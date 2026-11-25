namespace Hospital.Application.DTOs.Billing;

public record BillItemDto(
    int Id,
    string ServiceCode,
    string Description,
    string Category,
    int Quantity,
    decimal UnitPrice,
    decimal TotalPrice);

public record PaymentDto(
    int Id,
    string ReceiptNumber,
    int BillId,
    string BillNumber,
    int PatientId,
    string PatientName,
    string PatientCode,
    decimal Amount,
    string Method,
    string Status,
    string? TransactionReference,
    DateTime PaidAt,
    string? Notes);

public record BillDto(
    int Id,
    string BillNumber,
    int VisitId,
    string VisitNumber,
    string VisitStatus,
    int PatientId,
    string PatientCode,
    string PatientName,
    string PatientPhone,
    string DoctorName,
    string DepartmentName,
    decimal SubTotal,
    decimal DiscountAmount,
    decimal TaxAmount,
    decimal TotalAmount,
    decimal PaidAmount,
    decimal BalanceAmount,
    string Status,
    string? Notes,
    DateTime IssuedAt,
    IReadOnlyList<BillItemDto> Items,
    IReadOnlyList<PaymentDto> Payments);

public record CreateBillItemRequest(
    string ServiceCode,
    string Description,
    string Category,
    int Quantity,
    decimal UnitPrice);

public record GenerateBillRequest(
    int VisitId,
    decimal DiscountAmount,
    string? Notes,
    IReadOnlyList<CreateBillItemRequest>? AdditionalItems);

public record RecordPaymentRequest(
    int BillId,
    decimal Amount,
    string Method,
    string? TransactionReference,
    string? Notes);
