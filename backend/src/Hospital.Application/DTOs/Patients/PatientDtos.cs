namespace Hospital.Application.DTOs.Patients;

public record PatientDto(
    int Id,
    int? UserId,
    string PatientCode,
    string FirstName,
    string LastName,
    string FullName,
    DateOnly DateOfBirth,
    int Age,
    string Gender,
    string? BloodGroup,
    string PhoneNumber,
    string? Email,
    string? Address,
    string? City,
    string? EmergencyContactName,
    string? EmergencyContactPhone,
    string? Allergies,
    string? ChronicConditions,
    DateTime CreatedAt);

public record CreatePatientRequest(
    string FirstName,
    string LastName,
    DateOnly DateOfBirth,
    string Gender,
    string? BloodGroup,
    string PhoneNumber,
    string? Email,
    string? Address,
    string? City,
    string? EmergencyContactName,
    string? EmergencyContactPhone,
    string? Allergies,
    string? ChronicConditions,
    bool CreatePortalAccount = false,
    string? Password = null);

public record UpdatePatientRequest(
    string FirstName,
    string LastName,
    DateOnly DateOfBirth,
    string Gender,
    string? BloodGroup,
    string PhoneNumber,
    string? Email,
    string? Address,
    string? City,
    string? EmergencyContactName,
    string? EmergencyContactPhone,
    string? Allergies,
    string? ChronicConditions);
