using CipherAnnotation.Core.Interfaces;
using CipherAnnotation.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace CipherAnnotation.Infrastructure.Repositories;

/// <summary>
/// Generic repository implementation for generic data access operations.
/// </summary>
/// <typeparam name="T">The entity type.</typeparam>
public class GenericRepository<T> : IRepository<T> where T : class
{
    /// <summary>
    /// The database context.
    /// </summary>
    protected readonly AppDbContext _context;

    /// <summary>
    /// The database set for the entity type.
    /// </summary>
    protected readonly DbSet<T> _dbSet;

    /// <summary>
    /// Initializes a new instance of the <see cref="GenericRepository{T}"/> class.
    /// </summary>
    /// <param name="context">The database context.</param>
    public GenericRepository(AppDbContext context)
    {
        _context = context ?? throw new ArgumentNullException(nameof(context));
        _dbSet = context.Set<T>();
    }

    /// <summary>
    /// Gets an entity by its unique identifier asynchronously.
    /// </summary>
    /// <param name="id">The unique identifier of the entity.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>The entity if found; otherwise null.</returns>
    public virtual async Task<T?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _dbSet.FindAsync(new object[] { id }, cancellationToken: cancellationToken);
    }

    /// <summary>
    /// Gets all entities asynchronously.
    /// </summary>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of all entities.</returns>
    public virtual async Task<IEnumerable<T>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await _dbSet.ToListAsync(cancellationToken);
    }

    /// <summary>
    /// Adds a new entity to the repository asynchronously.
    /// </summary>
    /// <param name="entity">The entity to add.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    public virtual async Task AddAsync(T entity, CancellationToken cancellationToken = default)
    {
        if (entity == null)
        {
            throw new ArgumentNullException(nameof(entity));
        }

        await _dbSet.AddAsync(entity, cancellationToken);
    }

    /// <summary>
    /// Updates an existing entity in the repository.
    /// </summary>
    /// <param name="entity">The entity to update.</param>
    public virtual void Update(T entity)
    {
        if (entity == null)
        {
            throw new ArgumentNullException(nameof(entity));
        }

        _dbSet.Update(entity);
    }

    /// <summary>
    /// Deletes an entity from the repository.
    /// </summary>
    /// <param name="entity">The entity to delete.</param>
    public virtual void Delete(T entity)
    {
        if (entity == null)
        {
            throw new ArgumentNullException(nameof(entity));
        }

        _dbSet.Remove(entity);
    }

    /// <summary>
    /// Saves all changes made to the repository asynchronously.
    /// </summary>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>The number of entities affected.</returns>
    public virtual async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return await _context.SaveChangesAsync(cancellationToken);
    }
}
