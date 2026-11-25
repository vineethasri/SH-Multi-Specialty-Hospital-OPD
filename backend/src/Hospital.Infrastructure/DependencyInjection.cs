using Hospital.Application.Interfaces;
using Hospital.Infrastructure.Persistence;
using Hospital.Infrastructure.Security;
using Hospital.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Hospital.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var useInMemory = bool.TryParse(configuration["UseInMemoryDatabase"], out var inMem) && inMem;
        if (useInMemory)
        {
            var dbName = configuration["InMemoryDatabaseName"] ?? "HospitalOpdTestDb";
            services.AddDbContext<HospitalDbContext>(options => options.UseInMemoryDatabase(dbName));
        }
        else
        {
            var connectionString = configuration.GetConnectionString("DefaultConnection")
                ?? throw new InvalidOperationException("ConnectionStrings:DefaultConnection is not configured.");
            services.AddDbContext<HospitalDbContext>(options =>
                options.UseMySQL(connectionString, mysql =>
                {
                    mysql.MigrationsAssembly(typeof(HospitalDbContext).Assembly.FullName);
                }));
        }

        services.AddScoped<IApplicationDbContext>(sp => sp.GetRequiredService<HospitalDbContext>());
        services.AddScoped<DatabaseSeeder>();

        services.AddSingleton<IPasswordHasher, PasswordHasher>();
        services.AddSingleton<ITokenService, TokenService>();
        services.AddScoped<IAuditService, AuditService>();
        services.AddScoped<INotificationService, NotificationService>();
        services.AddScoped<ICodeGeneratorService, CodeGeneratorService>();
        services.AddScoped<IPaymentGateway, RazorpayPaymentGateway>();

        return services;
    }
}
