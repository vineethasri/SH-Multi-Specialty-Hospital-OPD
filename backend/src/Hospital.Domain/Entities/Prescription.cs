using Hospital.Domain.Common;

namespace Hospital.Domain.Entities;

public class Prescription : BaseEntity
{
    public string PrescriptionNumber { get; set; } = string.Empty;
    public int ConsultationId { get; set; }
    public int VisitId { get; set; }
    public int DoctorId { get; set; }
    public int PatientId { get; set; }
    public string? GeneralInstructions { get; set; }
    public DateTime IssuedAt { get; set; } = DateTime.UtcNow;

    public Consultation Consultation { get; set; } = null!;
    public Visit Visit { get; set; } = null!;
    public Doctor Doctor { get; set; } = null!;
    public Patient Patient { get; set; } = null!;
    public ICollection<PrescriptionItem> Items { get; set; } = new List<PrescriptionItem>();
}

public class PrescriptionItem
{
    public int Id { get; set; }
    public int PrescriptionId { get; set; }
    public string MedicineName { get; set; } = string.Empty;
    public string Dosage { get; set; } = string.Empty;
    public string Frequency { get; set; } = string.Empty;
    public int DurationDays { get; set; }
    public string Route { get; set; } = "Oral";
    public string? TimingInstruction { get; set; }
    public int? Quantity { get; set; }
    public string? Notes { get; set; }

    public Prescription Prescription { get; set; } = null!;
}
