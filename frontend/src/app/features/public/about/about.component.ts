import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../../core/services/api.service';
import { HospitalSettingDto } from '../../../core/models/hospital.models';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule, MatIconModule],
  template: `
    <div class="pub-container page-wrap">
      <div class="sh-card hero-banner">
        <span class="tag">About Our Hospital</span>
        <h1>{{ settings()?.hospitalName || 'SH Multi-Specialty Hospital' }}</h1>
        <p class="lead">
          {{ settings()?.tagline || 'Compassionate Outpatient Care, Precision Medicine' }}. Designed for streamlined outpatient care with minimal waiting times, evidence-based specialist consultations, and unified medical records.
        </p>
      </div>

      <div class="sh-grid-3" style="margin-top: 20px;">
        <div class="sh-card info-box">
          <mat-icon>verified_user</mat-icon>
          <h3>Patient-First OPD</h3>
          <p>Digital slot scheduling, live queue tokens, and synchronized front-desk check-in eliminate crowded waiting rooms.</p>
        </div>
        <div class="sh-card info-box">
          <mat-icon>medical_information</mat-icon>
          <h3>Unified Clinical Records</h3>
          <p>Every vital sign, diagnosis, clinical note, and prescription is securely stored and accessible in your patient portal.</p>
        </div>
        <div class="sh-card info-box">
          <mat-icon>receipt_long</mat-icon>
          <h3>Transparent Billing</h3>
          <p>Clear consultation fees, itemized receipts, and multi-mode reception payments via Cash, UPI, and Card.</p>
        </div>
      </div>

      <div class="sh-card cta-strip">
        <div>
          <h3>Need an outpatient consultation?</h3>
          <p>Book your preferred specialist slot online or walk into our OPD reception desk.</p>
        </div>
        <a mat-flat-button class="sh-btn-teal" routerLink="/book-appointment">Book OPD Slot</a>
      </div>
    </div>
  `,
  styles: [`
    .pub-container { max-width: 1240px; margin: 0 auto; padding: 32px 20px; }
    .hero-banner { padding: 32px; background: #ffffff; }
    .tag { font-size: 12px; font-weight: 600; color: var(--sh-teal); text-transform: uppercase; letter-spacing: 0.06em; }
    h1 { margin: 8px 0 10px; font-size: 30px; color: var(--sh-navy); }
    .lead { margin: 0; font-size: 15px; line-height: 1.65; color: var(--sh-text-muted); max-width: 780px; }
    .info-box { padding: 22px; }
    .info-box mat-icon { color: var(--sh-teal); font-size: 28px; width: 28px; height: 28px; margin-bottom: 10px; }
    .info-box h3 { margin: 0 0 8px; color: var(--sh-navy); font-size: 17px; }
    .info-box p { margin: 0; font-size: 13.5px; color: var(--sh-text-muted); line-height: 1.6; }
    .cta-strip { margin-top: 24px; padding: 22px 28px; display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; background: #eff6ff; border-color: #bfdbfe; }
    .cta-strip h3 { margin: 0 0 4px; color: var(--sh-navy); }
    .cta-strip p { margin: 0; color: var(--sh-text-muted); font-size: 13.5px; }
  `]
})
export class AboutComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly settings = signal<HospitalSettingDto | null>(null);
  ngOnInit(): void {
    this.api.getHospitalSettings().subscribe({ next: (s) => this.settings.set(s), error: () => {} });
  }
}
