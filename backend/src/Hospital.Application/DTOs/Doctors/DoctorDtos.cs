namespace Hospital.Application.DTOs.Doctors;

public record DoctorScheduleDto(
    int Id,
    int DoctorId,
    string DoctorName,
    DayOfWeek DayOfWeek,
    string DayName,
    TimeSpan StartTime,
    TimeSpan EndTime,
    int SlotDurationMinutes,
    int MaxPatientsPerSlot,
    bool IsActive);

public record SaveDoctorScheduleRequest(
    int DoctorId,
    DayOfWeek DayOfWeek,
    TimeSpan StartTime,
    TimeSpan EndTime,
    int SlotDurationMinutes,
    int MaxPatientsPerSlot,
    bool IsActive);

public record DoctorDto(
    int Id,
    int UserId,
    int DepartmentId,
    string DepartmentName,
    string DoctorCode,
    string FullName,
    string Email,
    string PhoneNumber,
    string Specialization,
    string Qualification,
    string RegistrationNumber,
    int ExperienceYears,
    decimal ConsultationFee,
    string Bio,
    string RoomNumber,
    int AverageConsultationMinutes,
    bool IsAvailableForOnlineBooking,
    bool IsActive,
    IReadOnlyList<DoctorScheduleDto> Schedules);

public record CreateDoctorRequest(
    string FullName,
    string Email,
    string PhoneNumber,
    string Password,
    int DepartmentId,
    string Specialization,
    string Qualification,
    string RegistrationNumber,
    int ExperienceYears,
    decimal ConsultationFee,
    string Bio,
    string RoomNumber,
    int AverageConsultationMinutes,
    bool IsAvailableForOnlineBooking);

public record UpdateDoctorRequest(
    string FullName,
    string PhoneNumber,
    int DepartmentId,
    string Specialization,
    string Qualification,
    string RegistrationNumber,
    int ExperienceYears,
    decimal ConsultationFee,
    string Bio,
    string RoomNumber,
    int AverageConsultationMinutes,
    bool IsAvailableForOnlineBooking,
    bool IsActive);

public record TimeSlotDto(
    TimeSpan StartTime,
    TimeSpan EndTime,
    string Label,
    bool IsAvailable,
    int RemainingCapacity);
