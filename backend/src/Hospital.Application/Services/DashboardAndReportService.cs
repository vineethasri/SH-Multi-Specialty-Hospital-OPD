using Hospital.Application.Common;
using Hospital.Application.DTOs.Dashboard;
using Hospital.Application.Interfaces;
using Hospital.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Hospital.Application.Services;

public class DashboardAndReportService(
    IApplicationDbContext db,
    ICurrentUserService currentUser) : IDashboardAndReportService
{
    public async Task<DashboardAnalyticsDto> GetDashboardAsync(DateOnly? date, CancellationToken cancellationToken = default)
    {
        var targetDate = date ?? DateOnly.FromDateTime(DateTime.Today);
        var dayStart = targetDate.ToDateTime(TimeOnly.MinValue);
        var dayEnd = targetDate.ToDateTime(TimeOnly.MaxValue);
        var monthStart = new DateTime(targetDate.Year, targetDate.Month, 1);

        int? scopedDoctorId = null;
        int? scopedPatientId = null;

        if (currentUser.IsInRole(nameof(RoleType.Doctor)))
        {
            scopedDoctorId = await db.Doctors.Where(d => d.UserId == currentUser.UserId).Select(d => d.Id).FirstOrDefaultAsync(cancellationToken);
        }
        else if (currentUser.IsInRole(nameof(RoleType.Patient)))
        {
            scopedPatientId = await db.Patients.Where(p => p.UserId == currentUser.UserId).Select(p => p.Id).FirstOrDefaultAsync(cancellationToken);
        }

        var appointmentsQuery = db.Appointments.AsNoTracking().AsQueryable();
        var visitsQuery = db.Visits.AsNoTracking().AsQueryable();
        var billsQuery = db.Bills.AsNoTracking().AsQueryable();
        var paymentsQuery = db.Payments.AsNoTracking().Where(p => p.Status == PaymentStatus.Completed);

        if (scopedDoctorId.HasValue)
        {
            appointmentsQuery = appointmentsQuery.Where(a => a.DoctorId == scopedDoctorId.Value);
            visitsQuery = visitsQuery.Where(v => v.DoctorId == scopedDoctorId.Value);
            billsQuery = billsQuery.Where(b => b.Visit.DoctorId == scopedDoctorId.Value);
            paymentsQuery = paymentsQuery.Where(p => p.Bill.Visit.DoctorId == scopedDoctorId.Value);
        }
        else if (scopedPatientId.HasValue)
        {
            appointmentsQuery = appointmentsQuery.Where(a => a.PatientId == scopedPatientId.Value);
            visitsQuery = visitsQuery.Where(v => v.PatientId == scopedPatientId.Value);
            billsQuery = billsQuery.Where(b => b.PatientId == scopedPatientId.Value);
            paymentsQuery = paymentsQuery.Where(p => p.PatientId == scopedPatientId.Value);
        }

        var totalPatients = scopedPatientId.HasValue
            ? 1
            : scopedDoctorId.HasValue
                ? await visitsQuery.Select(v => v.PatientId).Distinct().CountAsync(cancellationToken)
                : await db.Patients.CountAsync(cancellationToken);

        var todayAppointments = await appointmentsQuery.CountAsync(a => a.AppointmentDate == targetDate && a.Status != AppointmentStatus.Cancelled, cancellationToken);
        var todayCheckIns = await visitsQuery.CountAsync(v => v.VisitDate == targetDate && v.Status != VisitStatus.Cancelled && v.Status != VisitStatus.NoShow, cancellationToken);
        var patientsWaiting = await visitsQuery.CountAsync(v => v.VisitDate == targetDate && (v.Status == VisitStatus.CheckedIn || v.Status == VisitStatus.Waiting), cancellationToken);
        var patientsInConsultation = await visitsQuery.CountAsync(v => v.VisitDate == targetDate && v.Status == VisitStatus.InConsultation, cancellationToken);
        var completedConsultations = await visitsQuery.CountAsync(v => v.VisitDate == targetDate &&
            (v.Status == VisitStatus.ConsultationCompleted || v.Status == VisitStatus.BillingPending || v.Status == VisitStatus.ReadyForCheckout || v.Status == VisitStatus.CheckedOut), cancellationToken);
        var checkedOutPatients = await visitsQuery.CountAsync(v => v.VisitDate == targetDate && v.Status == VisitStatus.CheckedOut, cancellationToken);

        var pendingBills = await billsQuery
            .Where(b => b.Status == BillStatus.Pending || b.Status == BillStatus.PartiallyPaid)
            .Select(b => b.BalanceAmount)
            .ToListAsync(cancellationToken);

        var todayRevenue = await paymentsQuery.Where(p => p.PaidAt >= dayStart && p.PaidAt <= dayEnd).SumAsync(p => (decimal?)p.Amount, cancellationToken) ?? 0m;
        var monthRevenue = await paymentsQuery.Where(p => p.PaidAt >= monthStart && p.PaidAt <= dayEnd).SumAsync(p => (decimal?)p.Amount, cancellationToken) ?? 0m;
        var totalRevenue = await paymentsQuery.SumAsync(p => (decimal?)p.Amount, cancellationToken) ?? 0m;

        var activeDepts = await db.Departments
            .AsNoTracking()
            .Where(d => d.IsActive)
            .Select(d => new { d.Id, d.Name })
            .ToListAsync(cancellationToken);

        var allDeptVisits = await visitsQuery
            .Select(v => v.DepartmentId)
            .ToListAsync(cancellationToken);

        var allDeptAppts = await appointmentsQuery
            .Where(a => a.AppointmentDate == targetDate && a.Status != AppointmentStatus.Cancelled)
            .Select(a => a.DepartmentId)
            .ToListAsync(cancellationToken);

        var allDeptBills = await db.Bills
            .AsNoTracking()
            .Where(b => b.Status != BillStatus.Cancelled && (!scopedPatientId.HasValue || b.PatientId == scopedPatientId.Value))
            .Select(b => new { b.Visit.DepartmentId, b.PaidAmount })
            .ToListAsync(cancellationToken);

        var deptStats = activeDepts
            .Select(d => new DepartmentStatDto(
                d.Id,
                d.Name,
                allDeptVisits.Count(deptId => deptId == d.Id),
                allDeptAppts.Count(deptId => deptId == d.Id),
                allDeptBills.Where(b => b.DepartmentId == d.Id).Sum(b => b.PaidAmount)))
            .OrderByDescending(s => s.PatientVisitsCount)
            .ToList();

        var docQuery = db.Doctors.AsNoTracking().Where(d => d.IsActive);
        if (scopedDoctorId.HasValue) docQuery = docQuery.Where(d => d.Id == scopedDoctorId.Value);

        var activeDocs = await docQuery
            .Select(d => new { d.Id, FullName = d.User.FullName, DepartmentName = d.Department.Name })
            .ToListAsync(cancellationToken);

        var todayDocAppts = await appointmentsQuery
            .Where(a => a.AppointmentDate == targetDate && a.Status != AppointmentStatus.Cancelled)
            .Select(a => a.DoctorId)
            .ToListAsync(cancellationToken);

        var todayDocVisits = await visitsQuery
            .Where(v => v.VisitDate == targetDate)
            .Select(v => new { v.DoctorId, v.Status })
            .ToListAsync(cancellationToken);

        var doctorStats = activeDocs
            .Select(d => new DoctorStatDto(
                d.Id,
                d.FullName,
                d.DepartmentName,
                todayDocAppts.Count(docId => docId == d.Id),
                todayDocVisits.Count(v => v.DoctorId == d.Id && (v.Status == VisitStatus.CheckedIn || v.Status == VisitStatus.Waiting)),
                todayDocVisits.Count(v => v.DoctorId == d.Id &&
                    (v.Status == VisitStatus.ConsultationCompleted || v.Status == VisitStatus.BillingPending || v.Status == VisitStatus.ReadyForCheckout || v.Status == VisitStatus.CheckedOut))))
            .OrderByDescending(s => s.TotalAppointments)
            .ToList();

        var start7 = targetDate.AddDays(-6);
        var trendAppointmentDates = await appointmentsQuery
            .Where(a => a.AppointmentDate >= start7 && a.AppointmentDate <= targetDate && a.Status != AppointmentStatus.Cancelled)
            .Select(a => a.AppointmentDate)
            .ToListAsync(cancellationToken);

        var trendVisitDates = await visitsQuery
            .Where(v => v.VisitDate >= start7 && v.VisitDate <= targetDate && v.Status != VisitStatus.Cancelled)
            .Select(v => v.VisitDate)
            .ToListAsync(cancellationToken);

        var start7Dt = start7.ToDateTime(TimeOnly.MinValue);
        var trendPayments = await paymentsQuery
            .Where(p => p.PaidAt >= start7Dt && p.PaidAt <= dayEnd)
            .Select(p => new { p.PaidAt, p.Amount })
            .ToListAsync(cancellationToken);

        var trendList = new List<DailyTrendDto>();
        for (var i = 0; i < 7; i++)
        {
            var d = start7.AddDays(i);
            var appts = trendAppointmentDates.Count(x => x == d);
            var visits = trendVisitDates.Count(x => x == d);
            var rev = trendPayments.Where(p => DateOnly.FromDateTime(p.PaidAt) == d).Sum(p => p.Amount);
            trendList.Add(new DailyTrendDto(d, d.ToString("dd MMM"), appts, visits, rev));
        }

        return new DashboardAnalyticsDto(
            totalPatients,
            todayAppointments,
            todayCheckIns,
            patientsWaiting,
            patientsInConsultation,
            completedConsultations,
            checkedOutPatients,
            pendingBills.Count,
            pendingBills.Sum(),
            todayRevenue,
            monthRevenue,
            totalRevenue,
            deptStats,
            doctorStats,
            trendList);
    }

    public async Task<BillingReportSummaryDto> GetBillingReportAsync(DateOnly fromDate, DateOnly toDate, CancellationToken cancellationToken = default)
    {
        var fromDt = fromDate.ToDateTime(TimeOnly.MinValue);
        var toDt = toDate.ToDateTime(TimeOnly.MaxValue);

        var bills = await db.Bills
            .AsNoTracking()
            .Include(b => b.Visit).ThenInclude(v => v.Department)
            .Where(b => b.IssuedAt >= fromDt && b.IssuedAt <= toDt && b.Status != BillStatus.Cancelled)
            .ToListAsync(cancellationToken);

        var payments = await db.Payments
            .AsNoTracking()
            .Where(p => p.PaidAt >= fromDt && p.PaidAt <= toDt && p.Status == PaymentStatus.Completed)
            .ToListAsync(cancellationToken);

        var byMethod = payments
            .GroupBy(p => p.Method.ToString())
            .ToDictionary(g => g.Key, g => g.Sum(x => x.Amount));

        var deptBreakdown = bills
            .GroupBy(b => new { b.Visit.DepartmentId, b.Visit.Department.Name })
            .Select(g => new DepartmentStatDto(
                g.Key.DepartmentId,
                g.Key.Name,
                g.Count(),
                0,
                g.Sum(x => x.PaidAmount)))
            .OrderByDescending(d => d.Revenue)
            .ToList();

        return new BillingReportSummaryDto(
            fromDate,
            toDate,
            bills.Count,
            bills.Sum(b => b.TotalAmount),
            bills.Sum(b => b.PaidAmount),
            bills.Sum(b => b.BalanceAmount),
            byMethod,
            deptBreakdown);
    }

    public async Task<PagedResponse<AuditLogDto>> GetAuditLogsAsync(
        PagedRequest request,
        string? action,
        string? entityName,
        CancellationToken cancellationToken = default)
    {
        var query = db.AuditLogs.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(action)) query = query.Where(a => a.Action == action);
        if (!string.IsNullOrWhiteSpace(entityName)) query = query.Where(a => a.EntityName == entityName);
        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var s = request.Search.Trim().ToLower();
            query = query.Where(a =>
                (a.UserEmail != null && a.UserEmail.ToLower().Contains(s)) ||
                a.Action.ToLower().Contains(s) ||
                a.EntityName.ToLower().Contains(s) ||
                (a.Details != null && a.Details.ToLower().Contains(s)));
        }

        var total = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderByDescending(a => a.Timestamp)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(a => new AuditLogDto(a.Id, a.UserId, a.UserEmail, a.UserRole, a.Action, a.EntityName, a.EntityId, a.Details, a.IpAddress, a.Timestamp))
            .ToListAsync(cancellationToken);

        return new PagedResponse<AuditLogDto>
        {
            Items = items,
            Page = request.Page,
            PageSize = request.PageSize,
            TotalCount = total
        };
    }

    public async Task<PagedResponse<NotificationDto>> GetMyNotificationsAsync(PagedRequest request, bool? unreadOnly, CancellationToken cancellationToken = default)
    {
        var userId = currentUser.UserId ?? throw new UnauthorizedException();
        var query = db.Notifications.AsNoTracking().Where(n => n.UserId == userId);

        if (unreadOnly == true) query = query.Where(n => !n.IsRead);

        var total = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderByDescending(n => n.CreatedAt)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(n => new NotificationDto(n.Id, n.Title, n.Message, n.Type.ToString(), n.RelatedEntityType, n.RelatedEntityId, n.IsRead, n.ReadAt, n.CreatedAt))
            .ToListAsync(cancellationToken);

        return new PagedResponse<NotificationDto>
        {
            Items = items,
            Page = request.Page,
            PageSize = request.PageSize,
            TotalCount = total
        };
    }

    public async Task MarkNotificationReadAsync(int id, CancellationToken cancellationToken = default)
    {
        var userId = currentUser.UserId ?? throw new UnauthorizedException();
        var notification = await db.Notifications.FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId, cancellationToken)
            ?? throw new NotFoundException($"Notification {id} not found.");

        notification.IsRead = true;
        notification.ReadAt ??= DateTime.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task MarkAllNotificationsReadAsync(CancellationToken cancellationToken = default)
    {
        var userId = currentUser.UserId ?? throw new UnauthorizedException();
        var unread = await db.Notifications.Where(n => n.UserId == userId && !n.IsRead).ToListAsync(cancellationToken);
        var now = DateTime.UtcNow;
        foreach (var n in unread)
        {
            n.IsRead = true;
            n.ReadAt = now;
        }
        await db.SaveChangesAsync(cancellationToken);
    }
}
