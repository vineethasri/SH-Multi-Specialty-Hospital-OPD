using Hospital.Application.Common;
using Hospital.Application.DTOs.Patients;
using Hospital.Application.Interfaces;
using Hospital.Domain.Entities;
using Hospital.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Hospital.Application.Services;

public class PatientService(
    IApplicationDbContext db,
    ICurrentUserService currentUser,
    IPasswordHasher passwordHasher,
    ICodeGeneratorService codeGenerator,
    IAuditService auditService) : IPatientService
{
    public async Task<PagedResponse<PatientDto>> GetPatientsAsync(PagedRequest request, CancellationToken cancellationToken = default)
    {
        var query = db.Patients.AsNoTracking().AsQueryable();

        if (currentUser.IsInRole(nameof(RoleType.Patient)))
        {
            query = query.Where(p => p.UserId == currentUser.UserId);
        }
        else if (currentUser.IsInRole(nameof(RoleType.Doctor)))
        {
            var doctorId = await db.Doctors
                .Where(d => d.UserId == currentUser.UserId)
                .Select(d => d.Id)
                .FirstOrDefaultAsync(cancellationToken);

            query = query.Where(p =>
                p.Appointments.Any(a => a.DoctorId == doctorId) ||
                p.Visits.Any(v => v.DoctorId == doctorId) ||
                p.Consultations.Any(c => c.DoctorId == doctorId));
        }

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var s = request.Search.Trim().ToLower();
            query = query.Where(p =>
                p.FullName.ToLower().Contains(s) ||
                p.PatientCode.ToLower().Contains(s) ||
                p.PhoneNumber.Contains(s) ||
                (p.Email != null && p.Email.ToLower().Contains(s)));
        }

        var total = await query.CountAsync(cancellationToken);
        query = request.SortBy?.ToLower() switch
        {
            "name" => request.SortDirection == "asc" ? query.OrderBy(p => p.FullName) : query.OrderByDescending(p => p.FullName),
            "code" => request.SortDirection == "asc" ? query.OrderBy(p => p.PatientCode) : query.OrderByDescending(p => p.PatientCode),
            _ => request.SortDirection == "asc" ? query.OrderBy(p => p.CreatedAt) : query.OrderByDescending(p => p.CreatedAt)
        };

        var items = await query
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        return new PagedResponse<PatientDto>
        {
            Items = items.Select(MapPatient).ToList(),
            Page = request.Page,
            PageSize = request.PageSize,
            TotalCount = total
        };
    }

    public async Task<PatientDto> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var patient = await db.Patients.AsNoTracking().FirstOrDefaultAsync(p => p.Id == id, cancellationToken)
            ?? throw new NotFoundException($"Patient {id} not found.");

        await EnsureAccessAsync(patient, cancellationToken);
        await auditService.LogAsync("AccessSensitiveRecord", nameof(Patient), patient.Id.ToString(), $"Accessed patient profile {patient.PatientCode}", cancellationToken: cancellationToken);
        return MapPatient(patient);
    }

    public async Task<PatientDto> GetMyProfileAsync(CancellationToken cancellationToken = default)
    {
        var userId = currentUser.UserId ?? throw new UnauthorizedException();
        var patient = await db.Patients.AsNoTracking().FirstOrDefaultAsync(p => p.UserId == userId, cancellationToken)
            ?? throw new NotFoundException("Patient profile not found for current user.");
        return MapPatient(patient);
    }

    public async Task<PatientDto> CreateAsync(CreatePatientRequest request, CancellationToken cancellationToken = default)
    {
        if (!Enum.TryParse<Gender>(request.Gender, true, out var gender))
        {
            throw new BusinessRuleException("Invalid gender value. Allowed: Male, Female, Other.");
        }

        var phone = request.PhoneNumber.Trim();
        var email = string.IsNullOrWhiteSpace(request.Email) ? null : request.Email.Trim().ToLowerInvariant();
        var firstName = request.FirstName.Trim();
        var lastName = request.LastName.Trim();

        // Duplicate prevention
        var duplicate = await db.Patients.AnyAsync(p =>
            (p.PhoneNumber == phone && p.DateOfBirth == request.DateOfBirth && p.FirstName.ToLower() == firstName.ToLower()) ||
            (email != null && p.Email != null && p.Email.ToLower() == email), cancellationToken);

        if (duplicate)
        {
            throw new ConflictException("A patient with matching phone/date of birth/name or email already exists.");
        }

        int? userId = null;
        if (request.CreatePortalAccount)
        {
            if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(request.Password))
            {
                throw new BusinessRuleException("Email and password are required to create a patient portal account.");
            }

            if (await db.Users.AnyAsync(u => u.Email.ToLower() == email, cancellationToken))
            {
                throw new ConflictException("A user account with this email already exists.");
            }

            var role = await db.Roles.FirstOrDefaultAsync(r => r.Name == nameof(RoleType.Patient), cancellationToken)
                ?? throw new BusinessRuleException("Patient role not configured.");

            var user = new User
            {
                RoleId = role.Id,
                FullName = $"{firstName} {lastName}".Trim(),
                Email = email,
                PhoneNumber = phone,
                PasswordHash = passwordHasher.Hash(request.Password),
                IsActive = true
            };
            db.Users.Add(user);
            await db.SaveChangesAsync(cancellationToken);
            userId = user.Id;
        }

        var patient = new Patient
        {
            UserId = userId,
            PatientCode = await codeGenerator.GeneratePatientCodeAsync(cancellationToken),
            FirstName = firstName,
            LastName = lastName,
            FullName = $"{firstName} {lastName}".Trim(),
            DateOfBirth = request.DateOfBirth,
            Gender = gender,
            BloodGroup = request.BloodGroup?.Trim(),
            PhoneNumber = phone,
            Email = email,
            Address = request.Address?.Trim(),
            City = request.City?.Trim(),
            EmergencyContactName = request.EmergencyContactName?.Trim(),
            EmergencyContactPhone = request.EmergencyContactPhone?.Trim(),
            Allergies = request.Allergies?.Trim(),
            ChronicConditions = request.ChronicConditions?.Trim()
        };

        db.Patients.Add(patient);
        await db.SaveChangesAsync(cancellationToken);
        await auditService.LogAsync("CreatePatient", nameof(Patient), patient.Id.ToString(), $"Registered patient {patient.PatientCode}", cancellationToken: cancellationToken);

        return MapPatient(patient);
    }

    public async Task<PatientDto> UpdateAsync(int id, UpdatePatientRequest request, CancellationToken cancellationToken = default)
    {
        var patient = await db.Patients.Include(p => p.User).FirstOrDefaultAsync(p => p.Id == id, cancellationToken)
            ?? throw new NotFoundException($"Patient {id} not found.");

        if (currentUser.IsInRole(nameof(RoleType.Patient)) && patient.UserId != currentUser.UserId)
        {
            throw new ForbiddenException("Patients may only update their own profile.");
        }

        if (!Enum.TryParse<Gender>(request.Gender, true, out var gender))
        {
            throw new BusinessRuleException("Invalid gender value.");
        }

        patient.FirstName = request.FirstName.Trim();
        patient.LastName = request.LastName.Trim();
        patient.FullName = $"{patient.FirstName} {patient.LastName}".Trim();
        patient.DateOfBirth = request.DateOfBirth;
        patient.Gender = gender;
        patient.BloodGroup = request.BloodGroup?.Trim();
        patient.PhoneNumber = request.PhoneNumber.Trim();
        patient.Email = string.IsNullOrWhiteSpace(request.Email) ? null : request.Email.Trim().ToLowerInvariant();
        patient.Address = request.Address?.Trim();
        patient.City = request.City?.Trim();
        patient.EmergencyContactName = request.EmergencyContactName?.Trim();
        patient.EmergencyContactPhone = request.EmergencyContactPhone?.Trim();
        patient.Allergies = request.Allergies?.Trim();
        patient.ChronicConditions = request.ChronicConditions?.Trim();
        patient.UpdatedAt = DateTime.UtcNow;

        if (patient.User is not null)
        {
            patient.User.FullName = patient.FullName;
            patient.User.PhoneNumber = patient.PhoneNumber;
            patient.User.UpdatedAt = DateTime.UtcNow;
        }

        await db.SaveChangesAsync(cancellationToken);
        await auditService.LogAsync("UpdatePatient", nameof(Patient), patient.Id.ToString(), $"Updated patient {patient.PatientCode}", cancellationToken: cancellationToken);

        return MapPatient(patient);
    }

    private async Task EnsureAccessAsync(Patient patient, CancellationToken cancellationToken)
    {
        if (currentUser.IsInRole(nameof(RoleType.Admin), nameof(RoleType.Receptionist))) return;

        if (currentUser.IsInRole(nameof(RoleType.Patient)))
        {
            if (patient.UserId != currentUser.UserId)
                throw new ForbiddenException("You can only view your own patient record.");
            return;
        }

        if (currentUser.IsInRole(nameof(RoleType.Doctor)))
        {
            var doctorId = await db.Doctors
                .Where(d => d.UserId == currentUser.UserId)
                .Select(d => d.Id)
                .FirstOrDefaultAsync(cancellationToken);

            var authorized = await db.Appointments.AnyAsync(a => a.PatientId == patient.Id && a.DoctorId == doctorId, cancellationToken)
                || await db.Visits.AnyAsync(v => v.PatientId == patient.Id && v.DoctorId == doctorId, cancellationToken)
                || await db.Consultations.AnyAsync(c => c.PatientId == patient.Id && c.DoctorId == doctorId, cancellationToken);

            if (!authorized)
                throw new ForbiddenException("Doctors can only access records of patients assigned to them.");
        }
    }

    public static int CalculateAge(DateOnly dob)
    {
        var today = DateOnly.FromDateTime(DateTime.Today);
        var age = today.Year - dob.Year;
        if (dob > today.AddYears(-age)) age--;
        return Math.Max(0, age);
    }

    private static PatientDto MapPatient(Patient p) => new(
        p.Id,
        p.UserId,
        p.PatientCode,
        p.FirstName,
        p.LastName,
        p.FullName,
        p.DateOfBirth,
        CalculateAge(p.DateOfBirth),
        p.Gender.ToString(),
        p.BloodGroup,
        p.PhoneNumber,
        p.Email,
        p.Address,
        p.City,
        p.EmergencyContactName,
        p.EmergencyContactPhone,
        p.Allergies,
        p.ChronicConditions,
        p.CreatedAt);
}
