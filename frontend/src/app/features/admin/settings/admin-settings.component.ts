import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { extractApiError } from '../../../core/interceptors/auth.interceptor';

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSlideToggleModule, PageHeaderComponent],
  template: `
    <app-page-header title="Hospital Settings" subtitle="Configure hospital profile, OPD timings, registration fee, tax, and checkout rules" />

    @if (loading()) {
      <div class="sh-card sh-state-box">Loading settings...</div>
    } @else {
      <div class="sh-card" style="padding:24px;">
        <form [formGroup]="form" (ngSubmit)="save()">
          <div class="sh-grid-3">
            <mat-form-field appearance="outline"><mat-label>Hospital Name</mat-label><input matInput formControlName="hospitalName" /></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Tagline</mat-label><input matInput formControlName="tagline" /></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Email</mat-label><input matInput formControlName="email" /></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>OPD Phone</mat-label><input matInput formControlName="phone" /></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Emergency Phone</mat-label><input matInput formControlName="emergencyPhone" /></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Address Line</mat-label><input matInput formControlName="addressLine" /></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>City</mat-label><input matInput formControlName="city" /></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>State</mat-label><input matInput formControlName="state" /></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Postal Code</mat-label><input matInput formControlName="postalCode" /></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Google Maps URL</mat-label><input matInput formControlName="mapUrl" /></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>OPD Registration Fee (₹)</mat-label><input matInput type="number" formControlName="registrationFee" /></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Tax %</mat-label><input matInput type="number" formControlName="taxPercentage" /></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>OPD Start (HH:mm:ss)</mat-label><input matInput formControlName="opdStartTime" /></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>OPD End (HH:mm:ss)</mat-label><input matInput formControlName="opdEndTime" /></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Default Slot (min)</mat-label><input matInput type="number" formControlName="defaultSlotMinutes" /></mat-form-field>
          </div>
          <div style="display:flex;gap:24px;flex-wrap:wrap;margin:10px 0 18px;">
            <mat-slide-toggle formControlName="allowOnlineBooking">Allow Online Patient Booking</mat-slide-toggle>
            <mat-slide-toggle formControlName="requireFullPaymentBeforeCheckout">Require Full Bill Payment Before Checkout</mat-slide-toggle>
          </div>
          <div style="display:flex;justify-content:flex-end;">
            <button mat-flat-button class="sh-btn-teal" type="submit" [disabled]="saving() || form.invalid">
              {{ saving() ? 'Saving...' : 'Save Settings' }}
            </button>
          </div>
        </form>
      </div>
    }
  `
})
export class AdminSettingsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly saving = signal(false);

  readonly form = this.fb.nonNullable.group({
    hospitalName: ['', Validators.required],
    tagline: [''],
    phone: ['', Validators.required],
    emergencyPhone: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    addressLine: ['', Validators.required],
    city: ['', Validators.required],
    state: ['', Validators.required],
    postalCode: ['', Validators.required],
    mapUrl: ['', Validators.required],
    registrationFee: [100, Validators.min(0)],
    taxPercentage: [0, Validators.min(0)],
    opdStartTime: ['09:00:00', Validators.required],
    opdEndTime: ['18:00:00', Validators.required],
    defaultSlotMinutes: [15, Validators.min(5)],
    allowOnlineBooking: [true],
    requireFullPaymentBeforeCheckout: [true]
  });

  ngOnInit(): void {
    this.api.getHospitalSettings().subscribe({
      next: (s) => { this.form.patchValue(s); this.loading.set(false); },
      error: (err) => { this.toast.error(extractApiError(err)); this.loading.set(false); }
    });
  }

  save(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.api.updateHospitalSettings(this.form.getRawValue()).subscribe({
      next: () => { this.saving.set(false); this.toast.success('Hospital settings updated.'); },
      error: (err) => { this.saving.set(false); this.toast.error(extractApiError(err)); }
    });
  }
}
