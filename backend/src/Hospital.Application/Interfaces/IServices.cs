using Hospital.Domain.Entities;
using Hospital.Domain.Enums;

namespace Hospital.Application.Interfaces;

public interface ICurrentUserService
{
    int? UserId { get; }
    string? Email { get; }
    string? Role { get; }
    string? IpAddress { get; }
    string? UserAgent { get; }
    bool IsAuthenticated { get; }
    bool IsInRole(params string[] roles);
}

public interface IPasswordHasher
{
    string Hash(string password);
    bool Verify(string password, string passwordHash);
}

public interface ITokenService
{
    (string Token, string JwtId, DateTime ExpiresAt) GenerateAccessToken(User user);
    (string RawToken, string TokenHash, DateTime ExpiresAt) GenerateRefreshToken();
    string HashToken(string rawToken);
}

public interface IAuditService
{
    Task LogAsync(
        string action,
        string entityName,
        string? entityId,
        string? details = null,
        object? oldValues = null,
        object? newValues = null,
        CancellationToken cancellationToken = default);
}

public interface INotificationService
{
    Task SendAsync(
        int userId,
        string title,
        string message,
        NotificationType type,
        string? relatedEntityType = null,
        int? relatedEntityId = null,
        CancellationToken cancellationToken = default);
}

public interface ICodeGeneratorService
{
    Task<string> GeneratePatientCodeAsync(CancellationToken cancellationToken = default);
    Task<string> GenerateDoctorCodeAsync(CancellationToken cancellationToken = default);
    Task<string> GenerateAppointmentNumberAsync(DateOnly date, CancellationToken cancellationToken = default);
    Task<string> GenerateVisitNumberAsync(DateOnly date, CancellationToken cancellationToken = default);
    Task<(int TokenNumber, string TokenDisplay)> GenerateDailyDoctorTokenAsync(int doctorId, DateOnly date, CancellationToken cancellationToken = default);
    Task<string> GeneratePrescriptionNumberAsync(DateOnly date, CancellationToken cancellationToken = default);
    Task<string> GenerateBillNumberAsync(DateOnly date, CancellationToken cancellationToken = default);
    Task<string> GenerateReceiptNumberAsync(DateOnly date, CancellationToken cancellationToken = default);
}

/// <summary>
/// Payment gateway abstraction for future Razorpay integration.
/// Never simulates fake successful online transactions.
/// </summary>
public interface IPaymentGateway
{
    string ProviderName { get; }
    bool IsConfigured { get; }
    Task<PaymentGatewayOrderResult> CreateOrderAsync(PaymentGatewayOrderRequest request, CancellationToken cancellationToken = default);
    Task<PaymentGatewayVerificationResult> VerifyPaymentAsync(PaymentGatewayVerificationRequest request, CancellationToken cancellationToken = default);
}

public record PaymentGatewayOrderRequest(decimal Amount, string Currency, string ReceiptNumber, string CustomerName, string? CustomerEmail, string? CustomerPhone);
public record PaymentGatewayOrderResult(bool Supported, string? OrderId, string? Message);
public record PaymentGatewayVerificationRequest(string OrderId, string PaymentId, string Signature);
public record PaymentGatewayVerificationResult(bool Verified, string? Message);
