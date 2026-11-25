using System.Text.Json;
using FluentValidation;
using Hospital.Application.Common;
using Microsoft.EntityFrameworkCore;

namespace Hospital.API.Middleware;

public class GlobalExceptionMiddleware(
    RequestDelegate next,
    ILogger<GlobalExceptionMiddleware> logger)
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        var traceId = context.TraceIdentifier;

        ApiErrorResponse response = exception switch
        {
            ValidationAppException valEx => new ApiErrorResponse
            {
                StatusCode = valEx.StatusCode,
                Message = valEx.Message,
                Errors = valEx.Errors,
                TraceId = traceId
            },
            ValidationException fluentEx => new ApiErrorResponse
            {
                StatusCode = 422,
                Message = "One or more validation errors occurred.",
                Errors = fluentEx.Errors
                    .GroupBy(e => e.PropertyName)
                    .ToDictionary(g => g.Key, g => g.Select(e => e.ErrorMessage).ToArray()),
                TraceId = traceId
            },
            AppException appEx => new ApiErrorResponse
            {
                StatusCode = appEx.StatusCode,
                Message = appEx.Message,
                TraceId = traceId
            },
            DbUpdateConcurrencyException => new ApiErrorResponse
            {
                StatusCode = 409,
                Message = "The record was modified concurrently. Please refresh and try again.",
                TraceId = traceId
            },
            DbUpdateException dbEx => new ApiErrorResponse
            {
                StatusCode = 409,
                Message = dbEx.InnerException?.Message.Contains("Duplicate", StringComparison.OrdinalIgnoreCase) == true
                    ? "A conflicting duplicate record already exists."
                    : "Database constraint violation occurred.",
                TraceId = traceId
            },
            _ => new ApiErrorResponse
            {
                StatusCode = 500,
                Message = "An unexpected server error occurred.",
                TraceId = traceId
            }
        };

        if (response.StatusCode >= 500)
        {
            logger.LogError(exception, "Unhandled exception (TraceId: {TraceId})", traceId);
        }
        else
        {
            logger.LogWarning("Handled application error {StatusCode}: {Message} (TraceId: {TraceId})", response.StatusCode, response.Message, traceId);
        }

        context.Response.ContentType = "application/json";
        context.Response.StatusCode = response.StatusCode;
        await context.Response.WriteAsync(JsonSerializer.Serialize(response, JsonOptions));
    }
}
