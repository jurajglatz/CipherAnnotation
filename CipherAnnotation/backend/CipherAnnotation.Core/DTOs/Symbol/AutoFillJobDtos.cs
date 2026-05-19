namespace CipherAnnotation.Core.DTOs.Symbol;

public enum AutoFillJobStatus
{
    Pending,
    Running,
    Completed,
    Failed,
}

public enum AutoFillPageStatus
{
    Pending,
    Running,
    Completed,
    Failed,
}

public class AutoFillPageProgressDto
{
    public required Guid PageId { get; set; }
    public required int PageNumber { get; set; }
    public required Guid DocumentId { get; set; }
    public required string DocumentTitle { get; set; }
    public required int Total { get; set; }
    public required int Filled { get; set; }
    public required AutoFillPageStatus Status { get; set; }
    public string? Error { get; set; }
}

public class AutoFillJobDto
{
    public required Guid JobId { get; set; }
    public required AutoFillScope Scope { get; set; }
    public required Guid ScopeId { get; set; }
    public required AutoFillJobStatus Status { get; set; }
    public required DateTime StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public required IReadOnlyList<AutoFillPageProgressDto> Pages { get; set; }
}

public record StartAutoFillJobResponse(Guid JobId);
