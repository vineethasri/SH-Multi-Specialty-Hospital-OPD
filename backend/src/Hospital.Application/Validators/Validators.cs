using FluentValidation;
using Hospital.Application.DTOs.Appointments;
using Hospital.Application.DTOs.Auth;
using Hospital.Application.DTOs.Billing;
using Hospital.Application.DTOs.Consultations;
using Hospital.Application.DTOs.Doctors;
using Hospital.Application.DTOs.Patients;
using Hospital.Application.DTOs.Users;

namespace Hospital.Application.Validators;

public class LoginRequestValidator : AbstractValidator<LoginRequest>
{
    public LoginRequestValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Password).NotEmpty().MinimumLength(6);
    }
}

public class RegisterPatientRequestValidator : AbstractValidator<RegisterPatientRequest>
{
    public RegisterPatientRequestValidator()
    {
        RuleFor(x => x.FirstName).NotEmpty().MaximumLength(80);
        RuleFor(x => x.LastName).NotEmpty().MaximumLength(80);
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(160);
        RuleFor(x => x.PhoneNumber).NotEmpty().Matches(@"^[+\d][\d\s\-]{7,18}$").WithMessage("Enter a valid phone number.");
        RuleFor(x => x.Password).NotEmpty().MinimumLength(8).Matches(@"[A-Z]").WithMessage("Password must contain at least one uppercase letter.")
            .Matches(@"[a-z]").WithMessage("Password must contain at least one lowercase letter.")
            .Matches(@"\d").WithMessage("Password must contain at least one number.");
        RuleFor(x => x.DateOfBirth).LessThanOrEqualTo(DateOnly.FromDateTime(DateTime.Today));
        RuleFor(x => x.Gender).NotEmpty();
    }
}

public class CreatePatientRequestValidator : AbstractValidator<CreatePatientRequest>
{
    public CreatePatientRequestValidator()
    {
        RuleFor(x => x.FirstName).NotEmpty().MaximumLength(80);
        RuleFor(x => x.LastName).NotEmpty().MaximumLength(80);
        RuleFor(x => x.PhoneNumber).NotEmpty().Matches(@"^[+\d][\d\s\-]{7,18}$");
        RuleFor(x => x.DateOfBirth).LessThanOrEqualTo(DateOnly.FromDateTime(DateTime.Today));
        RuleFor(x => x.Gender).NotEmpty();
        RuleFor(x => x.Email).EmailAddress().When(x => !string.IsNullOrWhiteSpace(x.Email));
    }
}

public class CreateDoctorRequestValidator : AbstractValidator<CreateDoctorRequest>
{
    public CreateDoctorRequestValidator()
    {
        RuleFor(x => x.FullName).NotEmpty().MaximumLength(150);
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.PhoneNumber).NotEmpty();
        RuleFor(x => x.Password).NotEmpty().MinimumLength(8);
        RuleFor(x => x.DepartmentId).GreaterThan(0);
        RuleFor(x => x.Specialization).NotEmpty().MaximumLength(150);
        RuleFor(x => x.Qualification).NotEmpty().MaximumLength(150);
        RuleFor(x => x.RegistrationNumber).NotEmpty().MaximumLength(80);
        RuleFor(x => x.ConsultationFee).GreaterThanOrEqualTo(0);
    }
}

public class SaveDepartmentRequestValidator : AbstractValidator<SaveDepartmentRequest>
{
    public SaveDepartmentRequestValidator()
    {
        RuleFor(x => x.Code).NotEmpty().MaximumLength(20);
        RuleFor(x => x.Name).NotEmpty().MaximumLength(120);
        RuleFor(x => x.ConsultationFeeDefault).GreaterThanOrEqualTo(0);
    }
}

public class BookAppointmentRequestValidator : AbstractValidator<BookAppointmentRequest>
{
    public BookAppointmentRequestValidator()
    {
        RuleFor(x => x.DoctorId).GreaterThan(0);
        RuleFor(x => x.DepartmentId).GreaterThan(0);
        RuleFor(x => x.ReasonForVisit).NotEmpty().MaximumLength(500);
    }
}

public class SaveConsultationRequestValidator : AbstractValidator<SaveConsultationRequest>
{
    public SaveConsultationRequestValidator()
    {
        RuleFor(x => x.Symptoms).NotEmpty().MaximumLength(2000);
        RuleFor(x => x.Diagnosis).MaximumLength(1000);
        RuleFor(x => x.SpO2).InclusiveBetween(40, 100).When(x => x.SpO2.HasValue);
        RuleFor(x => x.PulseRate).InclusiveBetween(25, 250).When(x => x.PulseRate.HasValue);
    }
}

public class SavePrescriptionRequestValidator : AbstractValidator<SavePrescriptionRequest>
{
    public SavePrescriptionRequestValidator()
    {
        RuleFor(x => x.ConsultationId).GreaterThan(0);
        RuleFor(x => x.Items).NotEmpty();
        RuleForEach(x => x.Items).ChildRules(item =>
        {
            item.RuleFor(i => i.MedicineName).NotEmpty().MaximumLength(180);
            item.RuleFor(i => i.Dosage).NotEmpty().MaximumLength(80);
            item.RuleFor(i => i.Frequency).NotEmpty().MaximumLength(80);
            item.RuleFor(i => i.DurationDays).GreaterThan(0);
        });
    }
}

public class RecordPaymentRequestValidator : AbstractValidator<RecordPaymentRequest>
{
    public RecordPaymentRequestValidator()
    {
        RuleFor(x => x.BillId).GreaterThan(0);
        RuleFor(x => x.Amount).GreaterThan(0);
        RuleFor(x => x.Method).NotEmpty();
    }
}
