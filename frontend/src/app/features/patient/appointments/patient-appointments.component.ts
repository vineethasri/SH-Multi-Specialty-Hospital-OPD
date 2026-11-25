import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDialog } from '@angular/material/dialog';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { AppointmentDto } from '../../../core/models/hospital.models';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { DataTableShellComponent } from '../../../shared/components/data-table/data-table.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { extractApiError } from '../../../core/interceptors/auth.interceptor';

@Component({
  selector: 'app-patient-appointments',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, PageHeaderComponent, DataTableShellComponent, StatusBadgeComponent],
  template: `
    <app-page-header title="My Appointments" subtitle="View upcoming bookings, check confirmation status, or cancel an appointment" />

    <app-data-table-shell
      [loading]="loading()" [error]="error()" [totalCount]="totalCount()" [page]="page()" [pageSize]="15"
      [search]="search" searchPlaceholder="Search by APT# or doctor..."
      (searchChange)="search = $event; page.set(1); load()" (pageChange)="page.set($event); load()" (retry)="load()">
      <table class="sh-table">
        <thead><tr><th>APT #</th><th>Date &amp; Slot</th><th>Doctor / Dept</th><th>Reason</th><th>Status</th><th>Action</th></tr></thead>
        <tbody>
          @for (a of items(); track a.id) {
            <tr>
              <td><code>{{ a.appointmentNumber }}</code></td>
              <td>{{ a.appointmentDate }}<br/><small>{{ a.startTime.slice(0,5) }} - {{ a.endTime.slice(0,5) }}</small></td>
              <td><strong>{{ a.doctorName }}</strong><br/><small>{{ a.departmentName }}</small></td>
              <td>{{ a.reasonForVisit }}</td>
              <td><app-status-badge [status]="a.status" /></td>
              <td>
                @if (a.status === 'Booked' || a.status === 'Confirmed') {
                  <button mat-stroked-button color="warn" (click)="cancel(a)">Cancel</button>
                }
              </td>
            </tr>
          }
        </tbody>
      </table>
    </app-data-table-shell>
  `
})
export class PatientAppointmentsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(MatDialog);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly items = signal<AppointmentDto[]>([]);
  readonly totalCount = signal(0);
  readonly page = signal(1);
  search = '';

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.api.getAppointments({ page: this.page(), pageSize: 15, search: this.search }).subscribe({
      next: (r) => { this.items.set(r.items); this.totalCount.set(r.totalCount); this.loading.set(false); },
      error: (err) => { this.error.set(extractApiError(err)); this.loading.set(false); }
    });
  }

  cancel(a: AppointmentDto): void {
    this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Cancel Appointment', message: `Cancel appointment ${a.appointmentNumber} with ${a.doctorName}?`, confirmLabel: 'Cancel Appointment', confirmColor: 'warn', requireReason: true }
    }).afterClosed().subscribe((reason) => {
      if (!reason) return;
      this.api.cancelAppointment(a.id, reason).subscribe({
        next: () => { this.toast.success('Appointment cancelled.'); this.load(); },
        error: (err) => this.toast.error(extractApiError(err))
      });
    });
  }
}
