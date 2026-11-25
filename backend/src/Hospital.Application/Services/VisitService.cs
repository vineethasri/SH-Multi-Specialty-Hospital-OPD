using System.Data;
using Hospital.Application.Common;
using Hospital.Application.DTOs.Visits;
using Hospital.Application.Interfaces;
using Hospital.Domain.Entities;
using Hospital.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Hospital.Application.Services;

public class VisitService(
    IApplicationDbContext db,
    ICurrentUserService currentUser,
    ICodeGeneratorService codeGenerator,
    INotificationService notificationService,
    IAuditService auditService) : IVisitService
{
    public async Task<PagedResponse<VisitDto>> GetVisitsAsync(
        PagedRequest request,
        DateOnly? date,
        int? doctorId,
        int? departmentId,
        int? patientId,
        string? status,
        CancellationToken cancellationToken = default)
    {
        var query = BaseQuery();

        if (currentUser.IsInRole(nameof(RoleType.Patient)))
        {
            var myPatientId = await db.Patients.Where(p => p.UserId == currentUser.UserId).Select(p => p.Id).FirstOrDefaultAsync(cancellationToken);
            query = query.Where(v => v.PatientId == myPatientId);
        }
        else if (currentUser.IsInRole(nameof(RoleType.Doctor)))
        {
            var myDoctorId = await db.Doctors.Where(d => d.UserId == currentUser.UserId).Select(d => d.Id).FirstOrDefaultAsync(cancellationToken);
            query = query.Where(v => v.DoctorId == myDoctorId);
        }

        if (date.HasValue) query = query.Where(v => v.VisitDate == date.Value);
        if (doctorId.HasValue) query = query.Where(v => v.DoctorId == doctorId.Value);
        if (departmentId.HasValue) query = query.Where(v => v.DepartmentId == departmentId.Value);
        if (patientId.HasValue && !currentUser.IsInRole(nameof(RoleType.Patient))) query = query.Where(v => v.PatientId == patientId.Value);

        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<VisitStatus>(status, true, out var parsedStatus))
        {
            query = query.Where(v => v.Status == parsedStatus);
        }

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var s = request.Search.Trim().ToLower();
            query = query.Where(v =>
                v.VisitNumber.ToLower().Contains(s) ||
                v.TokenDisplay.ToLower().Contains(s) ||
                v.Patient.FullName.ToLower().Contains(s) ||
                v.Patient.PatientCode.ToLower().Contains(s) ||
                v.Patient.PhoneNumber.Contains(s) ||
                v.Doctor.User.FullName.ToLower().Contains(s));
        }

        var total = await query.CountAsync(cancellationToken);
        query = request.SortBy?.ToLower() switch
        {
            "token" => request.SortDirection == "desc"
                ? query.OrderByDescending(v => v.VisitDate).ThenByDescending(v => v.TokenNumber)
                : query.OrderBy(v => v.VisitDate).ThenBy(v => v.TokenNumber),
            _ => request.SortDirection == "asc"
                ? query.OrderBy(v => v.CreatedAt)
                : query.OrderByDescending(v => v.CreatedAt)
        };

        var items = await query
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        return new PagedResponse<VisitDto>
        {
            Items = items.Select(MapDto).ToList(),
            Page = request.Page,
            PageSize = request.PageSize,
            TotalCount = total
        };
    }

    public async Task<IReadOnlyList<VisitDto>> GetDoctorQueueAsync(int? doctorId, DateOnly? date, CancellationToken cancellationToken = default)
    {
        var targetDate = date ?? DateOnly.FromDateTime(DateTime.Today);
        var query = BaseQuery().Where(v => v.VisitDate == targetDate);

        if (currentUser.IsInRole(nameof(RoleType.Doctor)))
        {
            var myDoctorId = await db.Doctors.Where(d => d.UserId == currentUser.UserId).Select(d => d.Id).FirstOrDefaultAsync(cancellationToken);
            query = query.Where(v => v.DoctorId == myDoctorId);
        }
        else if (doctorId.HasValue)
        {
            query = query.Where(v => v.DoctorId == doctorId.Value);
        }

        var activeStatuses = new[]
        {
            VisitStatus.CheckedIn,
            VisitStatus.Waiting,
            VisitStatus.InConsultation,
            VisitStatus.ConsultationCompleted,
            VisitStatus.BillingPending,
            VisitStatus.ReadyForCheckout
        };

        var items = await query
            .Where(v => activeStatuses.Contains(v.Status))
            .OrderBy(v => v.DoctorId)
            .ThenBy(v => v.TokenNumber)
            .ToListAsync(cancellationToken);

        return items.Select(MapDto).ToList();
    }

    public async Task<VisitDto> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var visit = await BaseQuery().FirstOrDefaultAsync(v => v.Id == id, cancellationToken)
            ?? throw new NotFoundException($"Visit {id} not found.");

        if (currentUser.IsInRole(nameof(RoleType.Patient)))
        {
            var myPatientId = await db.Patients.Where(p => p.UserId == currentUser.UserId).Select(p => p.Id).FirstOrDefaultAsync(cancellationToken);
            if (visit.PatientId != myPatientId) throw new ForbiddenException();
        }
        else if (currentUser.IsInRole(nameof(RoleType.Doctor)))
        {
            var myDoctorId = await db.Doctors.Where(d => d.UserId == currentUser.UserId).Select(d => d.Id).FirstOrDefaultAsync(cancellationToken);
            if (visit.DoctorId != myDoctorId) throw new ForbiddenException();
        }

        return MapDto(visit);
    }

    public async Task<VisitDto> CheckInAppointmentAsync(CheckInAppointmentRequest request, CancellationToken cancellationToken = default)
    {
        await using var tx = db.SupportsTransactions
            ? await db.BeginTransactionAsync(IsolationLevel.Serializable, cancellationToken)
            : null;

        var appointment = await db.Appointments
            .Include(a => a.Patient)
            .Include(a => a.Doctor).ThenInclude(d => d.User)
            .Include(a => a.Department)
            .Include(a => a.Visit)
            .FirstOrDefaultAsync(a => a.Id == request.AppointmentId, cancellationToken)
            ?? throw new NotFoundException($"Appointment {request.AppointmentId} not found.");

        if (appointment.Status is AppointmentStatus.Cancelled or AppointmentStatus.NoShow)
        {
            throw new BusinessRuleException($"Cannot check in a {appointment.Status} appointment.");
        }

        if (appointment.Status is AppointmentStatus.CheckedIn or AppointmentStatus.Completed || appointment.Visit is not null)
        {
            throw new ConflictException("This appointment has already been checked in.");
        }

        var visitDate = DateOnly.FromDateTime(DateTime.Today);

        // Prevent double active check-in for same patient with same doctor on same day
        var alreadyActive = await db.Visits.AnyAsync(v =>
            v.PatientId == appointment.PatientId &&
            v.DoctorId == appointment.DoctorId &&
            v.VisitDate == visitDate &&
            v.Status != VisitStatus.CheckedOut &&
            v.Status != VisitStatus.Cancelled &&
            v.Status != VisitStatus.NoShow, cancellationToken);

        if (alreadyActive)
        {
            throw new ConflictException("Patient already has an active visit in queue with this doctor today.");
        }

        var (tokenNumber, tokenDisplay) = await codeGenerator.GenerateDailyDoctorTokenAsync(appointment.DoctorId, visitDate, cancellationToken);
        var visitNumber = await codeGenerator.GenerateVisitNumberAsync(visitDate, cancellationToken);

        var visit = new Visit
        {
            VisitNumber = visitNumber,
            AppointmentId = appointment.Id,
            Appointment = appointment,
            PatientId = appointment.PatientId,
            Patient = appointment.Patient,
            DoctorId = appointment.DoctorId,
            Doctor = appointment.Doctor,
            DepartmentId = appointment.DepartmentId,
            Department = appointment.Department,
            VisitDate = visitDate,
            VisitType = VisitType.Appointment,
            TokenNumber = tokenNumber,
            TokenDisplay = tokenDisplay,
            Status = VisitStatus.Waiting,
            CheckedInAt = DateTime.UtcNow,
            CheckedInByUserId = currentUser.UserId,
            ChiefComplaint = string.IsNullOrWhiteSpace(request.ChiefComplaint) ? appointment.ReasonForVisit : request.ChiefComplaint.Trim(),
            Notes = request.Notes?.Trim()
        };

        appointment.Status = AppointmentStatus.CheckedIn;
        appointment.UpdatedAt = DateTime.UtcNow;

        db.Visits.Add(visit);
        await db.SaveChangesAsync(cancellationToken);

        if (tx is not null) await tx.CommitAsync(cancellationToken);

        if (appointment.Patient.UserId.HasValue)
        {
            await notificationService.SendAsync(
                appointment.Patient.UserId.Value,
                "Checked In & Token Assigned",
                $"You are checked in for {appointment.Doctor.User.FullName}. Your OPD token is {visit.TokenDisplay} (Room {appointment.Doctor.RoomNumber}).",
                NotificationType.CheckedIn,
                nameof(Visit),
                visit.Id,
                cancellationToken);
        }

        await notificationService.SendAsync(
            appointment.Doctor.UserId,
            "Patient Waiting in Queue",
            $"Token {visit.TokenDisplay}: {appointment.Patient.FullName} has checked in.",
            NotificationType.CheckedIn,
            nameof(Visit),
            visit.Id,
            cancellationToken);

        await auditService.LogAsync("CheckInAppointment", nameof(Visit), visit.Id.ToString(), $"Checked in {appointment.AppointmentNumber} as {visit.VisitNumber} Token {visit.TokenDisplay}", cancellationToken: cancellationToken);
        return MapDto(visit);
    }

    public async Task<VisitDto> CheckInWalkInAsync(WalkInCheckInRequest request, CancellationToken cancellationToken = default)
    {
        await using var tx = db.SupportsTransactions
            ? await db.BeginTransactionAsync(IsolationLevel.Serializable, cancellationToken)
            : null;

        var patient = await db.Patients.FirstOrDefaultAsync(p => p.Id == request.PatientId, cancellationToken)
            ?? throw new NotFoundException($"Patient {request.PatientId} not found.");

        var doctor = await db.Doctors
            .Include(d => d.User)
            .Include(d => d.Department)
            .FirstOrDefaultAsync(d => d.Id == request.DoctorId && d.IsActive, cancellationToken)
            ?? throw new NotFoundException($"Active doctor {request.DoctorId} not found.");

        if (request.DepartmentId != doctor.DepartmentId)
        {
            throw new BusinessRuleException("Doctor does not belong to the selected department.");
        }

        var visitDate = DateOnly.FromDateTime(DateTime.Today);

        var alreadyActive = await db.Visits.AnyAsync(v =>
            v.PatientId == patient.Id &&
            v.DoctorId == doctor.Id &&
            v.VisitDate == visitDate &&
            v.Status != VisitStatus.CheckedOut &&
            v.Status != VisitStatus.Cancelled &&
            v.Status != VisitStatus.NoShow, cancellationToken);

        if (alreadyActive)
        {
            throw new ConflictException("Patient already has an active visit in this doctor's queue today.");
        }

        var (tokenNumber, tokenDisplay) = await codeGenerator.GenerateDailyDoctorTokenAsync(doctor.Id, visitDate, cancellationToken);
        var visitNumber = await codeGenerator.GenerateVisitNumberAsync(visitDate, cancellationToken);

        var visit = new Visit
        {
            VisitNumber = visitNumber,
            AppointmentId = null,
            PatientId = patient.Id,
            Patient = patient,
            DoctorId = doctor.Id,
            Doctor = doctor,
            DepartmentId = doctor.DepartmentId,
            Department = doctor.Department,
            VisitDate = visitDate,
            VisitType = VisitType.WalkIn,
            TokenNumber = tokenNumber,
            TokenDisplay = tokenDisplay,
            Status = VisitStatus.Waiting,
            CheckedInAt = DateTime.UtcNow,
            CheckedInByUserId = currentUser.UserId,
            ChiefComplaint = request.ChiefComplaint?.Trim(),
            Notes = request.Notes?.Trim()
        };

        db.Visits.Add(visit);
        await db.SaveChangesAsync(cancellationToken);

        if (tx is not null) await tx.CommitAsync(cancellationToken);

        if (patient.UserId.HasValue)
        {
            await notificationService.SendAsync(
                patient.UserId.Value,
                "Walk-In Visit Registered",
                $"Walk-in visit {visit.VisitNumber} created for {doctor.User.FullName}. Token: {visit.TokenDisplay}.",
                NotificationType.CheckedIn,
                nameof(Visit),
                visit.Id,
                cancellationToken);
        }

        await notificationService.SendAsync(
            doctor.UserId,
            "Walk-In Patient Waiting",
            $"Token {visit.TokenDisplay}: {patient.FullName} (Walk-In) is waiting.",
            NotificationType.CheckedIn,
            nameof(Visit),
            visit.Id,
            cancellationToken);

        await auditService.LogAsync("CheckInWalkIn", nameof(Visit), visit.Id.ToString(), $"Walk-in {visit.VisitNumber} Token {visit.TokenDisplay}", cancellationToken: cancellationToken);
        return MapDto(visit);
    }

    public async Task<VisitDto> UpdateStatusAsync(int id, UpdateVisitStatusRequest request, CancellationToken cancellationToken = default)
    {
        var visit = await BaseQuery().FirstOrDefaultAsync(v => v.Id == id, cancellationToken)
            ?? throw new NotFoundException($"Visit {id} not found.");

        if (!Enum.TryParse<VisitStatus>(request.Status, true, out var targetStatus))
        {
            throw new BusinessRuleException($"Invalid visit status '{request.Status}'.");
        }

        if (visit.Status == VisitStatus.CheckedOut)
        {
            throw new BusinessRuleException("Checked-out visits cannot change status.");
        }

        if (targetStatus == VisitStatus.CheckedOut)
        {
            return await CheckOutAsync(id, request.Notes, cancellationToken);
        }

        visit.Status = targetStatus;
        if (!string.IsNullOrWhiteSpace(request.Reason)) visit.CancellationReason = request.Reason.Trim();
        if (!string.IsNullOrWhiteSpace(request.Notes)) visit.Notes = request.Notes.Trim();
        visit.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(cancellationToken);
        await auditService.LogAsync("UpdateVisitStatus", nameof(Visit), visit.Id.ToString(), $"Visit {visit.VisitNumber} status -> {targetStatus}", cancellationToken: cancellationToken);
        return MapDto(visit);
    }

    public async Task<VisitDto> CheckOutAsync(int id, string? notes, CancellationToken cancellationToken = default)
    {
        var visit = await BaseQuery().FirstOrDefaultAsync(v => v.Id == id, cancellationToken)
            ?? throw new NotFoundException($"Visit {id} not found.");

        if (visit.Status == VisitStatus.CheckedOut)
        {
            throw new ConflictException("Patient is already checked out for this visit.");
        }

        if (visit.Status is VisitStatus.Cancelled or VisitStatus.NoShow)
        {
            throw new BusinessRuleException($"Cannot check out a {visit.Status} visit.");
        }

        if (visit.Status is VisitStatus.Scheduled or VisitStatus.CheckedIn or VisitStatus.Waiting or VisitStatus.InConsultation)
        {
            throw new BusinessRuleException("Consultation must be completed before checking out the patient.");
        }

        var settings = await db.HospitalSettings.AsNoTracking().FirstOrDefaultAsync(cancellationToken);
        var requireFullPayment = settings?.RequireFullPaymentBeforeCheckout ?? true;

        if (visit.Bill is null)
        {
            throw new BusinessRuleException("A bill must be generated before patient check-out.");
        }

        if (requireFullPayment && visit.Bill.BalanceAmount > 0)
        {
            throw new BusinessRuleException($"Outstanding bill balance of {visit.Bill.BalanceAmount:0.00} must be paid before check-out.");
        }

        visit.Status = VisitStatus.CheckedOut;
        visit.CheckedOutAt = DateTime.UtcNow;
        visit.CheckedOutByUserId = currentUser.UserId;
        if (!string.IsNullOrWhiteSpace(notes)) visit.Notes = notes.Trim();
        visit.UpdatedAt = DateTime.UtcNow;

        if (visit.Appointment is not null && visit.Appointment.Status != AppointmentStatus.Completed)
        {
            visit.Appointment.Status = AppointmentStatus.Completed;
            visit.Appointment.UpdatedAt = DateTime.UtcNow;
        }

        await db.SaveChangesAsync(cancellationToken);

        if (visit.Patient.UserId.HasValue)
        {
            await notificationService.SendAsync(
                visit.Patient.UserId.Value,
                "OPD Visit Completed",
                $"Thank you for visiting SH Hospital. Your visit {visit.VisitNumber} is checked out. Prescriptions and receipts are available in your portal.",
                NotificationType.CheckedOut,
                nameof(Visit),
                visit.Id,
                cancellationToken);
        }

        await auditService.LogAsync("CheckOut", nameof(Visit), visit.Id.ToString(), $"Checked out visit {visit.VisitNumber}", cancellationToken: cancellationToken);
        return MapDto(visit);
    }

    private IQueryable<Visit> BaseQuery() => db.Visits
        .Include(v => v.Appointment)
        .Include(v => v.Patient)
        .Include(v => v.Doctor).ThenInclude(d => d.User)
        .Include(v => v.Department)
        .Include(v => v.Consultation)
        .Include(v => v.Bill);

    private static VisitDto MapDto(Visit v) => new(
        v.Id,
        v.VisitNumber,
        v.AppointmentId,
        v.Appointment?.AppointmentNumber,
        v.PatientId,
        v.Patient.PatientCode,
        v.Patient.FullName,
        v.Patient.PhoneNumber,
        PatientService.CalculateAge(v.Patient.DateOfBirth),
        v.Patient.Gender.ToString(),
        v.DoctorId,
        v.Doctor.DoctorCode,
        v.Doctor.User.FullName,
        v.Doctor.RoomNumber,
        v.DepartmentId,
        v.Department.Name,
        v.VisitDate,
        v.VisitType.ToString(),
        v.TokenNumber,
        v.TokenDisplay,
        v.Status.ToString(),
        v.CheckedInAt,
        v.ConsultationStartedAt,
        v.ConsultationCompletedAt,
        v.CheckedOutAt,
        v.ChiefComplaint,
        v.Notes,
        v.Consultation?.Id,
        v.Bill?.Id,
        v.Bill?.Status.ToString(),
        v.Bill?.TotalAmount,
        v.Bill?.BalanceAmount);
}
