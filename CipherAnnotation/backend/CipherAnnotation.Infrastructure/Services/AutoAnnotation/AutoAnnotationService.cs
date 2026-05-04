using System.Diagnostics;
using System.Text.Json;
using CipherAnnotation.Core.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace CipherAnnotation.Infrastructure.Services.AutoAnnotation;

/// <summary>
/// Spawns a Python sidecar that runs YOLOv11 (ultralytics) inference on the
/// given image and parses the JSON detections back.
/// </summary>
public class AutoAnnotationService : IAutoAnnotationService
{
    private readonly ILogger<AutoAnnotationService> _logger;
    private readonly string _pythonExecutable;
    private readonly string _scriptPath;
    private readonly string _modelPath;
    private readonly float _confidence;

    public AutoAnnotationService(IConfiguration configuration, ILogger<AutoAnnotationService> logger)
    {
        _logger = logger;
        var section = configuration.GetSection("AutoAnnotation");
        _pythonExecutable = section["PythonExecutable"] ?? "python3";
        var scriptRel = section["ScriptPath"] ?? "ml/predict.py";
        var modelRel = section["ModelPath"] ?? "ml_models/cipher_yolov11.pt";
        _confidence = float.TryParse(section["Confidence"], out var c) ? c : 0.25f;

        var baseDir = AppContext.BaseDirectory;
        _scriptPath = ResolvePath(baseDir, scriptRel);
        _modelPath = ResolvePath(baseDir, modelRel);
    }

    public async Task<IReadOnlyList<AutoDetection>> DetectAsync(
        byte[] imageBytes,
        string fileExtension,
        CancellationToken cancellationToken = default)
    {
        if (!File.Exists(_modelPath))
            throw new InvalidOperationException($"YOLO model not found at '{_modelPath}'.");
        if (!File.Exists(_scriptPath))
            throw new InvalidOperationException($"Inference script not found at '{_scriptPath}'.");

        var ext = string.IsNullOrWhiteSpace(fileExtension) ? ".png" : fileExtension;
        if (!ext.StartsWith('.')) ext = "." + ext;

        var tempImage = Path.Combine(Path.GetTempPath(), $"cipher_auto_{Guid.NewGuid():N}{ext}");
        await File.WriteAllBytesAsync(tempImage, imageBytes, cancellationToken);

        try
        {
            var psi = new ProcessStartInfo
            {
                FileName = _pythonExecutable,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true,
            };
            psi.ArgumentList.Add(_scriptPath);
            psi.ArgumentList.Add(_modelPath);
            psi.ArgumentList.Add(tempImage);
            psi.ArgumentList.Add(_confidence.ToString(System.Globalization.CultureInfo.InvariantCulture));

            using var proc = Process.Start(psi)
                ?? throw new InvalidOperationException("Failed to launch Python inference process.");

            var stdoutTask = proc.StandardOutput.ReadToEndAsync(cancellationToken);
            var stderrTask = proc.StandardError.ReadToEndAsync(cancellationToken);
            await proc.WaitForExitAsync(cancellationToken);
            var stdout = await stdoutTask;
            var stderr = await stderrTask;

            if (proc.ExitCode != 0)
            {
                _logger.LogError("YOLO sidecar exited {Code}: {Stderr}", proc.ExitCode, stderr);
                throw new InvalidOperationException($"Auto-annotation failed (exit {proc.ExitCode}): {stderr}");
            }

            return Parse(stdout);
        }
        finally
        {
            try { File.Delete(tempImage); } catch { /* best effort */ }
        }
    }

    private static IReadOnlyList<AutoDetection> Parse(string json)
    {
        if (string.IsNullOrWhiteSpace(json)) return Array.Empty<AutoDetection>();

        // Defensive: ultralytics or torch can emit stray bytes on stdout. Extract
        // the outermost {...} balanced block so we don't choke on prefix/suffix noise.
        var start = json.IndexOf('{');
        var end = json.LastIndexOf('}');
        if (start < 0 || end < start)
            throw new InvalidOperationException("Sidecar produced no JSON object: " + json);
        json = json.Substring(start, end - start + 1);

        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        var names = new Dictionary<int, string>();
        if (root.TryGetProperty("names", out var namesEl) && namesEl.ValueKind == JsonValueKind.Object)
        {
            foreach (var prop in namesEl.EnumerateObject())
            {
                if (int.TryParse(prop.Name, out var k))
                    names[k] = prop.Value.GetString() ?? prop.Name;
            }
        }

        var list = new List<AutoDetection>();
        if (root.TryGetProperty("detections", out var dets) && dets.ValueKind == JsonValueKind.Array)
        {
            foreach (var d in dets.EnumerateArray())
            {
                var cls = d.GetProperty("cls").GetInt32();
                var name = names.TryGetValue(cls, out var n) ? n : cls.ToString();
                list.Add(new AutoDetection(
                    name,
                    d.GetProperty("x1").GetSingle(),
                    d.GetProperty("y1").GetSingle(),
                    d.GetProperty("x2").GetSingle(),
                    d.GetProperty("y2").GetSingle(),
                    d.GetProperty("conf").GetSingle()));
            }
        }
        return list;
    }

    private static string ResolvePath(string baseDir, string relative)
    {
        if (Path.IsPathRooted(relative)) return relative;
        var candidate = Path.GetFullPath(Path.Combine(baseDir, relative));
        if (File.Exists(candidate)) return candidate;

        // Fall back to walking up to find the project's root (where the "ml" or
        // "ml_models" folder lives) — useful in `dotnet run` where bin/ is deeper.
        var dir = new DirectoryInfo(baseDir);
        while (dir is not null)
        {
            var alt = Path.Combine(dir.FullName, relative);
            if (File.Exists(alt)) return Path.GetFullPath(alt);
            dir = dir.Parent;
        }
        return candidate;
    }
}
