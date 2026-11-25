import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { extractApiError } from '../../../core/interceptors/auth.interceptor';
import { formatIsoDate } from '../../../core/services/http-params.util';
import { BLOOD_GROUPS, COUNTRY_CODES, formatPhoneWithCode } from '../../../core/constants/form-options';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatDatepickerModule],
  template: `
    <div class="auth-wrap">
      <div class="sh-card reg-card">
        <div class="auth-head">
          <img src="assets/logo.png" alt="SH Hospital" />
          <h1>Patient Registration</h1>
          <p>Create your SH Hospital OPD account to book appointments and access medical records.</p>
        </div>

        @if (errorMsg()) {
          <div class="err-banner">{{ errorMsg() }}</div>
        }

        <form [formGroup]="form" (ngSubmit)="submit()">
          <div class="sh-grid-2">
            <mat-form-field appearance="outline"><mat-label>First Name</mat-label><input matInput formControlName="firstName" /></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Last Name</mat-label><input matInput formControlName="lastName" /></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Email</mat-label><input matInput type="email" formControlName="email" /></mat-form-field>

            <div class="phone-group">
              <mat-form-field appearance="outline" class="code-field">
                <mat-label>Code</mat-label>
                <mat-select formControlName="countryCode">
                  @for (c of countryCodes; track c.code + c.iso) {
                    <mat-option [value]="c.code">{{ c.code }} ({{ c.iso }}) &ndash; {{ c.country }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline" class="num-field">
                <mat-label>Phone Number</mat-label>
                <input matInput formControlName="phoneNumber" placeholder="98450 00000" />
              </mat-form-field>
            </div>

            <mat-form-field appearance="outline">
              <mat-label>Date of Birth</mat-label>
              <input matInput [matDatepicker]="dobPicker" [max]="maxDate" formControlName="dateOfBirth" placeholder="Select date of birth" />
              <mat-datepicker-toggle matIconSuffix [for]="dobPicker" />
              <mat-datepicker #dobPicker startView="multi-year" />
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

            <mat-form-field appearance="outline"><mat-label>City</mat-label><input matInput formControlName="city" /></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Address</mat-label><input matInput formControlName="address" /></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Password (min 8, A-Z, a-z, 0-9)</mat-label><input matInput type="password" formControlName="password" /></mat-form-field>
          </div>

          <button mat-flat-button class="sh-btn-teal submit-btn" type="submit" [disabled]="loading() || form.invalid">
            {{ loading() ? 'Creating Account...' : 'Register Patient Account' }}
          </button>
        </form>

        <div class="auth-foot">
          Already registered? <a routerLink="/login">Sign In</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-wrap { display: flex; justify-content: center; padding: 32px 16px; }
    .reg-card { width: 100%; max-width: 740px; padding: 28px; }
    .auth-head { text-align: center; margin-bottom: 20px; }
    .auth-head img { width: 48px; height: 48px; border-radius: 50%; margin-bottom: 8px; }
    .auth-head h1 { margin: 0 0 6px; font-size: 22px; color: var(--sh-navy); }
    .auth-head p { margin: 0; font-size: 13.5px; color: var(--sh-text-muted); }
    .err-banner { background: var(--sh-danger-bg); color: var(--sh-danger); padding: 10px 12px; border-radius: 6px; font-size: 13px; margin-bottom: 14px; }
    .phone-group { display: flex; gap: 8px; }
    .code-field { width: 130px; flex-shrink: 0; }
    .num-field { flex: 1; }
    .submit-btn { width: 100%; height: 44px; margin-top: 10px; }
    .auth-foot { margin-top: 16px; text-align: center; font-size: 13.5px; color: var(--sh-text-muted); }
    .auth-foot a { color: var(--sh-teal); font-weight: 600; text-decoration: none; }
  `]
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly loading = signal(false);
  readonly errorMsg = signal<string | null>(null);
  readonly maxDate = new Date();
  readonly bloodGroups = BLOOD_GROUPS;
  readonly countryCodes = COUNTRY_CODES;

  readonly form = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    countryCode: ['+91', Validators.required],
    phoneNumber: ['', Validators.required],
    dateOfBirth: [null as Date | null, Validators.required],
    gender: ['Male', Validators.required],
    bloodGroup: [''],
    city: ['Bengaluru'],
    address: [''],
    password: ['', [Validators.required, Validators.minLength(8)]]
  });

  submit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.errorMsg.set(null);

    const raw = this.form.getRawValue();
    this.auth.registerPatient({
      firstName: raw.firstName,
      lastName: raw.lastName,
      email: raw.email,
      phoneNumber: formatPhoneWithCode(raw.countryCode || '+91', raw.phoneNumber || ''),
      dateOfBirth: formatIsoDate(raw.dateOfBirth),
      gender: raw.gender,
      bloodGroup: raw.bloodGroup,
      city: raw.city,
      address: raw.address,
      password: raw.password
    }).subscribe({
      next: () => {
        this.loading.set(false);
        this.toast.success('Registration successful! Welcome to SH Hospital.');
        void this.router.navigate(['/patient/dashboard']);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMsg.set(extractApiError(err, 'Registration failed.'));
      }
    });
  }
}
