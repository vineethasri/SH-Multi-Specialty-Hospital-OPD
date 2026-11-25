using System.Data;
using Hospital.Application.Common;
using Hospital.Application.DTOs.Billing;
using Hospital.Application.Interfaces;
using Hospital.Domain.Entities;
using Hospital.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Hospital.Application.Services;

public class BillingService(
    IApplicationDbContext db,
    ICurrentUserService currentUser,
    ICodeGeneratorService codeGenerator,
    IPaymentGateway paymentGateway,
    INotificationService notificationService,
    IAuditService auditService) : IBillingService
{
    public async Task<PagedResponse<BillDto>> GetBillsAsync(
        PagedRequest request,
        int? patientId,
        string? status,
        DateOnly? fromDate,
        DateOnly? toDate,
        CancellationToken cancellationToken = default)
    {
        var query = BaseBillQuery();

        if (currentUser.IsInRole(nameof(RoleType.Patient)))
        {
            var myPatientId = await db.Patients.Where(p => p.UserId == currentUser.UserId).Select(p => p.Id).FirstOrDefaultAsync(cancellationToken);
            query = query.Where(b => b.PatientId == myPatientId);
        }

        if (patientId.HasValue && !currentUser.IsInRole(nameof(RoleType.Patient)))
        {
            query = query.Where(b => b.PatientId == patientId.Value);
        }

        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<BillStatus>(status, true, out var parsedStatus))
        {
            query = query.Where(b => b.Status == parsedStatus);
        }

        if (fromDate.HasValue)
        {
            var fromDt = fromDate.Value.ToDateTime(TimeOnly.MinValue);
            query = query.Where(b => b.IssuedAt >= fromDt);
        }

        if (toDate.HasValue)
        {
            var toDt = toDate.Value.ToDateTime(TimeOnly.MaxValue);
            query = query.Where(b => b.IssuedAt <= toDt);
        }

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var s = request.Search.Trim().ToLower();
            query = query.Where(b =>
                b.BillNumber.ToLower().Contains(s) ||
                b.Visit.VisitNumber.ToLower().Contains(s) ||
                b.Patient.FullName.ToLower().Contains(s) ||
                b.Patient.PatientCode.ToLower().Contains(s));
        }

        var total = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderByDescending(b => b.IssuedAt)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        return new PagedResponse<BillDto>
        {
            Items = items.Select(MapBill).ToList(),
            Page = request.Page,
            PageSize = request.PageSize,
            TotalCount = total
        };
    }

    public async Task<BillDto> GetBillByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var bill = await BaseBillQuery().FirstOrDefaultAsync(b => b.Id == id, cancellationToken)
            ?? throw new NotFoundException($"Bill {id} not found.");

        await EnsurePatientAccessAsync(bill.PatientId, cancellationToken);
        return MapBill(bill);
    }

    public async Task<BillDto> GetBillByVisitIdAsync(int visitId, CancellationToken cancellationToken = default)
    {
        var bill = await BaseBillQuery().FirstOrDefaultAsync(b => b.VisitId == visitId, cancellationToken)
            ?? throw new NotFoundException($"Bill for visit {visitId} not found.");

        await EnsurePatientAccessAsync(bill.PatientId, cancellationToken);
        return MapBill(bill);
    }

    public async Task<BillDto> GenerateBillAsync(GenerateBillRequest request, CancellationToken cancellationToken = default)
    {
        await using var tx = db.SupportsTransactions
            ? await db.BeginTransactionAsync(IsolationLevel.Serializable, cancellationToken)
            : null;

        var visit = await db.Visits
            .Include(v => v.Patient)
            .Include(v => v.Doctor).ThenInclude(d => d.User)
            .Include(v => v.Department)
            .Include(v => v.Bill)
            .FirstOrDefaultAsync(v => v.Id == request.VisitId, cancellationToken)
            ?? throw new NotFoundException($"Visit {request.VisitId} not found.");

        if (visit.Status is VisitStatus.Cancelled or VisitStatus.NoShow)
        {
            throw new BusinessRuleException($"Cannot generate a bill for a {visit.Status} visit.");
        }

        if (visit.Bill is not null && visit.Bill.Status != BillStatus.Cancelled)
        {
            throw new ConflictException($"A bill ({visit.Bill.BillNumber}) has already been generated for this visit.");
        }

        var settings = await db.HospitalSettings.AsNoTracking().FirstOrDefaultAsync(cancellationToken);
        var billItems = new List<BillItem>
        {
            new()
            {
                ServiceCode = "OPD-CONS",
                Description = $"OPD Consultation - {visit.Doctor.User.FullName} ({visit.Department.Name})",
                Category = BillItemCategory.Consultation,
                Quantity = 1,
                UnitPrice = visit.Doctor.ConsultationFee,
                TotalPrice = visit.Doctor.ConsultationFee
            }
        };

        // Add registration fee if configured and this is patient's first bill
        if (settings is { RegistrationFee: > 0 })
        {
            var hasPriorBill = await db.Bills.AnyAsync(b => b.PatientId == visit.PatientId && b.Status != BillStatus.Cancelled, cancellationToken);
            if (!hasPriorBill)
            {
                billItems.Add(new BillItem
                {
                    ServiceCode = "OPD-REG",
                    Description = "New Patient OPD Registration Fee",
                    Category = BillItemCategory.Registration,
                    Quantity = 1,
                    UnitPrice = settings.RegistrationFee,
                    TotalPrice = settings.RegistrationFee
                });
            }
        }

        if (request.AdditionalItems is not null)
        {
            foreach (var extra in request.AdditionalItems)
            {
                if (!Enum.TryParse<BillItemCategory>(extra.Category, true, out var cat))
                {
                    cat = BillItemCategory.Other;
                }
                var qty = Math.Max(1, extra.Quantity);
                var lineTotal = Math.Round(qty * extra.UnitPrice, 2);
                billItems.Add(new BillItem
                {
                    ServiceCode = string.IsNullOrWhiteSpace(extra.ServiceCode) ? "OPD-SVC" : extra.ServiceCode.Trim().ToUpperInvariant(),
                    Description = extra.Description.Trim(),
                    Category = cat,
                    Quantity = qty,
                    UnitPrice = extra.UnitPrice,
                    TotalPrice = lineTotal
                });
            }
        }

        var subTotal = billItems.Sum(i => i.TotalPrice);
        var discount = Math.Max(0, request.DiscountAmount);
        if (discount > subTotal)
        {
            throw new BusinessRuleException("Discount amount cannot exceed bill subtotal.");
        }

        var taxableAmount = subTotal - discount;
        var taxRate = settings?.TaxPercentage ?? 0m;
        var taxAmount = Math.Round(taxableAmount * (taxRate / 100m), 2);
        var totalAmount = Math.Round(taxableAmount + taxAmount, 2);

        var bill = new Bill
        {
            BillNumber = await codeGenerator.GenerateBillNumberAsync(DateOnly.FromDateTime(DateTime.Today), cancellationToken),
            VisitId = visit.Id,
            Visit = visit,
            PatientId = visit.PatientId,
            Patient = visit.Patient,
            GeneratedByUserId = currentUser.UserId,
            SubTotal = subTotal,
            DiscountAmount = discount,
            TaxAmount = taxAmount,
            TotalAmount = totalAmount,
            PaidAmount = 0m,
            BalanceAmount = totalAmount,
            Status = totalAmount == 0m ? BillStatus.Paid : BillStatus.Pending,
            Notes = request.Notes?.Trim(),
            IssuedAt = DateTime.UtcNow,
            Items = billItems
        };

        if (visit.Status is VisitStatus.ConsultationCompleted or VisitStatus.BillingPending)
        {
            visit.Status = totalAmount == 0m ? VisitStatus.ReadyForCheckout : VisitStatus.BillingPending;
            visit.UpdatedAt = DateTime.UtcNow;
        }

        db.Bills.Add(bill);
        await db.SaveChangesAsync(cancellationToken);

        if (tx is not null) await tx.CommitAsync(cancellationToken);

        if (visit.Patient.UserId.HasValue)
        {
            await notificationService.SendAsync(
                visit.Patient.UserId.Value,
                "OPD Bill Generated",
                $"Bill {bill.BillNumber} for {bill.TotalAmount:0.00} INR has been generated for visit {visit.VisitNumber}.",
                NotificationType.BillGenerated,
                nameof(Bill),
                bill.Id,
                cancellationToken);
        }

        await auditService.LogAsync("GenerateBill", nameof(Bill), bill.Id.ToString(), $"Generated bill {bill.BillNumber} Total {bill.TotalAmount:0.00}", cancellationToken: cancellationToken);
        return MapBill(bill);
    }

    public async Task<PaymentDto> RecordPaymentAsync(RecordPaymentRequest request, CancellationToken cancellationToken = default)
    {
        if (request.Amount <= 0)
        {
            throw new BusinessRuleException("Payment amount must be greater than zero.");
        }

        if (!Enum.TryParse<PaymentMethod>(request.Method, true, out var method))
        {
            throw new BusinessRuleException("Invalid payment method. Allowed: Cash, UPI, Card, Razorpay.");
        }

        if (method == PaymentMethod.Razorpay)
        {
            if (!paymentGateway.IsConfigured)
            {
                throw new BusinessRuleException("Online Razorpay gateway is not configured in this environment. Please use Cash, UPI, or Card recorded at reception.");
            }
        }

        await using var tx = db.SupportsTransactions
            ? await db.BeginTransactionAsync(IsolationLevel.Serializable, cancellationToken)
            : null;

        var bill = await db.Bills
            .Include(b => b.Visit)
            .Include(b => b.Patient)
            .FirstOrDefaultAsync(b => b.Id == request.BillId, cancellationToken)
            ?? throw new NotFoundException($"Bill {request.BillId} not found.");

        if (bill.Status == BillStatus.Cancelled)
        {
            throw new BusinessRuleException("Cannot record payment against a cancelled bill.");
        }

        if (bill.BalanceAmount <= 0)
        {
            throw new ConflictException("This bill is already fully paid.");
        }

        if (request.Amount > bill.BalanceAmount)
        {
            throw new BusinessRuleException($"Payment amount ({request.Amount:0.00}) exceeds outstanding balance ({bill.BalanceAmount:0.00}).");
        }

        var payment = new Payment
        {
            ReceiptNumber = await codeGenerator.GenerateReceiptNumberAsync(DateOnly.FromDateTime(DateTime.Today), cancellationToken),
            BillId = bill.Id,
            Bill = bill,
            PatientId = bill.PatientId,
            Patient = bill.Patient,
            Amount = Math.Round(request.Amount, 2),
            Method = method,
            Status = PaymentStatus.Completed,
            TransactionReference = request.TransactionReference?.Trim(),
            RecordedByUserId = currentUser.UserId,
            PaidAt = DateTime.UtcNow,
            Notes = request.Notes?.Trim()
        };

        bill.PaidAmount = Math.Round(bill.PaidAmount + payment.Amount, 2);
        bill.BalanceAmount = Math.Round(bill.TotalAmount - bill.PaidAmount, 2);
        bill.Status = bill.BalanceAmount <= 0 ? BillStatus.Paid : BillStatus.PartiallyPaid;
        bill.UpdatedAt = DateTime.UtcNow;

        if (bill.BalanceAmount <= 0 && bill.Visit.Status is VisitStatus.BillingPending or VisitStatus.ConsultationCompleted)
        {
            bill.Visit.Status = VisitStatus.ReadyForCheckout;
            bill.Visit.UpdatedAt = DateTime.UtcNow;
        }

        db.Payments.Add(payment);
        await db.SaveChangesAsync(cancellationToken);

        if (tx is not null) await tx.CommitAsync(cancellationToken);

        if (bill.Patient.UserId.HasValue)
        {
            await notificationService.SendAsync(
                bill.Patient.UserId.Value,
                "Payment Received",
                $"Payment of {payment.Amount:0.00} INR received via {payment.Method}. Receipt: {payment.ReceiptNumber}.",
                NotificationType.PaymentReceived,
                nameof(Payment),
                payment.Id,
                cancellationToken);
        }

        await auditService.LogAsync("PaymentRecorded", nameof(Payment), payment.Id.ToString(), $"Recorded {payment.Amount:0.00} ({payment.Method}) for {bill.BillNumber}, Receipt {payment.ReceiptNumber}", cancellationToken: cancellationToken);
        return MapPayment(payment);
    }

    public async Task<PagedResponse<PaymentDto>> GetPaymentsAsync(
        PagedRequest request,
        int? patientId,
        string? method,
        DateOnly? fromDate,
        DateOnly? toDate,
        CancellationToken cancellationToken = default)
    {
        var query = db.Payments
            .AsNoTracking()
            .Include(p => p.Bill)
            .Include(p => p.Patient)
            .AsQueryable();

        if (currentUser.IsInRole(nameof(RoleType.Patient)))
        {
            var myPatientId = await db.Patients.Where(pt => pt.UserId == currentUser.UserId).Select(pt => pt.Id).FirstOrDefaultAsync(cancellationToken);
            query = query.Where(p => p.PatientId == myPatientId);
        }

        if (patientId.HasValue && !currentUser.IsInRole(nameof(RoleType.Patient))) query = query.Where(p => p.PatientId == patientId.Value);

        if (!string.IsNullOrWhiteSpace(method) && Enum.TryParse<PaymentMethod>(method, true, out var parsedMethod))
        {
            query = query.Where(p => p.Method == parsedMethod);
        }

        if (fromDate.HasValue)
        {
            var fromDt = fromDate.Value.ToDateTime(TimeOnly.MinValue);
            query = query.Where(p => p.PaidAt >= fromDt);
        }

        if (toDate.HasValue)
        {
            var toDt = toDate.Value.ToDateTime(TimeOnly.MaxValue);
            query = query.Where(p => p.PaidAt <= toDt);
        }

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var s = request.Search.Trim().ToLower();
            query = query.Where(p =>
                p.ReceiptNumber.ToLower().Contains(s) ||
                p.Bill.BillNumber.ToLower().Contains(s) ||
                p.Patient.FullName.ToLower().Contains(s));
        }

        var total = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderByDescending(p => p.PaidAt)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        return new PagedResponse<PaymentDto>
        {
            Items = items.Select(p => MapPayment(p)).ToList(),
            Page = request.Page,
            PageSize = request.PageSize,
            TotalCount = total
        };
    }

    public async Task<PaymentDto> GetPaymentByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var p = await db.Payments.AsNoTracking().Include(x => x.Bill).Include(x => x.Patient)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new NotFoundException($"Payment {id} not found.");
        await EnsurePatientAccessAsync(p.PatientId, cancellationToken);
        return MapPayment(p);
    }

    private IQueryable<Bill> BaseBillQuery() => db.Bills
        .Include(b => b.Visit).ThenInclude(v => v.Doctor).ThenInclude(d => d.User)
        .Include(b => b.Visit).ThenInclude(v => v.Department)
        .Include(b => b.Patient)
        .Include(b => b.Items)
        .Include(b => b.Payments);

    private async Task EnsurePatientAccessAsync(int patientId, CancellationToken cancellationToken)
    {
        if (!currentUser.IsInRole(nameof(RoleType.Patient))) return;
        var myPatientId = await db.Patients.Where(p => p.UserId == currentUser.UserId).Select(p => p.Id).FirstOrDefaultAsync(cancellationToken);
        if (patientId != myPatientId) throw new ForbiddenException();
    }

    private static BillDto MapBill(Bill b) => new(
        b.Id,
        b.BillNumber,
        b.VisitId,
        b.Visit.VisitNumber,
        b.Visit.Status.ToString(),
        b.PatientId,
        b.Patient.PatientCode,
        b.Patient.FullName,
        b.Patient.PhoneNumber,
        b.Visit.Doctor.User.FullName,
        b.Visit.Department.Name,
        b.SubTotal,
        b.DiscountAmount,
        b.TaxAmount,
        b.TotalAmount,
        b.PaidAmount,
        b.BalanceAmount,
        b.Status.ToString(),
        b.Notes,
        b.IssuedAt,
        b.Items.Select(i => new BillItemDto(i.Id, i.ServiceCode, i.Description, i.Category.ToString(), i.Quantity, i.UnitPrice, i.TotalPrice)).ToList(),
        b.Payments.OrderByDescending(p => p.PaidAt).Select(p => MapPayment(p, b)).ToList());

    private static PaymentDto MapPayment(Payment p, Bill? billOverride = null) => new(
        p.Id,
        p.ReceiptNumber,
        p.BillId,
        billOverride?.BillNumber ?? p.Bill.BillNumber,
        p.PatientId,
        p.Patient.FullName,
        p.Patient.PatientCode,
        p.Amount,
        p.Method.ToString(),
        p.Status.ToString(),
        p.TransactionReference,
        p.PaidAt,
        p.Notes);
}
