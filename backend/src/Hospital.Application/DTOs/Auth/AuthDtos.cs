namespace Hospital.Application.DTOs.Auth;

public record LoginRequest(string Email, string Password);

public record RegisterPatientRequest(
    string FirstName,
    string LastName,
    string Email,
    string PhoneNumber,
    string Password,
    DateOnly DateOfBirth,
    string Gender,
    string? BloodGroup,
    string? Address,
    string? City,
    string? EmergencyContactName,
    string? EmergencyContactPhone);

public record RefreshTokenRequest(string RefreshToken);
public record LogoutRequest(string RefreshToken);
public record ChangePasswordRequest(string CurrentPassword, string NewPassword);

public record AuthResponse(
    string AccessToken,
    string RefreshToken,
    DateTime AccessTokenExpiresAt,
    UserInfoDto User);

public record UserInfoDto(
    int Id,
    string FullName,
    string Email,
    string PhoneNumber,
    string Role,
    int? PatientId,
    int? DoctorId,
    string? PatientCode,
    string? DoctorCode);
