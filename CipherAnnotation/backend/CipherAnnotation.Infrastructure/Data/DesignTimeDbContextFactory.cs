using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;

namespace CipherAnnotation.Infrastructure.Data;

/// <summary>
/// Design-time factory for creating AppDbContext instances during migrations.
/// Reads connection string from appsettings.json.
/// </summary>
public class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    /// <summary>
    /// Creates a new instance of AppDbContext for migrations.
    /// </summary>
    /// <param name="args">Command-line arguments.</param>
    /// <returns>A configured AppDbContext instance.</returns>
    public AppDbContext CreateDbContext(string[] args)
    {
        // Build configuration from appsettings.json (optional) + env vars,
        // so migrations can be generated in CI or locally without a secrets file.
        var configuration = new ConfigurationBuilder()
            .SetBasePath(Directory.GetCurrentDirectory())
            .AddJsonFile("appsettings.json", optional: true)
            .Build();

        var connectionString = configuration.GetConnectionString("DefaultConnection");
        if (string.IsNullOrEmpty(connectionString))
        {
            // Design-time only — never used at runtime — but EF needs a parseable
            // connection string to build the migration model.
            connectionString = "Host=localhost;Database=cipher_design;Username=postgres;Password=postgres";
        }

        // Configure DbContext options
        var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
        optionsBuilder.UseNpgsql(connectionString);

        return new AppDbContext(optionsBuilder.Options);
    }
}
