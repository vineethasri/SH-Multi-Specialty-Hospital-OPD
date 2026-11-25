using Hospital.Domain.Enums;

namespace Hospital.Domain.Entities;

public class Notification
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public NotificationType Type { get; set; } = NotificationType.System;
    public string? RelatedEntityType { get; set; }
    public int? RelatedEntityId { get; set; }
    public bool IsRead { get; set; }
    public DateTime? ReadAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;
}

public class RefreshToken
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string TokenHash { get; set; } = string.Empty;
    public string JwtId { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string? CreatedByIp { get; set; }
    public DateTime? RevokedAt { get; set; }
    public string? RevokedByIp { get; set; }
    public string? ReplacedByTokenHash { get; set; }
    public string? ReasonRevoked { get; set; }

    public bool IsExpired => DateTime.UtcNow >= ExpiresAt;
    public bool IsRevoked => RevokedAt != null;
    public bool IsActive => !IsRevoked && !IsExpired;

    public User User { get; set; } = null!;
}

public class AuditLog
{
    public long Id { get; set; }
    public int? UserId { get; set; }
    public string? UserEmail { get; set; }
    public string? UserRole { get; set; }
    public string Action { get; set; } = string.Empty;
    public string EntityName { get; set; } = string.Empty;
    public string? EntityId { get; set; }
    public string? Details { get; set; }
    public string? OldValuesJson { get; set; }
    public string? NewValuesJson { get; set; }
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}

public class HospitalSetting
{
    public int Id { get; set; }
    public string HospitalName { get; set; } = "SH Multi-Specialty Hospital";
    public string Tagline { get; set; } = "Compassionate Outpatient Care, Precision Medicine";
    public string Phone { get; set; } = "+91 80 4123 9000";
    public string EmergencyPhone { get; set; } = "+91 80 4123 9111";
    public string Email { get; set; } = "care@shhospital.in";
    public string AddressLine { get; set; } = "SH Hospital Campus, Healthcare Avenue";
    public string City { get; set; } = "Bengaluru";
    public string State { get; set; } = "Karnataka";
    public string PostalCode { get; set; } = "560001";
    public string MapUrl { get; set; } = "https://share.google/RwUtNoO8Bq6Seh1Gy";
    public decimal RegistrationFee { get; set; } = 100.00m;
    public decimal TaxPercentage { get; set; } = 0.00m;
    public string CurrencyCode { get; set; } = "INR";
    public TimeSpan OpdStartTime { get; set; } = new(9, 0, 0);
    public TimeSpan OpdEndTime { get; set; } = new(18, 0, 0);
    public int DefaultSlotMinutes { get; set; } = 15;
    public bool AllowOnlineBooking { get; set; } = true;
    public bool RequireFullPaymentBeforeCheckout { get; set; } = true;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
