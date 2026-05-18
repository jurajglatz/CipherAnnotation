namespace CipherAnnotation.Core.Interfaces;

/// <summary>
/// Reads and writes global feature-flag settings.
/// Values are cached in-memory briefly so feature-flag checks on hot paths
/// don't hit the database every call.
/// </summary>
public interface IAppSettingsService
{
    Task<bool> GetBoolAsync(string key, bool defaultValue = false, CancellationToken ct = default);

    Task<IReadOnlyDictionary<string, string>> GetAllAsync(CancellationToken ct = default);

    Task SetAsync(string key, string value, Guid? updatedByUserId = null, CancellationToken ct = default);
}

/// <summary>
/// Well-known setting keys. Keep in one place so callers can't typo.
/// </summary>
public static class AppSettingKeys
{
    public const string AutoContentGeneratorEnabled = "AutoContentGenerator.Enabled";
}
