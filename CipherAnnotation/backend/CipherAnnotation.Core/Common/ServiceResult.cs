namespace CipherAnnotation.Core.Common;

public enum ServiceErrorKind
{
    None,
    NotFound,
    Forbidden,
    BadRequest,
    Unauthorized,
}

public class ServiceResult
{
    public bool IsSuccess => ErrorKind == ServiceErrorKind.None;
    public ServiceErrorKind ErrorKind { get; protected init; } = ServiceErrorKind.None;
    public string? ErrorMessage { get; protected init; }

    protected ServiceResult() { }

    public static ServiceResult Success() => new();
    public static ServiceResult NotFound(string message = "Not found.") =>
        new() { ErrorKind = ServiceErrorKind.NotFound, ErrorMessage = message };
    public static ServiceResult Forbidden() =>
        new() { ErrorKind = ServiceErrorKind.Forbidden };
    public static ServiceResult BadRequest(string message) =>
        new() { ErrorKind = ServiceErrorKind.BadRequest, ErrorMessage = message };
    public static ServiceResult Unauthorized() =>
        new() { ErrorKind = ServiceErrorKind.Unauthorized };
}

public sealed class ServiceResult<T> : ServiceResult
{
    public T? Value { get; private init; }

    private ServiceResult() { }

    public static ServiceResult<T> Success(T value) =>
        new() { Value = value };
    public static new ServiceResult<T> NotFound(string message = "Not found.") =>
        new() { ErrorKind = ServiceErrorKind.NotFound, ErrorMessage = message };
    public static new ServiceResult<T> Forbidden() =>
        new() { ErrorKind = ServiceErrorKind.Forbidden };
    public static new ServiceResult<T> BadRequest(string message) =>
        new() { ErrorKind = ServiceErrorKind.BadRequest, ErrorMessage = message };
    public static new ServiceResult<T> Unauthorized() =>
        new() { ErrorKind = ServiceErrorKind.Unauthorized };
}
