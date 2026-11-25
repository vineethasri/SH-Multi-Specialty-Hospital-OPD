namespace Hospital.Application.DTOs.Visits;

public record VisitDto(
    int Id,
    string VisitNumber,
    int? AppointmentId,
    string? AppointmentNumber,
    int PatientId,
    string PatientCode,
    string PatientName,
    string PatientPhone,
    int PatientAge,
    string PatientGender,
    int DoctorId,
    string DoctorCode,
    string DoctorName,
    string DoctorRoomNumber,
    int DepartmentId,
    string DepartmentName,
    DateOnly VisitDate,
    string VisitType,
    int TokenNumber,
    string TokenDisplay,
    string Status,
    DateTime? CheckedInAt,
    DateTime? ConsultationStartedAt,
    DateTime? ConsultationCompletedAt,
    DateTime? CheckedOutAt,
    string? ChiefComplaint,
    string? Notes,
    int? ConsultationId,
    int? BillId,
    string? BillStatus,
    decimal? BillTotalAmount,
    decimal? BillBalanceAmount);

public record CheckInAppointmentRequest(int AppointmentId, string? ChiefComplaint, string? Notes);

public record WalkInCheckInRequest(
    int PatientId,
    int DoctorId,
    int DepartmentId,
    string? ChiefComplaint,
    string? Notes);

public record UpdateVisitStatusRequest(string Status, string? Reason, string? Notes);
