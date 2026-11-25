import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { AppointmentDto, DashboardAnalyticsDto, VisitDto } from '../../../core/models/hospital.models';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatCardComponent } from '../../../shared/components/stat-card/stat-card.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-patient-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule, MatIconModule, PageHeaderComponent, StatCardComponent, StatusBadgeComponent],
  template: `
    <app-page-header [title]="'Welcome, ' + (auth.user()?.fullName || 'Patient')" [subtitle]="'Patient ID: ' + (auth.user()?.patientCode || '-')">
      <a mat-flat-button class="sh-btn-teal" routerLink="/patient/book"><mat-icon>add_circle</mat-icon> Book Appointment</a>
    </app-page-header>

    @if (data(); as d) {
      <div class="sh-grid-4">
        <app-stat-card label="Today Appointments" [value]="d.todayAppointments" icon="event" tone="blue" />
        <app-stat-card label="Active Check-Ins" [value]="d.patientsWaiting + d.patientsInConsultation" icon="confirmation_number" tone="teal" />
        <app-stat-card label="Completed Visits" [value]="d.completedConsultations" icon="medical_information" tone="green" />
        <app-stat-card label="Pending Bills" [value]="d.pendingBillsCount" icon="receipt" tone="amber" [hint]="'₹' + d.pendingBillsAmount.toFixed(2) + ' due'" />
      </div>
    }

    <div class="sh-grid-2" style="margin-top:18px;">
      <div class="sh-card" style="padding:18px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <h3 style="margin:0;color:var(--sh-navy);font-size:16px;">Recent Appointments</h3>
          <a mat-button color="primary" routerLink="/patient/appointments">View All</a>
        </div>
        @if (appointments().length === 0) {
          <div class="sh-state-box">No appointments yet. Book your first OPD visit!</div>
        } @else {
          <table class="sh-table">
            <thead><tr><th>Date</th><th>Doctor</th><th>Status</th></tr></thead>
            <tbody>
              @for (a of appointments(); track a.id) {
                <tr>
                  <td>{{ a.appointmentDate }}<br/><small>{{ a.startTime.slice(0,5) }}</small></td>
                  <td>{{ a.doctorName }}<br/><small>{{ a.departmentName }}</small></td>
                  <td><app-status-badge [status]="a.status" /></td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>

      <div class="sh-card" style="padding:18px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <h3 style="margin:0;color:var(--sh-navy);font-size:16px;">Recent Visits &amp; Token Status</h3>
          <a mat-button color="primary" routerLink="/patient/visits">Visit History</a>
        </div>
        @if (visits().length === 0) {
          <div class="sh-state-box">No OPD visits recorded yet.</div>
        } @else {
          <table class="sh-table">
            <thead><tr><th>Token</th><th>Doctor</th><th>Status</th></tr></thead>
            <tbody>
              @for (v of visits(); track v.id) {
                <tr>
                  <td><strong>{{ v.tokenDisplay }}</strong><br/><small>{{ v.visitDate }}</small></td>
                  <td>{{ v.doctorName }}<br/><small>{{ v.doctorRoomNumber }}</small></td>
                  <td><app-status-badge [status]="v.status" /></td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>
    </div>
  `
})
export class PatientDashboardComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  readonly data = signal<DashboardAnalyticsDto | null>(null);
  readonly appointments = signal<AppointmentDto[]>([]);
  readonly visits = signal<VisitDto[]>([]);

  ngOnInit(): void {
    this.api.getDashboard().subscribe({ next: (d) => this.data.set(d), error: () => {} });
    this.api.getAppointments({ page: 1, pageSize: 5 }).subscribe({ next: (r) => this.appointments.set(r.items), error: () => {} });
    this.api.getVisits({ page: 1, pageSize: 5 }).subscribe({ next: (r) => this.visits.set(r.items), error: () => {} });
  }
}
