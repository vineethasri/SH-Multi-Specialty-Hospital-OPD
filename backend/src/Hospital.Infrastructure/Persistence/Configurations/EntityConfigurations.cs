using Hospital.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hospital.Infrastructure.Persistence.Configurations;

public class RoleConfiguration : IEntityTypeConfiguration<Role>
{
    public void Configure(EntityTypeBuilder<Role> builder)
    {
        builder.ToTable("Roles");
        builder.HasKey(r => r.Id);
        builder.Property(r => r.Name).IsRequired().HasMaxLength(50);
        builder.Property(r => r.Description).HasMaxLength(250);
        builder.HasIndex(r => r.Name).IsUnique();
    }
}

public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("Users");
        builder.HasKey(u => u.Id);
        builder.Property(u => u.FullName).IsRequired().HasMaxLength(150);
        builder.Property(u => u.Email).IsRequired().HasMaxLength(160);
        builder.Property(u => u.PhoneNumber).IsRequired().HasMaxLength(25);
        builder.Property(u => u.PasswordHash).IsRequired().HasMaxLength(255);
        builder.HasIndex(u => u.Email).IsUnique();
        builder.HasIndex(u => u.PhoneNumber);
        builder.HasOne(u => u.Role).WithMany(r => r.Users).HasForeignKey(u => u.RoleId).OnDelete(DeleteBehavior.Restrict);
    }
}

public class DepartmentConfiguration : IEntityTypeConfiguration<Department>
{
    public void Configure(EntityTypeBuilder<Department> builder)
    {
        builder.ToTable("Departments");
        builder.HasKey(d => d.Id);
        builder.Property(d => d.Code).IsRequired().HasMaxLength(20);
        builder.Property(d => d.Name).IsRequired().HasMaxLength(120);
        builder.Property(d => d.Description).HasMaxLength(600);
        builder.Property(d => d.FloorLocation).HasMaxLength(80);
        builder.Property(d => d.ConsultationFeeDefault).HasColumnType("decimal(10,2)");
        builder.HasIndex(d => d.Code).IsUnique();
        builder.HasIndex(d => d.Name).IsUnique();
    }
}

public class DoctorConfiguration : IEntityTypeConfiguration<Doctor>
{
    public void Configure(EntityTypeBuilder<Doctor> builder)
    {
        builder.ToTable("Doctors");
        builder.HasKey(d => d.Id);
        builder.Property(d => d.DoctorCode).IsRequired().HasMaxLength(30);
        builder.Property(d => d.Specialization).IsRequired().HasMaxLength(150);
        builder.Property(d => d.Qualification).IsRequired().HasMaxLength(150);
        builder.Property(d => d.RegistrationNumber).IsRequired().HasMaxLength(80);
        builder.Property(d => d.ConsultationFee).HasColumnType("decimal(10,2)");
        builder.Property(d => d.Bio).HasMaxLength(1000);
        builder.Property(d => d.RoomNumber).HasMaxLength(30);

        builder.HasIndex(d => d.DoctorCode).IsUnique();
        builder.HasIndex(d => d.UserId).IsUnique();
        builder.HasIndex(d => d.RegistrationNumber).IsUnique();

        builder.HasOne(d => d.User).WithOne(u => u.DoctorProfile).HasForeignKey<Doctor>(d => d.UserId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(d => d.Department).WithMany(dep => dep.Doctors).HasForeignKey(d => d.DepartmentId).OnDelete(DeleteBehavior.Restrict);
    }
}

public class DoctorScheduleConfiguration : IEntityTypeConfiguration<DoctorSchedule>
{
    public void Configure(EntityTypeBuilder<DoctorSchedule> builder)
    {
        builder.ToTable("DoctorSchedules");
        builder.HasKey(s => s.Id);
        builder.HasIndex(s => new { s.DoctorId, s.DayOfWeek, s.StartTime });
        builder.HasOne(s => s.Doctor).WithMany(d => d.Schedules).HasForeignKey(s => s.DoctorId).OnDelete(DeleteBehavior.Cascade);
    }
}

public class PatientConfiguration : IEntityTypeConfiguration<Patient>
{
    public void Configure(EntityTypeBuilder<Patient> builder)
    {
        builder.ToTable("Patients");
        builder.HasKey(p => p.Id);
        builder.Property(p => p.PatientCode).IsRequired().HasMaxLength(30);
        builder.Property(p => p.FirstName).IsRequired().HasMaxLength(80);
        builder.Property(p => p.LastName).IsRequired().HasMaxLength(80);
        builder.Property(p => p.FullName).IsRequired().HasMaxLength(165);
        builder.Property(p => p.Gender).HasConversion<string>().HasMaxLength(20);
        builder.Property(p => p.BloodGroup).HasMaxLength(10);
        builder.Property(p => p.PhoneNumber).IsRequired().HasMaxLength(25);
        builder.Property(p => p.Email).HasMaxLength(160);
        builder.Property(p => p.Address).HasMaxLength(300);
        builder.Property(p => p.City).HasMaxLength(100);
        builder.Property(p => p.EmergencyContactName).HasMaxLength(120);
        builder.Property(p => p.EmergencyContactPhone).HasMaxLength(25);
        builder.Property(p => p.Allergies).HasMaxLength(500);
        builder.Property(p => p.ChronicConditions).HasMaxLength(500);

        builder.HasIndex(p => p.PatientCode).IsUnique();
        builder.HasIndex(p => p.UserId).IsUnique();
        builder.HasIndex(p => p.PhoneNumber);
        builder.HasIndex(p => p.FullName);

        builder.HasOne(p => p.User).WithOne(u => u.PatientProfile).HasForeignKey<Patient>(p => p.UserId).OnDelete(DeleteBehavior.SetNull);
    }
}

public class AppointmentConfiguration : IEntityTypeConfiguration<Appointment>
{
    public void Configure(EntityTypeBuilder<Appointment> builder)
    {
        builder.ToTable("Appointments");
        builder.HasKey(a => a.Id);
        builder.Property(a => a.AppointmentNumber).IsRequired().HasMaxLength(30);
        builder.Property(a => a.BookingSource).HasConversion<string>().HasMaxLength(20);
        builder.Property(a => a.Status).HasConversion<string>().HasMaxLength(25);
        builder.Property(a => a.ReasonForVisit).IsRequired().HasMaxLength(500);
        builder.Property(a => a.CancellationReason).HasMaxLength(500);

        builder.HasIndex(a => a.AppointmentNumber).IsUnique();
        builder.HasIndex(a => new { a.DoctorId, a.AppointmentDate, a.StartTime });
        builder.HasIndex(a => new { a.PatientId, a.AppointmentDate });

        builder.HasOne(a => a.Patient).WithMany(p => p.Appointments).HasForeignKey(a => a.PatientId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(a => a.Doctor).WithMany(d => d.Appointments).HasForeignKey(a => a.DoctorId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(a => a.Department).WithMany(d => d.Appointments).HasForeignKey(a => a.DepartmentId).OnDelete(DeleteBehavior.Restrict);
    }
}

public class VisitConfiguration : IEntityTypeConfiguration<Visit>
{
    public void Configure(EntityTypeBuilder<Visit> builder)
    {
        builder.ToTable("Visits");
        builder.HasKey(v => v.Id);
        builder.Property(v => v.VisitNumber).IsRequired().HasMaxLength(30);
        builder.Property(v => v.VisitType).HasConversion<string>().HasMaxLength(20);
        builder.Property(v => v.TokenDisplay).IsRequired().HasMaxLength(20);
        builder.Property(v => v.Status).HasConversion<string>().HasMaxLength(30);
        builder.Property(v => v.ChiefComplaint).HasMaxLength(500);
        builder.Property(v => v.CancellationReason).HasMaxLength(500);
        builder.Property(v => v.Notes).HasMaxLength(1000);

        builder.HasIndex(v => v.VisitNumber).IsUnique();
        builder.HasIndex(v => v.AppointmentId).IsUnique();
        builder.HasIndex(v => new { v.DoctorId, v.VisitDate, v.TokenNumber }).IsUnique();
        builder.HasIndex(v => new { v.VisitDate, v.Status });

        builder.HasOne(v => v.Appointment).WithOne(a => a.Visit).HasForeignKey<Visit>(v => v.AppointmentId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(v => v.Patient).WithMany(p => p.Visits).HasForeignKey(v => v.PatientId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(v => v.Doctor).WithMany(d => d.Visits).HasForeignKey(v => v.DoctorId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(v => v.Department).WithMany(d => d.Visits).HasForeignKey(v => v.DepartmentId).OnDelete(DeleteBehavior.Restrict);
    }
}

public class ConsultationConfiguration : IEntityTypeConfiguration<Consultation>
{
    public void Configure(EntityTypeBuilder<Consultation> builder)
    {
        builder.ToTable("Consultations");
        builder.HasKey(c => c.Id);
        builder.Property(c => c.Status).HasConversion<string>().HasMaxLength(25);
        builder.Property(c => c.Symptoms).IsRequired().HasMaxLength(2000);
        builder.Property(c => c.BloodPressure).HasMaxLength(25);
        builder.Property(c => c.TemperatureCelsius).HasColumnType("decimal(4,1)");
        builder.Property(c => c.WeightKg).HasColumnType("decimal(5,2)");
        builder.Property(c => c.HeightCm).HasColumnType("decimal(5,2)");
        builder.Property(c => c.ClinicalExamination).HasMaxLength(2000);
        builder.Property(c => c.Diagnosis).HasMaxLength(1000);
        builder.Property(c => c.IcdCode).HasMaxLength(20);
        builder.Property(c => c.ConsultationNotes).HasMaxLength(2000);
        builder.Property(c => c.FollowUpInstructions).HasMaxLength(1000);

        builder.HasIndex(c => c.VisitId).IsUnique();
        builder.HasOne(c => c.Visit).WithOne(v => v.Consultation).HasForeignKey<Consultation>(c => c.VisitId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(c => c.Doctor).WithMany(d => d.Consultations).HasForeignKey(c => c.DoctorId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(c => c.Patient).WithMany(p => p.Consultations).HasForeignKey(c => c.PatientId).OnDelete(DeleteBehavior.Restrict);
    }
}

public class PrescriptionConfiguration : IEntityTypeConfiguration<Prescription>
{
    public void Configure(EntityTypeBuilder<Prescription> builder)
    {
        builder.ToTable("Prescriptions");
        builder.HasKey(p => p.Id);
        builder.Property(p => p.PrescriptionNumber).IsRequired().HasMaxLength(30);
        builder.Property(p => p.GeneralInstructions).HasMaxLength(1000);

        builder.HasIndex(p => p.PrescriptionNumber).IsUnique();
        builder.HasIndex(p => p.ConsultationId).IsUnique();

        builder.HasOne(p => p.Consultation).WithOne(c => c.Prescription).HasForeignKey<Prescription>(p => p.ConsultationId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(p => p.Visit).WithMany().HasForeignKey(p => p.VisitId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(p => p.Doctor).WithMany(d => d.Prescriptions).HasForeignKey(p => p.DoctorId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(p => p.Patient).WithMany(pt => pt.Prescriptions).HasForeignKey(p => p.PatientId).OnDelete(DeleteBehavior.Restrict);
    }
}

public class PrescriptionItemConfiguration : IEntityTypeConfiguration<PrescriptionItem>
{
    public void Configure(EntityTypeBuilder<PrescriptionItem> builder)
    {
        builder.ToTable("PrescriptionItems");
        builder.HasKey(i => i.Id);
        builder.Property(i => i.MedicineName).IsRequired().HasMaxLength(180);
        builder.Property(i => i.Dosage).IsRequired().HasMaxLength(80);
        builder.Property(i => i.Frequency).IsRequired().HasMaxLength(80);
        builder.Property(i => i.Route).IsRequired().HasMaxLength(50);
        builder.Property(i => i.TimingInstruction).HasMaxLength(120);
        builder.Property(i => i.Notes).HasMaxLength(300);

        builder.HasOne(i => i.Prescription).WithMany(p => p.Items).HasForeignKey(i => i.PrescriptionId).OnDelete(DeleteBehavior.Cascade);
    }
}

public class BillConfiguration : IEntityTypeConfiguration<Bill>
{
    public void Configure(EntityTypeBuilder<Bill> builder)
    {
        builder.ToTable("Bills");
        builder.HasKey(b => b.Id);
        builder.Property(b => b.BillNumber).IsRequired().HasMaxLength(30);
        builder.Property(b => b.SubTotal).HasColumnType("decimal(12,2)");
        builder.Property(b => b.DiscountAmount).HasColumnType("decimal(12,2)");
        builder.Property(b => b.TaxAmount).HasColumnType("decimal(12,2)");
        builder.Property(b => b.TotalAmount).HasColumnType("decimal(12,2)");
        builder.Property(b => b.PaidAmount).HasColumnType("decimal(12,2)");
        builder.Property(b => b.BalanceAmount).HasColumnType("decimal(12,2)");
        builder.Property(b => b.Status).HasConversion<string>().HasMaxLength(25);
        builder.Property(b => b.Notes).HasMaxLength(500);

        builder.HasIndex(b => b.BillNumber).IsUnique();
        builder.HasIndex(b => b.VisitId).IsUnique();
        builder.HasIndex(b => b.Status);

        builder.HasOne(b => b.Visit).WithOne(v => v.Bill).HasForeignKey<Bill>(b => b.VisitId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(b => b.Patient).WithMany(p => p.Bills).HasForeignKey(b => b.PatientId).OnDelete(DeleteBehavior.Restrict);
    }
}

public class BillItemConfiguration : IEntityTypeConfiguration<BillItem>
{
    public void Configure(EntityTypeBuilder<BillItem> builder)
    {
        builder.ToTable("BillItems");
        builder.HasKey(i => i.Id);
        builder.Property(i => i.ServiceCode).IsRequired().HasMaxLength(30);
        builder.Property(i => i.Description).IsRequired().HasMaxLength(250);
        builder.Property(i => i.Category).HasConversion<string>().HasMaxLength(25);
        builder.Property(i => i.UnitPrice).HasColumnType("decimal(12,2)");
        builder.Property(i => i.TotalPrice).HasColumnType("decimal(12,2)");

        builder.HasOne(i => i.Bill).WithMany(b => b.Items).HasForeignKey(i => i.BillId).OnDelete(DeleteBehavior.Cascade);
    }
}

public class PaymentConfiguration : IEntityTypeConfiguration<Payment>
{
    public void Configure(EntityTypeBuilder<Payment> builder)
    {
        builder.ToTable("Payments");
        builder.HasKey(p => p.Id);
        builder.Property(p => p.ReceiptNumber).IsRequired().HasMaxLength(30);
        builder.Property(p => p.Amount).HasColumnType("decimal(12,2)");
        builder.Property(p => p.Method).HasConversion<string>().HasMaxLength(25);
        builder.Property(p => p.Status).HasConversion<string>().HasMaxLength(25);
        builder.Property(p => p.TransactionReference).HasMaxLength(120);
        builder.Property(p => p.GatewayOrderId).HasMaxLength(120);
        builder.Property(p => p.GatewayPaymentId).HasMaxLength(120);
        builder.Property(p => p.Notes).HasMaxLength(500);

        builder.HasIndex(p => p.ReceiptNumber).IsUnique();
        builder.HasIndex(p => p.PaidAt);

        builder.HasOne(p => p.Bill).WithMany(b => b.Payments).HasForeignKey(p => p.BillId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(p => p.Patient).WithMany(pt => pt.Payments).HasForeignKey(p => p.PatientId).OnDelete(DeleteBehavior.Restrict);
    }
}

public class NotificationConfiguration : IEntityTypeConfiguration<Notification>
{
    public void Configure(EntityTypeBuilder<Notification> builder)
    {
        builder.ToTable("Notifications");
        builder.HasKey(n => n.Id);
        builder.Property(n => n.Title).IsRequired().HasMaxLength(150);
        builder.Property(n => n.Message).IsRequired().HasMaxLength(1000);
        builder.Property(n => n.Type).HasConversion<string>().HasMaxLength(30);
        builder.Property(n => n.RelatedEntityType).HasMaxLength(60);

        builder.HasIndex(n => new { n.UserId, n.IsRead, n.CreatedAt });
        builder.HasOne(n => n.User).WithMany(u => u.Notifications).HasForeignKey(n => n.UserId).OnDelete(DeleteBehavior.Cascade);
    }
}

public class RefreshTokenConfiguration : IEntityTypeConfiguration<RefreshToken>
{
    public void Configure(EntityTypeBuilder<RefreshToken> builder)
    {
        builder.ToTable("RefreshTokens");
        builder.HasKey(rt => rt.Id);
        builder.Property(rt => rt.TokenHash).IsRequired().HasMaxLength(128);
        builder.Property(rt => rt.JwtId).IsRequired().HasMaxLength(64);
        builder.Property(rt => rt.CreatedByIp).HasMaxLength(64);
        builder.Property(rt => rt.RevokedByIp).HasMaxLength(64);
        builder.Property(rt => rt.ReplacedByTokenHash).HasMaxLength(128);
        builder.Property(rt => rt.ReasonRevoked).HasMaxLength(200);

        builder.HasIndex(rt => rt.TokenHash).IsUnique();
        builder.HasOne(rt => rt.User).WithMany(u => u.RefreshTokens).HasForeignKey(rt => rt.UserId).OnDelete(DeleteBehavior.Cascade);
    }
}

public class AuditLogConfiguration : IEntityTypeConfiguration<AuditLog>
{
    public void Configure(EntityTypeBuilder<AuditLog> builder)
    {
        builder.ToTable("AuditLogs");
        builder.HasKey(a => a.Id);
        builder.Property(a => a.UserEmail).HasMaxLength(160);
        builder.Property(a => a.UserRole).HasMaxLength(50);
        builder.Property(a => a.Action).IsRequired().HasMaxLength(80);
        builder.Property(a => a.EntityName).IsRequired().HasMaxLength(80);
        builder.Property(a => a.EntityId).HasMaxLength(64);
        builder.Property(a => a.Details).HasMaxLength(1000);
        builder.Property(a => a.IpAddress).HasMaxLength(64);
        builder.Property(a => a.UserAgent).HasMaxLength(300);

        builder.HasIndex(a => a.Timestamp);
        builder.HasIndex(a => new { a.EntityName, a.EntityId });
    }
}

public class HospitalSettingConfiguration : IEntityTypeConfiguration<HospitalSetting>
{
    public void Configure(EntityTypeBuilder<HospitalSetting> builder)
    {
        builder.ToTable("HospitalSettings");
        builder.HasKey(h => h.Id);
        builder.Property(h => h.HospitalName).IsRequired().HasMaxLength(160);
        builder.Property(h => h.Tagline).HasMaxLength(250);
        builder.Property(h => h.Phone).HasMaxLength(30);
        builder.Property(h => h.EmergencyPhone).HasMaxLength(30);
        builder.Property(h => h.Email).HasMaxLength(160);
        builder.Property(h => h.AddressLine).HasMaxLength(250);
        builder.Property(h => h.City).HasMaxLength(100);
        builder.Property(h => h.State).HasMaxLength(100);
        builder.Property(h => h.PostalCode).HasMaxLength(20);
        builder.Property(h => h.MapUrl).HasMaxLength(500);
        builder.Property(h => h.RegistrationFee).HasColumnType("decimal(10,2)");
        builder.Property(h => h.TaxPercentage).HasColumnType("decimal(5,2)");
        builder.Property(h => h.CurrencyCode).HasMaxLength(10);
    }
}
