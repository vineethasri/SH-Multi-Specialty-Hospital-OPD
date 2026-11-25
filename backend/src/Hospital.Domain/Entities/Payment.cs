using Hospital.Domain.Common;
using Hospital.Domain.Enums;

namespace Hospital.Domain.Entities;

public class Payment : BaseEntity
{
    public string ReceiptNumber { get; set; } = string.Empty;
    public int BillId { get; set; }
    public int PatientId { get; set; }
    public decimal Amount { get; set; }
    public PaymentMethod Method { get; set; }
    public PaymentStatus Status { get; set; } = PaymentStatus.Completed;
    public string? TransactionReference { get; set; }
    public string? GatewayOrderId { get; set; }
    public string? GatewayPaymentId { get; set; }
    public int? RecordedByUserId { get; set; }
    public DateTime PaidAt { get; set; } = DateTime.UtcNow;
    public string? Notes { get; set; }

    public Bill Bill { get; set; } = null!;
    public Patient Patient { get; set; } = null!;
}
