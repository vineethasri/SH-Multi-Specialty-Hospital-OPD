using Hospital.Application.Common;
using Hospital.Application.DTOs.Doctors;
using Hospital.Application.Interfaces;
using Hospital.Domain.Entities;
using Hospital.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Hospital.Application.Services;

public class DoctorService(
    IApplicationDbContext db,
    IPasswordHasher passwordHasher,
    ICodeGeneratorService codeGenerator,
    IAuditService auditService) : IDoctorService
{
    public async Task<PagedResponse<DoctorDto>> GetDoctorsAsync(
        PagedRequest request,
        int? departmentId,
        bool? isActive,
        bool? onlineOnly,
        CancellationToken cancellationToken = default)
    {
        var query = db.Doctors
            .AsNoTracking()
            .Include(d => d.User)
            .Include(d => d.Department)
            .Include(d => d.Schedules)
            .AsQueryable();

        if (departmentId.HasValue) query = query.Where(d => d.DepartmentId == departmentId.Value);
        if (isActive.HasValue) query = query.Where(d => d.IsActive == isActive.Value);
        if (onlineOnly == true) query = query.Where(d => d.IsAvailableForOnlineBooking && d.IsActive);

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var s = request.Search.Trim().ToLower();
            query = query.Where(d =>
                d.User.FullName.ToLower().Contains(s) ||
                d.Specialization.ToLower().Contains(s) ||
                d.DoctorCode.ToLower().Contains(s) ||
                d.Department.Name.ToLower().Contains(s));
        }

        var total = await query.CountAsync(cancellationToken);
        query = request.SortBy?.ToLower() switch
        {
            "fee" => request.SortDirection == "asc" ? query.OrderBy(d => d.ConsultationFee) : query.OrderByDescending(d => d.ConsultationFee),
            "experience" => request.SortDirection == "asc" ? query.OrderBy(d => d.ExperienceYears) : query.OrderByDescending(d => d.ExperienceYears),
            _ => request.SortDirection == "desc" ? query.OrderByDescending(d => d.User.FullName) : query.OrderBy(d => d.User.FullName)
        };

        var items = await query
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        return new PagedResponse<DoctorDto>
        {
            Items = items.Select(MapDoctor).ToList(),
            Page = request.Page,
            PageSize = request.PageSize,
            TotalCount = total
        };
    }

    public async Task<DoctorDto> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var d = await db.Doctors
            .AsNoTracking()
            .Include(x => x.User)
            .Include(x => x.Department)
            .Include(x => x.Schedules)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new NotFoundException($"Doctor {id} not found.");

        return MapDoctor(d);
    }

    public async Task<DoctorDto> CreateAsync(CreateDoctorRequest request, CancellationToken cancellationToken = default)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        if (await db.Users.AnyAsync(u => u.Email.ToLower() == email, cancellationToken))
        {
            throw new ConflictException("A user with this email already exists.");
        }

        if (await db.Doctors.AnyAsync(d => d.RegistrationNumber == request.RegistrationNumber.Trim(), cancellationToken))
        {
            throw new ConflictException("A doctor with this medical registration number already exists.");
        }

        var dept = await db.Departments.FirstOrDefaultAsync(d => d.Id == request.DepartmentId, cancellationToken)
            ?? throw new NotFoundException($"Department {request.DepartmentId} not found.");

        var doctorRole = await db.Roles.FirstOrDefaultAsync(r => r.Name == nameof(RoleType.Doctor), cancellationToken)
            ?? throw new BusinessRuleException("Doctor role is not configured.");

        var user = new User
        {
            RoleId = doctorRole.Id,
            Role = doctorRole,
            FullName = request.FullName.Trim(),
            Email = email,
            PhoneNumber = request.PhoneNumber.Trim(),
            PasswordHash = passwordHasher.Hash(request.Password),
            IsActive = true
        };

        db.Users.Add(user);
        await db.SaveChangesAsync(cancellationToken);

        var doctor = new Doctor
        {
            UserId = user.Id,
            User = user,
            DepartmentId = dept.Id,
            Department = dept,
            DoctorCode = await codeGenerator.GenerateDoctorCodeAsync(cancellationToken),
            Specialization = request.Specialization.Trim(),
            Qualification = request.Qualification.Trim(),
            RegistrationNumber = request.RegistrationNumber.Trim(),
            ExperienceYears = request.ExperienceYears,
            ConsultationFee = request.ConsultationFee,
            Bio = request.Bio.Trim(),
            RoomNumber = request.RoomNumber.Trim(),
            AverageConsultationMinutes = request.AverageConsultationMinutes > 0 ? request.AverageConsultationMinutes : 15,
            IsAvailableForOnlineBooking = request.IsAvailableForOnlineBooking,
            IsActive = true
        };

        db.Doctors.Add(doctor);
        await db.SaveChangesAsync(cancellationToken);
        await auditService.LogAsync("CreateDoctor", nameof(Doctor), doctor.Id.ToString(), $"Created doctor {doctor.DoctorCode} ({user.FullName})", cancellationToken: cancellationToken);

        return MapDoctor(doctor);
    }

    public async Task<DoctorDto> UpdateAsync(int id, UpdateDoctorRequest request, CancellationToken cancellationToken = default)
    {
        var doctor = await db.Doctors
            .Include(d => d.User)
            .Include(d => d.Department)
            .Include(d => d.Schedules)
            .FirstOrDefaultAsync(d => d.Id == id, cancellationToken)
            ?? throw new NotFoundException($"Doctor {id} not found.");

        var dept = await db.Departments.FirstOrDefaultAsync(d => d.Id == request.DepartmentId, cancellationToken)
            ?? throw new NotFoundException($"Department {request.DepartmentId} not found.");

        if (await db.Doctors.AnyAsync(d => d.Id != id && d.RegistrationNumber == request.RegistrationNumber.Trim(), cancellationToken))
        {
            throw new ConflictException("Another doctor already uses this registration number.");
        }

        doctor.User.FullName = request.FullName.Trim();
        doctor.User.PhoneNumber = request.PhoneNumber.Trim();
        doctor.User.IsActive = request.IsActive;
        doctor.User.UpdatedAt = DateTime.UtcNow;

        doctor.DepartmentId = dept.Id;
        doctor.Department = dept;
        doctor.Specialization = request.Specialization.Trim();
        doctor.Qualification = request.Qualification.Trim();
        doctor.RegistrationNumber = request.RegistrationNumber.Trim();
        doctor.ExperienceYears = request.ExperienceYears;
        doctor.ConsultationFee = request.ConsultationFee;
        doctor.Bio = request.Bio.Trim();
        doctor.RoomNumber = request.RoomNumber.Trim();
        doctor.AverageConsultationMinutes = request.AverageConsultationMinutes > 0 ? request.AverageConsultationMinutes : 15;
        doctor.IsAvailableForOnlineBooking = request.IsAvailableForOnlineBooking;
        doctor.IsActive = request.IsActive;
        doctor.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(cancellationToken);
        await auditService.LogAsync("UpdateDoctor", nameof(Doctor), doctor.Id.ToString(), $"Updated doctor {doctor.DoctorCode}", cancellationToken: cancellationToken);

        return MapDoctor(doctor);
    }

    public async Task<IReadOnlyList<DoctorScheduleDto>> GetSchedulesAsync(int? doctorId, CancellationToken cancellationToken = default)
    {
        var query = db.DoctorSchedules
            .AsNoTracking()
            .Include(s => s.Doctor).ThenInclude(d => d.User)
            .AsQueryable();

        if (doctorId.HasValue) query = query.Where(s => s.DoctorId == doctorId.Value);

        var items = await query.OrderBy(s => s.DoctorId).ThenBy(s => s.DayOfWeek).ThenBy(s => s.StartTime).ToListAsync(cancellationToken);
        return items.Select(MapSchedule).ToList();
    }

    public async Task<DoctorScheduleDto> SaveScheduleAsync(SaveDoctorScheduleRequest request, int? scheduleId = null, CancellationToken cancellationToken = default)
    {
        if (request.EndTime <= request.StartTime)
        {
            throw new BusinessRuleException("Schedule end time must be after start time.");
        }

        if (request.SlotDurationMinutes < 5 || request.SlotDurationMinutes > 120)
        {
            throw new BusinessRuleException("Slot duration must be between 5 and 120 minutes.");
        }

        var doctor = await db.Doctors.Include(d => d.User).FirstOrDefaultAsync(d => d.Id == request.DoctorId, cancellationToken)
            ?? throw new NotFoundException($"Doctor {request.DoctorId} not found.");

        // Prevent overlapping schedule on same day
        var overlap = await db.DoctorSchedules.AnyAsync(s =>
            s.DoctorId == request.DoctorId &&
            s.DayOfWeek == request.DayOfWeek &&
            s.IsActive &&
            (!scheduleId.HasValue || s.Id != scheduleId.Value) &&
            s.StartTime < request.EndTime &&
            s.EndTime > request.StartTime, cancellationToken);

        if (overlap && request.IsActive)
        {
            throw new ConflictException("This schedule overlaps with an existing active schedule for the same day.");
        }

        DoctorSchedule schedule;
        if (scheduleId.HasValue)
        {
            schedule = await db.DoctorSchedules.Include(s => s.Doctor).ThenInclude(d => d.User)
                .FirstOrDefaultAsync(s => s.Id == scheduleId.Value, cancellationToken)
                ?? throw new NotFoundException($"Schedule {scheduleId.Value} not found.");
            schedule.DayOfWeek = request.DayOfWeek;
            schedule.StartTime = request.StartTime;
            schedule.EndTime = request.EndTime;
            schedule.SlotDurationMinutes = request.SlotDurationMinutes;
            schedule.MaxPatientsPerSlot = Math.Max(1, request.MaxPatientsPerSlot);
            schedule.IsActive = request.IsActive;
            schedule.UpdatedAt = DateTime.UtcNow;
        }
        else
        {
            schedule = new DoctorSchedule
            {
                DoctorId = request.DoctorId,
                Doctor = doctor,
                DayOfWeek = request.DayOfWeek,
                StartTime = request.StartTime,
                EndTime = request.EndTime,
                SlotDurationMinutes = request.SlotDurationMinutes,
                MaxPatientsPerSlot = Math.Max(1, request.MaxPatientsPerSlot),
                IsActive = request.IsActive
            };
            db.DoctorSchedules.Add(schedule);
        }

        await db.SaveChangesAsync(cancellationToken);
        await auditService.LogAsync("SaveDoctorSchedule", nameof(DoctorSchedule), schedule.Id.ToString(), $"Saved schedule for {doctor.DoctorCode} on {request.DayOfWeek}", cancellationToken: cancellationToken);
        return MapSchedule(schedule);
    }

    public async Task DeleteScheduleAsync(int scheduleId, CancellationToken cancellationToken = default)
    {
        var schedule = await db.DoctorSchedules.FirstOrDefaultAsync(s => s.Id == scheduleId, cancellationToken)
            ?? throw new NotFoundException($"Schedule {scheduleId} not found.");
        db.DoctorSchedules.Remove(schedule);
        await db.SaveChangesAsync(cancellationToken);
        await auditService.LogAsync("DeleteDoctorSchedule", nameof(DoctorSchedule), scheduleId.ToString(), "Deleted doctor schedule.", cancellationToken: cancellationToken);
    }

    public async Task<IReadOnlyList<TimeSlotDto>> GetAvailableSlotsAsync(int doctorId, DateOnly date, CancellationToken cancellationToken = default)
    {
        var doctor = await db.Doctors.AsNoTracking().FirstOrDefaultAsync(d => d.Id == doctorId && d.IsActive, cancellationToken)
            ?? throw new NotFoundException($"Active doctor {doctorId} not found.");

        var schedules = await db.DoctorSchedules
            .AsNoTracking()
            .Where(s => s.DoctorId == doctorId && s.DayOfWeek == date.DayOfWeek && s.IsActive)
            .OrderBy(s => s.StartTime)
            .ToListAsync(cancellationToken);

        if (schedules.Count == 0)
        {
            return Array.Empty<TimeSlotDto>();
        }

        var existingAppointments = await db.Appointments
            .AsNoTracking()
            .Where(a => a.DoctorId == doctorId
                && a.AppointmentDate == date
                && a.Status != AppointmentStatus.Cancelled
                && a.Status != AppointmentStatus.NoShow)
            .Select(a => new { a.StartTime, a.EndTime })
            .ToListAsync(cancellationToken);

        var today = DateOnly.FromDateTime(DateTime.Now);
        var nowTime = DateTime.Now.TimeOfDay;
        var slots = new List<TimeSlotDto>();

        foreach (var sched in schedules)
        {
            var slotDuration = TimeSpan.FromMinutes(sched.SlotDurationMinutes);
            var cursor = sched.StartTime;
            while (cursor + slotDuration <= sched.EndTime)
            {
                var slotEnd = cursor + slotDuration;
                var bookedCount = existingAppointments.Count(a => a.StartTime < slotEnd && a.EndTime > cursor);
                var remaining = Math.Max(0, sched.MaxPatientsPerSlot - bookedCount);
                var isPast = date < today || (date == today && cursor <= nowTime);

                slots.Add(new TimeSlotDto(
                    cursor,
                    slotEnd,
                    $"{DateTime.Today.Add(cursor):hh:mm tt} - {DateTime.Today.Add(slotEnd):hh:mm tt}",
                    !isPast && remaining > 0,
                    isPast ? 0 : remaining));

                cursor = slotEnd;
            }
        }

        return slots;
    }

    private static DoctorDto MapDoctor(Doctor d) => new(
        d.Id,
        d.UserId,
        d.DepartmentId,
        d.Department.Name,
        d.DoctorCode,
        d.User.FullName,
        d.User.Email,
        d.User.PhoneNumber,
        d.Specialization,
        d.Qualification,
        d.RegistrationNumber,
        d.ExperienceYears,
        d.ConsultationFee,
        d.Bio,
        d.RoomNumber,
        d.AverageConsultationMinutes,
        d.IsAvailableForOnlineBooking,
        d.IsActive,
        d.Schedules.OrderBy(s => s.DayOfWeek).ThenBy(s => s.StartTime).Select(s => new DoctorScheduleDto(
            s.Id, s.DoctorId, d.User.FullName, s.DayOfWeek, s.DayOfWeek.ToString(),
            s.StartTime, s.EndTime, s.SlotDurationMinutes, s.MaxPatientsPerSlot, s.IsActive)).ToList());

    private static DoctorScheduleDto MapSchedule(DoctorSchedule s) => new(
        s.Id, s.DoctorId, s.Doctor.User.FullName, s.DayOfWeek, s.DayOfWeek.ToString(),
        s.StartTime, s.EndTime, s.SlotDurationMinutes, s.MaxPatientsPerSlot, s.IsActive);
}
