using System.Diagnostics;
using System.Text;
using System.Text.Json;
using CipherAnnotation.Core.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace CipherAnnotation.Infrastructure.Services.Vlm;

/// <summary>
/// Spawns the TrOCR Python sidecar (ml/caption.py), ships a batch of crops
/// over stdin as JSON, and reads the captions back from stdout. Mirrors the
/// existing YOLO sidecar pattern in AutoAnnotationService.
/// </summary>
public class TrOcrVlmService : IVlmSuggestionService
{
    private readonly ILogger<TrOcrVlmService> _logger;
    private readonly string _pythonExecutable;
    private readonly string _scriptPath;
    private readonly TimeSpan _timeout;

    public TrOcrVlmService(IConfiguration configuration, ILogger<TrOcrVlmService> logger)
    {
        _logger = logger;
        var section = configuration.GetSection("TrOcr");
        // Reuse the same venv that the YOLO sidecar uses (the Dockerfile
        // points AutoAnnotation__PythonExecutable at it).
        _pythonExecutable = section["PythonExecutable"]
            ?? configuration["AutoAnnotation:PythonExecutable"]
            ?? "python3";
        var scriptRel = section["ScriptPath"] ?? "ml/caption.py";
        _timeout = TimeSpan.FromSeconds(
            int.TryParse(section["TimeoutSeconds"], out var t) ? t : 300);

        var baseDir = AppContext.BaseDirectory;
        _scriptPath = ResolvePath(baseDir, scriptRel);
    }

    public async Task<IReadOnlyList<string?>> SuggestSymbolContentsAsync(
        IReadOnlyList<byte[]> images, CancellationToken ct = default)
    {
        if (images is null || images.Count == 0) return Array.Empty<string?>();
        if (!File.Exists(_scriptPath))
        {
            _logger.LogError("TrOCR script not found at {Path}", _scriptPath);
            return new string?[images.Count];
        }

        var requestJson = JsonSerializer.Serialize(new
        {
            images_b64 = images.Select(b => Convert.ToBase64String(b)).ToArray(),
        });

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

        using var process = new Process { StartInfo = psi };
        try
        {
            process.Start();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to start TrOCR python process at {Python}", _pythonExecutable);
            return new string?[images.Count];
        }

        using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
        timeoutCts.CancelAfter(_timeout);

        try
        {
            // Stream stdin → child, then close so the child can finish reading.
            await process.StandardInput.WriteAsync(requestJson.AsMemory(), timeoutCts.Token);
            process.StandardInput.Close();

            var stdoutTask = process.StandardOutput.ReadToEndAsync(timeoutCts.Token);
            var stderrTask = process.StandardError.ReadToEndAsync(timeoutCts.Token);
            await process.WaitForExitAsync(timeoutCts.Token);

            var stdout = await stdoutTask;
            var stderr = await stderrTask;

            if (process.ExitCode != 0)
            {
                _logger.LogWarning(
                    "TrOCR sidecar exited with {Exit}. stderr: {Stderr}", process.ExitCode, stderr);
                return new string?[images.Count];
            }
            if (!string.IsNullOrWhiteSpace(stderr))
                _logger.LogDebug("TrOCR sidecar stderr: {Stderr}", stderr);

            using var doc = JsonDocument.Parse(stdout);
            if (!doc.RootElement.TryGetProperty("captions", out var captionsEl)
                || captionsEl.ValueKind != JsonValueKind.Array)
            {
                _logger.LogWarning("TrOCR response missing 'captions' array. Raw: {Stdout}", stdout);
                return new string?[images.Count];
            }

            var result = new string?[images.Count];
            for (var i = 0; i < captionsEl.GetArrayLength() && i < images.Count; i++)
            {
                var el = captionsEl[i];
                if (el.ValueKind == JsonValueKind.String)
                {
                    var s = el.GetString();
                    result[i] = string.IsNullOrWhiteSpace(s) ? null : s.Trim();
                }
            }
            return result;
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            TryKill(process);
            throw;
        }
        catch (OperationCanceledException)
        {
            _logger.LogWarning("TrOCR sidecar timed out after {Timeout}s.", _timeout.TotalSeconds);
            TryKill(process);
            return new string?[images.Count];
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "TrOCR sidecar threw.");
            TryKill(process);
            return new string?[images.Count];
        }
    }

    private static void TryKill(Process p)
    {
        try { if (!p.HasExited) p.Kill(entireProcessTree: true); }
        catch { /* best-effort */ }
    }

    private static string ResolvePath(string baseDir, string rel) =>
        Path.IsPathRooted(rel) ? rel : Path.Combine(baseDir, rel);
}
