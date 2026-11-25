import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDialog } from '@angular/material/dialog';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { AppointmentDto, DepartmentDto, DoctorDto, PatientDto, TimeSlotDto } from '../../../core/models/hospital.models';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { DataTableShellComponent } from '../../../shared/components/data-table/data-table.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { extractApiError } from '../../../core/interceptors/auth.interceptor';

@Component({
  selector: 'app-reception-appointments',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule, PageHeaderComponent, DataTableShellComponent, StatusBadgeComponent],
  template: `
    <app-page-header title="Appointments &amp; OPD Check-In" subtitle="Book appointments for patients, verify bookings, and check patients in to generate queue tokens">
      <button mat-flat-button class="sh-btn-primary" (click)="showBook.set(!showBook())">
        <mat-icon>{{ showBook() ? 'close' : 'add' }}</mat-icon>
        {{ showBook() ? 'Close Booking' : 'Book Appointment' }}
      </button>
    </app-page-header>

    @if (showBook()) {
      <div class="sh-card form-card">
        <h3>Reception Appointment Booking</h3>
        <form [formGroup]="bookForm" (ngSubmit)="submitBook()">
          <div class="sh-grid-4">
            <mat-form-field appearance="outline">
              <mat-label>Patient</mat-label>
              <mat-select formControlName="patientId">
                @for (p of patients(); track p.id) {
                  <mat-option [value]="p.id">{{ p.fullName }} ({{ p.patientCode }})</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Department</mat-label>
              <mat-select formControlName="departmentId" (selectionChange)="onDeptChange()">
                @for (d of departments(); track d.id) {
                  <mat-option [value]="d.id">{{ d.name }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Doctor</mat-label>
              <mat-select formControlName="doctorId" (selectionChange)="loadSlots()">
                @for (doc of filteredDoctors(); track doc.id) {
                  <mat-option [value]="doc.id">{{ doc.fullName }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Date</mat-label>
              <input matInput type="date" [min]="today" formControlName="appointmentDate" (change)="loadSlots()" />
            </mat-form-field>
          </div>
          <div class="sh-grid-2">
            <mat-form-field appearance="outline">
              <mat-label>Available Time Slot</mat-label>
              <mat-select formControlName="startTime">
                @for (s of slots(); track s.startTime) {
                  <mat-option [value]="s.startTime" [disabled]="!s.isAvailable">{{ s.label }} {{ s.isAvailable ? '' : '(Full/Past)' }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Reason for Visit</mat-label>
              <input matInput formControlName="reasonForVisit" />
            </mat-form-field>
          </div>
          <div style="display:flex;justify-content:flex-end;gap:10px;">
            <button mat-button type="button" (click)="showBook.set(false)">Cancel</button>
            <button mat-flat-button class="sh-btn-teal" type="submit" [disabled]="saving() || bookForm.invalid">Confirm Booking</button>
          </div>
        </form>
      </div>
    }

    <app-data-table-shell
      [loading]="loading()" [error]="error()" [totalCount]="totalCount()" [page]="page()" [pageSize]="15"
      [search]="search" searchPlaceholder="Search patient, APT#, doctor..."
      (searchChange)="search = $event; page.set(1); load()" (pageChange)="page.set($event); load()" (retry)="load()">
      <ng-container filters>
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>Date</mat-label>
          <input matInput type="date" [(ngModel)]="dateFilter" (change)="page.set(1); load()" />
        </mat-form-field>
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>Status</mat-label>
          <mat-select [(ngModel)]="statusFilter" (ngModelChange)="page.set(1); load()">
            <mat-option value="">All</mat-option>
            <mat-option value="Booked">Booked</mat-option>
            <mat-option value="Confirmed">Confirmed</mat-option>
            <mat-option value="CheckedIn">CheckedIn</mat-option>
            <mat-option value="Completed">Completed</mat-option>
            <mat-option value="Cancelled">Cancelled</mat-option>
          </mat-select>
        </mat-form-field>
      </ng-container>

      <table class="sh-table">
        <thead><tr><th>APT #</th><th>Date &amp; Time</th><th>Patient</th><th>Doctor / Dept</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          @for (a of items(); track a.id) {
            <tr>
              <td><code>{{ a.appointmentNumber }}</code></td>
              <td>{{ a.appointmentDate }}<br/><small>{{ a.startTime.slice(0,5) }}</small></td>
              <td><strong>{{ a.patientName }}</strong><br/><small>{{ a.patientCode }} &bull; {{ a.patientPhone }}</small></td>
              <td>{{ a.doctorName }}<br/><small>{{ a.departmentName }}</small></td>
              <td><app-status-badge [status]="a.status" /></td>
              <td style="white-space:nowrap;">
                @if (a.status === 'Booked') {
                  <button mat-stroked-button (click)="confirm(a.id)" style="margin-right:6px;">Verify</button>
                }
                @if (a.status === 'Booked' || a.status === 'Confirmed') {
                  <button mat-flat-button class="sh-btn-teal" (click)="checkIn(a)" style="margin-right:6px;">Check-In</button>
                  <button mat-button color="warn" (click)="cancel(a)">Cancel</button>
                }
              </td>
            </tr>
          }
        </tbody>
      </table>
    </app-data-table-shell>
  `,
  styles: [`.form-card { padding: 20px; margin-bottom: 18px; } .form-card h3 { margin: 0 0 14px; color: var(--sh-navy); }`]
})
export class ReceptionAppointmentsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(MatDialog);

  readonly today = new Date().toISOString().split('T')[0];
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly items = signal<AppointmentDto[]>([]);
  readonly totalCount = signal(0);
  readonly page = signal(1);
  readonly showBook = signal(false);
  readonly patients = signal<PatientDto[]>([]);
  readonly departments = signal<DepartmentDto[]>([]);
  readonly doctors = signal<DoctorDto[]>([]);
  readonly filteredDoctors = signal<DoctorDto[]>([]);
  readonly slots = signal<TimeSlotDto[]>([]);

  search = '';
  dateFilter = this.today;
  statusFilter = '';

  readonly bookForm = this.fb.nonNullable.group({
    patientId: [0, [Validators.required, Validators.min(1)]],
    departmentId: [0, [Validators.required, Validators.min(1)]],
    doctorId: [0, [Validators.required, Validators.min(1)]],
    appointmentDate: [this.today, Validators.required],
    startTime: ['', Validators.required],
    reasonForVisit: ['', Validators.required]
  });

  ngOnInit(): void {
    this.api.getPatients({ page: 1, pageSize: 100 }).subscribe({ next: (r) => this.patients.set(r.items) });
    this.api.getDepartments(true).subscribe({ next: (d) => this.departments.set(d) });
    this.api.getDoctors({ isActive: true, page: 1, pageSize: 100 }).subscribe({ next: (r) => this.doctors.set(r.items) });
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.api.getAppointments({ page: this.page(), pageSize: 15, search: this.search, date: this.dateFilter, status: this.statusFilter }).subscribe({
      next: (r) => { this.items.set(r.items); this.totalCount.set(r.totalCount); this.loading.set(false); },
      error: (err) => { this.error.set(extractApiError(err)); this.loading.set(false); }
    });
  }

  onDeptChange(): void {
    const deptId = this.bookForm.value.departmentId;
    const docs = this.doctors().filter((d) => d.departmentId === deptId);
    this.filteredDoctors.set(docs);
    this.bookForm.patchValue({ doctorId: docs[0]?.id ?? 0, startTime: '' });
    if (docs[0]) this.loadSlots();
  }

  loadSlots(): void {
    const { doctorId, appointmentDate } = this.bookForm.getRawValue();
    if (!doctorId || !appointmentDate) return;
    this.api.getDoctorSlots(doctorId, appointmentDate).subscribe({ next: (s) => this.slots.set(s) });
  }

  submitBook(): void {
    if (this.bookForm.invalid) return;
    this.saving.set(true);
    this.api.bookAppointment(this.bookForm.getRawValue()).subscribe({
      next: (a) => {
        this.saving.set(false);
        this.toast.success(`Appointment ${a.appointmentNumber} booked.`);
        this.showBook.set(false);
        this.dateFilter = a.appointmentDate;
        this.load();
      },
      error: (err) => { this.saving.set(false); this.toast.error(extractApiError(err)); }
    });
  }

  confirm(id: number): void {
    this.api.confirmAppointment(id).subscribe({
      next: () => { this.toast.success('Appointment verified.'); this.load(); },
      error: (err) => this.toast.error(extractApiError(err))
    });
  }

  checkIn(a: AppointmentDto): void {
    this.api.checkInAppointment(a.id, a.reasonForVisit).subscribe({
      next: (v) => {
        this.toast.success(`Checked in! Token ${v.tokenDisplay} assigned (${v.visitNumber})`);
        this.load();
      },
      error: (err) => this.toast.error(extractApiError(err))
    });
  }

  cancel(a: AppointmentDto): void {
    this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Cancel Appointment', message: `Cancel ${a.appointmentNumber}?`, confirmLabel: 'Cancel Appointment', confirmColor: 'warn', requireReason: true }
    }).afterClosed().subscribe((reason) => {
      if (!reason) return;
      this.api.cancelAppointment(a.id, reason).subscribe({
        next: () => { this.toast.success('Appointment cancelled.'); this.load(); },
        error: (err) => this.toast.error(extractApiError(err))
      });
    });
  }
}
