namespace Hospital.Application.DTOs.Users;

public record UserDto(
    int Id,
    string FullName,
    string Email,
    string PhoneNumber,
    string Role,
    int RoleId,
    bool IsActive,
    DateTime? LastLoginAt,
    DateTime CreatedAt);

public record CreateUserRequest(
    string FullName,
    string Email,
    string PhoneNumber,
    string Password,
    string RoleName);

public record UpdateUserRequest(
    string FullName,
    string PhoneNumber,
    string RoleName,
    bool IsActive);

public record DepartmentDto(
    int Id,
    string Code,
    string Name,
    string Description,
    string FloorLocation,
    decimal ConsultationFeeDefault,
    bool IsActive,
    int ActiveDoctorsCount);

public record SaveDepartmentRequest(
    string Code,
    string Name,
    string Description,
    string FloorLocation,
    decimal ConsultationFeeDefault,
    bool IsActive);

public record HospitalSettingDto(
    int Id,
    string HospitalName,
    string Tagline,
    string Phone,
    string EmergencyPhone,
    string Email,
    string AddressLine,
    string City,
    string State,
    string PostalCode,
    string MapUrl,
    decimal RegistrationFee,
    decimal TaxPercentage,
    string CurrencyCode,
    TimeSpan OpdStartTime,
    TimeSpan OpdEndTime,
    int DefaultSlotMinutes,
    bool AllowOnlineBooking,
    bool RequireFullPaymentBeforeCheckout,
    DateTime UpdatedAt);

public record UpdateHospitalSettingRequest(
    string HospitalName,
    string Tagline,
    string Phone,
    string EmergencyPhone,
    string Email,
    string AddressLine,
    string City,
    string State,
    string PostalCode,
    string MapUrl,
    decimal RegistrationFee,
    decimal TaxPercentage,
    TimeSpan OpdStartTime,
    TimeSpan OpdEndTime,
    int DefaultSlotMinutes,
    bool AllowOnlineBooking,
    bool RequireFullPaymentBeforeCheckout);
