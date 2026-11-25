import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../../core/services/api.service';
import { DashboardAnalyticsDto, VisitDto } from '../../../core/models/hospital.models';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatCardComponent } from '../../../shared/components/stat-card/stat-card.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-reception-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule, MatIconModule, PageHeaderComponent, StatCardComponent, StatusBadgeComponent],
  template: `
    <app-page-header title="OPD Reception Desk" subtitle="Front-desk check-in, walk-ins, doctor queues, billing, and check-out">
      <a mat-flat-button class="sh-btn-teal" routerLink="/reception/patients"><mat-icon>person_add</mat-icon> Walk-In / Register</a>
      <a mat-flat-button class="sh-btn-primary" routerLink="/reception/appointments"><mat-icon>event_available</mat-icon> Check-In / Book</a>
    </app-page-header>

    @if (data(); as d) {
      <div class="sh-grid-4">
        <app-stat-card label="Today's Appointments" [value]="d.todayAppointments" icon="event" tone="blue" />
        <app-stat-card label="Today's Check-Ins" [value]="d.todayCheckIns" icon="how_to_reg" tone="teal" />
        <app-stat-card label="Patients Waiting" [value]="d.patientsWaiting" icon="groups" tone="amber" [hint]="d.patientsInConsultation + ' in consultation'" />
        <app-stat-card label="Pending Bills" [value]="d.pendingBillsCount" icon="receipt_long" tone="navy" [hint]="'₹' + d.pendingBillsAmount.toFixed(2) + ' due'" />
      </div>
    }

    <div class="sh-card" style="margin-top:20px; padding:18px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <h3 style="margin:0;color:var(--sh-navy);font-size:16px;">Active OPD Queue Today</h3>
        <a mat-button color="primary" routerLink="/reception/queue">Open Full Queue &rarr;</a>
      </div>

      @if (queue().length === 0) {
        <div class="sh-state-box">No active patients in OPD queue right now.</div>
      } @else {
        <div class="sh-table-wrap">
          <table class="sh-table">
            <thead><tr><th>Token</th><th>Visit #</th><th>Patient</th><th>Doctor</th><th>Type</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              @for (v of queue().slice(0, 8); track v.id) {
                <tr>
                  <td><strong style="color:var(--sh-navy);">{{ v.tokenDisplay }}</strong></td>
                  <td><code>{{ v.visitNumber }}</code></td>
                  <td>{{ v.patientName }}<br/><small>{{ v.patientPhone }}</small></td>
                  <td>{{ v.doctorName }}<br/><small>{{ v.doctorRoomNumber }}</small></td>
                  <td><app-status-badge [status]="v.visitType" /></td>
                  <td><app-status-badge [status]="v.status" /></td>
                  <td>
                    <a mat-stroked-button routerLink="/reception/billing">Billing / Checkout</a>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `
})
export class ReceptionDashboardComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly data = signal<DashboardAnalyticsDto | null>(null);
  readonly queue = signal<VisitDto[]>([]);

  ngOnInit(): void {
    this.api.getDashboard().subscribe({ next: (d) => this.data.set(d), error: () => {} });
    this.api.getDoctorQueue().subscribe({ next: (q) => this.queue.set(q), error: () => {} });
  }
}
