using CipherAnnotation.Core.Entities;
using Microsoft.EntityFrameworkCore;

namespace CipherAnnotation.Infrastructure.Data;

public static class DocumentQueryExtensions
{
    // Full document graph used when loading a single document for read or
    // permission checks: owner (for DTO mapping), pages, and shares with users.
    public static IQueryable<Document> IncludeDetails(this IQueryable<Document> query) =>
        query
            .Include(d => d.Owner)
            .Include(d => d.Pages)
            .Include(d => d.Shares)
                .ThenInclude(ds => ds.User);

    // Lighter graph used for document listings: owner (DTO) + pages (count/thumbnail).
    public static IQueryable<Document> IncludeForListing(this IQueryable<Document> query) =>
        query
            .Include(d => d.Owner)
            .Include(d => d.Pages);
}
