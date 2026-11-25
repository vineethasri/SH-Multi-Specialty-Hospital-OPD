using System.Data;
using Hospital.Application.Common;
using Hospital.Application.DTOs.Appointments;
using Hospital.Application.Interfaces;
using Hospital.Domain.Entities;
using Hospital.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Hospital.Application.Services;

public class AppointmentService(
    IApplicationDbContext db,
    ICurrentUserService currentUser,
    ICodeGeneratorService codeGenerator,
    INotificationService notificationService,
    IAuditService auditService) : IAppointmentService
{
    public async Task<PagedResponse<AppointmentDto>> GetAppointmentsAsync(
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
            query = query.Where(a => a.PatientId == myPatientId);
        }
        else if (currentUser.IsInRole(nameof(RoleType.Doctor)))
        {
            var myDoctorId = await db.Doctors.Where(d => d.UserId == currentUser.UserId).Select(d => d.Id).FirstOrDefaultAsync(cancellationToken);
            query = query.Where(a => a.DoctorId == myDoctorId);
        }

        if (date.HasValue) query = query.Where(a => a.AppointmentDate == date.Value);
        if (doctorId.HasValue) query = query.Where(a => a.DoctorId == doctorId.Value);
        if (departmentId.HasValue) query = query.Where(a => a.DepartmentId == departmentId.Value);
        if (patientId.HasValue && !currentUser.IsInRole(nameof(RoleType.Patient))) query = query.Where(a => a.PatientId == patientId.Value);

        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<AppointmentStatus>(status, true, out var parsedStatus))
        {
            query = query.Where(a => a.Status == parsedStatus);
        }

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var s = request.Search.Trim().ToLower();
            query = query.Where(a =>
                a.AppointmentNumber.ToLower().Contains(s) ||
                a.Patient.FullName.ToLower().Contains(s) ||
                a.Patient.PatientCode.ToLower().Contains(s) ||
                a.Patient.PhoneNumber.Contains(s) ||
                a.Doctor.User.FullName.ToLower().Contains(s));
        }

        var total = await query.CountAsync(cancellationToken);
        query = request.SortBy?.ToLower() switch
        {
            "date" => request.SortDirection == "asc"
                ? query.OrderBy(a => a.AppointmentDate).ThenBy(a => a.StartTime)
                : query.OrderByDescending(a => a.AppointmentDate).ThenByDescending(a => a.StartTime),
            _ => request.SortDirection == "asc"
                ? query.OrderBy(a => a.AppointmentDate).ThenBy(a => a.StartTime)
                : query.OrderByDescending(a => a.AppointmentDate).ThenBy(a => a.StartTime)
        };

        var items = await query
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        return new PagedResponse<AppointmentDto>
        {
            Items = items.Select(MapDto).ToList(),
            Page = request.Page,
            PageSize = request.PageSize,
            TotalCount = total
        };
    }

    public async Task<AppointmentDto> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var appt = await BaseQuery().FirstOrDefaultAsync(a => a.Id == id, cancellationToken)
            ?? throw new NotFoundException($"Appointment {id} not found.");

        await EnsureAppointmentAccessAsync(appt, cancellationToken);
        return MapDto(appt);
    }

    public async Task<AppointmentDto> BookAsync(BookAppointmentRequest request, CancellationToken cancellationToken = default)
    {
        var isPatientCaller = currentUser.IsInRole(nameof(RoleType.Patient));
        var settings = await db.HospitalSettings.AsNoTracking().FirstOrDefaultAsync(cancellationToken);

        if (isPatientCaller && settings is { AllowOnlineBooking: false })
        {
            throw new BusinessRuleException("Online appointment booking is currently disabled by hospital administration.");
        }

        int resolvedPatientId;
        if (isPatientCaller)
        {
            resolvedPatientId = await db.Patients
                .Where(p => p.UserId == currentUser.UserId)
                .Select(p => p.Id)
                .FirstOrDefaultAsync(cancellationToken);
            if (resolvedPatientId == 0) throw new NotFoundException("Patient profile not found.");
        }
        else
        {
            if (!request.PatientId.HasValue)
                throw new BusinessRuleException("PatientId is required when booking from reception or admin.");
            resolvedPatientId = request.PatientId.Value;
        }

        var today = DateOnly.FromDateTime(DateTime.Now);
        if (request.AppointmentDate < today)
        {
            throw new BusinessRuleException("Appointments cannot be booked in the past.");
        }

        if (request.AppointmentDate == today && request.StartTime <= DateTime.Now.TimeOfDay)
        {
            throw new BusinessRuleException("Selected time slot has already passed.");
        }

        var patient = await db.Patients.FirstOrDefaultAsync(p => p.Id == resolvedPatientId, cancellationToken)
            ?? throw new NotFoundException($"Patient {resolvedPatientId} not found.");

        var doctor = await db.Doctors
            .Include(d => d.User)
            .Include(d => d.Department)
            .FirstOrDefaultAsync(d => d.Id == request.DoctorId && d.IsActive, cancellationToken)
            ?? throw new NotFoundException($"Active doctor {request.DoctorId} not found.");

        if (isPatientCaller && !doctor.IsAvailableForOnlineBooking)
        {
            throw new BusinessRuleException("This doctor is not available for online booking. Please contact reception.");
        }

        if (request.DepartmentId != doctor.DepartmentId)
        {
            throw new BusinessRuleException("Selected doctor does not belong to the chosen department.");
        }

        var schedule = await db.DoctorSchedules.FirstOrDefaultAsync(s =>
            s.DoctorId == doctor.Id &&
            s.DayOfWeek == request.AppointmentDate.DayOfWeek &&
            s.IsActive &&
            s.StartTime <= request.StartTime &&
            s.EndTime > request.StartTime, cancellationToken)
            ?? throw new BusinessRuleException("Doctor has no active schedule covering the selected date and time.");

        var endTime = request.StartTime.Add(TimeSpan.FromMinutes(schedule.SlotDurationMinutes));
        if (endTime > schedule.EndTime)
        {
            throw new BusinessRuleException("Selected slot extends beyond the doctor's scheduled hours.");
        }

        await using var tx = db.SupportsTransactions
            ? await db.BeginTransactionAsync(IsolationLevel.Serializable, cancellationToken)
            : null;

        // Check doctor slot capacity / overlap
        var doctorBookingsCount = await db.Appointments.CountAsync(a =>
            a.DoctorId == doctor.Id &&
            a.AppointmentDate == request.AppointmentDate &&
            a.Status != AppointmentStatus.Cancelled &&
            a.Status != AppointmentStatus.NoShow &&
            a.StartTime < endTime &&
            a.EndTime > request.StartTime, cancellationToken);

        if (doctorBookingsCount >= schedule.MaxPatientsPerSlot)
        {
            throw new ConflictException("This time slot is already fully booked. Please select another slot.");
        }

        // Check patient overlapping booking on same date/time
        var patientOverlap = await db.Appointments.AnyAsync(a =>
            a.PatientId == patient.Id &&
            a.AppointmentDate == request.AppointmentDate &&
            a.Status != AppointmentStatus.Cancelled &&
            a.Status != AppointmentStatus.NoShow &&
            a.StartTime < endTime &&
            a.EndTime > request.StartTime, cancellationToken);

        if (patientOverlap)
        {
            throw new ConflictException("Patient already has another appointment scheduled at this time.");
        }

        var appointment = new Appointment
        {
            AppointmentNumber = await codeGenerator.GenerateAppointmentNumberAsync(request.AppointmentDate, cancellationToken),
            PatientId = patient.Id,
            Patient = patient,
            DoctorId = doctor.Id,
            Doctor = doctor,
            DepartmentId = doctor.DepartmentId,
            Department = doctor.Department,
            AppointmentDate = request.AppointmentDate,
            StartTime = request.StartTime,
            EndTime = endTime,
            BookingSource = isPatientCaller ? BookingSource.Online : BookingSource.Reception,
            Status = isPatientCaller ? AppointmentStatus.Booked : AppointmentStatus.Confirmed,
            ReasonForVisit = request.ReasonForVisit.Trim(),
            BookedByUserId = currentUser.UserId
        };

        db.Appointments.Add(appointment);
        await db.SaveChangesAsync(cancellationToken);

        if (tx is not null) await tx.CommitAsync(cancellationToken);

        if (patient.UserId.HasValue)
        {
            await notificationService.SendAsync(
                patient.UserId.Value,
                "Appointment Booked",
                $"Your appointment {appointment.AppointmentNumber} with {doctor.User.FullName} on {appointment.AppointmentDate:dd MMM yyyy} at {DateTime.Today.Add(appointment.StartTime):hh:mm tt} is {appointment.Status}.",
                NotificationType.AppointmentBooked,
                nameof(Appointment),
                appointment.Id,
                cancellationToken);
        }

        await notificationService.SendAsync(
            doctor.UserId,
            "New OPD Appointment",
            $"Patient {patient.FullName} booked {appointment.AppointmentNumber} for {appointment.AppointmentDate:dd MMM yyyy} at {DateTime.Today.Add(appointment.StartTime):hh:mm tt}.",
            NotificationType.AppointmentBooked,
            nameof(Appointment),
            appointment.Id,
            cancellationToken);

        await auditService.LogAsync("BookAppointment", nameof(Appointment), appointment.Id.ToString(), $"Booked {appointment.AppointmentNumber}", cancellationToken: cancellationToken);
        return MapDto(appointment);
    }

    public async Task<AppointmentDto> ConfirmAsync(int id, CancellationToken cancellationToken = default)
    {
        var appt = await BaseQuery().FirstOrDefaultAsync(a => a.Id == id, cancellationToken)
            ?? throw new NotFoundException($"Appointment {id} not found.");

        if (appt.Status != AppointmentStatus.Booked)
        {
            throw new BusinessRuleException($"Cannot confirm appointment in '{appt.Status}' status.");
        }

        appt.Status = AppointmentStatus.Confirmed;
        appt.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(cancellationToken);

        if (appt.Patient.UserId.HasValue)
        {
            await notificationService.SendAsync(appt.Patient.UserId.Value, "Appointment Confirmed", $"Your appointment {appt.AppointmentNumber} has been verified and confirmed.", NotificationType.AppointmentBooked, nameof(Appointment), appt.Id, cancellationToken);
        }

        await auditService.LogAsync("ConfirmAppointment", nameof(Appointment), appt.Id.ToString(), $"Confirmed {appt.AppointmentNumber}", cancellationToken: cancellationToken);
        return MapDto(appt);
    }

    public async Task<AppointmentDto> CancelAsync(int id, CancelAppointmentRequest request, CancellationToken cancellationToken = default)
    {
        var appt = await BaseQuery().FirstOrDefaultAsync(a => a.Id == id, cancellationToken)
            ?? throw new NotFoundException($"Appointment {id} not found.");

        await EnsureAppointmentAccessAsync(appt, cancellationToken);

        if (appt.Status is AppointmentStatus.CheckedIn or AppointmentStatus.Completed or AppointmentStatus.Cancelled)
        {
            throw new BusinessRuleException($"Appointment in '{appt.Status}' status cannot be cancelled.");
        }

        appt.Status = AppointmentStatus.Cancelled;
        appt.CancellationReason = request.Reason.Trim();
        appt.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(cancellationToken);

        if (appt.Patient.UserId.HasValue)
        {
            await notificationService.SendAsync(appt.Patient.UserId.Value, "Appointment Cancelled", $"Appointment {appt.AppointmentNumber} has been cancelled. Reason: {appt.CancellationReason}", NotificationType.AppointmentCancelled, nameof(Appointment), appt.Id, cancellationToken);
        }

        await auditService.LogAsync("CancelAppointment", nameof(Appointment), appt.Id.ToString(), $"Cancelled {appt.AppointmentNumber}: {appt.CancellationReason}", cancellationToken: cancellationToken);
        return MapDto(appt);
    }

    public async Task<AppointmentDto> MarkNoShowAsync(int id, CancellationToken cancellationToken = default)
    {
        var appt = await BaseQuery().FirstOrDefaultAsync(a => a.Id == id, cancellationToken)
            ?? throw new NotFoundException($"Appointment {id} not found.");

        if (appt.Status is not (AppointmentStatus.Booked or AppointmentStatus.Confirmed))
        {
            throw new BusinessRuleException($"Cannot mark appointment in '{appt.Status}' status as No-Show.");
        }

        appt.Status = AppointmentStatus.NoShow;
        appt.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        await auditService.LogAsync("MarkNoShow", nameof(Appointment), appt.Id.ToString(), $"Marked {appt.AppointmentNumber} as NoShow", cancellationToken: cancellationToken);
        return MapDto(appt);
    }

    public async Task<AppointmentDto> RescheduleAsync(int id, RescheduleAppointmentRequest request, CancellationToken cancellationToken = default)
    {
        var appt = await BaseQuery().FirstOrDefaultAsync(a => a.Id == id, cancellationToken)
            ?? throw new NotFoundException($"Appointment {id} not found.");

        await EnsureAppointmentAccessAsync(appt, cancellationToken);

        if (appt.Status is not (AppointmentStatus.Booked or AppointmentStatus.Confirmed))
        {
            throw new BusinessRuleException($"Appointment in '{appt.Status}' status cannot be rescheduled.");
        }

        var schedule = await db.DoctorSchedules.FirstOrDefaultAsync(s =>
            s.DoctorId == appt.DoctorId &&
            s.DayOfWeek == request.AppointmentDate.DayOfWeek &&
            s.IsActive &&
            s.StartTime <= request.StartTime &&
            s.EndTime > request.StartTime, cancellationToken)
            ?? throw new BusinessRuleException("Doctor has no active schedule for the selected date and time.");

        var endTime = request.StartTime.Add(TimeSpan.FromMinutes(schedule.SlotDurationMinutes));
        var count = await db.Appointments.CountAsync(a =>
            a.Id != appt.Id &&
            a.DoctorId == appt.DoctorId &&
            a.AppointmentDate == request.AppointmentDate &&
            a.Status != AppointmentStatus.Cancelled &&
            a.Status != AppointmentStatus.NoShow &&
            a.StartTime < endTime &&
            a.EndTime > request.StartTime, cancellationToken);

        if (count >= schedule.MaxPatientsPerSlot)
        {
            throw new ConflictException("Selected slot is unavailable.");
        }

        appt.AppointmentDate = request.AppointmentDate;
        appt.StartTime = request.StartTime;
        appt.EndTime = endTime;
        appt.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(cancellationToken);
        await auditService.LogAsync("RescheduleAppointment", nameof(Appointment), appt.Id.ToString(), $"Rescheduled {appt.AppointmentNumber}", cancellationToken: cancellationToken);
        return MapDto(appt);
    }

    private IQueryable<Appointment> BaseQuery() => db.Appointments
        .Include(a => a.Patient)
        .Include(a => a.Doctor).ThenInclude(d => d.User)
        .Include(a => a.Department)
        .Include(a => a.Visit);

    private async Task EnsureAppointmentAccessAsync(Appointment appt, CancellationToken cancellationToken)
    {
        if (currentUser.IsInRole(nameof(RoleType.Admin), nameof(RoleType.Receptionist))) return;

        if (currentUser.IsInRole(nameof(RoleType.Patient)))
        {
            var myPatientId = await db.Patients.Where(p => p.UserId == currentUser.UserId).Select(p => p.Id).FirstOrDefaultAsync(cancellationToken);
            if (appt.PatientId != myPatientId) throw new ForbiddenException();
            return;
        }

        if (currentUser.IsInRole(nameof(RoleType.Doctor)))
        {
            var myDoctorId = await db.Doctors.Where(d => d.UserId == currentUser.UserId).Select(d => d.Id).FirstOrDefaultAsync(cancellationToken);
            if (appt.DoctorId != myDoctorId) throw new ForbiddenException();
        }
    }

    private static AppointmentDto MapDto(Appointment a) => new(
        a.Id,
        a.AppointmentNumber,
        a.PatientId,
        a.Patient.PatientCode,
        a.Patient.FullName,
        a.Patient.PhoneNumber,
        a.DoctorId,
        a.Doctor.DoctorCode,
        a.Doctor.User.FullName,
        a.DepartmentId,
        a.Department.Name,
        a.AppointmentDate,
        a.StartTime,
        a.EndTime,
        a.BookingSource.ToString(),
        a.Status.ToString(),
        a.ReasonForVisit,
        a.CancellationReason,
        a.Visit?.Id,
        a.CreatedAt);
}
