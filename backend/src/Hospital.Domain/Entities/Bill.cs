using Hospital.Domain.Common;
using Hospital.Domain.Enums;

namespace Hospital.Domain.Entities;

public class Bill : BaseEntity
{
    public string BillNumber { get; set; } = string.Empty;
    public int VisitId { get; set; }
    public int PatientId { get; set; }
    public int? GeneratedByUserId { get; set; }
    public decimal SubTotal { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal PaidAmount { get; set; }
    public decimal BalanceAmount { get; set; }
    public BillStatus Status { get; set; } = BillStatus.Pending;
    public string? Notes { get; set; }
    public DateTime IssuedAt { get; set; } = DateTime.UtcNow;

    public Visit Visit { get; set; } = null!;
    public Patient Patient { get; set; } = null!;
    public ICollection<BillItem> Items { get; set; } = new List<BillItem>();
    public ICollection<Payment> Payments { get; set; } = new List<Payment>();
}

public class BillItem
{
    public int Id { get; set; }
    public int BillId { get; set; }
    public string ServiceCode { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public BillItemCategory Category { get; set; } = BillItemCategory.Consultation;
    public int Quantity { get; set; } = 1;
    public decimal UnitPrice { get; set; }
    public decimal TotalPrice { get; set; }

    public Bill Bill { get; set; } = null!;
}
