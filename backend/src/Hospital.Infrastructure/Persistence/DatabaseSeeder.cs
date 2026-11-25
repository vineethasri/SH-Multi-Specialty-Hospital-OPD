using Hospital.Application.Interfaces;
using Hospital.Domain.Entities;
using Hospital.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Hospital.Infrastructure.Persistence;

public class DatabaseSeeder(
    HospitalDbContext db,
    IPasswordHasher passwordHasher,
    IConfiguration configuration,
    ILogger<DatabaseSeeder> logger)
{
    public async Task SeedAsync(CancellationToken cancellationToken = default)
    {
        await SeedRolesAsync(cancellationToken);
        await SeedHospitalSettingsAsync(cancellationToken);

        var enableDemo = bool.TryParse(configuration["Seed:EnableDemoData"], out var demo) && demo;
        if (!enableDemo)
        {
            await EnsureBaselineAdminAsync(cancellationToken);
            return;
        }

        if (await db.Users.AnyAsync(cancellationToken))
        {
            logger.LogInformation("Database already seeded; skipping demo seed.");
            return;
        }

        logger.LogInformation("Seeding SH Hospital OPD demo data...");

        var roles = await db.Roles.ToDictionaryAsync(r => r.Name, cancellationToken);

        // 1. Admin & Receptionist users
        var adminUser = new User
        {
            RoleId = roles[nameof(RoleType.Admin)].Id,
            FullName = "Arvind Menon",
            Email = "admin@shhospital.in",
            PhoneNumber = "+91 98450 10001",
            PasswordHash = passwordHasher.Hash("Admin@123"),
            IsActive = true
        };

        var receptionUser1 = new User
        {
            RoleId = roles[nameof(RoleType.Receptionist)].Id,
            FullName = "Priya Nair",
            Email = "reception@shhospital.in",
            PhoneNumber = "+91 98450 10002",
            PasswordHash = passwordHasher.Hash("Reception@123"),
            IsActive = true
        };

        var receptionUser2 = new User
        {
            RoleId = roles[nameof(RoleType.Receptionist)].Id,
            FullName = "Karthik Rao",
            Email = "karthik.desk@shhospital.in",
            PhoneNumber = "+91 98450 10003",
            PasswordHash = passwordHasher.Hash("Reception@123"),
            IsActive = true
        };

        db.Users.AddRange(adminUser, receptionUser1, receptionUser2);
        await db.SaveChangesAsync(cancellationToken);

        // 2. Departments
        var departments = new List<Department>
        {
            new() { Code = "GENMED", Name = "General Medicine", Description = "Comprehensive primary care, fever clinics, chronic disease management, and preventive health checkups.", FloorLocation = "Ground Floor - Wing A", ConsultationFeeDefault = 500m, IsActive = true },
            new() { Code = "CARD", Name = "Cardiology", Description = "Non-invasive cardiac evaluation, ECG, hypertension, lipid & heart failure outpatient clinic.", FloorLocation = "1st Floor - Wing B", ConsultationFeeDefault = 900m, IsActive = true },
            new() { Code = "ORTHO", Name = "Orthopedics", Description = "Joint pain, spine clinic, fracture follow-ups, sports injuries, and rehabilitation consults.", FloorLocation = "1st Floor - Wing A", ConsultationFeeDefault = 750m, IsActive = true },
            new() { Code = "PED", Name = "Pediatrics", Description = "Childhood wellness, vaccinations, growth monitoring, and acute pediatric care.", FloorLocation = "Ground Floor - Wing B", ConsultationFeeDefault = 600m, IsActive = true },
            new() { Code = "DERM", Name = "Dermatology", Description = "Clinical dermatology, allergy testing, skin and hair outpatient procedures.", FloorLocation = "2nd Floor - Wing A", ConsultationFeeDefault = 700m, IsActive = true },
            new() { Code = "ENT", Name = "ENT & Head Neck", Description = "Ear, nose, throat, sinus endoscopy, and audiology outpatient services.", FloorLocation = "2nd Floor - Wing B", ConsultationFeeDefault = 650m, IsActive = true }
        };
        db.Departments.AddRange(departments);
        await db.SaveChangesAsync(cancellationToken);

        // 3. Doctors + Schedules
        var doctorSeeds = new[]
        {
            new { Name = "Dr. Rajeshwar Sharma", Email = "dr.sharma@shhospital.in", Phone = "+91 98450 20001", Dept = departments[0], Code = "DOC-001", Spec = "Internal Medicine & Diabetology", Qual = "MBBS, MD (General Medicine)", Reg = "KMC-45821", Exp = 14, Fee = 500m, Room = "OPD-101", Bio = "Senior Consultant Physician specializing in metabolic disorders, infectious diseases, and preventive adult care." },
            new { Name = "Dr. Ananya Deshmukh", Email = "dr.deshmukh@shhospital.in", Phone = "+91 98450 20002", Dept = departments[1], Code = "DOC-002", Spec = "Clinical & Preventive Cardiology", Qual = "MBBS, MD, DM (Cardiology)", Reg = "KMC-51204", Exp = 12, Fee = 900m, Room = "OPD-201", Bio = "Consultant Cardiologist focused on hypertension, ischemic heart disease, and echocardiography." },
            new { Name = "Dr. Vikramaditya Kulkarni", Email = "dr.kulkarni@shhospital.in", Phone = "+91 98450 20003", Dept = departments[2], Code = "DOC-003", Spec = "Joint Replacement & Sports Orthopedics", Qual = "MBBS, MS (Orthopedics)", Reg = "KMC-48910", Exp = 11, Fee = 750m, Room = "OPD-204", Bio = "Orthopedic specialist treating knee, shoulder, and spine conditions with evidence-based conservative and surgical care." },
            new { Name = "Dr. Meenakshi Iyer", Email = "dr.iyer@shhospital.in", Phone = "+91 98450 20004", Dept = departments[3], Code = "DOC-004", Spec = "Pediatrics & Neonatology", Qual = "MBBS, MD (Pediatrics)", Reg = "KMC-53318", Exp = 9, Fee = 600m, Room = "OPD-105", Bio = "Dedicated pediatrician offering immunization schedules, adolescent care, and acute respiratory care." },
            new { Name = "Dr. Rohan Kapoor", Email = "dr.kapoor@shhospital.in", Phone = "+91 98450 20005", Dept = departments[4], Code = "DOC-005", Spec = "Clinical Dermatology", Qual = "MBBS, MD (DVL)", Reg = "KMC-56092", Exp = 8, Fee = 700m, Room = "OPD-302", Bio = "Specialist in eczema, psoriasis, acne management, and dermatoscopy." },
            new { Name = "Dr. Sneha Reddy", Email = "dr.reddy@shhospital.in", Phone = "+91 98450 20006", Dept = departments[5], Code = "DOC-006", Spec = "ENT, Sinus & Audiology", Qual = "MBBS, MS (ENT)", Reg = "KMC-58410", Exp = 10, Fee = 650m, Room = "OPD-305", Bio = "Consultant ENT surgeon specializing in endoscopic sinus care, vertigo, and pediatric ENT." }
        };

        var doctors = new List<Doctor>();
        foreach (var ds in doctorSeeds)
        {
            var u = new User
            {
                RoleId = roles[nameof(RoleType.Doctor)].Id,
                FullName = ds.Name,
                Email = ds.Email,
                PhoneNumber = ds.Phone,
                PasswordHash = passwordHasher.Hash("Doctor@123"),
                IsActive = true
            };
            db.Users.Add(u);
            await db.SaveChangesAsync(cancellationToken);

            var doc = new Doctor
            {
                UserId = u.Id,
                DepartmentId = ds.Dept.Id,
                DoctorCode = ds.Code,
                Specialization = ds.Spec,
                Qualification = ds.Qual,
                RegistrationNumber = ds.Reg,
                ExperienceYears = ds.Exp,
                ConsultationFee = ds.Fee,
                Bio = ds.Bio,
                RoomNumber = ds.Room,
                AverageConsultationMinutes = 15,
                IsAvailableForOnlineBooking = true,
                IsActive = true
            };
            db.Doctors.Add(doc);
            await db.SaveChangesAsync(cancellationToken);
            doctors.Add(doc);

            // Mon-Sat morning & evening schedules (plus Sunday morning for General Medicine)
            foreach (DayOfWeek day in Enum.GetValues<DayOfWeek>())
            {
                if (day == DayOfWeek.Sunday && ds.Code != "DOC-001") continue;

                db.DoctorSchedules.Add(new DoctorSchedule
                {
                    DoctorId = doc.Id,
                    DayOfWeek = day,
                    StartTime = new TimeSpan(9, 0, 0),
                    EndTime = new TimeSpan(13, 0, 0),
                    SlotDurationMinutes = 15,
                    MaxPatientsPerSlot = 1,
                    IsActive = true
                });

                if (day != DayOfWeek.Sunday)
                {
                    db.DoctorSchedules.Add(new DoctorSchedule
                    {
                        DoctorId = doc.Id,
                        DayOfWeek = day,
                        StartTime = new TimeSpan(15, 0, 0),
                        EndTime = new TimeSpan(18, 0, 0),
                        SlotDurationMinutes = 15,
                        MaxPatientsPerSlot = 1,
                        IsActive = true
                    });
                }
            }
            await db.SaveChangesAsync(cancellationToken);
        }

        // 4. Patients
        var patientSeeds = new[]
        {
            new { First = "Suresh", Last = "Babu", Email = (string?)"patient@shhospital.in", Phone = "+91 99001 30001", Dob = new DateOnly(1985, 4, 14), Gender = Gender.Male, Blood = "B+", City = "Bengaluru", Allergies = "Penicillin", Chronic = "Type 2 Diabetes", Portal = true, Code = $"SHP-{DateTime.Today.Year}-0001" },
            new { First = "Lakshmi", Last = "Narayanan", Email = (string?)"lakshmi.n@example.in", Phone = "+91 99001 30002", Dob = new DateOnly(1972, 9, 22), Gender = Gender.Female, Blood = "O+", City = "Bengaluru", Allergies = "None known", Chronic = "Hypertension", Portal = true, Code = $"SHP-{DateTime.Today.Year}-0002" },
            new { First = "Mohammed", Last = "Farhan", Email = (string?)"farhan.m@example.in", Phone = "+91 99001 30003", Dob = new DateOnly(1993, 1, 8), Gender = Gender.Male, Blood = "A+", City = "Bengaluru", Allergies = "Sulfa drugs", Chronic = (string?)null, Portal = true, Code = $"SHP-{DateTime.Today.Year}-0003" },
            new { First = "Kavya", Last = "Venkatesh", Email = (string?)null, Phone = "+91 99001 30004", Dob = new DateOnly(2018, 7, 19), Gender = Gender.Female, Blood = "O+", City = "Bengaluru", Allergies = "None", Chronic = (string?)null, Portal = false, Code = $"SHP-{DateTime.Today.Year}-0004" },
            new { First = "Deepak", Last = "Chauhan", Email = (string?)null, Phone = "+91 99001 30005", Dob = new DateOnly(1968, 12, 2), Gender = Gender.Male, Blood = "AB+", City = "Mysuru", Allergies = "Dust", Chronic = "Osteoarthritis", Portal = false, Code = $"SHP-{DateTime.Today.Year}-0005" },
            new { First = "Meera", Last = "Subramanian", Email = (string?)"meera.s@example.in", Phone = "+91 99001 30006", Dob = new DateOnly(1990, 8, 11), Gender = Gender.Female, Blood = "A-", City = "Bengaluru", Allergies = "None known", Chronic = "Allergic Rhinitis", Portal = true, Code = $"SHP-{DateTime.Today.Year}-0006" },
            new { First = "Rohan", Last = "Desai", Email = (string?)"rohan.d@example.in", Phone = "+91 99001 30007", Dob = new DateOnly(1979, 2, 25), Gender = Gender.Male, Blood = "B+", City = "Bengaluru", Allergies = "Aspirin", Chronic = "Dyslipidemia", Portal = true, Code = $"SHP-{DateTime.Today.Year}-0007" }
        };

        var patients = new List<Patient>();
        foreach (var ps in patientSeeds)
        {
            int? userId = null;
            if (ps.Portal && ps.Email is not null)
            {
                var pu = new User
                {
                    RoleId = roles[nameof(RoleType.Patient)].Id,
                    FullName = $"{ps.First} {ps.Last}",
                    Email = ps.Email,
                    PhoneNumber = ps.Phone,
                    PasswordHash = passwordHasher.Hash("Patient@123"),
                    IsActive = true
                };
                db.Users.Add(pu);
                await db.SaveChangesAsync(cancellationToken);
                userId = pu.Id;
            }

            var patient = new Patient
            {
                UserId = userId,
                PatientCode = ps.Code,
                FirstName = ps.First,
                LastName = ps.Last,
                FullName = $"{ps.First} {ps.Last}",
                DateOfBirth = ps.Dob,
                Gender = ps.Gender,
                BloodGroup = ps.Blood,
                PhoneNumber = ps.Phone,
                Email = ps.Email,
                Address = "Indiranagar 2nd Stage",
                City = ps.City,
                EmergencyContactName = "Family Caregiver",
                EmergencyContactPhone = "+91 99001 99999",
                Allergies = ps.Allergies,
                ChronicConditions = ps.Chronic
            };
            db.Patients.Add(patient);
            await db.SaveChangesAsync(cancellationToken);
            patients.Add(patient);
        }

        // 5. Realistic OPD Workflow History (Yesterday completed + Today active queue)
        var today = DateOnly.FromDateTime(DateTime.Today);
        var yesterday = today.AddDays(-1);

        // Completed Visit from Yesterday
        var yApt = new Appointment
        {
            AppointmentNumber = $"APT-{yesterday:yyyyMMdd}-0001",
            PatientId = patients[0].Id,
            DoctorId = doctors[0].Id,
            DepartmentId = doctors[0].DepartmentId,
            AppointmentDate = yesterday,
            StartTime = new TimeSpan(10, 0, 0),
            EndTime = new TimeSpan(10, 15, 0),
            BookingSource = BookingSource.Online,
            Status = AppointmentStatus.Completed,
            ReasonForVisit = "Routine diabetes review and fasting glucose check"
        };
        db.Appointments.Add(yApt);
        await db.SaveChangesAsync(cancellationToken);

        var yVisit = new Visit
        {
            VisitNumber = $"VST-{yesterday:yyyyMMdd}-0001",
            AppointmentId = yApt.Id,
            PatientId = patients[0].Id,
            DoctorId = doctors[0].Id,
            DepartmentId = doctors[0].DepartmentId,
            VisitDate = yesterday,
            VisitType = VisitType.Appointment,
            TokenNumber = 1,
            TokenDisplay = "D001-001",
            Status = VisitStatus.CheckedOut,
            CheckedInAt = yesterday.ToDateTime(new TimeOnly(9, 50)),
            ConsultationStartedAt = yesterday.ToDateTime(new TimeOnly(10, 2)),
            ConsultationCompletedAt = yesterday.ToDateTime(new TimeOnly(10, 16)),
            CheckedOutAt = yesterday.ToDateTime(new TimeOnly(10, 25)),
            ChiefComplaint = "Routine diabetes follow-up"
        };
        db.Visits.Add(yVisit);
        await db.SaveChangesAsync(cancellationToken);

        var yConsult = new Consultation
        {
            VisitId = yVisit.Id,
            DoctorId = doctors[0].Id,
            PatientId = patients[0].Id,
            Status = ConsultationStatus.Completed,
            Symptoms = "Mild fatigue in afternoons, compliant with medication",
            BloodPressure = "126/82 mmHg",
            TemperatureCelsius = 36.8m,
            PulseRate = 76,
            SpO2 = 98,
            WeightKg = 74.5m,
            HeightCm = 172m,
            ClinicalExamination = "CVS S1S2 normal, chest clear, foot exam normal.",
            Diagnosis = "Type 2 Diabetes Mellitus - Stable",
            IcdCode = "E11.9",
            ConsultationNotes = "Continue Metformin, advise 30 min daily brisk walk.",
            FollowUpInstructions = "Repeat HbA1c in 3 months.",
            RecommendedFollowUpDate = today.AddDays(90),
            StartedAt = yVisit.ConsultationStartedAt!.Value,
            CompletedAt = yVisit.ConsultationCompletedAt!.Value
        };
        db.Consultations.Add(yConsult);
        await db.SaveChangesAsync(cancellationToken);

        var yRx = new Prescription
        {
            PrescriptionNumber = $"RX-{yesterday:yyyyMMdd}-0001",
            ConsultationId = yConsult.Id,
            VisitId = yVisit.Id,
            DoctorId = doctors[0].Id,
            PatientId = patients[0].Id,
            GeneralInstructions = "Low-glycemic diet and daily hydration.",
            IssuedAt = yConsult.CompletedAt!.Value,
            Items = new List<PrescriptionItem>
            {
                new() { MedicineName = "Metformin Hydrochloride SR", Dosage = "500 mg", Frequency = "1-0-1", DurationDays = 30, Route = "Oral", TimingInstruction = "After meals", Quantity = 60 },
                new() { MedicineName = "Atorvastatin", Dosage = "10 mg", Frequency = "0-0-1", DurationDays = 30, Route = "Oral", TimingInstruction = "At bedtime", Quantity = 30 }
            }
        };
        db.Prescriptions.Add(yRx);

        var yBill = new Bill
        {
            BillNumber = $"BILL-{yesterday:yyyyMMdd}-0001",
            VisitId = yVisit.Id,
            PatientId = patients[0].Id,
            SubTotal = 600m,
            DiscountAmount = 0m,
            TaxAmount = 0m,
            TotalAmount = 600m,
            PaidAmount = 600m,
            BalanceAmount = 0m,
            Status = BillStatus.Paid,
            IssuedAt = yVisit.ConsultationCompletedAt!.Value,
            Items = new List<BillItem>
            {
                new() { ServiceCode = "OPD-CONS", Description = "OPD Consultation - Dr. Rajeshwar Sharma (General Medicine)", Category = BillItemCategory.Consultation, Quantity = 1, UnitPrice = 500m, TotalPrice = 500m },
                new() { ServiceCode = "OPD-REG", Description = "New Patient OPD Registration Fee", Category = BillItemCategory.Registration, Quantity = 1, UnitPrice = 100m, TotalPrice = 100m }
            }
        };
        db.Bills.Add(yBill);
        await db.SaveChangesAsync(cancellationToken);

        db.Payments.Add(new Payment
        {
            ReceiptNumber = $"RCP-{yesterday:yyyyMMdd}-0001",
            BillId = yBill.Id,
            PatientId = patients[0].Id,
            Amount = 600m,
            Method = PaymentMethod.UPI,
            Status = PaymentStatus.Completed,
            TransactionReference = "UPI-4129980012",
            PaidAt = yVisit.CheckedOutAt!.Value,
            Notes = "Settled at OPD desk"
        });

        // Today's Appointments & Active OPD Queue
        var todayApt1 = new Appointment
        {
            AppointmentNumber = $"APT-{today:yyyyMMdd}-0001",
            PatientId = patients[1].Id,
            DoctorId = doctors[1].Id,
            DepartmentId = doctors[1].DepartmentId,
            AppointmentDate = today,
            StartTime = new TimeSpan(10, 0, 0),
            EndTime = new TimeSpan(10, 15, 0),
            BookingSource = BookingSource.Online,
            Status = AppointmentStatus.CheckedIn,
            ReasonForVisit = "Blood pressure monitoring and ECG review"
        };
        var todayApt2 = new Appointment
        {
            AppointmentNumber = $"APT-{today:yyyyMMdd}-0002",
            PatientId = patients[2].Id,
            DoctorId = doctors[0].Id,
            DepartmentId = doctors[0].DepartmentId,
            AppointmentDate = today,
            StartTime = new TimeSpan(11, 30, 0),
            EndTime = new TimeSpan(11, 45, 0),
            BookingSource = BookingSource.Online,
            Status = AppointmentStatus.Confirmed,
            ReasonForVisit = "Persistent viral fever for 3 days"
        };
        var todayApt3 = new Appointment
        {
            AppointmentNumber = $"APT-{today:yyyyMMdd}-0003",
            PatientId = patients[0].Id,
            DoctorId = doctors[2].Id,
            DepartmentId = doctors[2].DepartmentId,
            AppointmentDate = today.AddDays(1),
            StartTime = new TimeSpan(10, 30, 0),
            EndTime = new TimeSpan(10, 45, 0),
            BookingSource = BookingSource.Online,
            Status = AppointmentStatus.Booked,
            ReasonForVisit = "Right knee stiffness on climbing stairs"
        };
        db.Appointments.AddRange(todayApt1, todayApt2, todayApt3);
        await db.SaveChangesAsync(cancellationToken);

        // Checked-in Waiting Visit for todayApt1
        db.Visits.Add(new Visit
        {
            VisitNumber = $"VST-{today:yyyyMMdd}-0001",
            AppointmentId = todayApt1.Id,
            PatientId = patients[1].Id,
            DoctorId = doctors[1].Id,
            DepartmentId = doctors[1].DepartmentId,
            VisitDate = today,
            VisitType = VisitType.Appointment,
            TokenNumber = 1,
            TokenDisplay = "D002-001",
            Status = VisitStatus.Waiting,
            CheckedInAt = DateTime.UtcNow.AddMinutes(-20),
            ChiefComplaint = "Hypertension review"
        });

        // Walk-in Waiting Visit for Pediatrics
        db.Visits.Add(new Visit
        {
            VisitNumber = $"VST-{today:yyyyMMdd}-0002",
            AppointmentId = null,
            PatientId = patients[3].Id,
            DoctorId = doctors[3].Id,
            DepartmentId = doctors[3].DepartmentId,
            VisitDate = today,
            VisitType = VisitType.WalkIn,
            TokenNumber = 1,
            TokenDisplay = "D004-001",
            Status = VisitStatus.Waiting,
            CheckedInAt = DateTime.UtcNow.AddMinutes(-10),
            ChiefComplaint = "Seasonal cough and cold"
        });

        // Billing Pending Visit from today (consultation completed)
        var todayDoneVisit = new Visit
        {
            VisitNumber = $"VST-{today:yyyyMMdd}-0003",
            AppointmentId = null,
            PatientId = patients[4].Id,
            DoctorId = doctors[2].Id,
            DepartmentId = doctors[2].DepartmentId,
            VisitDate = today,
            VisitType = VisitType.WalkIn,
            TokenNumber = 1,
            TokenDisplay = "D003-001",
            Status = VisitStatus.BillingPending,
            CheckedInAt = DateTime.UtcNow.AddMinutes(-45),
            ConsultationStartedAt = DateTime.UtcNow.AddMinutes(-30),
            ConsultationCompletedAt = DateTime.UtcNow.AddMinutes(-12),
            ChiefComplaint = "Chronic knee joint pain"
        };
        db.Visits.Add(todayDoneVisit);
        await db.SaveChangesAsync(cancellationToken);

        var todayDoneConsult = new Consultation
        {
            VisitId = todayDoneVisit.Id,
            DoctorId = doctors[2].Id,
            PatientId = patients[4].Id,
            Status = ConsultationStatus.Completed,
            Symptoms = "Bilateral knee pain aggravated on walking",
            BloodPressure = "132/84 mmHg",
            PulseRate = 78,
            SpO2 = 98,
            Diagnosis = "Early Osteoarthritis Knee",
            IcdCode = "M17.0",
            ConsultationNotes = "Advised quadriceps strengthening exercises.",
            FollowUpInstructions = "Review after 2 weeks with knee X-ray.",
            RecommendedFollowUpDate = today.AddDays(14),
            StartedAt = todayDoneVisit.ConsultationStartedAt!.Value,
            CompletedAt = todayDoneVisit.ConsultationCompletedAt!.Value
        };
        db.Consultations.Add(todayDoneConsult);
        await db.SaveChangesAsync(cancellationToken);

        db.Bills.Add(new Bill
        {
            BillNumber = $"BILL-{today:yyyyMMdd}-0001",
            VisitId = todayDoneVisit.Id,
            PatientId = patients[4].Id,
            SubTotal = 850m,
            DiscountAmount = 0m,
            TaxAmount = 0m,
            TotalAmount = 850m,
            PaidAmount = 0m,
            BalanceAmount = 850m,
            Status = BillStatus.Pending,
            IssuedAt = DateTime.UtcNow.AddMinutes(-10),
            Items = new List<BillItem>
            {
                new() { ServiceCode = "OPD-CONS", Description = "OPD Consultation - Dr. Vikramaditya Kulkarni (Orthopedics)", Category = BillItemCategory.Consultation, Quantity = 1, UnitPrice = 750m, TotalPrice = 750m },
                new() { ServiceCode = "OPD-REG", Description = "New Patient OPD Registration Fee", Category = BillItemCategory.Registration, Quantity = 1, UnitPrice = 100m, TotalPrice = 100m }
            }
        });

        await db.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Demo data seeded successfully.");
    }

    private async Task SeedRolesAsync(CancellationToken cancellationToken)
    {
        var roleDefinitions = new (RoleType Type, string Desc)[]
        {
            (RoleType.Admin, "Hospital administrator with full system configuration and analytics access"),
            (RoleType.Receptionist, "Front-desk staff managing registration, walk-ins, check-in, billing, and check-out"),
            (RoleType.Doctor, "Medical practitioner managing OPD queue, clinical consultations, and prescriptions"),
            (RoleType.Patient, "Registered outpatient with portal access for bookings, prescriptions, and receipts")
        };

        foreach (var (type, desc) in roleDefinitions)
        {
            var name = type.ToString();
            if (!await db.Roles.AnyAsync(r => r.Name == name, cancellationToken))
            {
                db.Roles.Add(new Role { Name = name, Description = desc });
            }
        }
        await db.SaveChangesAsync(cancellationToken);
    }

    private async Task SeedHospitalSettingsAsync(CancellationToken cancellationToken)
    {
        if (!await db.HospitalSettings.AnyAsync(cancellationToken))
        {
            db.HospitalSettings.Add(new HospitalSetting
            {
                HospitalName = "SH Multi-Specialty Hospital",
                Tagline = "Compassionate Outpatient Care, Precision Medicine",
                Phone = "+91 80 4123 9000",
                EmergencyPhone = "+91 80 4123 9111",
                Email = "care@shhospital.in",
                AddressLine = "SH Hospital Campus, Healthcare Avenue",
                City = "Bengaluru",
                State = "Karnataka",
                PostalCode = "560001",
                MapUrl = "https://share.google/RwUtNoO8Bq6Seh1Gy",
                RegistrationFee = 100m,
                TaxPercentage = 0m,
                CurrencyCode = "INR",
                OpdStartTime = new TimeSpan(9, 0, 0),
                OpdEndTime = new TimeSpan(18, 0, 0),
                DefaultSlotMinutes = 15,
                AllowOnlineBooking = true,
                RequireFullPaymentBeforeCheckout = true
            });
            await db.SaveChangesAsync(cancellationToken);
        }
    }

    private async Task EnsureBaselineAdminAsync(CancellationToken cancellationToken)
    {
        var adminEmail = configuration["Seed:AdminEmail"] ?? "admin@shhospital.in";
        var adminPass = configuration["Seed:AdminPassword"];
        if (string.IsNullOrWhiteSpace(adminPass)) return;

        if (!await db.Users.AnyAsync(u => u.Email == adminEmail, cancellationToken))
        {
            var adminRole = await db.Roles.FirstAsync(r => r.Name == nameof(RoleType.Admin), cancellationToken);
            db.Users.Add(new User
            {
                RoleId = adminRole.Id,
                FullName = "Hospital Administrator",
                Email = adminEmail,
                PhoneNumber = "+91 80 4123 9000",
                PasswordHash = passwordHasher.Hash(adminPass),
                IsActive = true
            });
            await db.SaveChangesAsync(cancellationToken);
        }
    }
}
