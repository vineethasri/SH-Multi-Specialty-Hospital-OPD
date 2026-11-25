using FluentValidation;
using Hospital.Application.Interfaces;
using Hospital.Application.Services;
using Microsoft.Extensions.DependencyInjection;

namespace Hospital.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddValidatorsFromAssembly(typeof(DependencyInjection).Assembly);

        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IUserService, UserService>();
        services.AddScoped<IDepartmentService, DepartmentService>();
        services.AddScoped<IDoctorService, DoctorService>();
        services.AddScoped<IPatientService, PatientService>();
        services.AddScoped<IAppointmentService, AppointmentService>();
        services.AddScoped<IVisitService, VisitService>();
        services.AddScoped<IConsultationService, ConsultationService>();
        services.AddScoped<IBillingService, BillingService>();
        services.AddScoped<IDashboardAndReportService, DashboardAndReportService>();

        return services;
    }
}
