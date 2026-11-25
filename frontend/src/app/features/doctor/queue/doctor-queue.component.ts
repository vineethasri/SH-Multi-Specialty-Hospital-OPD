import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { VisitDto } from '../../../core/models/hospital.models';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { extractApiError } from '../../../core/interceptors/auth.interceptor';

@Component({
  selector: 'app-doctor-queue',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, PageHeaderComponent, StatusBadgeComponent],
  template: `
    <app-page-header title="My OPD Waiting Queue" subtitle="Call next waiting patient, record clinical consultation, and issue digital prescriptions">
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
        <div class="sh-state-box">No patients in your queue for {{ date }}.</div>
      } @else {
        <div class="sh-table-wrap">
          <table class="sh-table">
            <thead><tr><th>Token</th><th>Visit #</th><th>Patient</th><th>Type</th><th>Chief Complaint</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              @for (v of queue(); track v.id) {
                <tr>
                  <td><span class="token">{{ v.tokenDisplay }}</span></td>
                  <td><code>{{ v.visitNumber }}</code></td>
                  <td><strong>{{ v.patientName }}</strong><br/><small>{{ v.patientCode }} &bull; {{ v.patientAge }}y {{ v.patientGender }}</small></td>
                  <td><app-status-badge [status]="v.visitType" /></td>
                  <td>{{ v.chiefComplaint || '-' }}</td>
                  <td><app-status-badge [status]="v.status" /></td>
                  <td>
                    @if (v.status === 'Waiting' || v.status === 'CheckedIn') {
                      <button mat-flat-button class="sh-btn-teal" (click)="startOrOpen(v)">Start Consultation</button>
                    } @else {
                      <button mat-stroked-button color="primary" (click)="startOrOpen(v)">
                        {{ v.status === 'InConsultation' ? 'Resume Consultation' : 'View Summary' }}
                      </button>
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
  styles: [`.token { padding: 4px 10px; border-radius: 6px; background: var(--sh-navy); color: #fff; font-weight: 700; }`]
})
export class DoctorQueueComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly queue = signal<VisitDto[]>([]);
  date = new Date().toISOString().split('T')[0];

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.api.getDoctorQueue(undefined, this.date).subscribe({
      next: (q) => { this.queue.set(q); this.loading.set(false); },
      error: (err) => { this.toast.error(extractApiError(err)); this.loading.set(false); }
    });
  }

  startOrOpen(v: VisitDto): void {
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
