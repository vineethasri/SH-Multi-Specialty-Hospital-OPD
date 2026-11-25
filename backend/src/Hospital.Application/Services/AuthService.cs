using Hospital.Application.Common;
using Hospital.Application.DTOs.Auth;
using Hospital.Application.Interfaces;
using Hospital.Domain.Entities;
using Hospital.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Hospital.Application.Services;

public class AuthService(
    IApplicationDbContext db,
    IPasswordHasher passwordHasher,
    ITokenService tokenService,
    ICurrentUserService currentUser,
    ICodeGeneratorService codeGenerator,
    IAuditService auditService) : IAuthService
{
    public async Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await db.Users
            .Include(u => u.Role)
            .Include(u => u.PatientProfile)
            .Include(u => u.DoctorProfile)
            .FirstOrDefaultAsync(u => u.Email.ToLower() == email, cancellationToken);

        if (user is null || !passwordHasher.Verify(request.Password, user.PasswordHash))
        {
            await auditService.LogAsync("LoginFailed", nameof(User), null, $"Failed login attempt for {email}", cancellationToken: cancellationToken);
            throw new UnauthorizedException("Invalid email or password.");
        }

        if (!user.IsActive)
        {
            throw new ForbiddenException("Your account has been deactivated. Please contact hospital administration.");
        }

        user.LastLoginAt = DateTime.UtcNow;
        user.UpdatedAt = DateTime.UtcNow;

        var response = await IssueTokensAsync(user, cancellationToken);
        await auditService.LogAsync("Login", nameof(User), user.Id.ToString(), $"User {user.Email} logged in.", cancellationToken: cancellationToken);
        return response;
    }

    public async Task<AuthResponse> RegisterPatientAsync(RegisterPatientRequest request, CancellationToken cancellationToken = default)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var phone = request.PhoneNumber.Trim();

        if (await db.Users.AnyAsync(u => u.Email.ToLower() == email, cancellationToken))
        {
            throw new ConflictException("An account with this email address already exists.");
        }

        if (!Enum.TryParse<Gender>(request.Gender, true, out var gender))
        {
            throw new BusinessRuleException("Invalid gender value. Allowed: Male, Female, Other.");
        }

        // Check for duplicate patient by phone + DOB
        var existingPatient = await db.Patients
            .FirstOrDefaultAsync(p => p.PhoneNumber == phone && p.DateOfBirth == request.DateOfBirth, cancellationToken);

        if (existingPatient is not null && existingPatient.UserId is not null)
        {
            throw new ConflictException("A patient profile with this phone number and date of birth is already registered.");
        }

        var patientRole = await db.Roles.FirstOrDefaultAsync(r => r.Name == nameof(RoleType.Patient), cancellationToken)
            ?? throw new BusinessRuleException("Patient role is not configured in the system.");

        var fullName = $"{request.FirstName.Trim()} {request.LastName.Trim()}".Trim();
        var user = new User
        {
            RoleId = patientRole.Id,
            Role = patientRole,
            FullName = fullName,
            Email = email,
            PhoneNumber = phone,
            PasswordHash = passwordHasher.Hash(request.Password),
            IsActive = true,
            LastLoginAt = DateTime.UtcNow
        };

        db.Users.Add(user);
        await db.SaveChangesAsync(cancellationToken);

        if (existingPatient is not null)
        {
            // Link walk-in patient profile to newly created portal account
            existingPatient.UserId = user.Id;
            existingPatient.Email = email;
            existingPatient.Address ??= request.Address?.Trim();
            existingPatient.City ??= request.City?.Trim();
            existingPatient.BloodGroup ??= request.BloodGroup?.Trim();
            existingPatient.EmergencyContactName ??= request.EmergencyContactName?.Trim();
            existingPatient.EmergencyContactPhone ??= request.EmergencyContactPhone?.Trim();
            existingPatient.UpdatedAt = DateTime.UtcNow;
            user.PatientProfile = existingPatient;
        }
        else
        {
            var patientCode = await codeGenerator.GeneratePatientCodeAsync(cancellationToken);
            var patient = new Patient
            {
                UserId = user.Id,
                PatientCode = patientCode,
                FirstName = request.FirstName.Trim(),
                LastName = request.LastName.Trim(),
                FullName = fullName,
                DateOfBirth = request.DateOfBirth,
                Gender = gender,
                BloodGroup = request.BloodGroup?.Trim(),
                PhoneNumber = phone,
                Email = email,
                Address = request.Address?.Trim(),
                City = request.City?.Trim(),
                EmergencyContactName = request.EmergencyContactName?.Trim(),
                EmergencyContactPhone = request.EmergencyContactPhone?.Trim()
            };
            db.Patients.Add(patient);
            await db.SaveChangesAsync(cancellationToken);
            user.PatientProfile = patient;
        }

        var response = await IssueTokensAsync(user, cancellationToken);
        await auditService.LogAsync("PatientRegistered", nameof(Patient), user.PatientProfile!.Id.ToString(), $"Patient {user.PatientProfile.PatientCode} registered online.", cancellationToken: cancellationToken);
        return response;
    }

    public async Task<AuthResponse> RefreshTokenAsync(RefreshTokenRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.RefreshToken))
        {
            throw new UnauthorizedException("Refresh token is required.");
        }

        var tokenHash = tokenService.HashToken(request.RefreshToken);
        var existingToken = await db.RefreshTokens
            .Include(rt => rt.User).ThenInclude(u => u.Role)
            .Include(rt => rt.User).ThenInclude(u => u.PatientProfile)
            .Include(rt => rt.User).ThenInclude(u => u.DoctorProfile)
            .FirstOrDefaultAsync(rt => rt.TokenHash == tokenHash, cancellationToken);

        if (existingToken is null)
        {
            throw new UnauthorizedException("Invalid refresh token.");
        }

        if (existingToken.IsRevoked)
        {
            // Token reuse detected: revoke all active tokens for this user
            var activeTokens = await db.RefreshTokens
                .Where(rt => rt.UserId == existingToken.UserId && rt.RevokedAt == null)
                .ToListAsync(cancellationToken);

            foreach (var t in activeTokens)
            {
                t.RevokedAt = DateTime.UtcNow;
                t.RevokedByIp = currentUser.IpAddress;
                t.ReasonRevoked = "Attempted reuse of revoked ancestor token";
            }

            await db.SaveChangesAsync(cancellationToken);
            throw new UnauthorizedException("Refresh token has been revoked. Please sign in again.");
        }

        if (existingToken.IsExpired)
        {
            throw new UnauthorizedException("Refresh token has expired. Please sign in again.");
        }

        if (!existingToken.User.IsActive)
        {
            throw new ForbiddenException("User account is inactive.");
        }

        var (accessToken, jwtId, accessExpiresAt) = tokenService.GenerateAccessToken(existingToken.User);
        var (rawNewRefresh, newRefreshHash, refreshExpiresAt) = tokenService.GenerateRefreshToken();

        existingToken.RevokedAt = DateTime.UtcNow;
        existingToken.RevokedByIp = currentUser.IpAddress;
        existingToken.ReplacedByTokenHash = newRefreshHash;
        existingToken.ReasonRevoked = "Rotated";

        db.RefreshTokens.Add(new RefreshToken
        {
            UserId = existingToken.UserId,
            TokenHash = newRefreshHash,
            JwtId = jwtId,
            ExpiresAt = refreshExpiresAt,
            CreatedByIp = currentUser.IpAddress
        });

        await db.SaveChangesAsync(cancellationToken);

        return new AuthResponse(accessToken, rawNewRefresh, accessExpiresAt, MapUserInfo(existingToken.User));
    }

    public async Task LogoutAsync(LogoutRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.RefreshToken)) return;

        var tokenHash = tokenService.HashToken(request.RefreshToken);
        var token = await db.RefreshTokens.FirstOrDefaultAsync(rt => rt.TokenHash == tokenHash, cancellationToken);
        if (token is not null && token.RevokedAt is null)
        {
            token.RevokedAt = DateTime.UtcNow;
            token.RevokedByIp = currentUser.IpAddress;
            token.ReasonRevoked = "User logout";
            await db.SaveChangesAsync(cancellationToken);
        }

        await auditService.LogAsync("Logout", nameof(User), currentUser.UserId?.ToString(), "User logged out.", cancellationToken: cancellationToken);
    }

    public async Task ChangePasswordAsync(ChangePasswordRequest request, CancellationToken cancellationToken = default)
    {
        var userId = currentUser.UserId ?? throw new UnauthorizedException();
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken)
            ?? throw new NotFoundException("User account not found.");

        if (!passwordHasher.Verify(request.CurrentPassword, user.PasswordHash))
        {
            throw new BusinessRuleException("Current password is incorrect.");
        }

        user.PasswordHash = passwordHasher.Hash(request.NewPassword);
        user.UpdatedAt = DateTime.UtcNow;

        // Revoke existing refresh tokens on password change
        var activeTokens = await db.RefreshTokens
            .Where(rt => rt.UserId == userId && rt.RevokedAt == null)
            .ToListAsync(cancellationToken);

        foreach (var rt in activeTokens)
        {
            rt.RevokedAt = DateTime.UtcNow;
            rt.ReasonRevoked = "Password changed";
        }

        await db.SaveChangesAsync(cancellationToken);
        await auditService.LogAsync("PasswordChanged", nameof(User), user.Id.ToString(), "Password changed by user.", cancellationToken: cancellationToken);
    }

    public async Task<UserInfoDto> GetMeAsync(CancellationToken cancellationToken = default)
    {
        var userId = currentUser.UserId ?? throw new UnauthorizedException();
        var user = await db.Users
            .AsNoTracking()
            .Include(u => u.Role)
            .Include(u => u.PatientProfile)
            .Include(u => u.DoctorProfile)
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken)
            ?? throw new NotFoundException("User not found.");

        return MapUserInfo(user);
    }

    private async Task<AuthResponse> IssueTokensAsync(User user, CancellationToken cancellationToken)
    {
        var (accessToken, jwtId, accessExpiresAt) = tokenService.GenerateAccessToken(user);
        var (rawRefresh, refreshHash, refreshExpiresAt) = tokenService.GenerateRefreshToken();

        db.RefreshTokens.Add(new RefreshToken
        {
            UserId = user.Id,
            TokenHash = refreshHash,
            JwtId = jwtId,
            ExpiresAt = refreshExpiresAt,
            CreatedByIp = currentUser.IpAddress
        });

        await db.SaveChangesAsync(cancellationToken);

        return new AuthResponse(accessToken, rawRefresh, accessExpiresAt, MapUserInfo(user));
    }

    private static UserInfoDto MapUserInfo(User user) => new(
        user.Id,
        user.FullName,
        user.Email,
        user.PhoneNumber,
        user.Role.Name,
        user.PatientProfile?.Id,
        user.DoctorProfile?.Id,
        user.PatientProfile?.PatientCode,
        user.DoctorProfile?.DoctorCode);
}
