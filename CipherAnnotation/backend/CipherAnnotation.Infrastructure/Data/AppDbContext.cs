using CipherAnnotation.Core.Entities;
using CipherAnnotation.Core.Enums;
using Microsoft.EntityFrameworkCore;

namespace CipherAnnotation.Infrastructure.Data;

/// <summary>
/// Entity Framework Core database context for CipherAnnotation application.
/// </summary>
public class AppDbContext : DbContext
{
    /// <summary>
    /// Initializes a new instance of the <see cref="AppDbContext"/> class.
    /// </summary>
    /// <param name="options">Database context options.</param>
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    /// <summary>
    /// Gets or sets the Users database set.
    /// </summary>
    public DbSet<User> Users { get; set; } = null!;

    /// <summary>
    /// Gets or sets the Documents database set.
    /// </summary>
    public DbSet<Document> Documents { get; set; } = null!;

    /// <summary>
    /// Gets or sets the Pages database set.
    /// </summary>
    public DbSet<Page> Pages { get; set; } = null!;

    /// <summary>
    /// Gets or sets the DocumentShares database set.
    /// </summary>
    public DbSet<DocumentShare> DocumentShares { get; set; } = null!;

    /// <summary>
    /// Gets or sets the SectionAnnotations database set.
    /// </summary>
    public DbSet<SectionAnnotation> SectionAnnotations { get; set; } = null!;

    /// <summary>
    /// Gets or sets the PairAnnotations database set.
    /// </summary>
    public DbSet<PairAnnotation> PairAnnotations { get; set; } = null!;

    /// <summary>
    /// Gets or sets the ElementAnnotations database set.
    /// </summary>
    public DbSet<ElementAnnotation> ElementAnnotations { get; set; } = null!;

    /// <summary>
    /// Gets or sets the BoundingBoxes database set.
    /// </summary>
    public DbSet<BoundingBox> BoundingBoxes { get; set; } = null!;

    /// <summary>
    /// Gets or sets the Symbols database set.
    /// </summary>
    public DbSet<Symbol> Symbols { get; set; } = null!;

    /// <summary>
    /// Gets or sets the FileBlobs database set.
    /// </summary>
    public DbSet<FileBlob> FileBlobs { get; set; } = null!;

    /// <summary>
    /// Gets or sets the PreprocessHistoryEntries database set.
    /// </summary>
    public DbSet<PreprocessHistoryEntry> PreprocessHistoryEntries { get; set; } = null!;

    /// <summary>
    /// Configures the model using the Fluent API.
    /// </summary>
    /// <param name="modelBuilder">The model builder.</param>
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Configure User entity
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id)
                .ValueGeneratedOnAdd();

            entity.Property(e => e.Email)
                .IsRequired()
                .HasMaxLength(256);

            entity.Property(e => e.Name)
                .IsRequired()
                .HasMaxLength(256);

            entity.Property(e => e.CreatedAt)
                .HasDefaultValue(DateTime.UtcNow);

            entity.HasIndex(e => e.Email)
                .IsUnique();

            entity.HasMany(e => e.OwnedDocuments)
                .WithOne(d => d.Owner)
                .HasForeignKey(d => d.OwnerId)
                .IsRequired()
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(e => e.SharedDocuments)
                .WithOne(ds => ds.User)
                .HasForeignKey(ds => ds.UserId)
                .IsRequired()
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Configure Document entity
        modelBuilder.Entity<Document>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id)
                .ValueGeneratedOnAdd();

            entity.Property(e => e.Title)
                .IsRequired()
                .HasMaxLength(500);

            entity.Property(e => e.Description)
                .HasMaxLength(2000);

            entity.Property(e => e.OriginCountry)
                .HasMaxLength(100);

            entity.Property(e => e.Author)
                .HasMaxLength(256);

            entity.Property(e => e.Language)
                .HasMaxLength(50);

            entity.Property(e => e.Visibility)
                .HasConversion<string>()
                .HasMaxLength(50);

            entity.Property(e => e.CreatedAt)
                .HasDefaultValue(DateTime.UtcNow);

            entity.Property(e => e.UpdatedAt)
                .HasDefaultValue(DateTime.UtcNow);

            entity.HasOne(e => e.Owner)
                .WithMany(u => u.OwnedDocuments)
                .HasForeignKey(e => e.OwnerId)
                .IsRequired()
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(e => e.Pages)
                .WithOne(p => p.Document)
                .HasForeignKey(p => p.DocumentId)
                .IsRequired()
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(e => e.Shares)
                .WithOne(ds => ds.Document)
                .HasForeignKey(ds => ds.DocumentId)
                .IsRequired()
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => e.Visibility);
        });

        // Configure Page entity
        modelBuilder.Entity<Page>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id)
                .ValueGeneratedOnAdd();

            entity.Property(e => e.CreatedAt)
                .HasDefaultValue(DateTime.UtcNow);

            entity.HasOne(e => e.ImageBlob)
                .WithMany()
                .HasForeignKey(e => e.ImageBlobId)
                .IsRequired()
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.ProcessedImageBlob)
                .WithMany()
                .HasForeignKey(e => e.ProcessedImageBlobId)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Document)
                .WithMany(d => d.Pages)
                .HasForeignKey(e => e.DocumentId)
                .IsRequired()
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(e => e.SectionAnnotations)
                .WithOne(sa => sa.Page)
                .HasForeignKey(sa => sa.PageId)
                .IsRequired()
                .OnDelete(DeleteBehavior.Cascade);

            // Constraint: PageNumber must be between 1 and 100 per document
            entity.ToTable(t => t.HasCheckConstraint("CK_Page_PageNumber", "\"PageNumber\" >= 1 AND \"PageNumber\" <= 100"));

            // Unique constraint on DocumentId and PageNumber combination
            entity.HasIndex(e => new { e.DocumentId, e.PageNumber })
                .IsUnique();
        });

        // Configure DocumentShare entity
        modelBuilder.Entity<DocumentShare>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id)
                .ValueGeneratedOnAdd();

            entity.Property(e => e.Permission)
                .HasConversion<string>()
                .HasMaxLength(50);

            entity.Property(e => e.SharedAt)
                .HasDefaultValue(DateTime.UtcNow);

            entity.HasOne(e => e.Document)
                .WithMany(d => d.Shares)
                .HasForeignKey(e => e.DocumentId)
                .IsRequired()
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.User)
                .WithMany(u => u.SharedDocuments)
                .HasForeignKey(e => e.UserId)
                .IsRequired()
                .OnDelete(DeleteBehavior.Cascade);

            // Composite unique index on (DocumentId, UserId)
            entity.HasIndex(e => new { e.DocumentId, e.UserId })
                .IsUnique();
        });

        // Configure SectionAnnotation entity
        modelBuilder.Entity<SectionAnnotation>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id)
                .ValueGeneratedOnAdd();

            entity.Property(e => e.Label)
                .HasMaxLength(100);

            entity.Property(e => e.CreatedAt)
                .HasDefaultValue(DateTime.UtcNow);

            entity.HasOne(e => e.Page)
                .WithMany(p => p.SectionAnnotations)
                .HasForeignKey(e => e.PageId)
                .IsRequired()
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.BoundingBox)
                .WithOne(bb => bb.Section)
                .HasForeignKey<BoundingBox>(bb => bb.SectionId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(e => e.PairAnnotations)
                .WithOne(pa => pa.Section)
                .HasForeignKey(pa => pa.SectionId)
                .IsRequired()
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Configure PairAnnotation entity
        modelBuilder.Entity<PairAnnotation>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id)
                .ValueGeneratedOnAdd();

            entity.Property(e => e.CreatedAt)
                .HasDefaultValue(DateTime.UtcNow);

            entity.HasOne(e => e.Section)
                .WithMany(sa => sa.PairAnnotations)
                .HasForeignKey(e => e.SectionId)
                .IsRequired()
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.BoundingBox)
                .WithOne(bb => bb.Pair)
                .HasForeignKey<BoundingBox>(bb => bb.PairId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(e => e.ElementAnnotations)
                .WithOne(ea => ea.Pair)
                .HasForeignKey(ea => ea.PairId)
                .IsRequired()
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Configure ElementAnnotation entity
        modelBuilder.Entity<ElementAnnotation>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id)
                .ValueGeneratedOnAdd();

            entity.Property(e => e.Type)
                .HasConversion<string>()
                .HasMaxLength(50);

            entity.Property(e => e.Content)
                .HasMaxLength(1000);

            entity.Property(e => e.Transcription)
                .HasMaxLength(1000);

            entity.Property(e => e.CreatedAt)
                .HasDefaultValue(DateTime.UtcNow);

            entity.HasOne(e => e.Pair)
                .WithMany(pa => pa.ElementAnnotations)
                .HasForeignKey(e => e.PairId)
                .IsRequired()
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Symbol)
                .WithMany(s => s.Elements)
                .HasForeignKey(e => e.SymbolId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.BoundingBox)
                .WithOne(bb => bb.Element)
                .HasForeignKey<BoundingBox>(bb => bb.ElementId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Configure BoundingBox entity
        modelBuilder.Entity<BoundingBox>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id)
                .ValueGeneratedOnAdd();

            // One-to-one with SectionAnnotation (optional)
            entity.HasOne(e => e.Section)
                .WithOne(sa => sa.BoundingBox)
                .HasForeignKey<BoundingBox>(e => e.SectionId)
                .OnDelete(DeleteBehavior.Cascade);

            // One-to-one with PairAnnotation (optional)
            entity.HasOne(e => e.Pair)
                .WithOne(pa => pa.BoundingBox)
                .HasForeignKey<BoundingBox>(e => e.PairId)
                .OnDelete(DeleteBehavior.Cascade);

            // One-to-one with ElementAnnotation (optional)
            entity.HasOne(e => e.Element)
                .WithOne(ea => ea.BoundingBox)
                .HasForeignKey<BoundingBox>(e => e.ElementId)
                .OnDelete(DeleteBehavior.Cascade);

            // Constraint: Only one FK should be set at a time
            entity.ToTable(t => t.HasCheckConstraint("CK_BoundingBox_SingleFK",
                "(CASE WHEN \"SectionId\" IS NOT NULL THEN 1 ELSE 0 END) + " +
                "(CASE WHEN \"PairId\" IS NOT NULL THEN 1 ELSE 0 END) + " +
                "(CASE WHEN \"ElementId\" IS NOT NULL THEN 1 ELSE 0 END) = 1"));
        });

        // Configure Symbol entity
        modelBuilder.Entity<Symbol>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id)
                .ValueGeneratedOnAdd();

            entity.Property(e => e.Code)
                .IsRequired()
                .HasMaxLength(50);

            entity.HasOne(e => e.PreviewImageBlob)
                .WithMany()
                .HasForeignKey(e => e.PreviewImageBlobId)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.Restrict);

            entity.Property(e => e.CreatedAt)
                .HasDefaultValue(DateTime.UtcNow);

            entity.HasMany(e => e.Elements)
                .WithOne(ea => ea.Symbol)
                .HasForeignKey(ea => ea.SymbolId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(e => e.Code)
                .IsUnique();
        });

        // Configure PreprocessHistoryEntry entity
        modelBuilder.Entity<PreprocessHistoryEntry>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id)
                .ValueGeneratedOnAdd();

            entity.Property(e => e.OperationsJson)
                .IsRequired()
                .HasColumnType("text");

            entity.Property(e => e.AppliedAt)
                .HasDefaultValue(DateTime.UtcNow);

            entity.HasOne(e => e.Page)
                .WithMany(p => p.PreprocessHistory)
                .HasForeignKey(e => e.PageId)
                .IsRequired()
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.ResultBlob)
                .WithMany()
                .HasForeignKey(e => e.ResultBlobId)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(e => new { e.PageId, e.Sequence })
                .IsUnique();
        });

        // Link Page.CurrentPreprocessHistoryId without a navigation to avoid cascade cycles.
        modelBuilder.Entity<Page>()
            .HasOne<PreprocessHistoryEntry>()
            .WithMany()
            .HasForeignKey(p => p.CurrentPreprocessHistoryId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.SetNull);

        // Configure FileBlob entity
        modelBuilder.Entity<FileBlob>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id)
                .ValueGeneratedOnAdd();

            entity.Property(e => e.Data)
                .IsRequired()
                .HasColumnType("bytea");

            entity.Property(e => e.ContentType)
                .IsRequired()
                .HasMaxLength(100);

            entity.Property(e => e.FileName)
                .IsRequired()
                .HasMaxLength(500);

            entity.Property(e => e.Sha256)
                .IsRequired()
                .HasMaxLength(64);

            entity.Property(e => e.CreatedAt)
                .HasDefaultValue(DateTime.UtcNow);

            entity.HasIndex(e => e.Sha256);
        });
    }
}
