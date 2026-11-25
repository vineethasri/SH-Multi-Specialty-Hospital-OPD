using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Hospital.Application.DTOs.Appointments;
using Hospital.Application.DTOs.Auth;
using Hospital.Application.DTOs.Billing;
using Hospital.Application.DTOs.Consultations;
using Hospital.Application.DTOs.Dashboard;
using Hospital.Application.DTOs.Doctors;
using Hospital.Application.DTOs.Patients;
using Hospital.Application.DTOs.Visits;

namespace Hospital.Tests;

public class OpdWorkflowIntegrationTests(HospitalWebApplicationFactory factory)
    : IClassFixture<HospitalWebApplicationFactory>
{
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNameCaseInsensitive = true };

    [Fact]
    public async Task CompleteOpdLifecycle_FromBookingToCheckout_AndSecurityRules_WorkEndToEnd()
    {
        var client = factory.CreateClient();

        // 1. Verify public endpoints work without auth
        var deptRes = await client.GetAsync("/api/v1/departments");
        deptRes.EnsureSuccessStatusCode();

        // 2. Register new patient online
        var regReq = new RegisterPatientRequest(
            "Anjali", "Menon", $"anjali.{Guid.NewGuid():N}@test.in", "+91 98800 55443",
            "Patient@2026", new DateOnly(1992, 6, 15), "Female", "O+",
            "MG Road", "Bengaluru", "Ramesh Menon", "+91 98800 55444");
        var regRes = await client.PostAsJsonAsync("/api/v1/auth/register", regReq);
        Assert.Equal(HttpStatusCode.Created, regRes.StatusCode);
        var patientAuth = await regRes.Content.ReadFromJsonAsync<AuthResponse>(JsonOpts);
        Assert.NotNull(patientAuth);
        Assert.Equal("Patient", patientAuth!.User.Role);

        // 3. Test refresh token rotation & reuse detection
        var refreshRes = await client.PostAsJsonAsync("/api/v1/auth/refresh", new RefreshTokenRequest(patientAuth.RefreshToken));
        refreshRes.EnsureSuccessStatusCode();
        var rotatedAuth = await refreshRes.Content.ReadFromJsonAsync<AuthResponse>(JsonOpts);
        Assert.NotNull(rotatedAuth);
        Assert.NotEqual(patientAuth.RefreshToken, rotatedAuth!.RefreshToken);

        // Reusing old refresh token must fail (401)
        var reuseRes = await client.PostAsJsonAsync("/api/v1/auth/refresh", new RefreshTokenRequest(patientAuth.RefreshToken));
        Assert.Equal(HttpStatusCode.Unauthorized, reuseRes.StatusCode);

        // Re-login as patient
        var loginPat = await LoginAsync(client, regReq.Email, regReq.Password);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", loginPat.AccessToken);

        // Patient must be forbidden from accessing Admin users endpoint
        var adminForbidden = await client.GetAsync("/api/v1/users");
        Assert.Equal(HttpStatusCode.Forbidden, adminForbidden.StatusCode);

        // Patient books an appointment for tomorrow with Dr. Sharma (DoctorId=1, DepartmentId=1)
        var tomorrow = DateOnly.FromDateTime(DateTime.Today.AddDays(1));
        if (tomorrow.DayOfWeek == DayOfWeek.Sunday) tomorrow = tomorrow.AddDays(1);

        var slotsRes = await client.GetFromJsonAsync<List<TimeSlotDto>>($"/api/v1/doctors/1/slots?date={tomorrow:yyyy-MM-dd}", JsonOpts);
        Assert.NotNull(slotsRes);
        var firstSlot = slotsRes!.First(s => s.IsAvailable);

        var bookRes = await client.PostAsJsonAsync("/api/v1/appointments", new BookAppointmentRequest(
            null, 1, 1, tomorrow, firstSlot.StartTime, "Routine health checkup"));
        Assert.Equal(HttpStatusCode.Created, bookRes.StatusCode);
        var bookedAppt = await bookRes.Content.ReadFromJsonAsync<AppointmentDto>(JsonOpts);
        Assert.NotNull(bookedAppt);

        // Overlapping booking on exact same slot must return 409 Conflict
        var overlapRes = await client.PostAsJsonAsync("/api/v1/appointments", new BookAppointmentRequest(
            null, 1, 1, tomorrow, firstSlot.StartTime, "Duplicate slot attempt"));
        Assert.Equal(HttpStatusCode.Conflict, overlapRes.StatusCode);

        // 4. Receptionist logs in, creates walk-in patient, checks in walk-in without appointment
        var receptionAuth = await LoginAsync(client, "reception@shhospital.in", "Reception@123");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", receptionAuth.AccessToken);

        var walkInPatRes = await client.PostAsJsonAsync("/api/v1/patients", new CreatePatientRequest(
            "Raghav", "Kulkarni", new DateOnly(1980, 3, 20), "Male", "A+",
            "+91 98111 77889", null, "Jayanagar", "Bengaluru", null, null, null, null));
        Assert.Equal(HttpStatusCode.Created, walkInPatRes.StatusCode);
        var walkInPatient = await walkInPatRes.Content.ReadFromJsonAsync<PatientDto>(JsonOpts);
        Assert.NotNull(walkInPatient);

        var walkInVisitRes = await client.PostAsJsonAsync("/api/v1/visits/walk-in", new WalkInCheckInRequest(
            walkInPatient!.Id, 1, 1, "High fever and headache", "Urgent OPD walk-in"));
        Assert.Equal(HttpStatusCode.Created, walkInVisitRes.StatusCode);
        var visit = await walkInVisitRes.Content.ReadFromJsonAsync<VisitDto>(JsonOpts);
        Assert.NotNull(visit);
        Assert.Equal("WalkIn", visit!.VisitType);
        Assert.Equal("Waiting", visit.Status);

        // 5. Doctor logs in, views queue, starts consultation, records vitals/diagnosis/prescription, completes consultation
        var doctorAuth = await LoginAsync(client, "dr.sharma@shhospital.in", "Doctor@123");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", doctorAuth.AccessToken);

        var queue = await client.GetFromJsonAsync<List<VisitDto>>("/api/v1/visits/queue", JsonOpts);
        Assert.Contains(queue!, v => v.Id == visit.Id);

        var startConsultRes = await client.PostAsJsonAsync("/api/v1/consultations/start", new StartConsultationRequest(visit.Id));
        Assert.Equal(HttpStatusCode.Created, startConsultRes.StatusCode);
        var consult = await startConsultRes.Content.ReadFromJsonAsync<ConsultationDto>(JsonOpts);
        Assert.NotNull(consult);

        var rxRes = await client.PostAsJsonAsync("/api/v1/prescriptions", new SavePrescriptionRequest(
            consult!.Id,
            "Hydrate well and rest.",
            [
                new SavePrescriptionItemRequest("Paracetamol", "650 mg", "1-1-1", 3, "Oral", "After meals", 9, "For fever")
            ]));
        rxRes.EnsureSuccessStatusCode();

        var completeRes = await client.PostAsJsonAsync($"/api/v1/consultations/{consult.Id}/complete", new SaveConsultationRequest(
            "High fever, body ache", "118/78 mmHg", 38.4m, 92, 18, 98, 70m, 173m,
            "Throat mildly congested", "Acute Viral Pyrexia", "B34.9",
            "Monitor temperature 6 hourly", "Review if fever persists > 3 days", DateOnly.FromDateTime(DateTime.Today.AddDays(3))));
        completeRes.EnsureSuccessStatusCode();

        // 6. Receptionist tries checkout before billing -> must fail (400), generates bill, records payment, then checks out
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", receptionAuth.AccessToken);

        var earlyCheckout = await client.PostAsJsonAsync($"/api/v1/visits/{visit.Id}/checkout", new { notes = "Early" });
        Assert.Equal(HttpStatusCode.BadRequest, earlyCheckout.StatusCode);

        var billRes = await client.PostAsJsonAsync("/api/v1/bills", new GenerateBillRequest(visit.Id, 0m, "OPD visit bill", null));
        Assert.Equal(HttpStatusCode.Created, billRes.StatusCode);
        var bill = await billRes.Content.ReadFromJsonAsync<BillDto>(JsonOpts);
        Assert.NotNull(bill);
        Assert.True(bill!.TotalAmount > 0);

        // Razorpay unconfigured must not fake success
        var fakeGatewayRes = await client.PostAsJsonAsync("/api/v1/payments", new RecordPaymentRequest(bill.Id, bill.BalanceAmount, "Razorpay", "FAKE", null));
        Assert.Equal(HttpStatusCode.BadRequest, fakeGatewayRes.StatusCode);

        // Record Cash payment
        var payRes = await client.PostAsJsonAsync("/api/v1/payments", new RecordPaymentRequest(bill.Id, bill.BalanceAmount, "Cash", null, "Paid at desk"));
        Assert.Equal(HttpStatusCode.Created, payRes.StatusCode);

        // Checkout now succeeds
        var checkoutRes = await client.PostAsJsonAsync($"/api/v1/visits/{visit.Id}/checkout", new { notes = "Checked out cleanly" });
        checkoutRes.EnsureSuccessStatusCode();
        var checkedOutVisit = await checkoutRes.Content.ReadFromJsonAsync<VisitDto>(JsonOpts);
        Assert.Equal("CheckedOut", checkedOutVisit!.Status);

        // 7. Admin checks dashboard analytics
        var adminAuth = await LoginAsync(client, "admin@shhospital.in", "Admin@123");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", adminAuth.AccessToken);
        var dashboard = await client.GetFromJsonAsync<DashboardAnalyticsDto>("/api/v1/dashboard", JsonOpts);
        Assert.NotNull(dashboard);
        Assert.True(dashboard!.TotalRegisteredPatients >= 6);
        Assert.True(dashboard.TodayRevenue >= bill.TotalAmount);
    }

    private static async Task<AuthResponse> LoginAsync(HttpClient client, string email, string password)
    {
        var res = await client.PostAsJsonAsync("/api/v1/auth/login", new LoginRequest(email, password));
        res.EnsureSuccessStatusCode();
        return (await res.Content.ReadFromJsonAsync<AuthResponse>(JsonOpts))!;
    }
}
