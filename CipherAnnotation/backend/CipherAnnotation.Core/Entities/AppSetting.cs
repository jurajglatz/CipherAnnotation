namespace CipherAnnotation.Core.Entities;

/// <summary>
/// Global key/value setting used for runtime-toggleable feature flags
/// (e.g. enabling/disabling the Gemini-backed auto content generator).
/// </summary>
public class AppSetting
{
    public required string Key { get; set; }
    public required string Value { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; set; }
}
