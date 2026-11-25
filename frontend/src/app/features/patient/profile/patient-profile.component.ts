import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { PatientDto } from '../../../core/models/hospital.models';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { extractApiError } from '../../../core/interceptors/auth.interceptor';
import { formatIsoDate } from '../../../core/services/http-params.util';
import { BLOOD_GROUPS, COUNTRY_CODES, formatPhoneWithCode, splitPhoneNumber } from '../../../core/constants/form-options';

@Component({
  selector: 'app-patient-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatDatepickerModule, PageHeaderComponent],
  template: `
    <app-page-header title="My Patient Profile" subtitle="Keep your contact, emergency, and allergy details up to date" />

    @if (profile(); as p) {
      <div class="sh-card" style="padding:22px;margin-bottom:18px;">
        <div style="margin-bottom:14px;">
          <strong>Patient Code:</strong> <code>{{ p.patientCode }}</code> &bull; <strong>Age:</strong> {{ p.age }} yrs
        </div>
        <form [formGroup]="form" (ngSubmit)="save()">
          <div class="sh-grid-3">
            <mat-form-field appearance="outline"><mat-label>First Name</mat-label><input matInput formControlName="firstName" /></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Last Name</mat-label><input matInput formControlName="lastName" /></mat-form-field>
            <div class="phone-group">
              <mat-form-field appearance="outline" class="code-field">
                <mat-label>Code</mat-label>
                <mat-select formControlName="countryCode">
                  @for (c of countryCodes; track c.code + c.iso) {
                    <mat-option [value]="c.code">{{ c.code }} ({{ c.iso }})</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline" class="num-field">
                <mat-label>Phone</mat-label>
                <input matInput formControlName="phoneNumber" />
              </mat-form-field>
            </div>
            <mat-form-field appearance="outline">
              <mat-label>Date of Birth</mat-label>
              <input matInput [matDatepicker]="profDob" [max]="maxDate" formControlName="dateOfBirth" />
              <mat-datepicker-toggle matIconSuffix [for]="profDob" />
              <mat-datepicker #profDob startView="multi-year" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Gender</mat-label>
              <mat-select formControlName="gender">
                <mat-option value="Male">Male</mat-option>
                <mat-option value="Female">Female</mat-option>
                <mat-option value="Other">Other</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Blood Group</mat-label>
              <mat-select formControlName="bloodGroup">
                <mat-option value="">Not Known</mat-option>
                @for (bg of bloodGroups; track bg) {
                  <mat-option [value]="bg">{{ bg }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Address</mat-label><input matInput formControlName="address" /></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>City</mat-label><input matInput formControlName="city" /></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Emergency Contact Name</mat-label><input matInput formControlName="emergencyContactName" /></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Emergency Phone</mat-label><input matInput formControlName="emergencyContactPhone" /></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Known Allergies</mat-label><input matInput formControlName="allergies" /></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Chronic Conditions</mat-label><input matInput formControlName="chronicConditions" /></mat-form-field>
          </div>
          <div style="display:flex;justify-content:flex-end;">
            <button mat-flat-button class="sh-btn-teal" type="submit" [disabled]="saving() || form.invalid">Save Profile</button>
          </div>
        </form>
      </div>
    }

    <div class="sh-card" style="padding:22px;">
      <h3 style="margin:0 0 12px;color:var(--sh-navy);font-size:16px;">Change Password</h3>
      <form [formGroup]="pwForm" (ngSubmit)="changePassword()" class="sh-grid-3" style="align-items:center;">
        <mat-form-field appearance="outline"><mat-label>Current Password</mat-label><input matInput type="password" formControlName="currentPassword" /></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>New Password (min 8 chars)</mat-label><input matInput type="password" formControlName="newPassword" /></mat-form-field>
        <div>
          <button mat-stroked-button color="primary" type="submit" [disabled]="pwForm.invalid">Update Password</button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .phone-group { display: flex; gap: 8px; }
    .code-field { width: 118px; flex-shrink: 0; }
    .num-field { flex: 1; }
  `]
})
export class PatientProfileComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);

  readonly profile = signal<PatientDto | null>(null);
  readonly saving = signal(false);
  readonly maxDate = new Date();
  readonly bloodGroups = BLOOD_GROUPS;
  readonly countryCodes = COUNTRY_CODES;

  readonly form = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    countryCode: ['+91', Validators.required],
    phoneNumber: ['', Validators.required],
    dateOfBirth: [null as Date | null, Validators.required],
    gender: ['Male', Validators.required],
    bloodGroup: [''],
    email: [''],
    address: [''],
    city: [''],
    emergencyContactName: [''],
    emergencyContactPhone: [''],
    allergies: [''],
    chronicConditions: ['']
  });

  readonly pwForm = this.fb.nonNullable.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(8)]]
  });

  ngOnInit(): void {
    this.api.getMyPatientProfile().subscribe({
      next: (p) => {
        this.profile.set(p);
        const parsedPhone = splitPhoneNumber(p.phoneNumber);
        this.form.patchValue({
          firstName: p.firstName,
          lastName: p.lastName,
          countryCode: parsedPhone.countryCode,
          phoneNumber: parsedPhone.localNumber,
          dateOfBirth: p.dateOfBirth ? new Date(p.dateOfBirth + 'T00:00:00') : null,
          gender: p.gender,
          bloodGroup: p.bloodGroup || '',
          email: p.email || '',
          address: p.address || '',
          city: p.city || '',
          emergencyContactName: p.emergencyContactName || '',
          emergencyContactPhone: p.emergencyContactPhone || '',
          allergies: p.allergies || '',
          chronicConditions: p.chronicConditions || ''
        });
      }
    });
  }

  save(): void {
    const p = this.profile();
    if (!p || this.form.invalid) return;
    this.saving.set(true);
    const raw = this.form.getRawValue();
    this.api.updatePatient(p.id, {
      firstName: raw.firstName,
      lastName: raw.lastName,
      phoneNumber: formatPhoneWithCode(raw.countryCode || '+91', raw.phoneNumber || ''),
      dateOfBirth: formatIsoDate(raw.dateOfBirth),
      gender: raw.gender,
      bloodGroup: raw.bloodGroup,
      email: raw.email,
      address: raw.address,
      city: raw.city,
      emergencyContactName: raw.emergencyContactName,
      emergencyContactPhone: raw.emergencyContactPhone,
      allergies: raw.allergies,
      chronicConditions: raw.chronicConditions
    }).subscribe({
      next: (updated) => { this.saving.set(false); this.profile.set(updated); this.toast.success('Profile updated.'); },
      error: (err) => { this.saving.set(false); this.toast.error(extractApiError(err)); }
    });
  }

  changePassword(): void {
    if (this.pwForm.invalid) return;
    const { currentPassword, newPassword } = this.pwForm.getRawValue();
    this.auth.changePassword(currentPassword, newPassword).subscribe({
      next: () => { this.toast.success('Password updated.'); this.pwForm.reset(); },
      error: (err) => this.toast.error(extractApiError(err))
    });
  }
}
