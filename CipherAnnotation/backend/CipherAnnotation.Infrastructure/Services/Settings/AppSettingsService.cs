using CipherAnnotation.Core.Entities;
using CipherAnnotation.Core.Interfaces;
using CipherAnnotation.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace CipherAnnotation.Infrastructure.Services.Settings;

public class AppSettingsService : IAppSettingsService
{
    // Short TTL — settings change rarely, and the admin toggle UI should see
    // its own writes within a few seconds. Anything longer makes "I turned it
    // off, why is it still on?" debugging unpleasant.
    private static readonly TimeSpan CacheTtl = TimeSpan.FromSeconds(10);
    private const string AllCacheKey = "appsettings:all";

    private readonly AppDbContext _db;
    private readonly IMemoryCache _cache;

    public AppSettingsService(AppDbContext db, IMemoryCache cache)
    {
        _db = db;
        _cache = cache;
    }

    public async Task<IReadOnlyDictionary<string, string>> GetAllAsync(CancellationToken ct = default)
    {
        if (_cache.TryGetValue(AllCacheKey, out IReadOnlyDictionary<string, string>? cached) && cached is not null)
            return cached;

        var rows = await _db.AppSettings.AsNoTracking()
            .Select(s => new { s.Key, s.Value })
            .ToListAsync(ct);

        var dict = rows.ToDictionary(r => r.Key, r => r.Value, StringComparer.Ordinal);
        _cache.Set(AllCacheKey, (IReadOnlyDictionary<string, string>)dict, CacheTtl);
        return dict;
    }

    public async Task<bool> GetBoolAsync(string key, bool defaultValue = false, CancellationToken ct = default)
    {
        var all = await GetAllAsync(ct);
        return all.TryGetValue(key, out var raw) && bool.TryParse(raw, out var parsed) ? parsed : defaultValue;
    }

    public async Task SetAsync(string key, string value, Guid? updatedByUserId = null, CancellationToken ct = default)
    {
        var existing = await _db.AppSettings.FirstOrDefaultAsync(s => s.Key == key, ct);
        if (existing is null)
        {
            _db.AppSettings.Add(new AppSetting
            {
                Key = key,
                Value = value,
                UpdatedAt = DateTime.UtcNow,
                UpdatedByUserId = updatedByUserId,
            });
        }
        else
        {
            existing.Value = value;
            existing.UpdatedAt = DateTime.UtcNow;
            existing.UpdatedByUserId = updatedByUserId;
        }

        await _db.SaveChangesAsync(ct);
        _cache.Remove(AllCacheKey);
    }
}
