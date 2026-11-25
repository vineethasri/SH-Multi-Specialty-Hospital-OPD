namespace Hospital.Application.DTOs.Consultations;

public record ConsultationDto(
    int Id,
    int VisitId,
    string VisitNumber,
    string TokenDisplay,
    int DoctorId,
    string DoctorName,
    string DepartmentName,
    int PatientId,
    string PatientCode,
    string PatientName,
    int PatientAge,
    string PatientGender,
    string? Allergies,
    string? ChronicConditions,
    string Status,
    string Symptoms,
    string? BloodPressure,
    decimal? TemperatureCelsius,
    int? PulseRate,
    int? RespiratoryRate,
    int? SpO2,
    decimal? WeightKg,
    decimal? HeightCm,
    string? ClinicalExamination,
    string Diagnosis,
    string? IcdCode,
    string? ConsultationNotes,
    string? FollowUpInstructions,
    DateOnly? RecommendedFollowUpDate,
    DateTime StartedAt,
    DateTime? CompletedAt,
    PrescriptionDto? Prescription);

public record StartConsultationRequest(int VisitId);

public record SaveConsultationRequest(
    string Symptoms,
    string? BloodPressure,
    decimal? TemperatureCelsius,
    int? PulseRate,
    int? RespiratoryRate,
    int? SpO2,
    decimal? WeightKg,
    decimal? HeightCm,
    string? ClinicalExamination,
    string Diagnosis,
    string? IcdCode,
    string? ConsultationNotes,
    string? FollowUpInstructions,
    DateOnly? RecommendedFollowUpDate);

public record PrescriptionItemDto(
    int Id,
    string MedicineName,
    string Dosage,
    string Frequency,
    int DurationDays,
    string Route,
    string? TimingInstruction,
    int? Quantity,
    string? Notes);

public record PrescriptionDto(
    int Id,
    string PrescriptionNumber,
    int ConsultationId,
    int VisitId,
    string VisitNumber,
    int DoctorId,
    string DoctorName,
    string DoctorRegistrationNumber,
    string DepartmentName,
    int PatientId,
    string PatientCode,
    string PatientName,
    int PatientAge,
    string PatientGender,
    string Diagnosis,
    string? GeneralInstructions,
    DateTime IssuedAt,
    IReadOnlyList<PrescriptionItemDto> Items);

public record SavePrescriptionItemRequest(
    string MedicineName,
    string Dosage,
    string Frequency,
    int DurationDays,
    string Route,
    string? TimingInstruction,
    int? Quantity,
    string? Notes);

public record SavePrescriptionRequest(
    int ConsultationId,
    string? GeneralInstructions,
    IReadOnlyList<SavePrescriptionItemRequest> Items);
