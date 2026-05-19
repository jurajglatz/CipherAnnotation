using System.Diagnostics;
using System.Text.Json;
using CipherAnnotation.Core.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace CipherAnnotation.Infrastructure.Services.Vlm;

/// <summary>
/// Long-lived TrOCR worker. The Python sidecar is started lazily on first
/// request and kept alive for the lifetime of the host so the model load
/// cost (~3–10 s on CPU) is paid once, not per page. Requests are
/// newline-delimited JSON; a SemaphoreSlim ensures requests are serialized
/// over the single stdin pipe.
///
/// Registered as a singleton — see Program.cs.
/// </summary>
public class TrOcrVlmService : IVlmSuggestionService, IAsyncDisposable
{
    private readonly ILogger<TrOcrVlmService> _logger;
    private readonly string _pythonExecutable;
    private readonly string _scriptPath;
    private readonly TimeSpan _requestTimeout;
    private readonly TimeSpan _firstRequestTimeout;

    private readonly SemaphoreSlim _gate = new(1, 1);
    private Process? _process;
    private StreamWriter? _stdin;
    private StreamReader? _stdout;
    private Task? _stderrPump;
    private bool _firstRequestServed;

    public TrOcrVlmService(IConfiguration configuration, ILogger<TrOcrVlmService> logger)
    {
        _logger = logger;
        var section = configuration.GetSection("TrOcr");
        _pythonExecutable = section["PythonExecutable"]
            ?? configuration["AutoAnnotation:PythonExecutable"]
            ?? "python3";
        var scriptRel = section["ScriptPath"] ?? "ml/caption.py";
        _requestTimeout = TimeSpan.FromSeconds(
            int.TryParse(section["TimeoutSeconds"], out var t) ? t : 300);
        // First request pays the model-load cost — be more generous so a slow
        // cold start (cloud disk, large weights) doesn't fail the first job.
        _firstRequestTimeout = TimeSpan.FromSeconds(
            int.TryParse(section["FirstRequestTimeoutSeconds"], out var ft) ? ft : 600);

        var baseDir = AppContext.BaseDirectory;
        _scriptPath = Path.IsPathRooted(scriptRel) ? scriptRel : Path.Combine(baseDir, scriptRel);
    }

    public Task<IReadOnlyList<string?>> SuggestSymbolContentsAsync(
        IReadOnlyList<byte[]> images, CancellationToken ct = default) =>
        SuggestSymbolContentsAsync(images, progress: null, ct);

    public async Task<IReadOnlyList<string?>> SuggestSymbolContentsAsync(
        IReadOnlyList<byte[]> images, IProgress<int>? progress, CancellationToken ct = default)
    {
        if (images is null || images.Count == 0) return Array.Empty<string?>();
        if (!File.Exists(_scriptPath))
        {
            _logger.LogError("TrOCR script not found at {Path}", _scriptPath);
            return new string?[images.Count];
        }

        await _gate.WaitAsync(ct);
        try
        {
            EnsureStarted();

            var id = Guid.NewGuid().ToString("N");
            var requestJson = JsonSerializer.Serialize(new
            {
                id,
                images_b64 = images.Select(b => Convert.ToBase64String(b)).ToArray(),
            });

            using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            timeoutCts.CancelAfter(_firstRequestServed ? _requestTimeout : _firstRequestTimeout);

            try
            {
                await _stdin!.WriteLineAsync(requestJson.AsMemory(), timeoutCts.Token);
                await _stdin.FlushAsync(timeoutCts.Token);

                var result = new string?[images.Count];
                while (true)
                {
                    var line = await _stdout!.ReadLineAsync(timeoutCts.Token);
                    if (line is null)
                    {
                        // Worker exited mid-request — drop it so the next call
                        // gets a fresh process.
                        _logger.LogWarning("TrOCR worker exited unexpectedly during request {Id}.", id);
                        await KillWorkerAsync();
                        return new string?[images.Count];
                    }
                    if (string.IsNullOrWhiteSpace(line)) continue;

                    JsonElement root;
                    try
                    {
                        using var doc = JsonDocument.Parse(line);
                        root = doc.RootElement.Clone();
                    }
                    catch (JsonException ex)
                    {
                        _logger.LogDebug(ex, "Skipping non-JSON line on TrOCR stdout: {Line}", line);
                        continue;
                    }

                    // Ignore lines from other requests if any ever leak in.
                    if (root.TryGetProperty("id", out var idEl) && idEl.ValueKind == JsonValueKind.String)
                    {
                        if (idEl.GetString() != id) continue;
                    }

                    if (root.TryGetProperty("captions", out var capsEl)
                        && capsEl.ValueKind == JsonValueKind.Array)
                    {
                        for (int i = 0; i < capsEl.GetArrayLength() && i < images.Count; i++)
                        {
                            var el = capsEl[i];
                            if (el.ValueKind == JsonValueKind.String)
                            {
                                var s = el.GetString();
                                result[i] = string.IsNullOrWhiteSpace(s) ? null : s.Trim();
                            }
                        }
                        _firstRequestServed = true;
                        return result;
                    }

                    if (root.TryGetProperty("progress", out var progEl) && progEl.TryGetInt32(out var n))
                    {
                        progress?.Report(n);
                    }
                }
            }
            catch (OperationCanceledException) when (ct.IsCancellationRequested)
            {
                // Caller cancelled — leave the worker alive, but our pipe
                // state is now indeterminate so kill+restart on next request.
                await KillWorkerAsync();
                throw;
            }
            catch (OperationCanceledException)
            {
                _logger.LogWarning("TrOCR request {Id} timed out.", id);
                await KillWorkerAsync();
                return new string?[images.Count];
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "TrOCR worker request {Id} threw.", id);
                await KillWorkerAsync();
                return new string?[images.Count];
            }
        }
        finally
        {
            _gate.Release();
        }
    }

    private void EnsureStarted()
    {
        if (_process is not null && !_process.HasExited) return;

        // Tear down any half-dead state from a previous crash.
        try { _process?.Dispose(); } catch { /* best-effort */ }
        _process = null;
        _stdin = null;
        _stdout = null;

        var psi = new ProcessStartInfo
        {
            FileName = _pythonExecutable,
            RedirectStandardInput = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true,
        };
        psi.ArgumentList.Add(_scriptPath);

        _logger.LogInformation("Starting TrOCR worker: {Python} {Script}", _pythonExecutable, _scriptPath);
        var p = Process.Start(psi)
                ?? throw new InvalidOperationException("Failed to start TrOCR worker.");
        _process = p;
        _stdin = p.StandardInput;
        _stdout = p.StandardOutput;
        _firstRequestServed = false;

        // Drain stderr in the background so the pipe doesn't fill up and
        // block the worker. We log each line at debug to keep noise down.
        _stderrPump = Task.Run(async () =>
        {
            try
            {
                string? l;
                while ((l = await p.StandardError.ReadLineAsync()) is not null)
                    _logger.LogDebug("trocr: {Line}", l);
            }
            catch
            {
                // Pipe closes when the worker exits — that's expected.
            }
        });
    }

    private async Task KillWorkerAsync()
    {
        try
        {
            if (_process is not null && !_process.HasExited)
            {
                _process.Kill(entireProcessTree: true);
                await _process.WaitForExitAsync();
            }
        }
        catch { /* best-effort */ }
        try { _process?.Dispose(); } catch { /* best-effort */ }
        _process = null;
        _stdin = null;
        _stdout = null;
        _firstRequestServed = false;
    }

    public async ValueTask DisposeAsync()
    {
        await KillWorkerAsync();
        if (_stderrPump is not null)
        {
            try { await _stderrPump; } catch { /* best-effort */ }
        }
        _gate.Dispose();
    }
}
