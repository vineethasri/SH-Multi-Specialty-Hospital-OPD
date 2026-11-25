using System.Text.Json;
using Hospital.Application.Interfaces;
using Hospital.Domain.Entities;
using Hospital.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Hospital.Infrastructure.Services;

public class AuditService(
    IApplicationDbContext db,
    ICurrentUserService currentUser,
    ILogger<AuditService> logger) : IAuditService
{
    public async Task LogAsync(
        string action,
        string entityName,
        string? entityId,
        string? details = null,
        object? oldValues = null,
        object? newValues = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var entry = new AuditLog
            {
                UserId = currentUser.UserId,
                UserEmail = currentUser.Email,
                UserRole = currentUser.Role,
                Action = action,
                EntityName = entityName,
                EntityId = entityId,
                Details = details,
                OldValuesJson = oldValues is null ? null : JsonSerializer.Serialize(oldValues),
                NewValuesJson = newValues is null ? null : JsonSerializer.Serialize(newValues),
                IpAddress = currentUser.IpAddress,
                UserAgent = currentUser.UserAgent,
                Timestamp = DateTime.UtcNow
            };
            db.AuditLogs.Add(entry);
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to persist audit log for {Action} on {EntityName}", action, entityName);
        }
    }
}

public class NotificationService(IApplicationDbContext db) : INotificationService
{
    public async Task SendAsync(
        int userId,
        string title,
        string message,
        NotificationType type,
        string? relatedEntityType = null,
        int? relatedEntityId = null,
        CancellationToken cancellationToken = default)
    {
        db.Notifications.Add(new Notification
        {
            UserId = userId,
            Title = title,
            Message = message,
            Type = type,
            RelatedEntityType = relatedEntityType,
            RelatedEntityId = relatedEntityId,
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync(cancellationToken);
    }
}

public class CodeGeneratorService(IApplicationDbContext db) : ICodeGeneratorService
{
    public async Task<string> GeneratePatientCodeAsync(CancellationToken cancellationToken = default)
    {
        var year = DateTime.UtcNow.Year;
        var prefix = $"SHP-{year}-";
        var count = await db.Patients.CountAsync(p => p.PatientCode.StartsWith(prefix), cancellationToken);
        string code;
        do
        {
            count++;
            code = $"{prefix}{count:D4}";
        } while (await db.Patients.AnyAsync(p => p.PatientCode == code, cancellationToken));
        return code;
    }

    public async Task<string> GenerateDoctorCodeAsync(CancellationToken cancellationToken = default)
    {
        var count = await db.Doctors.CountAsync(cancellationToken);
        string code;
        do
        {
            count++;
            code = $"DOC-{count:D3}";
        } while (await db.Doctors.AnyAsync(d => d.DoctorCode == code, cancellationToken));
        return code;
    }

    public async Task<string> GenerateAppointmentNumberAsync(DateOnly date, CancellationToken cancellationToken = default)
    {
        var prefix = $"APT-{date:yyyyMMdd}-";
        var count = await db.Appointments.CountAsync(a => a.AppointmentNumber.StartsWith(prefix), cancellationToken);
        string num;
        do
        {
            count++;
            num = $"{prefix}{count:D4}";
        } while (await db.Appointments.AnyAsync(a => a.AppointmentNumber == num, cancellationToken));
        return num;
    }

    public async Task<string> GenerateVisitNumberAsync(DateOnly date, CancellationToken cancellationToken = default)
    {
        var prefix = $"VST-{date:yyyyMMdd}-";
        var count = await db.Visits.CountAsync(v => v.VisitNumber.StartsWith(prefix), cancellationToken);
        string num;
        do
        {
            count++;
            num = $"{prefix}{count:D4}";
        } while (await db.Visits.AnyAsync(v => v.VisitNumber == num, cancellationToken));
        return num;
    }

    public async Task<(int TokenNumber, string TokenDisplay)> GenerateDailyDoctorTokenAsync(int doctorId, DateOnly date, CancellationToken cancellationToken = default)
    {
        var maxToken = await db.Visits
            .Where(v => v.DoctorId == doctorId && v.VisitDate == date)
            .MaxAsync(v => (int?)v.TokenNumber, cancellationToken) ?? 0;

        var nextToken = maxToken + 1;
        var doctorCode = await db.Doctors
            .Where(d => d.Id == doctorId)
            .Select(d => d.DoctorCode)
            .FirstOrDefaultAsync(cancellationToken) ?? $"D{doctorId:D2}";

        var shortCode = doctorCode.Replace("DOC-", "D");
        return (nextToken, $"{shortCode}-{nextToken:D3}");
    }

    public async Task<string> GeneratePrescriptionNumberAsync(DateOnly date, CancellationToken cancellationToken = default)
    {
        var prefix = $"RX-{date:yyyyMMdd}-";
        var count = await db.Prescriptions.CountAsync(p => p.PrescriptionNumber.StartsWith(prefix), cancellationToken);
        string num;
        do
        {
            count++;
            num = $"{prefix}{count:D4}";
        } while (await db.Prescriptions.AnyAsync(p => p.PrescriptionNumber == num, cancellationToken));
        return num;
    }

    public async Task<string> GenerateBillNumberAsync(DateOnly date, CancellationToken cancellationToken = default)
    {
        var prefix = $"BILL-{date:yyyyMMdd}-";
        var count = await db.Bills.CountAsync(b => b.BillNumber.StartsWith(prefix), cancellationToken);
        string num;
        do
        {
            count++;
            num = $"{prefix}{count:D4}";
        } while (await db.Bills.AnyAsync(b => b.BillNumber == num, cancellationToken));
        return num;
    }

    public async Task<string> GenerateReceiptNumberAsync(DateOnly date, CancellationToken cancellationToken = default)
    {
        var prefix = $"RCP-{date:yyyyMMdd}-";
        var count = await db.Payments.CountAsync(p => p.ReceiptNumber.StartsWith(prefix), cancellationToken);
        string num;
        do
        {
            count++;
            num = $"{prefix}{count:D4}";
        } while (await db.Payments.AnyAsync(p => p.ReceiptNumber == num, cancellationToken));
        return num;
    }
}

public class RazorpayPaymentGateway(IConfiguration configuration) : IPaymentGateway
{
    public string ProviderName => "Razorpay";

    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(configuration["PaymentGateway:KeyId"]) &&
        !string.IsNullOrWhiteSpace(configuration["PaymentGateway:KeySecret"]);

    public Task<PaymentGatewayOrderResult> CreateOrderAsync(PaymentGatewayOrderRequest request, CancellationToken cancellationToken = default)
    {
        if (!IsConfigured)
        {
            return Task.FromResult(new PaymentGatewayOrderResult(
                false,
                null,
                "Razorpay credentials are not configured. Use Cash, UPI, or Card payment at reception."));
        }

        return Task.FromResult(new PaymentGatewayOrderResult(
            false,
            null,
            "Razorpay live SDK integration hook ready; configure live keys and webhook handler before enabling online capture."));
    }

    public Task<PaymentGatewayVerificationResult> VerifyPaymentAsync(PaymentGatewayVerificationRequest request, CancellationToken cancellationToken = default)
    {
        return Task.FromResult(new PaymentGatewayVerificationResult(
            false,
            "Razorpay signature verification requires configured KeySecret."));
    }
}
