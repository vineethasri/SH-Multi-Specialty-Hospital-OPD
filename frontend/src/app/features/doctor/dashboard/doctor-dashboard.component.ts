import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { AppointmentDto, DashboardAnalyticsDto, VisitDto } from '../../../core/models/hospital.models';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatCardComponent } from '../../../shared/components/stat-card/stat-card.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { extractApiError } from '../../../core/interceptors/auth.interceptor';

@Component({
  selector: 'app-doctor-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule, MatIconModule, PageHeaderComponent, StatCardComponent, StatusBadgeComponent],
  template: `
    <app-page-header title="Doctor OPD Workspace" subtitle="Today's appointments, live waiting queue, and consultation overview">
      <a mat-flat-button class="sh-btn-teal" routerLink="/doctor/queue"><mat-icon>stethoscope</mat-icon> Open Waiting Queue</a>
    </app-page-header>

    @if (data(); as d) {
      <div class="sh-grid-4">
        <app-stat-card label="Today's Appointments" [value]="d.todayAppointments" icon="event" tone="blue" />
        <app-stat-card label="Waiting Queue" [value]="d.patientsWaiting" icon="hourglass_top" tone="amber" />
        <app-stat-card label="In Consultation" [value]="d.patientsInConsultation" icon="medical_services" tone="teal" />
        <app-stat-card label="Completed Today" [value]="d.completedConsultations" icon="task_alt" tone="green" />
      </div>
    }

    <div class="sh-grid-2" style="margin-top:18px;">
      <div class="sh-card" style="padding:18px;">
        <h3 style="margin:0 0 12px;color:var(--sh-navy);font-size:16px;">Waiting &amp; Active Patients</h3>
        @if (queue().length === 0) {
          <div class="sh-state-box">No patients waiting in your OPD queue right now.</div>
        } @else {
          <table class="sh-table">
            <thead><tr><th>Token</th><th>Patient</th><th>Complaint</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              @for (v of queue(); track v.id) {
                <tr>
                  <td><strong>{{ v.tokenDisplay }}</strong></td>
                  <td>{{ v.patientName }}<br/><small>{{ v.patientAge }}y / {{ v.patientGender }}</small></td>
                  <td>{{ v.chiefComplaint || '-' }}</td>
                  <td><app-status-badge [status]="v.status" /></td>
                  <td>
                    @if (v.status === 'Waiting' || v.status === 'CheckedIn' || v.status === 'InConsultation') {
                      <button mat-flat-button class="sh-btn-primary" (click)="openConsultation(v)">
                        {{ v.consultationId ? 'Resume' : 'Start' }}
                      </button>
                    } @else if (v.consultationId) {
                      <button mat-stroked-button (click)="router.navigate(['/doctor/consultation', v.id])">View</button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>

      <div class="sh-card" style="padding:18px;">
        <h3 style="margin:0 0 12px;color:var(--sh-navy);font-size:16px;">Today's Scheduled Appointments</h3>
        @if (appointments().length === 0) {
          <div class="sh-state-box">No appointments scheduled for today.</div>
        } @else {
          <table class="sh-table">
            <thead><tr><th>Slot</th><th>Patient</th><th>Reason</th><th>Status</th></tr></thead>
            <tbody>
              @for (a of appointments(); track a.id) {
                <tr>
                  <td><strong>{{ a.startTime.slice(0,5) }}</strong></td>
                  <td>{{ a.patientName }}<br/><small>{{ a.patientCode }}</small></td>
                  <td>{{ a.reasonForVisit }}</td>
                  <td><app-status-badge [status]="a.status" /></td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>
    </div>
  `
})
export class DoctorDashboardComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly data = signal<DashboardAnalyticsDto | null>(null);
  readonly queue = signal<VisitDto[]>([]);
  readonly appointments = signal<AppointmentDto[]>([]);

  ngOnInit(): void {
    const today = new Date().toISOString().split('T')[0];
    this.api.getDashboard(today).subscribe({ next: (d) => this.data.set(d), error: () => {} });
    this.api.getDoctorQueue(undefined, today).subscribe({ next: (q) => this.queue.set(q), error: () => {} });
    this.api.getAppointments({ date: today, page: 1, pageSize: 20 }).subscribe({ next: (r) => this.appointments.set(r.items), error: () => {} });
  }

  openConsultation(v: VisitDto): void {
    if (v.consultationId) {
      void this.router.navigate(['/doctor/consultation', v.id]);
      return;
    }
    this.api.startConsultation(v.id).subscribe({
      next: () => void this.router.navigate(['/doctor/consultation', v.id]),
      error: (err) => this.toast.error(extractApiError(err))
    });
  }
}
