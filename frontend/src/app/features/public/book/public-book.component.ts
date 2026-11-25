import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { DepartmentDto, DoctorDto, TimeSlotDto } from '../../../core/models/hospital.models';
import { extractApiError } from '../../../core/interceptors/auth.interceptor';
import { formatIsoDate } from '../../../core/services/http-params.util';

@Component({
  selector: 'app-book-appointment-widget',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatIconModule, MatDatepickerModule],
  template: `
    <div class="book-container">
      <div class="sh-card book-card">
        <h1>Book OPD Appointment</h1>
        <p class="sub">Select department, specialist doctor, appointment date, and an available time slot.</p>

        @if (!auth.isAuthenticated()) {
          <div class="notice-banner">
            <mat-icon>info</mat-icon>
            <div>
              You can browse live slots below. To confirm your booking, please
              <a routerLink="/login" [queryParams]="{ returnUrl: '/patient/book' }">sign in</a> or
              <a routerLink="/register">register as a patient</a>.
            </div>
          </div>
        }

        <form [formGroup]="form" (ngSubmit)="submit()">
          <div class="sh-grid-3">
            <mat-form-field appearance="outline">
              <mat-label>Department</mat-label>
              <mat-select formControlName="departmentId" (selectionChange)="onDepartmentChange()">
                @for (d of departments(); track d.id) {
                  <mat-option [value]="d.id">{{ d.name }}</mat-option>
                }
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Doctor</mat-label>
              <mat-select formControlName="doctorId" (selectionChange)="loadSlots()">
                @for (doc of filteredDoctors(); track doc.id) {
                  <mat-option [value]="doc.id">{{ doc.fullName }} (₹{{ doc.consultationFee }})</mat-option>
                }
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Appointment Date</mat-label>
              <input matInput [matDatepicker]="apptPicker" [min]="minDateObj" formControlName="appointmentDate" (dateChange)="loadSlots()" />
              <mat-datepicker-toggle matIconSuffix [for]="apptPicker" />
              <mat-datepicker #apptPicker />
            </mat-form-field>
          </div>

          <div class="slots-section">
            <label class="slots-label">Available Time Slots</label>
            @if (loadingSlots()) {
              <div class="slots-msg">Checking live availability...</div>
            } @else if (!form.value.doctorId || !form.value.appointmentDate) {
              <div class="slots-msg">Select a doctor and date to view available slots.</div>
            } @else if (slots().length === 0) {
              <div class="slots-msg">No OPD schedule configured for this doctor on the selected weekday.</div>
            } @else {
              <div class="slots-grid">
                @for (s of slots(); track s.startTime) {
                  <button
                    type="button"
                    class="slot-chip"
                    [disabled]="!s.isAvailable"
                    [class.selected]="form.value.startTime === s.startTime"
                    (click)="form.patchValue({ startTime: s.startTime })">
                    {{ s.label }}
                  </button>
                }
              </div>
            }
          </div>

          <mat-form-field appearance="outline" style="width: 100%; margin-top: 14px;">
            <mat-label>Reason for Visit / Chief Symptoms</mat-label>
            <textarea matInput rows="2" formControlName="reasonForVisit" placeholder="Briefly describe your symptoms or purpose of consultation"></textarea>
          </mat-form-field>

          <div class="actions">
            @if (auth.hasRole('Patient')) {
              <button mat-flat-button class="sh-btn-teal" type="submit" [disabled]="submitting() || form.invalid">
                {{ submitting() ? 'Booking...' : 'Confirm Appointment' }}
              </button>
            } @else {
              <a mat-flat-button class="sh-btn-primary" routerLink="/login" [queryParams]="{ returnUrl: '/patient/book' }">
                Sign In as Patient to Confirm
              </a>
            }
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .book-container { max-width: 980px; margin: 0 auto; padding: 28px 16px; }
    .book-card { padding: 26px; }
    h1 { margin: 0 0 6px; font-size: 24px; color: var(--sh-navy); }
    .sub { margin: 0 0 18px; color: var(--sh-text-muted); font-size: 14px; }
    .notice-banner { display: flex; gap: 10px; align-items: center; background: #eff6ff; border: 1px solid #bfdbfe; color: #1e3a8a; padding: 12px 14px; border-radius: 8px; margin-bottom: 18px; font-size: 13.5px; }
    .notice-banner a { font-weight: 600; color: var(--sh-teal); }
    .slots-section { margin-top: 10px; }
    .slots-label { display: block; font-size: 13px; font-weight: 600; color: var(--sh-navy); margin-bottom: 8px; }
    .slots-msg { font-size: 13px; color: var(--sh-text-muted); padding: 12px; background: #f8fafc; border-radius: 6px; border: 1px dashed var(--sh-border); }
    .slots-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(165px, 1fr)); gap: 8px; }
    .slot-chip {
      padding: 9px 10px; border-radius: 6px; border: 1px solid var(--sh-border);
      background: #ffffff; cursor: pointer; font-size: 12.5px; font-weight: 500; color: var(--sh-text);
    }
    .slot-chip:hover:not(:disabled) { border-color: var(--sh-teal); background: var(--sh-teal-soft); }
    .slot-chip.selected { background: var(--sh-navy); color: #ffffff; border-color: var(--sh-navy); }
    .slot-chip:disabled { opacity: 0.45; cursor: not-allowed; background: #f1f5f9; }
    .actions { display: flex; justify-content: flex-end; margin-top: 10px; }
  `]
})
export class PublicBookComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly departments = signal<DepartmentDto[]>([]);
  readonly allDoctors = signal<DoctorDto[]>([]);
  readonly filteredDoctors = signal<DoctorDto[]>([]);
  readonly slots = signal<TimeSlotDto[]>([]);
  readonly loadingSlots = signal(false);
  readonly submitting = signal(false);
  readonly minDateObj = new Date();

  readonly form = this.fb.group({
    departmentId: [0, [Validators.required, Validators.min(1)]],
    doctorId: [0, [Validators.required, Validators.min(1)]],
    appointmentDate: [new Date() as Date | null, Validators.required],
    startTime: ['', Validators.required],
    reasonForVisit: ['', [Validators.required, Validators.minLength(3)]]
  });

  ngOnInit(): void {
    const qDept = Number(this.route.snapshot.queryParamMap.get('departmentId') || 0);
    const qDoc = Number(this.route.snapshot.queryParamMap.get('doctorId') || 0);

    this.api.getDepartments(true).subscribe({ next: (d) => this.departments.set(d) });
    this.api.getDoctors({ isActive: true, onlineOnly: true, page: 1, pageSize: 100 }).subscribe({
      next: (res) => {
        this.allDoctors.set(res.items);
        if (qDept) this.form.patchValue({ departmentId: qDept });
        this.onDepartmentChange(false);
        if (qDoc) {
          this.form.patchValue({ doctorId: qDoc });
          this.loadSlots();
        }
      }
    });
  }

  onDepartmentChange(resetDoctor = true): void {
    const deptId = this.form.value.departmentId;
    const docs = deptId ? this.allDoctors().filter((d) => d.departmentId === deptId) : this.allDoctors();
    this.filteredDoctors.set(docs);
    if (resetDoctor) {
      this.form.patchValue({ doctorId: 0, startTime: '' });
      this.slots.set([]);
    }
  }

  loadSlots(): void {
    const { doctorId, appointmentDate } = this.form.getRawValue();
    const iso = formatIsoDate(appointmentDate);
    if (!doctorId || !iso) return;
    this.loadingSlots.set(true);
    this.form.patchValue({ startTime: '' });
    this.api.getDoctorSlots(doctorId, iso).subscribe({
      next: (list) => { this.slots.set(list); this.loadingSlots.set(false); },
      error: () => this.loadingSlots.set(false)
    });
  }

  submit(): void {
    if (this.form.invalid) return;
    this.submitting.set(true);
    const raw = this.form.getRawValue();
    this.api.bookAppointment({
      ...raw,
      appointmentDate: formatIsoDate(raw.appointmentDate)
    }).subscribe({
      next: (appt) => {
        this.submitting.set(false);
        this.toast.success(`Appointment ${appt.appointmentNumber} booked!`);
        void this.router.navigate(['/patient/appointments']);
      },
      error: (err) => {
        this.submitting.set(false);
        this.toast.error(extractApiError(err, 'Unable to book appointment.'));
      }
    });
  }
}
