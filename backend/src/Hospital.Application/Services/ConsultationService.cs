using Hospital.Application.Common;
using Hospital.Application.DTOs.Consultations;
using Hospital.Application.Interfaces;
using Hospital.Domain.Entities;
using Hospital.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Hospital.Application.Services;

public class ConsultationService(
    IApplicationDbContext db,
    ICurrentUserService currentUser,
    ICodeGeneratorService codeGenerator,
    INotificationService notificationService,
    IAuditService auditService) : IConsultationService
{
    public async Task<PagedResponse<ConsultationDto>> GetConsultationsAsync(
        PagedRequest request,
        int? doctorId,
        int? patientId,
        CancellationToken cancellationToken = default)
    {
        var query = BaseQuery();

        if (currentUser.IsInRole(nameof(RoleType.Patient)))
        {
            var myPatientId = await db.Patients.Where(p => p.UserId == currentUser.UserId).Select(p => p.Id).FirstOrDefaultAsync(cancellationToken);
            query = query.Where(c => c.PatientId == myPatientId);
        }
        else if (currentUser.IsInRole(nameof(RoleType.Doctor)))
        {
            var myDoctorId = await db.Doctors.Where(d => d.UserId == currentUser.UserId).Select(d => d.Id).FirstOrDefaultAsync(cancellationToken);
            query = query.Where(c => c.DoctorId == myDoctorId);
        }

        if (doctorId.HasValue && !currentUser.IsInRole(nameof(RoleType.Doctor))) query = query.Where(c => c.DoctorId == doctorId.Value);
        if (patientId.HasValue && !currentUser.IsInRole(nameof(RoleType.Patient))) query = query.Where(c => c.PatientId == patientId.Value);

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var s = request.Search.Trim().ToLower();
            query = query.Where(c =>
                c.Patient.FullName.ToLower().Contains(s) ||
                c.Patient.PatientCode.ToLower().Contains(s) ||
                c.Diagnosis.ToLower().Contains(s) ||
                c.Visit.VisitNumber.ToLower().Contains(s));
        }

        var total = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderByDescending(c => c.StartedAt)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        return new PagedResponse<ConsultationDto>
        {
            Items = items.Select(MapConsultation).ToList(),
            Page = request.Page,
            PageSize = request.PageSize,
            TotalCount = total
        };
    }

    public async Task<ConsultationDto> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var c = await BaseQuery().FirstOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new NotFoundException($"Consultation {id} not found.");
        await EnsureReadAccessAsync(c, cancellationToken);
        return MapConsultation(c);
    }

    public async Task<ConsultationDto> GetByVisitIdAsync(int visitId, CancellationToken cancellationToken = default)
    {
        var c = await BaseQuery().FirstOrDefaultAsync(x => x.VisitId == visitId, cancellationToken)
            ?? throw new NotFoundException($"Consultation for visit {visitId} not found.");
        await EnsureReadAccessAsync(c, cancellationToken);
        return MapConsultation(c);
    }

    public async Task<ConsultationDto> StartConsultationAsync(StartConsultationRequest request, CancellationToken cancellationToken = default)
    {
        var visit = await db.Visits
            .Include(v => v.Patient)
            .Include(v => v.Doctor).ThenInclude(d => d.User)
            .Include(v => v.Department)
            .Include(v => v.Consultation).ThenInclude(c => c!.Prescription).ThenInclude(p => p!.Items)
            .FirstOrDefaultAsync(v => v.Id == request.VisitId, cancellationToken)
            ?? throw new NotFoundException($"Visit {request.VisitId} not found.");

        await EnsureDoctorOwnershipAsync(visit.DoctorId, cancellationToken);

        if (visit.Consultation is not null)
        {
            return MapConsultation(visit.Consultation);
        }

        if (visit.Status is not (VisitStatus.CheckedIn or VisitStatus.Waiting))
        {
            throw new BusinessRuleException($"Cannot start consultation when visit is in '{visit.Status}' status.");
        }

        var consultation = new Consultation
        {
            VisitId = visit.Id,
            Visit = visit,
            DoctorId = visit.DoctorId,
            Doctor = visit.Doctor,
            PatientId = visit.PatientId,
            Patient = visit.Patient,
            Status = ConsultationStatus.InProgress,
            Symptoms = visit.ChiefComplaint ?? string.Empty,
            StartedAt = DateTime.UtcNow
        };

        visit.Status = VisitStatus.InConsultation;
        visit.ConsultationStartedAt = DateTime.UtcNow;
        visit.UpdatedAt = DateTime.UtcNow;

        db.Consultations.Add(consultation);
        await db.SaveChangesAsync(cancellationToken);

        if (visit.Patient.UserId.HasValue)
        {
            await notificationService.SendAsync(
                visit.Patient.UserId.Value,
                "Consultation Started",
                $"Dr. {visit.Doctor.User.FullName} has started your consultation (Token {visit.TokenDisplay}, Room {visit.Doctor.RoomNumber}).",
                NotificationType.ConsultationStarted,
                nameof(Consultation),
                consultation.Id,
                cancellationToken);
        }

        await auditService.LogAsync("StartConsultation", nameof(Consultation), consultation.Id.ToString(), $"Started consultation for visit {visit.VisitNumber}", cancellationToken: cancellationToken);
        return MapConsultation(consultation);
    }

    public async Task<ConsultationDto> SaveConsultationAsync(int id, SaveConsultationRequest request, CancellationToken cancellationToken = default)
    {
        var consultation = await BaseQuery().FirstOrDefaultAsync(c => c.Id == id, cancellationToken)
            ?? throw new NotFoundException($"Consultation {id} not found.");

        await EnsureDoctorOwnershipAsync(consultation.DoctorId, cancellationToken);

        ApplyConsultationFields(consultation, request);
        await db.SaveChangesAsync(cancellationToken);

        await auditService.LogAsync("UpdateConsultation", nameof(Consultation), consultation.Id.ToString(), $"Updated clinical notes for visit {consultation.Visit.VisitNumber}", cancellationToken: cancellationToken);
        return MapConsultation(consultation);
    }

    public async Task<ConsultationDto> CompleteConsultationAsync(int id, SaveConsultationRequest? finalData, CancellationToken cancellationToken = default)
    {
        var consultation = await BaseQuery().FirstOrDefaultAsync(c => c.Id == id, cancellationToken)
            ?? throw new NotFoundException($"Consultation {id} not found.");

        await EnsureDoctorOwnershipAsync(consultation.DoctorId, cancellationToken);

        if (finalData is not null)
        {
            ApplyConsultationFields(consultation, finalData);
        }

        if (string.IsNullOrWhiteSpace(consultation.Diagnosis))
        {
            throw new BusinessRuleException("Diagnosis is required before completing the consultation.");
        }

        consultation.Status = ConsultationStatus.Completed;
        consultation.CompletedAt ??= DateTime.UtcNow;
        consultation.UpdatedAt = DateTime.UtcNow;

        consultation.Visit.Status = VisitStatus.BillingPending;
        consultation.Visit.ConsultationCompletedAt = consultation.CompletedAt;
        consultation.Visit.UpdatedAt = DateTime.UtcNow;

        if (consultation.Visit.AppointmentId.HasValue)
        {
            var appt = await db.Appointments.FirstOrDefaultAsync(a => a.Id == consultation.Visit.AppointmentId.Value, cancellationToken);
            if (appt is not null && appt.Status != AppointmentStatus.Cancelled)
            {
                appt.Status = AppointmentStatus.Completed;
                appt.UpdatedAt = DateTime.UtcNow;
            }
        }

        await db.SaveChangesAsync(cancellationToken);

        if (consultation.Patient.UserId.HasValue)
        {
            await notificationService.SendAsync(
                consultation.Patient.UserId.Value,
                "Consultation Completed",
                $"Your consultation for visit {consultation.Visit.VisitNumber} is complete. Please proceed to the billing desk.",
                NotificationType.ConsultationCompleted,
                nameof(Consultation),
                consultation.Id,
                cancellationToken);
        }

        await auditService.LogAsync("CompleteConsultation", nameof(Consultation), consultation.Id.ToString(), $"Completed consultation for visit {consultation.Visit.VisitNumber}", cancellationToken: cancellationToken);
        return MapConsultation(consultation);
    }

    public async Task<PrescriptionDto> SavePrescriptionAsync(SavePrescriptionRequest request, CancellationToken cancellationToken = default)
    {
        var consultation = await db.Consultations
            .Include(c => c.Visit).ThenInclude(v => v.Department)
            .Include(c => c.Doctor).ThenInclude(d => d.User)
            .Include(c => c.Patient)
            .Include(c => c.Prescription).ThenInclude(p => p!.Items)
            .FirstOrDefaultAsync(c => c.Id == request.ConsultationId, cancellationToken)
            ?? throw new NotFoundException($"Consultation {request.ConsultationId} not found.");

        await EnsureDoctorOwnershipAsync(consultation.DoctorId, cancellationToken);

        if (request.Items.Count == 0)
        {
            throw new BusinessRuleException("At least one medicine item is required for a prescription.");
        }

        Prescription prescription;
        if (consultation.Prescription is not null)
        {
            prescription = consultation.Prescription;
            prescription.GeneralInstructions = request.GeneralInstructions?.Trim();
            prescription.UpdatedAt = DateTime.UtcNow;
            db.PrescriptionItems.RemoveRange(prescription.Items);
            prescription.Items.Clear();
        }
        else
        {
            prescription = new Prescription
            {
                PrescriptionNumber = await codeGenerator.GeneratePrescriptionNumberAsync(DateOnly.FromDateTime(DateTime.Today), cancellationToken),
                ConsultationId = consultation.Id,
                Consultation = consultation,
                VisitId = consultation.VisitId,
                Visit = consultation.Visit,
                DoctorId = consultation.DoctorId,
                Doctor = consultation.Doctor,
                PatientId = consultation.PatientId,
                Patient = consultation.Patient,
                GeneralInstructions = request.GeneralInstructions?.Trim(),
                IssuedAt = DateTime.UtcNow
            };
            db.Prescriptions.Add(prescription);
        }

        foreach (var item in request.Items)
        {
            prescription.Items.Add(new PrescriptionItem
            {
                MedicineName = item.MedicineName.Trim(),
                Dosage = item.Dosage.Trim(),
                Frequency = item.Frequency.Trim(),
                DurationDays = Math.Max(1, item.DurationDays),
                Route = string.IsNullOrWhiteSpace(item.Route) ? "Oral" : item.Route.Trim(),
                TimingInstruction = item.TimingInstruction?.Trim(),
                Quantity = item.Quantity,
                Notes = item.Notes?.Trim()
            });
        }

        await db.SaveChangesAsync(cancellationToken);
        await auditService.LogAsync("SavePrescription", nameof(Prescription), prescription.Id.ToString(), $"Saved prescription {prescription.PrescriptionNumber}", cancellationToken: cancellationToken);
        return MapPrescription(prescription);
    }

    public async Task<PagedResponse<PrescriptionDto>> GetPrescriptionsAsync(
        PagedRequest request,
        int? patientId,
        int? doctorId,
        CancellationToken cancellationToken = default)
    {
        var query = db.Prescriptions
            .AsNoTracking()
            .Include(p => p.Consultation)
            .Include(p => p.Visit).ThenInclude(v => v.Department)
            .Include(p => p.Doctor).ThenInclude(d => d.User)
            .Include(p => p.Patient)
            .Include(p => p.Items)
            .AsQueryable();

        if (currentUser.IsInRole(nameof(RoleType.Patient)))
        {
            var myPatientId = await db.Patients.Where(p => p.UserId == currentUser.UserId).Select(p => p.Id).FirstOrDefaultAsync(cancellationToken);
            query = query.Where(p => p.PatientId == myPatientId);
        }
        else if (currentUser.IsInRole(nameof(RoleType.Doctor)))
        {
            var myDoctorId = await db.Doctors.Where(d => d.UserId == currentUser.UserId).Select(d => d.Id).FirstOrDefaultAsync(cancellationToken);
            query = query.Where(p => p.DoctorId == myDoctorId);
        }

        if (patientId.HasValue && !currentUser.IsInRole(nameof(RoleType.Patient))) query = query.Where(p => p.PatientId == patientId.Value);
        if (doctorId.HasValue && !currentUser.IsInRole(nameof(RoleType.Doctor))) query = query.Where(p => p.DoctorId == doctorId.Value);

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var s = request.Search.Trim().ToLower();
            query = query.Where(p =>
                p.PrescriptionNumber.ToLower().Contains(s) ||
                p.Patient.FullName.ToLower().Contains(s) ||
                p.Doctor.User.FullName.ToLower().Contains(s));
        }

        var total = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderByDescending(p => p.IssuedAt)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        return new PagedResponse<PrescriptionDto>
        {
            Items = items.Select(MapPrescription).ToList(),
            Page = request.Page,
            PageSize = request.PageSize,
            TotalCount = total
        };
    }

    public async Task<PrescriptionDto> GetPrescriptionByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var p = await db.Prescriptions
            .AsNoTracking()
            .Include(x => x.Consultation)
            .Include(x => x.Visit).ThenInclude(v => v.Department)
            .Include(x => x.Doctor).ThenInclude(d => d.User)
            .Include(x => x.Patient)
            .Include(x => x.Items)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new NotFoundException($"Prescription {id} not found.");

        if (currentUser.IsInRole(nameof(RoleType.Patient)))
        {
            var myPatientId = await db.Patients.Where(pt => pt.UserId == currentUser.UserId).Select(pt => pt.Id).FirstOrDefaultAsync(cancellationToken);
            if (p.PatientId != myPatientId) throw new ForbiddenException();
        }
        else if (currentUser.IsInRole(nameof(RoleType.Doctor)))
        {
            var myDoctorId = await db.Doctors.Where(d => d.UserId == currentUser.UserId).Select(d => d.Id).FirstOrDefaultAsync(cancellationToken);
            if (p.DoctorId != myDoctorId) throw new ForbiddenException();
        }

        return MapPrescription(p);
    }

    private IQueryable<Consultation> BaseQuery() => db.Consultations
        .Include(c => c.Visit).ThenInclude(v => v.Department)
        .Include(c => c.Doctor).ThenInclude(d => d.User)
        .Include(c => c.Patient)
        .Include(c => c.Prescription).ThenInclude(p => p!.Items);

    private static void ApplyConsultationFields(Consultation consultation, SaveConsultationRequest request)
    {
        consultation.Symptoms = request.Symptoms.Trim();
        consultation.BloodPressure = request.BloodPressure?.Trim();
        consultation.TemperatureCelsius = request.TemperatureCelsius;
        consultation.PulseRate = request.PulseRate;
        consultation.RespiratoryRate = request.RespiratoryRate;
        consultation.SpO2 = request.SpO2;
        consultation.WeightKg = request.WeightKg;
        consultation.HeightCm = request.HeightCm;
        consultation.ClinicalExamination = request.ClinicalExamination?.Trim();
        consultation.Diagnosis = request.Diagnosis.Trim();
        consultation.IcdCode = request.IcdCode?.Trim();
        consultation.ConsultationNotes = request.ConsultationNotes?.Trim();
        consultation.FollowUpInstructions = request.FollowUpInstructions?.Trim();
        consultation.RecommendedFollowUpDate = request.RecommendedFollowUpDate;
        consultation.UpdatedAt = DateTime.UtcNow;
    }

    private async Task EnsureDoctorOwnershipAsync(int doctorId, CancellationToken cancellationToken)
    {
        if (currentUser.IsInRole(nameof(RoleType.Admin))) return;

        if (currentUser.IsInRole(nameof(RoleType.Doctor)))
        {
            var myDoctorId = await db.Doctors.Where(d => d.UserId == currentUser.UserId).Select(d => d.Id).FirstOrDefaultAsync(cancellationToken);
            if (myDoctorId != doctorId)
                throw new ForbiddenException("Doctors can only manage consultations assigned to them.");
            return;
        }

        throw new ForbiddenException();
    }

    private async Task EnsureReadAccessAsync(Consultation c, CancellationToken cancellationToken)
    {
        if (currentUser.IsInRole(nameof(RoleType.Admin), nameof(RoleType.Receptionist))) return;

        if (currentUser.IsInRole(nameof(RoleType.Patient)))
        {
            var myPatientId = await db.Patients.Where(p => p.UserId == currentUser.UserId).Select(p => p.Id).FirstOrDefaultAsync(cancellationToken);
            if (c.PatientId != myPatientId) throw new ForbiddenException();
            return;
        }

        if (currentUser.IsInRole(nameof(RoleType.Doctor)))
        {
            var myDoctorId = await db.Doctors.Where(d => d.UserId == currentUser.UserId).Select(d => d.Id).FirstOrDefaultAsync(cancellationToken);
            if (c.DoctorId != myDoctorId) throw new ForbiddenException();
        }
    }

    private static ConsultationDto MapConsultation(Consultation c) => new(
        c.Id,
        c.VisitId,
        c.Visit.VisitNumber,
        c.Visit.TokenDisplay,
        c.DoctorId,
        c.Doctor.User.FullName,
        c.Visit.Department.Name,
        c.PatientId,
        c.Patient.PatientCode,
        c.Patient.FullName,
        PatientService.CalculateAge(c.Patient.DateOfBirth),
        c.Patient.Gender.ToString(),
        c.Patient.Allergies,
        c.Patient.ChronicConditions,
        c.Status.ToString(),
        c.Symptoms,
        c.BloodPressure,
        c.TemperatureCelsius,
        c.PulseRate,
        c.RespiratoryRate,
        c.SpO2,
        c.WeightKg,
        c.HeightCm,
        c.ClinicalExamination,
        c.Diagnosis,
        c.IcdCode,
        c.ConsultationNotes,
        c.FollowUpInstructions,
        c.RecommendedFollowUpDate,
        c.StartedAt,
        c.CompletedAt,
        c.Prescription is null ? null : MapPrescription(c.Prescription));

    private static PrescriptionDto MapPrescription(Prescription p) => new(
        p.Id,
        p.PrescriptionNumber,
        p.ConsultationId,
        p.VisitId,
        p.Visit.VisitNumber,
        p.DoctorId,
        p.Doctor.User.FullName,
        p.Doctor.RegistrationNumber,
        p.Visit.Department.Name,
        p.PatientId,
        p.Patient.PatientCode,
        p.Patient.FullName,
        PatientService.CalculateAge(p.Patient.DateOfBirth),
        p.Patient.Gender.ToString(),
        p.Consultation.Diagnosis,
        p.GeneralInstructions,
        p.IssuedAt,
        p.Items.Select(i => new PrescriptionItemDto(
            i.Id, i.MedicineName, i.Dosage, i.Frequency, i.DurationDays,
            i.Route, i.TimingInstruction, i.Quantity, i.Notes)).ToList());
}
