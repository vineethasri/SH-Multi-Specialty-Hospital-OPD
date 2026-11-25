using Hospital.Application.Common;
using Hospital.Application.DTOs.Visits;
using Hospital.Application.Interfaces;
using Hospital.Application.Services;
using Hospital.Domain.Entities;
using Hospital.Domain.Enums;
using Hospital.Infrastructure.Persistence;
using Hospital.Infrastructure.Security;
using Hospital.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;

namespace Hospital.Tests;

public class UnitTests
{
    private static HospitalDbContext CreateInMemoryDb()
    {
        var options = new DbContextOptionsBuilder<HospitalDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString("N"))
            .Options;
        return new HospitalDbContext(options);
    }

    [Fact]
    public void PasswordHasher_HashesAndVerifies_Correctly()
    {
        var hasher = new PasswordHasher();
        var hash = hasher.Hash("StrongPass@2026");

        Assert.NotEqual("StrongPass@2026", hash);
        Assert.True(hasher.Verify("StrongPass@2026", hash));
        Assert.False(hasher.Verify("WrongPass@2026", hash));
    }

    [Fact]
    public void TokenService_GeneratesValidJwtAndDistinctRefreshTokens()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:SecretKey"] = "UnitTest_Super_Secret_Key_2026_AtLeast32Chars!",
                ["Jwt:Issuer"] = "TestIssuer",
                ["Jwt:Audience"] = "TestAudience",
                ["Jwt:AccessTokenMinutes"] = "15",
                ["Jwt:RefreshTokenDays"] = "7"
            }).Build();

        var service = new TokenService(config);
        var user = new User
        {
            Id = 10,
            Email = "doc@shhospital.in",
            FullName = "Dr. Test",
            Role = new Role { Id = 3, Name = "Doctor" }
        };

        var (jwt, jwtId, exp) = service.GenerateAccessToken(user);
        var (raw1, hash1, _) = service.GenerateRefreshToken();
        var (raw2, hash2, _) = service.GenerateRefreshToken();

        Assert.False(string.IsNullOrWhiteSpace(jwt));
        Assert.False(string.IsNullOrWhiteSpace(jwtId));
        Assert.True(exp > DateTime.UtcNow);
        Assert.NotEqual(raw1, raw2);
        Assert.NotEqual(hash1, hash2);
        Assert.Equal(hash1, service.HashToken(raw1));
    }

    [Fact]
    public async Task VisitService_BlocksCancelledAppointmentCheckIn_AndPreventsDoubleCheckIn()
    {
        await using var db = CreateInMemoryDb();
        var roleDoc = new Role { Name = "Doctor" };
        var rolePat = new Role { Name = "Patient" };
        db.Roles.AddRange(roleDoc, rolePat);
        await db.SaveChangesAsync();

        var docUser = new User { RoleId = roleDoc.Id, FullName = "Dr. Unit", Email = "u@h.in", PhoneNumber = "1234567890", PasswordHash = "x" };
        var dept = new Department { Code = "GM", Name = "General Medicine", ConsultationFeeDefault = 500m };
        db.Users.Add(docUser);
        db.Departments.Add(dept);
        await db.SaveChangesAsync();

        var doctor = new Doctor { UserId = docUser.Id, DepartmentId = dept.Id, DoctorCode = "DOC-001", Specialization = "GP", Qualification = "MBBS", RegistrationNumber = "REG1", ConsultationFee = 500m, RoomNumber = "101" };
        var patient = new Patient { PatientCode = "SHP-1", FirstName = "A", LastName = "B", FullName = "A B", DateOfBirth = new DateOnly(1990, 1, 1), Gender = Gender.Male, PhoneNumber = "9999999999" };
        db.Doctors.Add(doctor);
        db.Patients.Add(patient);
        await db.SaveChangesAsync();

        var today = DateOnly.FromDateTime(DateTime.Today);
        var cancelledAppt = new Appointment { AppointmentNumber = "APT-1", PatientId = patient.Id, DoctorId = doctor.Id, DepartmentId = dept.Id, AppointmentDate = today, StartTime = new TimeSpan(10, 0, 0), EndTime = new TimeSpan(10, 15, 0), Status = AppointmentStatus.Cancelled, ReasonForVisit = "Check" };
        var activeAppt = new Appointment { AppointmentNumber = "APT-2", PatientId = patient.Id, DoctorId = doctor.Id, DepartmentId = dept.Id, AppointmentDate = today, StartTime = new TimeSpan(11, 0, 0), EndTime = new TimeSpan(11, 15, 0), Status = AppointmentStatus.Confirmed, ReasonForVisit = "Fever" };
        db.Appointments.AddRange(cancelledAppt, activeAppt);
        await db.SaveChangesAsync();

        var fakeUser = new TestCurrentUserService { UserId = 1, Role = "Receptionist", Email = "rec@h.in" };
        var visitService = new VisitService(
            db,
            fakeUser,
            new CodeGeneratorService(db),
            new NotificationService(db),
            new AuditService(db, fakeUser, NullLogger<AuditService>.Instance));

        await Assert.ThrowsAsync<BusinessRuleException>(() =>
            visitService.CheckInAppointmentAsync(new CheckInAppointmentRequest(cancelledAppt.Id, null, null)));

        var visit = await visitService.CheckInAppointmentAsync(new CheckInAppointmentRequest(activeAppt.Id, null, null));
        Assert.Equal(1, visit.TokenNumber);
        Assert.Equal("Waiting", visit.Status);

        await Assert.ThrowsAsync<ConflictException>(() =>
            visitService.CheckInAppointmentAsync(new CheckInAppointmentRequest(activeAppt.Id, null, null)));
    }

    private sealed class TestCurrentUserService : ICurrentUserService
    {
        public int? UserId { get; set; }
        public string? Email { get; set; }
        public string? Role { get; set; }
        public string? IpAddress => "127.0.0.1";
        public string? UserAgent => "xUnit";
        public bool IsAuthenticated => UserId.HasValue;
        public bool IsInRole(params string[] roles) => Role is not null && roles.Contains(Role);
    }
}
