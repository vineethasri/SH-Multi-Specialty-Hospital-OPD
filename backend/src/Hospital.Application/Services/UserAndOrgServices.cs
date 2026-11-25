using Hospital.Application.Common;
using Hospital.Application.DTOs.Users;
using Hospital.Application.Interfaces;
using Hospital.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Hospital.Application.Services;

public class UserService(
    IApplicationDbContext db,
    IPasswordHasher passwordHasher,
    IAuditService auditService) : IUserService
{
    public async Task<PagedResponse<UserDto>> GetUsersAsync(PagedRequest request, string? role, bool? isActive, CancellationToken cancellationToken = default)
    {
        var query = db.Users.AsNoTracking().Include(u => u.Role).AsQueryable();

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var s = request.Search.Trim().ToLower();
            query = query.Where(u => u.FullName.ToLower().Contains(s) || u.Email.ToLower().Contains(s) || u.PhoneNumber.Contains(s));
        }

        if (!string.IsNullOrWhiteSpace(role))
        {
            query = query.Where(u => u.Role.Name == role);
        }

        if (isActive.HasValue)
        {
            query = query.Where(u => u.IsActive == isActive.Value);
        }

        var total = await query.CountAsync(cancellationToken);
        query = request.SortBy?.ToLower() switch
        {
            "fullname" => request.SortDirection == "asc" ? query.OrderBy(u => u.FullName) : query.OrderByDescending(u => u.FullName),
            "email" => request.SortDirection == "asc" ? query.OrderBy(u => u.Email) : query.OrderByDescending(u => u.Email),
            _ => request.SortDirection == "asc" ? query.OrderBy(u => u.CreatedAt) : query.OrderByDescending(u => u.CreatedAt)
        };

        var items = await query
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(u => new UserDto(u.Id, u.FullName, u.Email, u.PhoneNumber, u.Role.Name, u.RoleId, u.IsActive, u.LastLoginAt, u.CreatedAt))
            .ToListAsync(cancellationToken);

        return new PagedResponse<UserDto> { Items = items, Page = request.Page, PageSize = request.PageSize, TotalCount = total };
    }

    public async Task<UserDto> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var u = await db.Users.AsNoTracking().Include(x => x.Role).FirstOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new NotFoundException($"User {id} not found.");
        return new UserDto(u.Id, u.FullName, u.Email, u.PhoneNumber, u.Role.Name, u.RoleId, u.IsActive, u.LastLoginAt, u.CreatedAt);
    }

    public async Task<UserDto> CreateUserAsync(CreateUserRequest request, CancellationToken cancellationToken = default)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        if (await db.Users.AnyAsync(u => u.Email.ToLower() == email, cancellationToken))
        {
            throw new ConflictException("A user with this email already exists.");
        }

        var role = await db.Roles.FirstOrDefaultAsync(r => r.Name == request.RoleName, cancellationToken)
            ?? throw new BusinessRuleException($"Invalid role '{request.RoleName}'.");

        var user = new User
        {
            RoleId = role.Id,
            Role = role,
            FullName = request.FullName.Trim(),
            Email = email,
            PhoneNumber = request.PhoneNumber.Trim(),
            PasswordHash = passwordHasher.Hash(request.Password),
            IsActive = true
        };

        db.Users.Add(user);
        await db.SaveChangesAsync(cancellationToken);
        await auditService.LogAsync("CreateUser", nameof(User), user.Id.ToString(), $"Created user {user.Email} with role {role.Name}", cancellationToken: cancellationToken);

        return new UserDto(user.Id, user.FullName, user.Email, user.PhoneNumber, role.Name, role.Id, user.IsActive, user.LastLoginAt, user.CreatedAt);
    }

    public async Task<UserDto> UpdateUserAsync(int id, UpdateUserRequest request, CancellationToken cancellationToken = default)
    {
        var user = await db.Users.Include(u => u.Role).FirstOrDefaultAsync(u => u.Id == id, cancellationToken)
            ?? throw new NotFoundException($"User {id} not found.");

        var role = await db.Roles.FirstOrDefaultAsync(r => r.Name == request.RoleName, cancellationToken)
            ?? throw new BusinessRuleException($"Invalid role '{request.RoleName}'.");

        user.FullName = request.FullName.Trim();
        user.PhoneNumber = request.PhoneNumber.Trim();
        user.RoleId = role.Id;
        user.Role = role;
        user.IsActive = request.IsActive;
        user.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(cancellationToken);
        await auditService.LogAsync("UpdateUser", nameof(User), user.Id.ToString(), $"Updated user {user.Email}", cancellationToken: cancellationToken);

        return new UserDto(user.Id, user.FullName, user.Email, user.PhoneNumber, role.Name, role.Id, user.IsActive, user.LastLoginAt, user.CreatedAt);
    }

    public async Task<IReadOnlyList<string>> GetRolesAsync(CancellationToken cancellationToken = default) =>
        await db.Roles.AsNoTracking().OrderBy(r => r.Id).Select(r => r.Name).ToListAsync(cancellationToken);
}

public class DepartmentService(IApplicationDbContext db, IAuditService auditService) : IDepartmentService
{
    public async Task<IReadOnlyList<DepartmentDto>> GetAllAsync(bool? isActive, string? search, CancellationToken cancellationToken = default)
    {
        var query = db.Departments.AsNoTracking().AsQueryable();
        if (isActive.HasValue) query = query.Where(d => d.IsActive == isActive.Value);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(d => d.Name.ToLower().Contains(s) || d.Code.ToLower().Contains(s));
        }

        return await query
            .OrderBy(d => d.Name)
            .Select(d => new DepartmentDto(
                d.Id,
                d.Code,
                d.Name,
                d.Description,
                d.FloorLocation,
                d.ConsultationFeeDefault,
                d.IsActive,
                d.Doctors.Count(doc => doc.IsActive)))
            .ToListAsync(cancellationToken);
    }

    public async Task<DepartmentDto> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var d = await db.Departments.AsNoTracking().Include(x => x.Doctors).FirstOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new NotFoundException($"Department {id} not found.");
        return new DepartmentDto(d.Id, d.Code, d.Name, d.Description, d.FloorLocation, d.ConsultationFeeDefault, d.IsActive, d.Doctors.Count(doc => doc.IsActive));
    }

    public async Task<DepartmentDto> CreateAsync(SaveDepartmentRequest request, CancellationToken cancellationToken = default)
    {
        var code = request.Code.Trim().ToUpperInvariant();
        var name = request.Name.Trim();

        if (await db.Departments.AnyAsync(d => d.Code == code || d.Name.ToLower() == name.ToLower(), cancellationToken))
        {
            throw new ConflictException("A department with this code or name already exists.");
        }

        var dept = new Department
        {
            Code = code,
            Name = name,
            Description = request.Description.Trim(),
            FloorLocation = request.FloorLocation.Trim(),
            ConsultationFeeDefault = request.ConsultationFeeDefault,
            IsActive = request.IsActive
        };

        db.Departments.Add(dept);
        await db.SaveChangesAsync(cancellationToken);
        await auditService.LogAsync("CreateDepartment", nameof(Department), dept.Id.ToString(), $"Created department {dept.Name}", cancellationToken: cancellationToken);

        return new DepartmentDto(dept.Id, dept.Code, dept.Name, dept.Description, dept.FloorLocation, dept.ConsultationFeeDefault, dept.IsActive, 0);
    }

    public async Task<DepartmentDto> UpdateAsync(int id, SaveDepartmentRequest request, CancellationToken cancellationToken = default)
    {
        var dept = await db.Departments.Include(d => d.Doctors).FirstOrDefaultAsync(d => d.Id == id, cancellationToken)
            ?? throw new NotFoundException($"Department {id} not found.");

        var code = request.Code.Trim().ToUpperInvariant();
        var name = request.Name.Trim();

        if (await db.Departments.AnyAsync(d => d.Id != id && (d.Code == code || d.Name.ToLower() == name.ToLower()), cancellationToken))
        {
            throw new ConflictException("Another department with this code or name already exists.");
        }

        dept.Code = code;
        dept.Name = name;
        dept.Description = request.Description.Trim();
        dept.FloorLocation = request.FloorLocation.Trim();
        dept.ConsultationFeeDefault = request.ConsultationFeeDefault;
        dept.IsActive = request.IsActive;
        dept.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(cancellationToken);
        await auditService.LogAsync("UpdateDepartment", nameof(Department), dept.Id.ToString(), $"Updated department {dept.Name}", cancellationToken: cancellationToken);

        return new DepartmentDto(dept.Id, dept.Code, dept.Name, dept.Description, dept.FloorLocation, dept.ConsultationFeeDefault, dept.IsActive, dept.Doctors.Count(doc => doc.IsActive));
    }

    public async Task<HospitalSettingDto> GetHospitalSettingsAsync(CancellationToken cancellationToken = default)
    {
        var s = await db.HospitalSettings.AsNoTracking().FirstOrDefaultAsync(cancellationToken)
            ?? throw new NotFoundException("Hospital settings have not been initialized.");

        return MapSettings(s);
    }

    public async Task<HospitalSettingDto> UpdateHospitalSettingsAsync(UpdateHospitalSettingRequest request, CancellationToken cancellationToken = default)
    {
        var s = await db.HospitalSettings.FirstOrDefaultAsync(cancellationToken);
        if (s is null)
        {
            s = new HospitalSetting();
            db.HospitalSettings.Add(s);
        }

        s.HospitalName = request.HospitalName.Trim();
        s.Tagline = request.Tagline.Trim();
        s.Phone = request.Phone.Trim();
        s.EmergencyPhone = request.EmergencyPhone.Trim();
        s.Email = request.Email.Trim();
        s.AddressLine = request.AddressLine.Trim();
        s.City = request.City.Trim();
        s.State = request.State.Trim();
        s.PostalCode = request.PostalCode.Trim();
        s.MapUrl = request.MapUrl.Trim();
        s.RegistrationFee = request.RegistrationFee;
        s.TaxPercentage = request.TaxPercentage;
        s.OpdStartTime = request.OpdStartTime;
        s.OpdEndTime = request.OpdEndTime;
        s.DefaultSlotMinutes = request.DefaultSlotMinutes;
        s.AllowOnlineBooking = request.AllowOnlineBooking;
        s.RequireFullPaymentBeforeCheckout = request.RequireFullPaymentBeforeCheckout;
        s.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(cancellationToken);
        await auditService.LogAsync("UpdateHospitalSettings", nameof(HospitalSetting), s.Id.ToString(), "Updated hospital settings.", cancellationToken: cancellationToken);

        return MapSettings(s);
    }

    private static HospitalSettingDto MapSettings(HospitalSetting s) => new(
        s.Id, s.HospitalName, s.Tagline, s.Phone, s.EmergencyPhone, s.Email,
        s.AddressLine, s.City, s.State, s.PostalCode, s.MapUrl,
        s.RegistrationFee, s.TaxPercentage, s.CurrencyCode,
        s.OpdStartTime, s.OpdEndTime, s.DefaultSlotMinutes,
        s.AllowOnlineBooking, s.RequireFullPaymentBeforeCheckout, s.UpdatedAt);
}
