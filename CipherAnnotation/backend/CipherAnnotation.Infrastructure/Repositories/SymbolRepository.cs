using CipherAnnotation.Core.Entities;
using CipherAnnotation.Core.Interfaces;
using CipherAnnotation.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace CipherAnnotation.Infrastructure.Repositories;

/// <summary>
/// Repository implementation for symbol-specific data access operations.
/// </summary>
public class SymbolRepository : GenericRepository<Symbol>, ISymbolRepository
{
    /// <summary>
    /// Initializes a new instance of the <see cref="SymbolRepository"/> class.
    /// </summary>
    /// <param name="context">The database context.</param>
    public SymbolRepository(AppDbContext context) : base(context)
    {
    }

    /// <summary>
    /// Searches for symbols by their code asynchronously with case-insensitive matching.
    /// </summary>
    /// <param name="code">The code or partial code to search for.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of symbols matching the search code.</returns>
    public async Task<IEnumerable<Symbol>> SearchByCodeAsync(string code, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(code))
        {
            throw new ArgumentException("Code cannot be null or empty.", nameof(code));
        }

        var normalizedCode = code.ToLower();
        return await _dbSet
            .Where(s => s.Code.ToLower().Contains(normalizedCode))
            .OrderBy(s => s.Code)
            .ToListAsync(cancellationToken);
    }
}
