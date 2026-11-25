-- SH Multi-Specialty Hospital OPD - Reference Seed SQL (MySQL 8.4)
-- Note: Demo users with PBKDF2 password hashes and transactional OPD history are
-- automatically seeded on first startup by DatabaseSeeder when Seed:EnableDemoData=true.

USE sh_hospital_opd;

INSERT IGNORE INTO Roles (Name, Description) VALUES
('Admin', 'Hospital administrator with full system configuration and analytics access'),
('Receptionist', 'Front-desk staff managing registration, walk-ins, check-in, billing, and check-out'),
('Doctor', 'Medical practitioner managing OPD queue, clinical consultations, and prescriptions'),
('Patient', 'Registered outpatient with portal access for bookings, prescriptions, and receipts');

INSERT IGNORE INTO HospitalSettings (
    Id, HospitalName, Tagline, Phone, EmergencyPhone, Email,
    AddressLine, City, State, PostalCode, MapUrl,
    RegistrationFee, TaxPercentage, CurrencyCode,
    OpdStartTime, OpdEndTime, DefaultSlotMinutes,
    AllowOnlineBooking, RequireFullPaymentBeforeCheckout
) VALUES (
    1,
    'SH Multi-Specialty Hospital',
    'Compassionate Outpatient Care, Precision Medicine',
    '+91 80 4123 9000',
    '+91 80 4123 9111',
    'care@shhospital.in',
    'SH Hospital Campus, Healthcare Avenue',
    'Bengaluru',
    'Karnataka',
    '560001',
    'https://share.google/RwUtNoO8Bq6Seh1Gy',
    100.00,
    0.00,
    'INR',
    '09:00:00',
    '18:00:00',
    15,
    1,
    1
);

INSERT IGNORE INTO Departments (Code, Name, Description, FloorLocation, ConsultationFeeDefault, IsActive) VALUES
('GENMED', 'General Medicine', 'Comprehensive primary care, fever clinics, chronic disease management, and preventive health checkups.', 'Ground Floor - Wing A', 500.00, 1),
('CARD', 'Cardiology', 'Non-invasive cardiac evaluation, ECG, hypertension, lipid & heart failure outpatient clinic.', '1st Floor - Wing B', 900.00, 1),
('ORTHO', 'Orthopedics', 'Joint pain, spine clinic, fracture follow-ups, sports injuries, and rehabilitation consults.', '1st Floor - Wing A', 750.00, 1),
('PED', 'Pediatrics', 'Childhood wellness, vaccinations, growth monitoring, and acute pediatric care.', 'Ground Floor - Wing B', 600.00, 1),
('DERM', 'Dermatology', 'Clinical dermatology, allergy testing, skin and hair outpatient procedures.', '2nd Floor - Wing A', 700.00, 1),
('ENT', 'ENT & Head Neck', 'Ear, nose, throat, sinus endoscopy, and audiology outpatient services.', '2nd Floor - Wing B', 650.00, 1);
