using CipherAnnotation.Core.Entities;

namespace CipherAnnotation.Core.Interfaces;

/// <summary>
/// Repository interface for symbol-specific data access operations.
/// </summary>
public interface ISymbolRepository : IRepository<Symbol>
{
    /// <summary>
    /// Searches for symbols by their code asynchronously.
    /// </summary>
    /// <param name="code">The code or partial code to search for.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of symbols matching the search code.</returns>
    Task<IEnumerable<Symbol>> SearchByCodeAsync(string code, CancellationToken cancellationToken = default);
}
