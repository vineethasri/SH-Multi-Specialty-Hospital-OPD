import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ApiService } from '../../../core/services/api.service';
import { DashboardAnalyticsDto } from '../../../core/models/hospital.models';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatCardComponent } from '../../../shared/components/stat-card/stat-card.component';
import { extractApiError } from '../../../core/interceptors/auth.interceptor';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, PageHeaderComponent, StatCardComponent],
  template: `
    <app-page-header title="Hospital OPD Analytics" subtitle="Real-time outpatient volume, queue performance, and revenue overview">
      <mat-form-field appearance="outline" subscriptSizing="dynamic">
        <mat-label>Date</mat-label>
        <input matInput type="date" [(ngModel)]="selectedDate" (change)="load()" />
      </mat-form-field>
      <button mat-stroked-button (click)="load()">
        <mat-icon>refresh</mat-icon> Refresh
      </button>
    </app-page-header>

    @if (loading()) {
      <div class="sh-card sh-state-box">Loading analytics...</div>
    } @else if (error()) {
      <div class="sh-card sh-state-box">{{ error() }}</div>
    } @else if (data(); as d) {
      <div class="sh-grid-4">
        <app-stat-card label="Registered Patients" [value]="d.totalRegisteredPatients" icon="groups" tone="navy" hint="Total outpatient registry" />
        <app-stat-card label="Today's Appointments" [value]="d.todayAppointments" icon="event" tone="blue" [hint]="d.todayCheckIns + ' checked in today'" />
        <app-stat-card label="Waiting / In Consult" [value]="d.patientsWaiting + ' / ' + d.patientsInConsultation" icon="hourglass_top" tone="teal" [hint]="d.completedConsultations + ' completed'" />
        <app-stat-card label="Checked-Out Patients" [value]="d.checkedOutPatients" icon="task_alt" tone="green" [hint]="'Pending bills: ' + d.pendingBillsCount + ' (₹' + d.pendingBillsAmount + ')'" />
      </div>

      <div class="sh-grid-3" style="margin-top: 16px;">
        <app-stat-card label="Today's Revenue" [value]="'₹' + d.todayRevenue.toFixed(2)" icon="currency_rupee" tone="teal" />
        <app-stat-card label="Month Revenue" [value]="'₹' + d.monthRevenue.toFixed(2)" icon="trending_up" tone="blue" />
        <app-stat-card label="Total Collected" [value]="'₹' + d.totalRevenue.toFixed(2)" icon="account_balance_wallet" tone="navy" />
      </div>

      <div class="sh-grid-2" style="margin-top: 18px;">
        <div class="sh-card panel">
          <h3>7-Day OPD Visits &amp; Appointments Trend</h3>
          <div class="bars-list">
            @for (day of d.last7DaysTrend; track day.date) {
              <div class="bar-row">
                <span class="bar-label">{{ day.label }}</span>
                <div class="bar-track">
                  <div class="bar-fill" [style.width.%]="barPercent(day.visitsCount, maxTrendVisits(d))"></div>
                </div>
                <span class="bar-val">{{ day.visitsCount }} visits ({{ day.appointmentsCount }} appts) &bull; ₹{{ day.revenue }}</span>
              </div>
            }
          </div>
        </div>

        <div class="sh-card panel">
          <h3>Department-Wise OPD Statistics</h3>
          <div class="sh-table-wrap">
            <table class="sh-table">
              <thead>
                <tr><th>Department</th><th>Visits</th><th>Today Appts</th><th>Revenue</th></tr>
              </thead>
              <tbody>
                @for (dept of d.departmentStats; track dept.departmentId) {
                  <tr>
                    <td><strong>{{ dept.departmentName }}</strong></td>
                    <td>{{ dept.patientVisitsCount }}</td>
                    <td>{{ dept.appointmentsCount }}</td>
                    <td>₹{{ dept.revenue.toFixed(2) }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="sh-card panel" style="margin-top: 18px;">
        <h3>Doctor-Wise OPD Queue &amp; Appointment Load</h3>
        <div class="sh-table-wrap">
          <table class="sh-table">
            <thead>
              <tr><th>Doctor</th><th>Department</th><th>Today Appointments</th><th>Waiting Now</th><th>Completed Consults</th></tr>
            </thead>
            <tbody>
              @for (doc of d.doctorStats; track doc.doctorId) {
                <tr>
                  <td><strong>{{ doc.doctorName }}</strong></td>
                  <td>{{ doc.departmentName }}</td>
                  <td>{{ doc.totalAppointments }}</td>
                  <td>{{ doc.waitingCount }}</td>
                  <td>{{ doc.completedConsultations }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    }
  `,
  styles: [`
    .panel { padding: 18px; }
    .panel h3 { margin: 0 0 14px; font-size: 15.5px; color: var(--sh-navy); }
    .bars-list { display: flex; flex-direction: column; gap: 10px; }
    .bar-row { display: grid; grid-template-columns: 60px 1fr auto; align-items: center; gap: 10px; font-size: 12.5px; }
    .bar-label { color: var(--sh-text-muted); font-weight: 600; }
    .bar-track { height: 10px; background: #f1f5f9; border-radius: 999px; overflow: hidden; }
    .bar-fill { height: 100%; background: var(--sh-teal); border-radius: 999px; min-width: 4px; }
    .bar-val { color: var(--sh-text); font-weight: 500; white-space: nowrap; }
  `]
})
export class AdminDashboardComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly data = signal<DashboardAnalyticsDto | null>(null);
  selectedDate = new Date().toISOString().split('T')[0];

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.getDashboard(this.selectedDate).subscribe({
      next: (res) => { this.data.set(res); this.loading.set(false); },
      error: (err) => { this.error.set(extractApiError(err)); this.loading.set(false); }
    });
  }

  maxTrendVisits(d: DashboardAnalyticsDto): number {
    return Math.max(1, ...d.last7DaysTrend.map((x) => x.visitsCount));
  }

  barPercent(val: number, max: number): number {
    return val === 0 ? 0 : Math.max(6, Math.round((val / max) * 100));
  }
}
