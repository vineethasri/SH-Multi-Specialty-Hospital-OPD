import { Routes } from '@angular/router';
import { authGuard, guestGuard, roleGuard } from './core/guards/auth.guard';
import { PublicLayoutComponent } from './shared/components/public-layout/public-layout.component';
import { AppShellComponent } from './shared/components/app-shell/app-shell.component';

export const routes: Routes = [
  {
    path: '',
    component: PublicLayoutComponent,
    children: [
      { path: '', loadComponent: () => import('./features/public/home/home.component').then(m => m.HomeComponent) },
      { path: 'about', loadComponent: () => import('./features/public/about/about.component').then(m => m.AboutComponent) },
      { path: 'departments', loadComponent: () => import('./features/public/departments/departments.component').then(m => m.PublicDepartmentsComponent) },
      { path: 'doctors', loadComponent: () => import('./features/public/doctors/doctors.component').then(m => m.PublicDoctorsComponent) },
      { path: 'contact', loadComponent: () => import('./features/public/contact/contact.component').then(m => m.ContactComponent) },
      { path: 'book-appointment', loadComponent: () => import('./features/public/book/public-book.component').then(m => m.PublicBookComponent) },
      { path: 'login', canActivate: [guestGuard], loadComponent: () => import('./features/public/auth/login.component').then(m => m.LoginComponent) },
      { path: 'register', canActivate: [guestGuard], loadComponent: () => import('./features/public/auth/register.component').then(m => m.RegisterComponent) }
    ]
  },
  {
    path: 'admin',
    component: AppShellComponent,
    canActivate: [authGuard, roleGuard('Admin')],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: () => import('./features/admin/dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent) },
      { path: 'users', loadComponent: () => import('./features/admin/users/admin-users.component').then(m => m.AdminUsersComponent) },
      { path: 'doctors', loadComponent: () => import('./features/admin/doctors/admin-doctors.component').then(m => m.AdminDoctorsComponent) },
      { path: 'departments', loadComponent: () => import('./features/admin/departments/admin-departments.component').then(m => m.AdminDepartmentsComponent) },
      { path: 'appointments', loadComponent: () => import('./features/admin/appointments/admin-appointments.component').then(m => m.AdminAppointmentsComponent) },
      { path: 'patients', loadComponent: () => import('./features/admin/patients/admin-patients.component').then(m => m.AdminPatientsComponent) },
      { path: 'visits', loadComponent: () => import('./features/admin/visits/admin-visits.component').then(m => m.AdminVisitsComponent) },
      { path: 'reports', loadComponent: () => import('./features/admin/reports/admin-reports.component').then(m => m.AdminReportsComponent) },
      { path: 'audit-logs', loadComponent: () => import('./features/admin/audit-logs/admin-audit-logs.component').then(m => m.AdminAuditLogsComponent) },
      { path: 'settings', loadComponent: () => import('./features/admin/settings/admin-settings.component').then(m => m.AdminSettingsComponent) }
    ]
  },
  {
    path: 'reception',
    component: AppShellComponent,
    canActivate: [authGuard, roleGuard('Receptionist', 'Admin')],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: () => import('./features/reception/dashboard/reception-dashboard.component').then(m => m.ReceptionDashboardComponent) },
      { path: 'patients', loadComponent: () => import('./features/reception/patients/reception-patients.component').then(m => m.ReceptionPatientsComponent) },
      { path: 'appointments', loadComponent: () => import('./features/reception/appointments/reception-appointments.component').then(m => m.ReceptionAppointmentsComponent) },
      { path: 'queue', loadComponent: () => import('./features/reception/queue/reception-queue.component').then(m => m.ReceptionQueueComponent) },
      { path: 'billing', loadComponent: () => import('./features/reception/billing/reception-billing.component').then(m => m.ReceptionBillingComponent) }
    ]
  },
  {
    path: 'doctor',
    component: AppShellComponent,
    canActivate: [authGuard, roleGuard('Doctor')],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: () => import('./features/doctor/dashboard/doctor-dashboard.component').then(m => m.DoctorDashboardComponent) },
      { path: 'queue', loadComponent: () => import('./features/doctor/queue/doctor-queue.component').then(m => m.DoctorQueueComponent) },
      { path: 'consultation/:visitId', loadComponent: () => import('./features/doctor/consultation/doctor-consultation.component').then(m => m.DoctorConsultationComponent) }
    ]
  },
  {
    path: 'patient',
    component: AppShellComponent,
    canActivate: [authGuard, roleGuard('Patient')],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: () => import('./features/patient/dashboard/patient-dashboard.component').then(m => m.PatientDashboardComponent) },
      { path: 'book', loadComponent: () => import('./features/public/book/public-book.component').then(m => m.PublicBookComponent) },
      { path: 'appointments', loadComponent: () => import('./features/patient/appointments/patient-appointments.component').then(m => m.PatientAppointmentsComponent) },
      { path: 'visits', loadComponent: () => import('./features/patient/visits/patient-visits.component').then(m => m.PatientVisitsComponent) },
      { path: 'prescriptions', loadComponent: () => import('./features/patient/prescriptions/patient-prescriptions.component').then(m => m.PatientPrescriptionsComponent) },
      { path: 'billing', loadComponent: () => import('./features/patient/billing/patient-billing.component').then(m => m.PatientBillingComponent) },
      { path: 'notifications', loadComponent: () => import('./features/patient/notifications/patient-notifications.component').then(m => m.PatientNotificationsComponent) },
      { path: 'profile', loadComponent: () => import('./features/patient/profile/patient-profile.component').then(m => m.PatientProfileComponent) }
    ]
  },
  { path: '**', redirectTo: '' }
];
