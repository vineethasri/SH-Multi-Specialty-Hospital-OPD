import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { DepartmentDto, DoctorDto } from '../../../core/models/hospital.models';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { DataTableShellComponent } from '../../../shared/components/data-table/data-table.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { extractApiError } from '../../../core/interceptors/auth.interceptor';

@Component({
  selector: 'app-admin-doctors',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatSlideToggleModule,
    PageHeaderComponent, DataTableShellComponent, StatusBadgeComponent
  ],
  template: `
    <app-page-header title="Doctors &amp; OPD Schedules" subtitle="Manage specialist doctors, consultation fees, and weekly OPD slots">
      <button mat-flat-button class="sh-btn-primary" (click)="openCreate()">
        <mat-icon>add</mat-icon> Add Doctor
      </button>
    </app-page-header>

    @if (showDoctorForm()) {
      <div class="sh-card form-card">
        <h3>{{ editingDoctor() ? 'Edit ' + editingDoctor()!.fullName : 'Register New Doctor' }}</h3>
        <form [formGroup]="docForm" (ngSubmit)="saveDoctor()">
          <div class="sh-grid-3">
            <mat-form-field appearance="outline"><mat-label>Full Name</mat-label><input matInput formControlName="fullName" /></mat-form-field>
            @if (!editingDoctor()) {
              <mat-form-field appearance="outline"><mat-label>Email</mat-label><input matInput type="email" formControlName="email" /></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Password</mat-label><input matInput type="password" formControlName="password" /></mat-form-field>
            }
            <mat-form-field appearance="outline"><mat-label>Phone</mat-label><input matInput formControlName="phoneNumber" /></mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Department</mat-label>
              <mat-select formControlName="departmentId">
                @for (d of departments(); track d.id) {
                  <mat-option [value]="d.id">{{ d.name }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Specialization</mat-label><input matInput formControlName="specialization" /></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Qualification</mat-label><input matInput formControlName="qualification" /></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Medical Reg. No</mat-label><input matInput formControlName="registrationNumber" /></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Experience (Years)</mat-label><input matInput type="number" formControlName="experienceYears" /></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Consultation Fee (₹)</mat-label><input matInput type="number" formControlName="consultationFee" /></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>OPD Room</mat-label><input matInput formControlName="roomNumber" /></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Avg Consult (min)</mat-label><input matInput type="number" formControlName="averageConsultationMinutes" /></mat-form-field>
          </div>
          <mat-form-field appearance="outline" style="width:100%"><mat-label>Bio</mat-label><textarea matInput rows="2" formControlName="bio"></textarea></mat-form-field>
          <div style="display:flex;gap:20px;align-items:center;margin-bottom:12px;">
            <mat-slide-toggle formControlName="isAvailableForOnlineBooking">Online Booking Enabled</mat-slide-toggle>
            @if (editingDoctor()) {
              <mat-slide-toggle formControlName="isActive">Active</mat-slide-toggle>
            }
          </div>
          <div style="display:flex;justify-content:flex-end;gap:10px;">
            <button mat-button type="button" (click)="showDoctorForm.set(false)">Cancel</button>
            <button mat-flat-button class="sh-btn-teal" type="submit" [disabled]="saving() || docForm.invalid">Save Doctor</button>
          </div>
        </form>
      </div>
    }

    @if (scheduleDoctor(); as sd) {
      <div class="sh-card form-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <h3 style="margin:0;">OPD Weekly Schedule &mdash; {{ sd.fullName }}</h3>
          <button mat-button (click)="scheduleDoctor.set(null)">Close</button>
        </div>

        <form [formGroup]="schedForm" (ngSubmit)="addSchedule()" class="sh-grid-4" style="align-items:center;">
          <mat-form-field appearance="outline">
            <mat-label>Day</mat-label>
            <mat-select formControlName="dayOfWeek">
              @for (day of weekDays; track day.value) {
                <mat-option [value]="day.value">{{ day.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Start (HH:mm:ss)</mat-label><input matInput formControlName="startTime" /></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>End (HH:mm:ss)</mat-label><input matInput formControlName="endTime" /></mat-form-field>
          <div style="display:flex;gap:8px;align-items:center;">
            <mat-form-field appearance="outline" style="width:100px;"><mat-label>Slot Min</mat-label><input matInput type="number" formControlName="slotDurationMinutes" /></mat-form-field>
            <button mat-flat-button class="sh-btn-teal" type="submit" [disabled]="schedForm.invalid">Add Slot Rule</button>
          </div>
        </form>

        <table class="sh-table">
          <thead><tr><th>Day</th><th>Window</th><th>Slot Duration</th><th>Max/Slot</th><th>Action</th></tr></thead>
          <tbody>
            @for (s of sd.schedules; track s.id) {
              <tr>
                <td><strong>{{ s.dayName }}</strong></td>
                <td>{{ s.startTime.slice(0,5) }} &ndash; {{ s.endTime.slice(0,5) }}</td>
                <td>{{ s.slotDurationMinutes }} mins</td>
                <td>{{ s.maxPatientsPerSlot }}</td>
                <td><button mat-button color="warn" (click)="deleteSchedule(s.id)">Remove</button></td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }

    <app-data-table-shell
      [loading]="loading()"
      [error]="error()"
      [totalCount]="totalCount()"
      [page]="page()"
      [pageSize]="15"
      [search]="search"
      searchPlaceholder="Search doctors..."
      (searchChange)="search = $event; page.set(1); load()"
      (pageChange)="page.set($event); load()"
      (retry)="load()">
      <table class="sh-table">
        <thead>
          <tr><th>Code</th><th>Doctor</th><th>Department</th><th>Fee</th><th>Room</th><th>Schedules</th><th>Status</th><th>Actions</th></tr>
        </thead>
        <tbody>
          @for (d of doctors(); track d.id) {
            <tr>
              <td><code>{{ d.doctorCode }}</code></td>
              <td><strong>{{ d.fullName }}</strong><br/><small style="color:#64748b;">{{ d.specialization }}</small></td>
              <td>{{ d.departmentName }}</td>
              <td>₹{{ d.consultationFee }}</td>
              <td>{{ d.roomNumber }}</td>
              <td>{{ d.schedules.length }} blocks</td>
              <td><app-status-badge [status]="d.isActive ? 'Active' : 'Inactive'" /></td>
              <td style="white-space:nowrap;">
                <button mat-stroked-button (click)="openEdit(d)" style="margin-right:6px;">Edit</button>
                <button mat-stroked-button color="primary" (click)="scheduleDoctor.set(d)">Schedules</button>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </app-data-table-shell>
  `,
  styles: [`.form-card { padding: 20px; margin-bottom: 18px; } .form-card h3 { margin: 0 0 14px; color: var(--sh-navy); }`]
})
export class AdminDoctorsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly doctors = signal<DoctorDto[]>([]);
  readonly departments = signal<DepartmentDto[]>([]);
  readonly totalCount = signal(0);
  readonly page = signal(1);
  readonly showDoctorForm = signal(false);
  readonly editingDoctor = signal<DoctorDto | null>(null);
  readonly scheduleDoctor = signal<DoctorDto | null>(null);
  search = '';

  readonly weekDays = [
    { value: 1, label: 'Monday' }, { value: 2, label: 'Tuesday' }, { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' }, { value: 5, label: 'Friday' }, { value: 6, label: 'Saturday' }, { value: 0, label: 'Sunday' }
  ];

  readonly docForm = this.fb.nonNullable.group({
    fullName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['Doctor@123', Validators.minLength(8)],
    phoneNumber: ['', Validators.required],
    departmentId: [0, [Validators.required, Validators.min(1)]],
    specialization: ['', Validators.required],
    qualification: ['', Validators.required],
    registrationNumber: ['', Validators.required],
    experienceYears: [5, Validators.min(0)],
    consultationFee: [500, Validators.min(0)],
    roomNumber: ['OPD-101', Validators.required],
    averageConsultationMinutes: [15, Validators.min(5)],
    bio: [''],
    isAvailableForOnlineBooking: [true],
    isActive: [true]
  });

  readonly schedForm = this.fb.nonNullable.group({
    dayOfWeek: [1, Validators.required],
    startTime: ['09:00:00', Validators.required],
    endTime: ['13:00:00', Validators.required],
    slotDurationMinutes: [15, [Validators.required, Validators.min(5)]]
  });

  ngOnInit(): void {
    this.api.getDepartments().subscribe({ next: (d) => this.departments.set(d) });
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.api.getDoctors({ page: this.page(), pageSize: 15, search: this.search }).subscribe({
      next: (res) => {
        this.doctors.set(res.items);
        this.totalCount.set(res.totalCount);
        this.loading.set(false);
        const cur = this.scheduleDoctor();
        if (cur) {
          const updated = res.items.find((x) => x.id === cur.id);
          if (updated) this.scheduleDoctor.set(updated);
        }
      },
      error: (err) => { this.error.set(extractApiError(err)); this.loading.set(false); }
    });
  }

  openCreate(): void {
    this.editingDoctor.set(null);
    this.docForm.reset({
      fullName: '', email: '', password: '', phoneNumber: '', departmentId: this.departments()[0]?.id ?? 1,
      specialization: '', qualification: 'MBBS, MD', registrationNumber: '', experienceYears: 5,
      consultationFee: 600, roomNumber: 'OPD-102', averageConsultationMinutes: 15, bio: '',
      isAvailableForOnlineBooking: true, isActive: true
    });
    this.docForm.controls.email.setValidators([Validators.required, Validators.email]);
    this.docForm.controls.password.setValidators([Validators.required, Validators.minLength(8)]);
    this.docForm.updateValueAndValidity();
    this.showDoctorForm.set(true);
  }

  openEdit(d: DoctorDto): void {
    this.editingDoctor.set(d);
    this.docForm.controls.email.clearValidators();
    this.docForm.controls.password.clearValidators();
    this.docForm.patchValue({ ...d, password: 'unchanged' });
    this.docForm.updateValueAndValidity();
    this.showDoctorForm.set(true);
  }

  saveDoctor(): void {
    if (this.docForm.invalid) return;
    this.saving.set(true);
    const val = this.docForm.getRawValue();
    const editing = this.editingDoctor();
    const obs = editing ? this.api.updateDoctor(editing.id, val) : this.api.createDoctor(val);
    obs.subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success(editing ? 'Doctor updated.' : 'Doctor created.');
        this.showDoctorForm.set(false);
        this.load();
      },
      error: (err) => { this.saving.set(false); this.toast.error(extractApiError(err)); }
    });
  }

  addSchedule(): void {
    const doc = this.scheduleDoctor();
    if (!doc || this.schedForm.invalid) return;
    const val = this.schedForm.getRawValue();
    this.api.createSchedule({ ...val, doctorId: doc.id, maxPatientsPerSlot: 1, isActive: true }).subscribe({
      next: () => { this.toast.success('Schedule block added.'); this.load(); },
      error: (err) => this.toast.error(extractApiError(err))
    });
  }

  deleteSchedule(id: number): void {
    this.api.deleteSchedule(id).subscribe({
      next: () => { this.toast.success('Schedule block removed.'); this.load(); },
      error: (err) => this.toast.error(extractApiError(err))
    });
  }
}
