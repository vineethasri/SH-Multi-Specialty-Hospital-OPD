import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { DoctorDto, VisitDto } from '../../../core/models/hospital.models';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { extractApiError } from '../../../core/interceptors/auth.interceptor';

@Component({
  selector: 'app-reception-queue',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule, PageHeaderComponent, StatusBadgeComponent],
  template: `
    <app-page-header title="Doctor-Wise OPD Waiting Queue" subtitle="Live OPD token monitor and patient check-out desk">
      <mat-form-field appearance="outline" subscriptSizing="dynamic">
        <mat-label>Doctor</mat-label>
        <mat-select [(ngModel)]="doctorId" (ngModelChange)="load()">
          <mat-option [value]="undefined">All Doctors</mat-option>
          @for (d of doctors(); track d.id) {
            <mat-option [value]="d.id">{{ d.fullName }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline" subscriptSizing="dynamic">
        <mat-label>Date</mat-label>
        <input matInput type="date" [(ngModel)]="date" (change)="load()" />
      </mat-form-field>
      <button mat-stroked-button (click)="load()"><mat-icon>refresh</mat-icon> Refresh</button>
    </app-page-header>

    <div class="sh-card">
      @if (loading()) {
        <div class="sh-state-box">Loading queue...</div>
      } @else if (queue().length === 0) {
        <div class="sh-state-box">No active visits in queue for the selected criteria.</div>
      } @else {
        <div class="sh-table-wrap">
          <table class="sh-table">
            <thead><tr><th>Token</th><th>Visit #</th><th>Patient</th><th>Doctor / Room</th><th>Checked-In</th><th>Status</th><th>Bill</th><th>Action</th></tr></thead>
            <tbody>
              @for (v of queue(); track v.id) {
                <tr>
                  <td><span class="token-pill">{{ v.tokenDisplay }}</span></td>
                  <td><code>{{ v.visitNumber }}</code><br/><small>{{ v.visitType }}</small></td>
                  <td><strong>{{ v.patientName }}</strong><br/><small>{{ v.patientCode }} &bull; {{ v.patientPhone }}</small></td>
                  <td>{{ v.doctorName }}<br/><small>{{ v.departmentName }} &bull; {{ v.doctorRoomNumber }}</small></td>
                  <td>{{ v.checkedInAt ? (v.checkedInAt | date:'shortTime') : '-' }}</td>
                  <td><app-status-badge [status]="v.status" /></td>
                  <td>
                    @if (v.billId) {
                      <span>₹{{ v.billTotalAmount?.toFixed(2) }} ({{ v.billStatus }})</span>
                    } @else {
                      <span style="color:#64748b;">Pending Bill</span>
                    }
                  </td>
                  <td style="white-space:nowrap;">
                    @if (v.status === 'ReadyForCheckout') {
                      <button mat-flat-button class="sh-btn-teal" (click)="checkOut(v)">Check Out</button>
                    } @else if (v.status === 'BillingPending' || v.status === 'ConsultationCompleted') {
                      <a mat-stroked-button routerLink="/reception/billing" [queryParams]="{ visitId: v.id }">Bill / Pay</a>
                    } @else {
                      <span style="font-size:12px;color:#64748b;">With Doctor / Waiting</span>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
  styles: [`
    .token-pill { display: inline-block; padding: 4px 10px; border-radius: 6px; background: var(--sh-navy); color: #fff; font-weight: 700; font-size: 13px; }
  `]
})
export class ReceptionQueueComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly queue = signal<VisitDto[]>([]);
  readonly doctors = signal<DoctorDto[]>([]);
  doctorId?: number;
  date = new Date().toISOString().split('T')[0];

  ngOnInit(): void {
    this.api.getDoctors({ isActive: true, page: 1, pageSize: 100 }).subscribe({ next: (r) => this.doctors.set(r.items) });
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.api.getDoctorQueue(this.doctorId, this.date).subscribe({
      next: (q) => { this.queue.set(q); this.loading.set(false); },
      error: (err) => { this.toast.error(extractApiError(err)); this.loading.set(false); }
    });
  }

  checkOut(v: VisitDto): void {
    this.api.checkOutVisit(v.id, 'Checked out at OPD queue desk').subscribe({
      next: () => { this.toast.success(`Patient ${v.patientName} checked out.`); this.load(); },
      error: (err) => this.toast.error(extractApiError(err))
    });
  }
}
