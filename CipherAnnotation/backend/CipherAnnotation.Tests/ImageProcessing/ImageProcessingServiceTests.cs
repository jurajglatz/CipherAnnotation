using CipherAnnotation.Infrastructure.Services.ImageProcessing;
using Microsoft.Extensions.Logging.Abstractions;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Png;
using SixLabors.ImageSharp.PixelFormats;

namespace CipherAnnotation.Tests.ImageProcessing;

public class ImageProcessingServiceTests
{
    private static ImageProcessingService NewService() =>
        new(NullLogger<ImageProcessingService>.Instance);

    private static byte[] MakePng(int width, int height)
    {
        using var img = new Image<Rgba32>(width, height, new Rgba32(255, 255, 255, 255));
        using var ms = new MemoryStream();
        img.Save(ms, new PngEncoder());
        return ms.ToArray();
    }

    private static (int W, int H) Dimensions(byte[] png)
    {
        using var img = Image.Load(png);
        return (img.Width, img.Height);
    }

    [Fact]
    public async Task RotateAsync_90Degrees_SwapsDimensions()
    {
        var svc = NewService();
        var input = MakePng(10, 20);

        var output = await svc.RotateAsync(input, 90);

        var (w, h) = Dimensions(output);
        w.Should().Be(20);
        h.Should().Be(10);
    }

    [Fact]
    public async Task ScaleAsync_Half_HalvesDimensions()
    {
        var svc = NewService();
        var input = MakePng(20, 20);

        var output = await svc.ScaleAsync(input, 0.5f);

        Dimensions(output).Should().Be((10, 10));
    }

    [Fact]
    public async Task GrayscaleAsync_PreservesDimensions_AndReturnsValidPng()
    {
        var svc = NewService();
        var input = MakePng(15, 25);

        var output = await svc.GrayscaleAsync(input);

        Dimensions(output).Should().Be((15, 25));
    }

    [Fact]
    public async Task BinarizeAsync_ReturnsValidPng()
    {
        var svc = NewService();
        var input = MakePng(8, 8);

        var output = await svc.BinarizeAsync(input);

        Dimensions(output).Should().Be((8, 8));
    }

    [Fact]
    public async Task ScaleAsync_NonPositiveFactor_Throws()
    {
        var svc = NewService();
        var input = MakePng(4, 4);

        var act = async () => await svc.ScaleAsync(input, 0);

        await act.Should().ThrowAsync<ArgumentException>();
    }

    [Fact]
    public async Task AdjustContrastAsync_NonPositiveFactor_Throws()
    {
        var svc = NewService();
        var input = MakePng(4, 4);

        var act = async () => await svc.AdjustContrastAsync(input, -1f);

        await act.Should().ThrowAsync<ArgumentException>();
    }

    [Fact]
    public async Task RotateAsync_EmptyInput_Throws()
    {
        var svc = NewService();

        var act = async () => await svc.RotateAsync(Array.Empty<byte>(), 90);

        await act.Should().ThrowAsync<ArgumentException>();
    }
}
