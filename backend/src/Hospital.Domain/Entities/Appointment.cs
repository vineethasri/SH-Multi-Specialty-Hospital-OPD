using Hospital.Domain.Common;
using Hospital.Domain.Enums;

namespace Hospital.Domain.Entities;

public class Appointment : BaseEntity
{
    public string AppointmentNumber { get; set; } = string.Empty;
    public int PatientId { get; set; }
    public int DoctorId { get; set; }
    public int DepartmentId { get; set; }
    public DateOnly AppointmentDate { get; set; }
    public TimeSpan StartTime { get; set; }
    public TimeSpan EndTime { get; set; }
    public BookingSource BookingSource { get; set; } = BookingSource.Online;
    public AppointmentStatus Status { get; set; } = AppointmentStatus.Booked;
    public string ReasonForVisit { get; set; } = string.Empty;
    public string? CancellationReason { get; set; }
    public int? BookedByUserId { get; set; }

    public Patient Patient { get; set; } = null!;
    public Doctor Doctor { get; set; } = null!;
    public Department Department { get; set; } = null!;
    public Visit? Visit { get; set; }
}
