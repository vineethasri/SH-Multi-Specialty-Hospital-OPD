using Hospital.Application.Common;
using Hospital.Application.DTOs.Appointments;
using Hospital.Application.DTOs.Auth;
using Hospital.Application.DTOs.Billing;
using Hospital.Application.DTOs.Consultations;
using Hospital.Application.DTOs.Dashboard;
using Hospital.Application.DTOs.Doctors;
using Hospital.Application.DTOs.Patients;
using Hospital.Application.DTOs.Users;
using Hospital.Application.DTOs.Visits;

namespace Hospital.Application.Interfaces;

public interface IAuthService
{
    Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default);
    Task<AuthResponse> RegisterPatientAsync(RegisterPatientRequest request, CancellationToken cancellationToken = default);
    Task<AuthResponse> RefreshTokenAsync(RefreshTokenRequest request, CancellationToken cancellationToken = default);
    Task LogoutAsync(LogoutRequest request, CancellationToken cancellationToken = default);
    Task ChangePasswordAsync(ChangePasswordRequest request, CancellationToken cancellationToken = default);
    Task<UserInfoDto> GetMeAsync(CancellationToken cancellationToken = default);
}

public interface IUserService
{
    Task<PagedResponse<UserDto>> GetUsersAsync(PagedRequest request, string? role, bool? isActive, CancellationToken cancellationToken = default);
    Task<UserDto> GetByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<UserDto> CreateUserAsync(CreateUserRequest request, CancellationToken cancellationToken = default);
    Task<UserDto> UpdateUserAsync(int id, UpdateUserRequest request, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<string>> GetRolesAsync(CancellationToken cancellationToken = default);
}

public interface IDepartmentService
{
    Task<IReadOnlyList<DepartmentDto>> GetAllAsync(bool? isActive, string? search, CancellationToken cancellationToken = default);
    Task<DepartmentDto> GetByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<DepartmentDto> CreateAsync(SaveDepartmentRequest request, CancellationToken cancellationToken = default);
    Task<DepartmentDto> UpdateAsync(int id, SaveDepartmentRequest request, CancellationToken cancellationToken = default);
    Task<HospitalSettingDto> GetHospitalSettingsAsync(CancellationToken cancellationToken = default);
    Task<HospitalSettingDto> UpdateHospitalSettingsAsync(UpdateHospitalSettingRequest request, CancellationToken cancellationToken = default);
}

public interface IDoctorService
{
    Task<PagedResponse<DoctorDto>> GetDoctorsAsync(PagedRequest request, int? departmentId, bool? isActive, bool? onlineOnly, CancellationToken cancellationToken = default);
    Task<DoctorDto> GetByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<DoctorDto> CreateAsync(CreateDoctorRequest request, CancellationToken cancellationToken = default);
    Task<DoctorDto> UpdateAsync(int id, UpdateDoctorRequest request, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<DoctorScheduleDto>> GetSchedulesAsync(int? doctorId, CancellationToken cancellationToken = default);
    Task<DoctorScheduleDto> SaveScheduleAsync(SaveDoctorScheduleRequest request, int? scheduleId = null, CancellationToken cancellationToken = default);
    Task DeleteScheduleAsync(int scheduleId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<TimeSlotDto>> GetAvailableSlotsAsync(int doctorId, DateOnly date, CancellationToken cancellationToken = default);
}

public interface IPatientService
{
    Task<PagedResponse<PatientDto>> GetPatientsAsync(PagedRequest request, CancellationToken cancellationToken = default);
    Task<PatientDto> GetByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<PatientDto> GetMyProfileAsync(CancellationToken cancellationToken = default);
    Task<PatientDto> CreateAsync(CreatePatientRequest request, CancellationToken cancellationToken = default);
    Task<PatientDto> UpdateAsync(int id, UpdatePatientRequest request, CancellationToken cancellationToken = default);
}

public interface IAppointmentService
{
    Task<PagedResponse<AppointmentDto>> GetAppointmentsAsync(PagedRequest request, DateOnly? date, int? doctorId, int? departmentId, int? patientId, string? status, CancellationToken cancellationToken = default);
    Task<AppointmentDto> GetByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<AppointmentDto> BookAsync(BookAppointmentRequest request, CancellationToken cancellationToken = default);
    Task<AppointmentDto> ConfirmAsync(int id, CancellationToken cancellationToken = default);
    Task<AppointmentDto> CancelAsync(int id, CancelAppointmentRequest request, CancellationToken cancellationToken = default);
    Task<AppointmentDto> MarkNoShowAsync(int id, CancellationToken cancellationToken = default);
    Task<AppointmentDto> RescheduleAsync(int id, RescheduleAppointmentRequest request, CancellationToken cancellationToken = default);
}

public interface IVisitService
{
    Task<PagedResponse<VisitDto>> GetVisitsAsync(PagedRequest request, DateOnly? date, int? doctorId, int? departmentId, int? patientId, string? status, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<VisitDto>> GetDoctorQueueAsync(int? doctorId, DateOnly? date, CancellationToken cancellationToken = default);
    Task<VisitDto> GetByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<VisitDto> CheckInAppointmentAsync(CheckInAppointmentRequest request, CancellationToken cancellationToken = default);
    Task<VisitDto> CheckInWalkInAsync(WalkInCheckInRequest request, CancellationToken cancellationToken = default);
    Task<VisitDto> UpdateStatusAsync(int id, UpdateVisitStatusRequest request, CancellationToken cancellationToken = default);
    Task<VisitDto> CheckOutAsync(int id, string? notes, CancellationToken cancellationToken = default);
}

public interface IConsultationService
{
    Task<PagedResponse<ConsultationDto>> GetConsultationsAsync(PagedRequest request, int? doctorId, int? patientId, CancellationToken cancellationToken = default);
    Task<ConsultationDto> GetByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<ConsultationDto> GetByVisitIdAsync(int visitId, CancellationToken cancellationToken = default);
    Task<ConsultationDto> StartConsultationAsync(StartConsultationRequest request, CancellationToken cancellationToken = default);
    Task<ConsultationDto> SaveConsultationAsync(int id, SaveConsultationRequest request, CancellationToken cancellationToken = default);
    Task<ConsultationDto> CompleteConsultationAsync(int id, SaveConsultationRequest? finalData, CancellationToken cancellationToken = default);
    Task<PrescriptionDto> SavePrescriptionAsync(SavePrescriptionRequest request, CancellationToken cancellationToken = default);
    Task<PagedResponse<PrescriptionDto>> GetPrescriptionsAsync(PagedRequest request, int? patientId, int? doctorId, CancellationToken cancellationToken = default);
    Task<PrescriptionDto> GetPrescriptionByIdAsync(int id, CancellationToken cancellationToken = default);
}

public interface IBillingService
{
    Task<PagedResponse<BillDto>> GetBillsAsync(PagedRequest request, int? patientId, string? status, DateOnly? fromDate, DateOnly? toDate, CancellationToken cancellationToken = default);
    Task<BillDto> GetBillByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<BillDto> GetBillByVisitIdAsync(int visitId, CancellationToken cancellationToken = default);
    Task<BillDto> GenerateBillAsync(GenerateBillRequest request, CancellationToken cancellationToken = default);
    Task<PaymentDto> RecordPaymentAsync(RecordPaymentRequest request, CancellationToken cancellationToken = default);
    Task<PagedResponse<PaymentDto>> GetPaymentsAsync(PagedRequest request, int? patientId, string? method, DateOnly? fromDate, DateOnly? toDate, CancellationToken cancellationToken = default);
    Task<PaymentDto> GetPaymentByIdAsync(int id, CancellationToken cancellationToken = default);
}

public interface IDashboardAndReportService
{
    Task<DashboardAnalyticsDto> GetDashboardAsync(DateOnly? date, CancellationToken cancellationToken = default);
    Task<BillingReportSummaryDto> GetBillingReportAsync(DateOnly fromDate, DateOnly toDate, CancellationToken cancellationToken = default);
    Task<PagedResponse<AuditLogDto>> GetAuditLogsAsync(PagedRequest request, string? action, string? entityName, CancellationToken cancellationToken = default);
    Task<PagedResponse<NotificationDto>> GetMyNotificationsAsync(PagedRequest request, bool? unreadOnly, CancellationToken cancellationToken = default);
    Task MarkNotificationReadAsync(int id, CancellationToken cancellationToken = default);
    Task MarkAllNotificationsReadAsync(CancellationToken cancellationToken = default);
}
