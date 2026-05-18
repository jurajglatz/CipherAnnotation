using CipherAnnotation.API.Validation;
using CipherAnnotation.Core.Interfaces;
using CipherAnnotation.Infrastructure.Data;
using CipherAnnotation.Infrastructure.Repositories;
using CipherAnnotation.Infrastructure.Services.Auth;
using CipherAnnotation.Infrastructure.Services.Annotations;
using CipherAnnotation.Infrastructure.Services.AutoAnnotation;
using CipherAnnotation.Infrastructure.Services.Documents;
using CipherAnnotation.Infrastructure.Services.Export;
using CipherAnnotation.Infrastructure.Services.ImageProcessing;
using CipherAnnotation.Infrastructure.Services.Pages;
using CipherAnnotation.Infrastructure.Services.Storage;
using CipherAnnotation.Infrastructure.Services.Symbols;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Text;
using System.Threading.RateLimiting;

// Build the host
var builder = WebApplication.CreateBuilder(args);

// Get configuration
var configuration = builder.Configuration;

// ============================================================================
// Add services to the container
// ============================================================================

// Add Entity Framework Core with PostgreSQL
var connectionString = configuration.GetConnectionString("DefaultConnection");
if (string.IsNullOrWhiteSpace(connectionString))
    throw new InvalidOperationException(
        "Connection string 'DefaultConnection' is not configured. " +
        "Set it via user-secrets (dev) or the ConnectionStrings__DefaultConnection environment variable (prod).");

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));

// Add AutoMapper
builder.Services.AddAutoMapper(AppDomain.CurrentDomain.GetAssemblies());

// Register repositories
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IDocumentRepository, DocumentRepository>();

// Register services
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IImageProcessingService, ImageProcessingService>();
builder.Services.AddScoped<IExportService, ExportService>();
builder.Services.AddScoped<IFileStorageService, FileStorageService>();
builder.Services.AddScoped<IAutoAnnotationService, AutoAnnotationService>();
builder.Services.AddScoped<IDocumentService, DocumentService>();
builder.Services.AddScoped<IPageService, PageService>();
builder.Services.AddScoped<IAnnotationService, AnnotationService>();
builder.Services.AddScoped<ISymbolService, SymbolService>();
builder.Services.AddScoped<IExportOrchestrationService, ExportOrchestrationService>();

// Upload validation (file size, MIME, max pages)
builder.Services.Configure<UploadValidationOptions>(
    configuration.GetSection(UploadValidationOptions.SectionName));
builder.Services.AddSingleton<UploadValidator>();

// Allow larger multipart uploads (images can be several MB each, and documents may contain 100+ pages)
builder.Services.Configure<Microsoft.AspNetCore.Http.Features.FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = 1024L * 1024 * 1024; // 1 GB
    options.ValueLengthLimit = int.MaxValue;
    options.MultipartHeadersLengthLimit = int.MaxValue;
    options.ValueCountLimit = 10_000;
});

builder.WebHost.ConfigureKestrel(options =>
{
    options.Limits.MaxRequestBodySize = 1024L * 1024 * 1024; // 1 GB
});

// ============================================================================
// Configure JWT Authentication
// ============================================================================

var jwtSettings = configuration.GetSection("Jwt");
var key = jwtSettings["Key"];
if (string.IsNullOrWhiteSpace(key))
    throw new InvalidOperationException(
        "JWT 'Key' is not configured. Set it via user-secrets (dev) or the Jwt__Key environment variable (prod). " +
        "Must be at least 32 characters.");
var issuer = jwtSettings["Issuer"]
    ?? throw new InvalidOperationException("JWT 'Issuer' is not configured.");
var audience = jwtSettings["Audience"]
    ?? throw new InvalidOperationException("JWT 'Audience' is not configured.");

var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key));

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = signingKey,
            ValidateIssuer = true,
            ValidIssuer = issuer,
            ValidateAudience = true,
            ValidAudience = audience,
            ValidateLifetime = true,
            // Small skew tolerates minor client clock drift — without it any
            // sub-second drift past expiry causes a 401 even on a freshly
            // issued token.
            ClockSkew = TimeSpan.FromSeconds(30),
        };
    });

// ============================================================================
// Configure CORS
// ============================================================================

var allowedOrigins = configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? Array.Empty<string>();
if (allowedOrigins.Length == 0)
    throw new InvalidOperationException(
        "No CORS origins configured. Set 'Cors:AllowedOrigins' in appsettings.json or via the Cors__AllowedOrigins__0 environment variable.");

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        // AllowCredentials is required so the browser sends the httpOnly
        // refresh-token cookie on cross-origin /auth/refresh and /auth/logout.
        policy
            .WithOrigins(allowedOrigins)
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials();
    });
});

// ============================================================================
// Forwarded headers (HTTPS terminates at the reverse proxy; without this the
// API sees the proxy's intra-docker IP for every request, which breaks the
// per-IP rate limiter and any audit logging of client IPs).
// ============================================================================

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});

// ============================================================================
// Configure Rate Limiting (defense against credential-stuffing / brute-force on auth)
// ============================================================================

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    static string IpKey(HttpContext ctx) =>
        ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown";

    // 5 requests / minute / IP for register and password login (brute-force defense).
    options.AddPolicy("auth", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: IpKey(httpContext),
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 5,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
            }));

    // Refresh is legitimately frequent (every ~15 min per active tab, plus retries),
    // so we allow more — but still bounded so a stolen token can't be hammered.
    options.AddPolicy("auth-refresh", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: IpKey(httpContext),
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 30,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
            }));

    // Google validates the ID token itself, but we still want to bound abuse.
    options.AddPolicy("auth-google", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: IpKey(httpContext),
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
            }));
});

// Used by AuthController to throttle login attempts per-email, complementing
// the per-IP policy above (a botnet can spread credential-stuffing across IPs).
builder.Services.AddMemoryCache();

// ============================================================================
// Add Controllers and API Explorer
// ============================================================================

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

// ============================================================================
// Configure Swagger with JWT Bearer authentication
// ============================================================================

builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "CipherAnnotation API",
        Version = "v1",
        Description = "API for cipher document annotation and analysis"
    });

    // Add JWT Bearer authentication to Swagger
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        Description = "Enter 'Bearer' followed by a space and then your token. Example: Bearer eyJhbGciOiJIUzI1NiIs..."
    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});

// ============================================================================
// Build the application
// ============================================================================

var app = builder.Build();

// Apply EF Core migrations on startup when ApplyMigrationsOnStartup=true (used by Docker).
if (configuration.GetValue("ApplyMigrationsOnStartup", false))
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
}

// ============================================================================
// Configure the HTTP request pipeline
// ============================================================================

// Forwarded headers must run before anything that reads RemoteIpAddress or
// Request.Scheme (rate limiter, HTTPS redirect, auth).
app.UseForwardedHeaders();

// Swagger UI
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "CipherAnnotation API v1");
        options.RoutePrefix = string.Empty;
    });
}

// HTTPS redirection (dev only — in production HTTPS is terminated at the reverse proxy)
if (app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

// ============================================================================
// Apply middleware in order
// ============================================================================

// ============================================================================
// Error Handling Middleware (must run before downstream middleware to catch their exceptions)
// ============================================================================

app.UseExceptionHandler(errorApp =>
{
    errorApp.Run(async context =>
    {
        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
        context.Response.ContentType = "application/json";

        var exceptionHandlerPathFeature = context.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerPathFeature>();
        var exception = exceptionHandlerPathFeature?.Error;

        // Correlation id users can quote when reporting the error — matches
        // the id written into the server logs by the ASP.NET request tracing.
        var traceId = System.Diagnostics.Activity.Current?.TraceId.ToString()
                      ?? context.TraceIdentifier;

        var response = new
        {
            error = "An unexpected error occurred",
            traceId,
            message = app.Environment.IsDevelopment() ? exception?.Message : null,
            details = app.Environment.IsDevelopment() ? exception?.StackTrace : null
        };

        await context.Response.WriteAsJsonAsync(response);
    });
});

// CORS
app.UseCors("AllowFrontend");

// Rate limiting (must run before endpoints so per-policy limits apply)
app.UseRateLimiter();

// Authentication and Authorization
app.UseAuthentication();
app.UseAuthorization();

// Map controllers
app.MapControllers();

// ============================================================================
// Health check endpoint
// ============================================================================

app.MapGet("/health", () => Results.Ok(new { status = "healthy" }))
    .WithName("Health")
    .AllowAnonymous();

// ============================================================================
// Run the application
// ============================================================================

try
{
    app.Run();
}
catch (Exception ex)
{
    Console.WriteLine($"Application terminated unexpectedly: {ex.Message}");
    throw;
}
