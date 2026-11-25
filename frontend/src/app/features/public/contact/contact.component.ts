import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../../core/services/api.service';
import { HospitalSettingDto } from '../../../core/models/hospital.models';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule, MatIconModule],
  template: `
    <div class="pub-container">
      <h1>Contact &amp; OPD Campus Location</h1>
      <p class="sub">Reach our outpatient reception desk, emergency line, or open directions to the hospital campus.</p>

      <div class="sh-grid-2" style="margin-top: 22px;">
        <div class="sh-card card-pad">
          <h3>Hospital Information</h3>
          <div class="row"><mat-icon>local_hospital</mat-icon><div><strong>{{ settings()?.hospitalName || 'SH Multi-Specialty Hospital' }}</strong><br/>{{ settings()?.tagline }}</div></div>
          <div class="row"><mat-icon>call</mat-icon><div><strong>OPD Reception:</strong> {{ settings()?.phone || '+91 80 4123 9000' }}</div></div>
          <div class="row"><mat-icon>emergency</mat-icon><div><strong>24/7 Emergency:</strong> {{ settings()?.emergencyPhone || '+91 80 4123 9111' }}</div></div>
          <div class="row"><mat-icon>mail</mat-icon><div><strong>Email:</strong> {{ settings()?.email || 'care@shhospital.in' }}</div></div>
          <div class="row"><mat-icon>schedule</mat-icon><div><strong>OPD Hours:</strong> {{ settings()?.opdStartTime?.slice(0,5) || '09:00' }} &ndash; {{ settings()?.opdEndTime?.slice(0,5) || '18:00' }} (Mon&ndash;Sat)</div></div>
        </div>

        <div class="sh-card card-pad">
          <h3>Campus Address &amp; Directions</h3>
          <p style="color: var(--sh-text-muted); font-size: 14px; line-height: 1.6;">
            {{ settings()?.addressLine || 'SH Hospital Campus, Healthcare Avenue' }}<br/>
            {{ settings()?.city || 'Bengaluru' }}, {{ settings()?.state || 'Karnataka' }} - {{ settings()?.postalCode || '560001' }}
          </p>
          <div class="map-box">
            <mat-icon>location_on</mat-icon>
            <div>
              <strong>Google Maps Location Pin</strong>
              <p>Open official hospital directions directly in Google Maps.</p>
              <a mat-flat-button class="sh-btn-teal"
                 [href]="settings()?.mapUrl || 'https://share.google/RwUtNoO8Bq6Seh1Gy'"
                 target="_blank" rel="noopener noreferrer">
                Open Location in Maps
              </a>
            </div>
          </div>
          <div style="margin-top: 16px;">
            <a mat-stroked-button color="primary" routerLink="/book-appointment">Book OPD Appointment Online</a>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .pub-container { max-width: 1120px; margin: 0 auto; padding: 32px 20px; }
    h1 { margin: 0 0 6px; font-size: 28px; color: var(--sh-navy); }
    .sub { margin: 0; color: var(--sh-text-muted); font-size: 14.5px; }
    .card-pad { padding: 24px; display: flex; flex-direction: column; gap: 14px; }
    h3 { margin: 0 0 4px; color: var(--sh-navy); font-size: 18px; }
    .row { display: flex; gap: 12px; align-items: flex-start; font-size: 14px; color: var(--sh-text-muted); }
    .row mat-icon { color: var(--sh-teal); }
    .map-box { display: flex; gap: 12px; padding: 16px; border-radius: 8px; background: #f0fdfa; border: 1px solid #99f6e4; }
    .map-box mat-icon { color: var(--sh-teal); font-size: 28px; width: 28px; height: 28px; }
    .map-box p { margin: 4px 0 10px; font-size: 13px; color: var(--sh-text-muted); }
  `]
})
export class ContactComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly settings = signal<HospitalSettingDto | null>(null);
  ngOnInit(): void {
    this.api.getHospitalSettings().subscribe({ next: (s) => this.settings.set(s), error: () => {} });
  }
}
