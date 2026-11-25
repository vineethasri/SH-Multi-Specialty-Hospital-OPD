namespace Hospital.Application.DTOs.Dashboard;

public record NotificationDto(
    int Id,
    string Title,
    string Message,
    string Type,
    string? RelatedEntityType,
    int? RelatedEntityId,
    bool IsRead,
    DateTime? ReadAt,
    DateTime CreatedAt);

public record AuditLogDto(
    long Id,
    int? UserId,
    string? UserEmail,
    string? UserRole,
    string Action,
    string EntityName,
    string? EntityId,
    string? Details,
    string? IpAddress,
    DateTime Timestamp);

public record DepartmentStatDto(
    int DepartmentId,
    string DepartmentName,
    int PatientVisitsCount,
    int AppointmentsCount,
    decimal Revenue);

public record DoctorStatDto(
    int DoctorId,
    string DoctorName,
    string DepartmentName,
    int TotalAppointments,
    int WaitingCount,
    int CompletedConsultations);

public record DailyTrendDto(
    DateOnly Date,
    string Label,
    int AppointmentsCount,
    int VisitsCount,
    decimal Revenue);

public record DashboardAnalyticsDto(
    int TotalRegisteredPatients,
    int TodayAppointments,
    int TodayCheckIns,
    int PatientsWaiting,
    int PatientsInConsultation,
    int CompletedConsultations,
    int CheckedOutPatients,
    int PendingBillsCount,
    decimal PendingBillsAmount,
    decimal TodayRevenue,
    decimal MonthRevenue,
    decimal TotalRevenue,
    IReadOnlyList<DepartmentStatDto> DepartmentStats,
    IReadOnlyList<DoctorStatDto> DoctorStats,
    IReadOnlyList<DailyTrendDto> Last7DaysTrend);

public record BillingReportSummaryDto(
    DateOnly FromDate,
    DateOnly ToDate,
    int TotalBills,
    decimal TotalBilledAmount,
    decimal TotalCollectedAmount,
    decimal TotalPendingAmount,
    IReadOnlyDictionary<string, decimal> RevenueByPaymentMethod,
    IReadOnlyList<DepartmentStatDto> DepartmentBreakdown);
