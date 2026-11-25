using Hospital.Domain.Common;
using Hospital.Domain.Enums;

namespace Hospital.Domain.Entities;

public class Consultation : BaseEntity
{
    public int VisitId { get; set; }
    public int DoctorId { get; set; }
    public int PatientId { get; set; }
    public ConsultationStatus Status { get; set; } = ConsultationStatus.InProgress;
    public string Symptoms { get; set; } = string.Empty;
    public string? BloodPressure { get; set; }
    public decimal? TemperatureCelsius { get; set; }
    public int? PulseRate { get; set; }
    public int? RespiratoryRate { get; set; }
    public int? SpO2 { get; set; }
    public decimal? WeightKg { get; set; }
    public decimal? HeightCm { get; set; }
    public string? ClinicalExamination { get; set; }
    public string Diagnosis { get; set; } = string.Empty;
    public string? IcdCode { get; set; }
    public string? ConsultationNotes { get; set; }
    public string? FollowUpInstructions { get; set; }
    public DateOnly? RecommendedFollowUpDate { get; set; }
    public DateTime StartedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }

    public Visit Visit { get; set; } = null!;
    public Doctor Doctor { get; set; } = null!;
    public Patient Patient { get; set; } = null!;
    public Prescription? Prescription { get; set; }
}
