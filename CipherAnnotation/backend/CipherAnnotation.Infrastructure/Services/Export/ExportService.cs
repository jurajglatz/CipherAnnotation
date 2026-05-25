using System.Globalization;
using System.Text;
using System.Text.Json;
using CipherAnnotation.Core.Entities;
using CipherAnnotation.Core.Enums;
using CipherAnnotation.Core.Interfaces;
using CipherAnnotation.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CipherAnnotation.Infrastructure.Services.Export;

/// <summary>
/// Service implementation for exporting annotation datasets to COCO, YOLO and TFRecord formats.
/// </summary>
public class ExportService : IExportService
{
    private readonly AppDbContext _db;
    private readonly ILogger<ExportService> _logger;

    public ExportService(AppDbContext db, ILogger<ExportService> logger)
    {
        _db = db ?? throw new ArgumentNullException(nameof(db));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    // ------------------------------------------------------------------
    // Data loading helpers
    // ------------------------------------------------------------------

    /// <summary>
    /// Internal representation of one annotated bounding box on a page.
    /// </summary>
    private sealed class ExportAnnotation
    {
        public required Guid PageId { get; init; }
        public required float X { get; init; }
        public required float Y { get; init; }
        public required float Width { get; init; }
        public required float Height { get; init; }
        public required string CategoryName { get; init; }
        public required int CategoryId { get; init; }
    }

    /// <summary>
    /// Internal representation of an exportable page (image + annotations).
    /// </summary>
    private sealed class ExportPage
    {
        public required Guid Id { get; init; }
        public required int PageNumber { get; init; }
        public required int Width { get; init; }
        public required int Height { get; init; }
        public required Guid ImageBlobId { get; init; }
        public required string ImageExtension { get; init; }
        public List<ExportAnnotation> Annotations { get; } = new();
    }

    private static string ExtensionFromContentType(string? contentType) => contentType?.ToLowerInvariant() switch
    {
        "image/jpeg" => "jpg",
        "image/jpg" => "jpg",
        "image/png" => "png",
        "image/gif" => "gif",
        "image/webp" => "webp",
        _ => "png",
    };

    private async Task<byte[]> LoadBlobBytesAsync(Guid blobId, CancellationToken ct)
    {
        var row = await _db.FileBlobs
            .AsNoTracking()
            .Where(b => b.Id == blobId)
            .Select(b => new { b.Data })
            .FirstOrDefaultAsync(ct);
        return row?.Data ?? Array.Empty<byte>();
    }

    private async Task<(Document document, List<ExportPage> pages, Dictionary<string, int> categories)>
        LoadAsync(Guid documentId, CancellationToken cancellationToken)
    {
        var document = await _db.Documents
            .AsNoTracking()
            .Include(d => d.Pages)
                .ThenInclude(p => p.Annotations)
                    .ThenInclude(a => a.BoundingBox)
            .Include(d => d.Pages)
                .ThenInclude(p => p.Annotations)
                    .ThenInclude(a => a.Caption)
            .FirstOrDefaultAsync(d => d.Id == documentId, cancellationToken)
            ?? throw new InvalidOperationException($"Document {documentId} not found.");

        // Build category dictionary on the fly from element types / symbols.
        var categories = new Dictionary<string, int>(StringComparer.Ordinal);
        int NextCategoryId(string name)
        {
            if (!categories.TryGetValue(name, out var id))
            {
                id = categories.Count + 1; // 1-based category IDs (COCO convention)
                categories[name] = id;
            }
            return id;
        }

        var pages = new List<ExportPage>();
        foreach (var page in document.Pages.OrderBy(p => p.PageNumber))
        {
            var effectiveBlobId = page.ProcessedImageBlobId ?? page.ImageBlobId;
            var blobMeta = await _db.FileBlobs
                .AsNoTracking()
                .Where(b => b.Id == effectiveBlobId)
                .Select(b => new { b.ContentType })
                .FirstOrDefaultAsync(cancellationToken);

            var ep = new ExportPage
            {
                Id = page.Id,
                PageNumber = page.PageNumber,
                Width = page.Width,
                Height = page.Height,
                ImageBlobId = effectiveBlobId,
                ImageExtension = ExtensionFromContentType(blobMeta?.ContentType),
            };

            foreach (var ann in page.Annotations)
            {
                if (ann.BoundingBox == null) continue;
                var name = ann.Content
                           ?? ann.Caption?.Name
                           ?? ann.Type.ToString();
                ep.Annotations.Add(new ExportAnnotation
                {
                    PageId = page.Id,
                    X = ann.BoundingBox.X,
                    Y = ann.BoundingBox.Y,
                    Width = ann.BoundingBox.Width,
                    Height = ann.BoundingBox.Height,
                    CategoryName = name,
                    CategoryId = NextCategoryId(name),
                });
            }

            pages.Add(ep);
        }

        return (document, pages, categories);
    }

    // ------------------------------------------------------------------
    // COCO export
    // ------------------------------------------------------------------

    public async Task ExportCocoAsync(Guid documentId, string outputPath, string? imagesDirectory = null, CancellationToken cancellationToken = default)
    {
        var (document, pages, categories) = await LoadAsync(documentId, cancellationToken);

        var images = new List<object>();
        var annotations = new List<object>();
        int nextImageId = 1;
        int nextAnnotationId = 1;

        foreach (var page in pages)
        {
            int imageId = nextImageId++;
            images.Add(new
            {
                id = imageId,
                file_name = $"page_{page.PageNumber:D4}.{page.ImageExtension}",
                width = page.Width,
                height = page.Height,
            });

            foreach (var a in page.Annotations)
            {
                annotations.Add(new
                {
                    id = nextAnnotationId++,
                    image_id = imageId,
                    category_id = a.CategoryId,
                    bbox = new[] { a.X, a.Y, a.Width, a.Height },
                    area = a.Width * a.Height,
                    iscrowd = 0,
                    segmentation = Array.Empty<object>(),
                });
            }
        }

        var coco = new
        {
            info = new
            {
                description = document.Title,
                version = "1.0",
                year = DateTime.UtcNow.Year,
                contributor = document.Author ?? "CipherAnnotation",
                date_created = DateTime.UtcNow.ToString("o", CultureInfo.InvariantCulture),
            },
            licenses = Array.Empty<object>(),
            images,
            annotations,
            categories = categories
                .OrderBy(kv => kv.Value)
                .Select(kv => new { id = kv.Value, name = kv.Key, supercategory = "cipher" })
                .ToList(),
        };

        var options = new JsonSerializerOptions { WriteIndented = true };
        await using (var fs = File.Create(outputPath))
        {
            await JsonSerializer.SerializeAsync(fs, coco, options, cancellationToken);
        }

        // Optionally bundle the actual image files, matching the file names
        // referenced in the JSON (page_{N:D4}.{ext}).
        if (imagesDirectory != null)
        {
            Directory.CreateDirectory(imagesDirectory);
            foreach (var page in pages)
            {
                var imageFileName = $"page_{page.PageNumber:D4}.{page.ImageExtension}";
                var destImage = Path.Combine(imagesDirectory, imageFileName);
                try
                {
                    var bytes = await LoadBlobBytesAsync(page.ImageBlobId, cancellationToken);
                    if (bytes.Length > 0)
                        await File.WriteAllBytesAsync(destImage, bytes, cancellationToken);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Could not write image for page {PageId}", page.Id);
                }
            }
        }

        _logger.LogInformation("COCO export written to {Path} ({ImageCount} images, {AnnotationCount} annotations, bundledImages={Bundled}).",
            outputPath, images.Count, annotations.Count, imagesDirectory != null);
    }

    // ------------------------------------------------------------------
    // YOLO export
    // ------------------------------------------------------------------

    public async Task ExportYoloAsync(Guid documentId, string outputPath, float trainTestSplit = 0.8f, CancellationToken cancellationToken = default)
    {
        var (document, pages, categories) = await LoadAsync(documentId, cancellationToken);

        Directory.CreateDirectory(outputPath);
        var labelsDir = Path.Combine(outputPath, "labels");
        var imagesDir = Path.Combine(outputPath, "images");
        Directory.CreateDirectory(labelsDir);
        Directory.CreateDirectory(imagesDir);

        // Deterministic shuffle to split into train/val.
        var rng = new Random(documentId.GetHashCode());
        var shuffled = pages.OrderBy(_ => rng.Next()).ToList();
        int trainCount = (int)Math.Round(shuffled.Count * Math.Clamp(trainTestSplit, 0f, 1f));
        var trainSet = new HashSet<Guid>(shuffled.Take(trainCount).Select(p => p.Id));

        var trainList = new List<string>();
        var valList = new List<string>();

        foreach (var page in pages)
        {
            var baseName = $"page_{page.PageNumber:D4}";
            var imageFileName = $"{baseName}.{page.ImageExtension}";
            var labelFileName = baseName + ".txt";

            // Write image bytes from the database blob to the export directory.
            var destImage = Path.Combine(imagesDir, imageFileName);
            try
            {
                var bytes = await LoadBlobBytesAsync(page.ImageBlobId, cancellationToken);
                if (bytes.Length > 0)
                    await File.WriteAllBytesAsync(destImage, bytes, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not write image for page {PageId}", page.Id);
            }

            // Write YOLO label file: class cx cy w h (normalized, 0..1).
            var sb = new StringBuilder();
            foreach (var a in page.Annotations)
            {
                float cx = (a.X + a.Width / 2f) / Math.Max(1, page.Width);
                float cy = (a.Y + a.Height / 2f) / Math.Max(1, page.Height);
                float nw = a.Width / Math.Max(1, page.Width);
                float nh = a.Height / Math.Max(1, page.Height);
                // YOLO is 0-indexed
                sb.AppendLine(string.Format(CultureInfo.InvariantCulture,
                    "{0} {1:0.######} {2:0.######} {3:0.######} {4:0.######}",
                    a.CategoryId - 1, cx, cy, nw, nh));
            }
            await File.WriteAllTextAsync(Path.Combine(labelsDir, labelFileName), sb.ToString(), cancellationToken);

            var relativePath = $"./images/{imageFileName}";
            if (trainSet.Contains(page.Id)) trainList.Add(relativePath);
            else valList.Add(relativePath);
        }

        await File.WriteAllLinesAsync(Path.Combine(outputPath, "train.txt"), trainList, cancellationToken);
        await File.WriteAllLinesAsync(Path.Combine(outputPath, "val.txt"), valList, cancellationToken);

        // data.yaml describes the dataset for YOLO training.
        var yaml = new StringBuilder();
        yaml.AppendLine($"# Dataset: {document.Title}");
        yaml.AppendLine("path: .");
        yaml.AppendLine("train: train.txt");
        yaml.AppendLine("val: val.txt");
        yaml.AppendLine($"nc: {categories.Count}");
        yaml.Append("names: [");
        yaml.Append(string.Join(", ",
            categories.OrderBy(kv => kv.Value).Select(kv => $"\"{kv.Key.Replace("\"", "\\\"")}\"")));
        yaml.AppendLine("]");
        await File.WriteAllTextAsync(Path.Combine(outputPath, "data.yaml"), yaml.ToString(), cancellationToken);

        _logger.LogInformation("YOLO export written to {Path} ({Train}/{Val} split).",
            outputPath, trainList.Count, valList.Count);
    }

    // ------------------------------------------------------------------
    // TFRecord export
    // ------------------------------------------------------------------

    public async Task ExportTfRecordAsync(Guid documentId, string outputPath, float trainTestSplit = 0.8f, CancellationToken cancellationToken = default)
    {
        var (document, pages, categories) = await LoadAsync(documentId, cancellationToken);

        Directory.CreateDirectory(outputPath);

        // Deterministic shuffle + split.
        var rng = new Random(documentId.GetHashCode());
        var shuffled = pages.OrderBy(_ => rng.Next()).ToList();
        int trainCount = (int)Math.Round(shuffled.Count * Math.Clamp(trainTestSplit, 0f, 1f));
        var trainPages = shuffled.Take(trainCount).ToList();
        var valPages = shuffled.Skip(trainCount).ToList();

        await WriteTfRecordFileAsync(Path.Combine(outputPath, "train.tfrecord"), trainPages, cancellationToken);
        await WriteTfRecordFileAsync(Path.Combine(outputPath, "val.tfrecord"), valPages, cancellationToken);

        async Task WriteTfRecordFileAsync(string path, List<ExportPage> pages, CancellationToken ct)
        {
            await using var fs = File.Create(path);
            foreach (var page in pages)
            {
                var imageBytes = await LoadBlobBytesAsync(page.ImageBlobId, ct);
                var exampleBytes = BuildTfExample(page, imageBytes);
                WriteTfRecord(fs, exampleBytes);
            }
        }

        // label_map.pbtxt is the standard companion file for TFRecord object detection datasets.
        var labelMap = new StringBuilder();
        foreach (var kv in categories.OrderBy(kv => kv.Value))
        {
            labelMap.AppendLine("item {");
            labelMap.AppendLine($"  id: {kv.Value}");
            labelMap.AppendLine($"  name: \"{kv.Key.Replace("\"", "\\\"")}\"");
            labelMap.AppendLine("}");
        }
        await File.WriteAllTextAsync(Path.Combine(outputPath, "label_map.pbtxt"), labelMap.ToString(), cancellationToken);

        // Human-readable metadata.
        var readme = new StringBuilder();
        readme.AppendLine($"TFRecord export for document: {document.Title}");
        readme.AppendLine($"Exported at: {DateTime.UtcNow:o}");
        readme.AppendLine($"Train pages: {trainPages.Count}   Val pages: {valPages.Count}");
        readme.AppendLine($"Classes: {categories.Count}");
        readme.AppendLine();
        readme.AppendLine("Each record is a tf.train.Example with fields:");
        readme.AppendLine("  image/encoded, image/format, image/filename,");
        readme.AppendLine("  image/width, image/height,");
        readme.AppendLine("  image/object/bbox/{xmin,ymin,xmax,ymax},");
        readme.AppendLine("  image/object/class/label, image/object/class/text");
        await File.WriteAllTextAsync(Path.Combine(outputPath, "README.txt"), readme.ToString(), cancellationToken);

        _logger.LogInformation("TFRecord export written to {Path} ({Train}/{Val} split, {Classes} classes).",
            outputPath, trainPages.Count, valPages.Count, categories.Count);
    }

    /// <summary>
    /// Builds a tf.train.Example protobuf message for a single page.
    /// </summary>
    private static byte[] BuildTfExample(ExportPage page, byte[] imageBytes)
    {
        // Build individual features.
        var features = new List<(string key, byte[] featureBytes)>();

        features.Add(("image/encoded", Proto.Feature.Bytes(imageBytes)));
        features.Add(("image/format", Proto.Feature.Bytes(Encoding.ASCII.GetBytes(page.ImageExtension))));
        features.Add(("image/filename", Proto.Feature.Bytes(Encoding.UTF8.GetBytes($"page_{page.PageNumber:D4}"))));
        features.Add(("image/width", Proto.Feature.Int64(new[] { (long)page.Width })));
        features.Add(("image/height", Proto.Feature.Int64(new[] { (long)page.Height })));

        float w = Math.Max(1, page.Width);
        float h = Math.Max(1, page.Height);
        var xmins = page.Annotations.Select(a => a.X / w).ToArray();
        var ymins = page.Annotations.Select(a => a.Y / h).ToArray();
        var xmaxs = page.Annotations.Select(a => (a.X + a.Width) / w).ToArray();
        var ymaxs = page.Annotations.Select(a => (a.Y + a.Height) / h).ToArray();
        var labels = page.Annotations.Select(a => (long)a.CategoryId).ToArray();
        var texts = page.Annotations.Select(a => Encoding.UTF8.GetBytes(a.CategoryName)).ToArray();

        features.Add(("image/object/bbox/xmin", Proto.Feature.Float(xmins)));
        features.Add(("image/object/bbox/ymin", Proto.Feature.Float(ymins)));
        features.Add(("image/object/bbox/xmax", Proto.Feature.Float(xmaxs)));
        features.Add(("image/object/bbox/ymax", Proto.Feature.Float(ymaxs)));
        features.Add(("image/object/class/label", Proto.Feature.Int64(labels)));
        features.Add(("image/object/class/text", Proto.Feature.BytesList(texts)));

        // Assemble Features map entries: map<string, Feature> feature = 1
        using var featuresStream = new MemoryStream();
        foreach (var (key, value) in features)
        {
            // Each map entry is: message { string key = 1; Feature value = 2; }
            using var entry = new MemoryStream();
            Proto.WriteString(entry, fieldNumber: 1, Encoding.UTF8.GetBytes(key));
            Proto.WriteBytes(entry, fieldNumber: 2, value);
            // Write the entry as field 1 (feature map) of Features message
            Proto.WriteBytes(featuresStream, fieldNumber: 1, entry.ToArray());
        }

        // Example message: Features features = 1
        using var exampleStream = new MemoryStream();
        Proto.WriteBytes(exampleStream, fieldNumber: 1, featuresStream.ToArray());
        return exampleStream.ToArray();
    }

    /// <summary>
    /// Writes a single TFRecord frame: [len: uint64 LE][masked_crc32c(len): uint32 LE][data][masked_crc32c(data): uint32 LE].
    /// </summary>
    private static void WriteTfRecord(Stream stream, byte[] data)
    {
        Span<byte> lenBuf = stackalloc byte[8];
        BitConverter.TryWriteBytes(lenBuf, (ulong)data.LongLength);
        if (!BitConverter.IsLittleEndian) lenBuf.Reverse();

        uint lenCrc = MaskedCrc32C(lenBuf);
        uint dataCrc = MaskedCrc32C(data);

        stream.Write(lenBuf);
        WriteUInt32Le(stream, lenCrc);
        stream.Write(data, 0, data.Length);
        WriteUInt32Le(stream, dataCrc);
    }

    private static void WriteUInt32Le(Stream stream, uint value)
    {
        Span<byte> buf = stackalloc byte[4];
        BitConverter.TryWriteBytes(buf, value);
        if (!BitConverter.IsLittleEndian) buf.Reverse();
        stream.Write(buf);
    }

    private static uint MaskedCrc32C(ReadOnlySpan<byte> data)
    {
        uint crc = Crc32C.Compute(data);
        // Mask used by TFRecord format: ((crc >> 15) | (crc << 17)) + 0xa282ead8
        return ((crc >> 15) | (crc << 17)) + 0xa282ead8u;
    }

    // ------------------------------------------------------------------
    // Imports (not yet implemented — kept as placeholders).
    // ------------------------------------------------------------------

    public Task ImportCocoAsync(Guid documentId, string cocoJsonPath, CancellationToken cancellationToken = default)
        => throw new NotImplementedException("COCO import is not implemented yet.");

    public Task ImportYoloAsync(Guid documentId, string yoloDirectoryPath, CancellationToken cancellationToken = default)
        => throw new NotImplementedException("YOLO import is not implemented yet.");
}

/// <summary>
/// Minimal protobuf wire-format writer used to emit tf.train.Example messages without a dependency on Protobuf runtime.
/// </summary>
internal static class Proto
{
    private const int WireTypeVarint = 0;
    private const int WireTypeFixed32 = 5;
    private const int WireTypeLengthDelimited = 2;

    private static void WriteTag(Stream s, int fieldNumber, int wireType)
        => WriteVarint(s, (ulong)((fieldNumber << 3) | wireType));

    private static void WriteVarint(Stream s, ulong value)
    {
        while (value >= 0x80)
        {
            s.WriteByte((byte)(value | 0x80));
            value >>= 7;
        }
        s.WriteByte((byte)value);
    }

    public static void WriteBytes(Stream s, int fieldNumber, byte[] data)
    {
        WriteTag(s, fieldNumber, WireTypeLengthDelimited);
        WriteVarint(s, (ulong)data.LongLength);
        s.Write(data, 0, data.Length);
    }

    public static void WriteString(Stream s, int fieldNumber, byte[] utf8)
        => WriteBytes(s, fieldNumber, utf8);

    /// <summary>Builders for tf.train.Feature submessages.</summary>
    public static class Feature
    {
        // Feature { oneof { BytesList bytes_list = 1; FloatList float_list = 2; Int64List int64_list = 3; } }
        // BytesList { repeated bytes value = 1; }
        // FloatList { repeated float value = 1; }  (packed)
        // Int64List { repeated int64 value = 1; }  (packed)

        public static byte[] Bytes(byte[] value) => BytesList(new[] { value });

        public static byte[] BytesList(IReadOnlyList<byte[]> values)
        {
            using var listStream = new MemoryStream();
            foreach (var v in values)
                WriteBytes(listStream, fieldNumber: 1, v);

            using var feature = new MemoryStream();
            WriteBytes(feature, fieldNumber: 1, listStream.ToArray()); // bytes_list = 1
            return feature.ToArray();
        }

        public static byte[] Float(IReadOnlyList<float> values)
        {
            using var packed = new MemoryStream();
            byte[] buf = new byte[4];
            foreach (var f in values)
            {
                BitConverter.TryWriteBytes(buf.AsSpan(), f);
                if (!BitConverter.IsLittleEndian) Array.Reverse(buf);
                packed.Write(buf, 0, 4);
            }

            using var list = new MemoryStream();
            // repeated float packed = field 1, wire type length-delimited
            WriteTag(list, fieldNumber: 1, WireTypeLengthDelimited);
            WriteVarint(list, (ulong)packed.Length);
            packed.Position = 0;
            packed.CopyTo(list);

            using var feature = new MemoryStream();
            WriteBytes(feature, fieldNumber: 2, list.ToArray()); // float_list = 2
            return feature.ToArray();
        }

        public static byte[] Int64(IReadOnlyList<long> values)
        {
            using var packed = new MemoryStream();
            foreach (var v in values)
                WriteVarint(packed, unchecked((ulong)v));

            using var list = new MemoryStream();
            WriteTag(list, fieldNumber: 1, WireTypeLengthDelimited);
            WriteVarint(list, (ulong)packed.Length);
            packed.Position = 0;
            packed.CopyTo(list);

            using var feature = new MemoryStream();
            WriteBytes(feature, fieldNumber: 3, list.ToArray()); // int64_list = 3
            return feature.ToArray();
        }
    }
}

/// <summary>
/// CRC-32C (Castagnoli polynomial 0x1EDC6F41) — required by TFRecord framing.
/// </summary>
internal static class Crc32C
{
    private static readonly uint[] Table = BuildTable();

    private static uint[] BuildTable()
    {
        const uint poly = 0x82F63B78u; // reversed 0x1EDC6F41
        var table = new uint[256];
        for (uint i = 0; i < 256; i++)
        {
            uint c = i;
            for (int j = 0; j < 8; j++)
                c = (c & 1) != 0 ? (poly ^ (c >> 1)) : (c >> 1);
            table[i] = c;
        }
        return table;
    }

    public static uint Compute(ReadOnlySpan<byte> data)
    {
        uint crc = 0xFFFFFFFFu;
        for (int i = 0; i < data.Length; i++)
            crc = Table[(crc ^ data[i]) & 0xFF] ^ (crc >> 8);
        return crc ^ 0xFFFFFFFFu;
    }
}
