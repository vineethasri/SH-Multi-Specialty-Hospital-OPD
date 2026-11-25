import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { extractApiError } from '../../../core/interceptors/auth.interceptor';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule],
  template: `
    <div class="auth-wrap">
      <div class="sh-card auth-card">
        <div class="auth-head">
          <img src="assets/logo.png" alt="SH Hospital" />
          <h1>Sign in to SH Hospital</h1>
          <p>Access your OPD portal for Admin, Receptionist, Doctor, or Patient.</p>
        </div>

        @if (errorMsg()) {
          <div class="err-banner">{{ errorMsg() }}</div>
        }

        <form [formGroup]="form" (ngSubmit)="submit()" class="auth-form">
          <mat-form-field appearance="outline">
            <mat-label>Email Address</mat-label>
            <input matInput type="email" formControlName="email" placeholder="you@shhospital.in" />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Password</mat-label>
            <input matInput [type]="hidePassword() ? 'password' : 'text'" formControlName="password" />
            <button mat-icon-button matSuffix type="button" (click)="hidePassword.set(!hidePassword())">
              <mat-icon>{{ hidePassword() ? 'visibility' : 'visibility_off' }}</mat-icon>
            </button>
          </mat-form-field>

          <button mat-flat-button class="sh-btn-primary submit-btn" type="submit" [disabled]="loading() || form.invalid">
            {{ loading() ? 'Signing in...' : 'Sign In' }}
          </button>
        </form>

        <div class="demo-box">
          <div class="demo-title">Demo Role Quick-Fill (Development)</div>
          <div class="demo-btns">
            <button mat-stroked-button type="button" (click)="fillDemo('admin@shhospital.in', 'Admin@123')">Admin</button>
            <button mat-stroked-button type="button" (click)="fillDemo('reception@shhospital.in', 'Reception@123')">Receptionist</button>
            <button mat-stroked-button type="button" (click)="fillDemo('dr.sharma@shhospital.in', 'Doctor@123')">Doctor</button>
            <button mat-stroked-button type="button" (click)="fillDemo('patient@shhospital.in', 'Patient@123')">Patient</button>
          </div>
        </div>

        <div class="auth-foot">
          New patient? <a routerLink="/register">Create Patient Account</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-wrap { min-height: calc(100vh - 200px); display: flex; align-items: center; justify-content: center; padding: 32px 16px; }
    .auth-card { width: 100%; max-width: 440px; padding: 28px; }
    .auth-head { text-align: center; margin-bottom: 20px; }
    .auth-head img { width: 52px; height: 52px; border-radius: 50%; margin-bottom: 10px; }
    .auth-head h1 { margin: 0 0 6px; font-size: 22px; color: var(--sh-navy); }
    .auth-head p { margin: 0; font-size: 13px; color: var(--sh-text-muted); }
    .err-banner { background: var(--sh-danger-bg); color: var(--sh-danger); padding: 10px 12px; border-radius: 6px; font-size: 13px; margin-bottom: 14px; }
    .auth-form { display: flex; flex-direction: column; gap: 10px; }
    .submit-btn { height: 44px; font-size: 14.5px; }
    .demo-box { margin-top: 20px; padding-top: 14px; border-top: 1px solid var(--sh-border); }
    .demo-title { font-size: 11.5px; font-weight: 600; color: var(--sh-text-subtle); text-transform: uppercase; margin-bottom: 8px; text-align: center; }
    .demo-btns { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
    .auth-foot { margin-top: 18px; text-align: center; font-size: 13.5px; color: var(--sh-text-muted); }
    .auth-foot a { color: var(--sh-teal); font-weight: 600; text-decoration: none; }
  `]
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);

  readonly loading = signal(false);
  readonly hidePassword = signal(true);
  readonly errorMsg = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  fillDemo(email: string, password: string): void {
    this.form.setValue({ email, password });
  }

  submit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.errorMsg.set(null);

    const { email, password } = this.form.getRawValue();
    this.auth.login(email, password).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.toast.success(`Welcome back, ${res.user.fullName}`);
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        void this.router.navigateByUrl(returnUrl || this.auth.getDefaultRouteForRole(res.user.role));
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMsg.set(extractApiError(err, 'Invalid login credentials.'));
      }
    });
  }
}
