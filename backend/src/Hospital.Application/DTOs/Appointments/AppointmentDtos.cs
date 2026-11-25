namespace Hospital.Application.DTOs.Appointments;

public record AppointmentDto(
    int Id,
    string AppointmentNumber,
    int PatientId,
    string PatientCode,
    string PatientName,
    string PatientPhone,
    int DoctorId,
    string DoctorCode,
    string DoctorName,
    int DepartmentId,
    string DepartmentName,
    DateOnly AppointmentDate,
    TimeSpan StartTime,
    TimeSpan EndTime,
    string BookingSource,
    string Status,
    string ReasonForVisit,
    string? CancellationReason,
    int? VisitId,
    DateTime CreatedAt);

public record BookAppointmentRequest(
    int? PatientId,
    int DoctorId,
    int DepartmentId,
    DateOnly AppointmentDate,
    TimeSpan StartTime,
    string ReasonForVisit);

public record CancelAppointmentRequest(string Reason);
public record RescheduleAppointmentRequest(DateOnly AppointmentDate, TimeSpan StartTime);
