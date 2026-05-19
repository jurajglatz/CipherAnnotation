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
    /// Gets or sets the BoundingBoxes database set.
    /// </summary>
    public DbSet<BoundingBox> BoundingBoxes { get; set; } = null!;

    /// <summary>
    /// Gets or sets the Annotations database set.
    /// </summary>
    public DbSet<Annotation> Annotations { get; set; } = null!;

    /// <summary>
    /// Gets or sets the Captions database set.
    /// </summary>
    public DbSet<Caption> Captions { get; set; } = null!;

    /// <summary>
    /// Gets or sets the FileBlobs database set.
    /// </summary>
    public DbSet<FileBlob> FileBlobs { get; set; } = null!;

    /// <summary>
    /// Gets or sets the PreprocessHistoryEntries database set.
    /// </summary>
    public DbSet<PreprocessHistoryEntry> PreprocessHistoryEntries { get; set; } = null!;

    /// <summary>
    /// Gets or sets the RefreshTokens database set.
    /// </summary>
    public DbSet<RefreshToken> RefreshTokens { get; set; } = null!;

    /// <summary>
    /// Gets or sets the Symbols database set.
    /// </summary>
    public DbSet<Symbol> Symbols { get; set; } = null!;

    /// <summary>
    /// Gets or sets the AppSettings database set (global feature flags).
    /// </summary>
    public DbSet<AppSetting> AppSettings { get; set; } = null!;

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
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

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
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

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

        modelBuilder.Entity<Document>()
            .HasMany(d => d.Captions)
            .WithOne(c => c.Document)
            .HasForeignKey(c => c.DocumentId)
            .IsRequired()
            .OnDelete(DeleteBehavior.Cascade);

        // Configure Page entity
        modelBuilder.Entity<Page>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id)
                .ValueGeneratedOnAdd();

            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

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

            entity.HasMany(e => e.Annotations)
                .WithOne(a => a.Page)
                .HasForeignKey(a => a.PageId)
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
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

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

        // Configure Caption entity
        modelBuilder.Entity<Caption>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).ValueGeneratedOnAdd();
            entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasIndex(e => new { e.DocumentId, e.Name }).IsUnique();
            entity.HasIndex(e => new { e.DocumentId, e.CreatedAt });
        });

        // Configure Annotation entity
        modelBuilder.Entity<Annotation>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).ValueGeneratedOnAdd();

            entity.Property(e => e.Type)
                .HasConversion<string>()
                .HasMaxLength(50);

            entity.Property(e => e.Content).HasMaxLength(2000);
            entity.Property(e => e.Transcription).HasMaxLength(2000);

            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(e => e.Page)
                .WithMany(p => p.Annotations)
                .HasForeignKey(e => e.PageId)
                .IsRequired()
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Caption)
                .WithMany(c => c.Annotations)
                .HasForeignKey(e => e.CaptionId)
                .IsRequired()
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Parent)
                .WithMany(p => p.Children)
                .HasForeignKey(e => e.ParentId)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.TranscriptionRef)
                .WithMany(t => t.ReferencedBy)
                .HasForeignKey(e => e.TranscriptionRefId)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.Symbol)
                .WithMany(s => s.Annotations)
                .HasForeignKey(e => e.SymbolId)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.SetNull);

            entity.ToTable(t => t.HasCheckConstraint(
                "CK_Annotation_TypeFields",
                "(\"Type\" = 'Text'   AND \"Transcription\" IS NULL AND \"TranscriptionRefId\" IS NULL AND \"SymbolId\" IS NULL) OR " +
                "(\"Type\" = 'Cipher' AND \"TranscriptionRefId\" IS NULL AND \"SymbolId\" IS NULL) OR " +
                "(\"Type\" = 'Symbol' AND \"Transcription\" IS NULL)"));

            entity.HasIndex(e => new { e.PageId, e.CaptionId, e.CreatedAt });
        });

        // Configure BoundingBox entity
        modelBuilder.Entity<BoundingBox>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).ValueGeneratedOnAdd();

            entity.HasOne(e => e.Annotation)
                .WithOne(a => a.BoundingBox)
                .HasForeignKey<BoundingBox>(e => e.AnnotationId)
                .OnDelete(DeleteBehavior.Cascade);
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
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

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
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasIndex(e => e.Sha256);
        });

        // Configure RefreshToken entity
        modelBuilder.Entity<RefreshToken>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).ValueGeneratedOnAdd();

            entity.Property(e => e.TokenHash)
                .IsRequired()
                .HasMaxLength(128);

            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .IsRequired()
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => e.TokenHash).IsUnique();
            entity.HasIndex(e => e.UserId);
        });

        // Configure Symbol entity
        modelBuilder.Entity<Symbol>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).ValueGeneratedOnAdd();

            entity.Property(e => e.Content).HasMaxLength(2000);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(e => e.Owner)
                .WithMany()
                .HasForeignKey(e => e.OwnerUserId)
                .IsRequired()
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.ImageBlob)
                .WithMany()
                .HasForeignKey(e => e.ImageBlobId)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(e => e.OwnerUserId);
            entity.HasIndex(e => e.Content);
        });

        // Configure AppSetting entity
        modelBuilder.Entity<AppSetting>(entity =>
        {
            entity.HasKey(e => e.Key);
            entity.Property(e => e.Key).HasMaxLength(128);
            entity.Property(e => e.Value).IsRequired().HasMaxLength(2000);
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
        });
    }
}
