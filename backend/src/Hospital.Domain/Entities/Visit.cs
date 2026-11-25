using Hospital.Domain.Common;
using Hospital.Domain.Enums;

namespace Hospital.Domain.Entities;

public class Visit : BaseEntity
{
    public string VisitNumber { get; set; } = string.Empty;
    public int? AppointmentId { get; set; }
    public int PatientId { get; set; }
    public int DoctorId { get; set; }
    public int DepartmentId { get; set; }
    public DateOnly VisitDate { get; set; }
    public VisitType VisitType { get; set; }
    public int TokenNumber { get; set; }
    public string TokenDisplay { get; set; } = string.Empty;
    public VisitStatus Status { get; set; } = VisitStatus.CheckedIn;
    public DateTime? CheckedInAt { get; set; }
    public DateTime? ConsultationStartedAt { get; set; }
    public DateTime? ConsultationCompletedAt { get; set; }
    public DateTime? CheckedOutAt { get; set; }
    public int? CheckedInByUserId { get; set; }
    public int? CheckedOutByUserId { get; set; }
    public string? ChiefComplaint { get; set; }
    public string? CancellationReason { get; set; }
    public string? Notes { get; set; }

    public Appointment? Appointment { get; set; }
    public Patient Patient { get; set; } = null!;
    public Doctor Doctor { get; set; } = null!;
    public Department Department { get; set; } = null!;
    public Consultation? Consultation { get; set; }
    public Bill? Bill { get; set; }
}
