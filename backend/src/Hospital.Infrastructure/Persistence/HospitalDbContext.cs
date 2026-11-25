using System.Data;
using Hospital.Application.Interfaces;
using Hospital.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace Hospital.Infrastructure.Persistence;

public class HospitalDbContext(DbContextOptions<HospitalDbContext> options)
    : DbContext(options), IApplicationDbContext
{
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Patient> Patients => Set<Patient>();
    public DbSet<Doctor> Doctors => Set<Doctor>();
    public DbSet<Department> Departments => Set<Department>();
    public DbSet<DoctorSchedule> DoctorSchedules => Set<DoctorSchedule>();
    public DbSet<Appointment> Appointments => Set<Appointment>();
    public DbSet<Visit> Visits => Set<Visit>();
    public DbSet<Consultation> Consultations => Set<Consultation>();
    public DbSet<Prescription> Prescriptions => Set<Prescription>();
    public DbSet<PrescriptionItem> PrescriptionItems => Set<PrescriptionItem>();
    public DbSet<Bill> Bills => Set<Bill>();
    public DbSet<BillItem> BillItems => Set<BillItem>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<HospitalSetting> HospitalSettings => Set<HospitalSetting>();

    public bool SupportsTransactions => Database.IsRelational();

    public Task<IDbContextTransaction> BeginTransactionAsync(
        IsolationLevel isolationLevel = IsolationLevel.ReadCommitted,
        CancellationToken cancellationToken = default)
        => Database.BeginTransactionAsync(isolationLevel, cancellationToken);

    protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
    {
        base.ConfigureConventions(configurationBuilder);
        configurationBuilder.Properties<DateOnly>().HaveConversion<DateOnlyToDateTimeConverter>();
        configurationBuilder.Properties<DateOnly?>().HaveConversion<NullableDateOnlyToDateTimeConverter>();
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(HospitalDbContext).Assembly);
    }
}

internal sealed class DateOnlyToDateTimeConverter()
    : ValueConverter<DateOnly, DateTime>(
        d => d.ToDateTime(TimeOnly.MinValue),
        dt => DateOnly.FromDateTime(dt));

internal sealed class NullableDateOnlyToDateTimeConverter()
    : ValueConverter<DateOnly?, DateTime?>(
        d => d.HasValue ? d.Value.ToDateTime(TimeOnly.MinValue) : null,
        dt => dt.HasValue ? DateOnly.FromDateTime(dt.Value) : null);
