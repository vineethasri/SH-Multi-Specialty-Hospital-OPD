# SH Multi-Specialty Hospital — OPD Management System

A full-stack, production-style Outpatient Department (OPD) CRM & Queue Management System built with **Angular 21**, **ASP.NET Core Web API (.NET 10)**, **Entity Framework Core**, and **MySQL 8.4**.

---

## Architecture Overview

```
SH-Hospital-CRM/
├── assets/logo.png                 # Hospital branding emblem
├── backend/
│   ├── Hospital.slnx
│   ├── src/
│   │   ├── Hospital.Domain/        # Core entities, enums, domain rules
│   │   ├── Hospital.Application/   # DTOs, service interfaces, business workflows, FluentValidation
│   │   ├── Hospital.Infrastructure/# EF Core DbContext, MySQL configs, migrations, PBKDF2, JWT, Seeder
│   │   └── Hospital.API/           # Versioned REST API (/api/v1/*), Swagger, Serilog, Global Exception Middleware
│   └── tests/Hospital.Tests/       # Unit & end-to-end integration tests
├── frontend/                       # Angular 21 standalone app + Angular Material
├── database/
│   ├── schema.sql                  # Normalized MySQL 8.4 DDL
│   ├── seed.sql                    # Reference roles, settings, departments SQL
│   └── backup-restore.ps1          # MySQL backup & recovery utility
├── postman/
│   └── SH-Hospital-OPD.postman_collection.json
├── docker-compose.yml              # MySQL 8.4 + .NET 10 API + Angular Nginx
└── .env.example                    # Environment configuration template
```

---

## Implemented Roles & Workflows

| Role | Capabilities |
| :--- | :--- |
| **Admin** | Analytics dashboard, user & receptionist CRUD, doctor & schedule management, department setup, appointments & OPD visit monitor, billing reports, audit logs, hospital settings. |
| **Receptionist** | Reception dashboard, new/walk-in patient registration, existing patient search, appointment booking & verification, check-in with automatic daily doctor-wise token generation, waiting queue monitor, bill generation, Cash/UPI/Card payment recording, printable receipts, patient check-out. |
| **Doctor** | Doctor dashboard, today's appointments, live waiting queue, consultation management (symptoms, vital signs, diagnosis, ICD-10, clinical notes, follow-up date), patient medical history, digital prescription builder, consultation completion. |
| **Patient** | Online registration & login, profile management, department/doctor/slot booking, appointment cancellation, live check-in token tracking, visit history, printable prescriptions, bills & receipts, notifications. |

### Visit Status Lifecycle
`Scheduled` → `CheckedIn` → `Waiting` → `InConsultation` → `ConsultationCompleted` → `BillingPending` → `ReadyForCheckout` → `CheckedOut` (plus `Cancelled`, `NoShow`).

---

## Demo Credentials (Development Mode)

When `Seed:EnableDemoData=true` (enabled in `appsettings.Development.json`):

| Role | Email | Password |
| :--- | :--- | :--- |
| **Admin** | `admin@shhospital.in` | `Admin@123` |
| **Receptionist** | `reception@shhospital.in` | `Reception@123` |
| **Doctor** | `dr.sharma@shhospital.in` | `Doctor@123` |
| **Patient** | `patient@shhospital.in` | `Patient@123` |

> **Important:** Set `Seed__EnableDemoData=false` in production and provide a strong `Jwt__SecretKey` via environment variables.

---

## Local Setup & Running

### 1. Prerequisites
- [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0)
- Node.js 20+ & npm
- MySQL 8.4 (or Docker Desktop)

### 2. Configure Database & Environment
1. Copy `.env.example` to `.env` and update credentials.
2. Ensure MySQL 8.4 is running and create the database (or execute `database/schema.sql`):
   ```sql
   CREATE DATABASE IF NOT EXISTS sh_hospital_opd CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```
3. Update `ConnectionStrings:DefaultConnection` in `backend/src/Hospital.API/appsettings.Development.json` or via environment variable `ConnectionStrings__DefaultConnection`.

### 3. Run EF Core Migrations & Backend API
```bash
cd backend
dotnet ef database update --project src/Hospital.Infrastructure --startup-project src/Hospital.Infrastructure
dotnet run --project src/Hospital.API --urls "http://localhost:5001"
```
- Swagger UI: `http://localhost:5001/swagger`
- Health Check: `http://localhost:5001/health`

### 4. Run Angular 21 Frontend
```bash
cd frontend
npm install
npm start
```
- Web App: `http://localhost:4200`

### 5. Run Docker Compose (Optional)
```bash
cp .env.example .env
docker compose up --build -d
```
- Frontend: `http://localhost:4200`
- Backend API: `http://localhost:5001`
- MySQL 8.4: `localhost:3306`

---

## Running Tests

### Backend Unit & Integration Tests
```bash
cd backend
dotnet test
```

### Frontend Production Build & Unit Tests
```bash
cd frontend
npm run build
npm test -- --watch=false
```

---

## Security, Privacy & Indian Healthcare Compliance Notes
- **Password Hashing:** PBKDF2-SHA256 with 100,000 iterations and per-user cryptographic salts; plain-text passwords are never stored.
- **JWT & Refresh Token Rotation:** Short-lived JWT access tokens + SHA-256 hashed refresh tokens with automatic reuse detection (revokes ancestor token family if reused).
- **Server-Side RBAC & Record Ownership:** Backend controllers and services enforce role permissions and verify patient/doctor ownership (patients can only view their own appointments, visits, prescriptions, and bills; doctors are restricted to assigned patients).
- **Audit Logging:** Authentication events, sensitive patient record access, appointments, check-ins, consultations, billing, and payments are logged in `AuditLogs`.
- **Transactions & Concurrency:** Serialized transactions protect appointment slot capacity, daily doctor token allocation, bill generation, and payment recording.
- **Payment Gateway Readiness:** `IPaymentGateway` provides the Razorpay integration contract without simulating fake online payment success; unconfigured Razorpay requests are safely rejected.
- **Backup & Recovery:** Use `database/backup-restore.ps1 -Action backup` (uses `mysqldump --single-transaction`) and `-Action restore -RestoreFile <path>` for routine backups and disaster recovery, aligned with India's DPDP Act 2023 and clinical data retention practices.

---

## Hospital Location
SH Multi-Specialty Hospital Campus: [Google Maps Link](https://share.google/RwUtNoO8Bq6Seh1Gy)
