namespace AssetBridge.Application.Common.Models;

// Standardizes the API response envelope for all endpoints across the system.
// React, Flutter, and external AI clients receive a predictable structure:
// success flag, user-friendly message, payload data, timestamp, and optional errors.
public class ApiResponse<T>
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public T? Data { get; set; }
    public IDictionary<string, string[]>? Errors { get; set; }
    public DateTime TimestampUtc { get; set; } = DateTime.UtcNow;

    public static ApiResponse<T> SuccessResult(T data, string message = "Operation completed successfully.")
    {
        return new ApiResponse<T>
        {
            Success = true,
            Message = message,
            Data = data,
            TimestampUtc = DateTime.UtcNow
        };
    }

    public static ApiResponse<T> FailureResult(string message, IDictionary<string, string[]>? errors = null)
    {
        return new ApiResponse<T>
        {
            Success = false,
            Message = message,
            Data = default,
            Errors = errors,
            TimestampUtc = DateTime.UtcNow
        };
    }
}
