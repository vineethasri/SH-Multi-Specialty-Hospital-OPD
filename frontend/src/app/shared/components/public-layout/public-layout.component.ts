import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../core/services/auth.service';
import { ApiService } from '../../../core/services/api.service';
import { HospitalSettingDto } from '../../../core/models/hospital.models';

@Component({
  selector: 'app-public-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, MatButtonModule, MatIconModule],
  template: `
    <div class="public-wrapper">
      <header class="pub-header">
        <div class="pub-container header-inner">
          <a routerLink="/" class="brand">
            <img src="assets/logo.png" alt="SH Hospital" />
            <div>
              <div class="brand-name">{{ settings()?.hospitalName || 'SH Multi-Specialty Hospital' }}</div>
              <div class="brand-sub">Outpatient Care &amp; Diagnostics</div>
            </div>
          </a>

          <nav class="pub-nav">
            <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Home</a>
            <a routerLink="/about" routerLinkActive="active">About</a>
            <a routerLink="/departments" routerLinkActive="active">Departments</a>
            <a routerLink="/doctors" routerLinkActive="active">Doctors</a>
            <a routerLink="/contact" routerLinkActive="active">Contact</a>
          </nav>

          <div class="header-actions">
            <a mat-stroked-button routerLink="/book-appointment" class="book-btn">Book OPD</a>
            @if (auth.isAuthenticated()) {
              <a mat-flat-button class="sh-btn-primary" [routerLink]="auth.getDefaultRouteForRole()">
                Dashboard
              </a>
            } @else {
              <a mat-flat-button class="sh-btn-primary" routerLink="/login">Sign In</a>
            }
          </div>
        </div>
      </header>

      <main class="pub-main">
        <router-outlet />
      </main>

      <footer class="pub-footer">
        <div class="pub-container footer-grid">
          <div>
            <div class="footer-brand">
              <img src="assets/logo.png" alt="SH Hospital" />
              <div>
                <strong>{{ settings()?.hospitalName || 'SH Multi-Specialty Hospital' }}</strong>
                <p>{{ settings()?.tagline || 'Compassionate Outpatient Care, Precision Medicine' }}</p>
              </div>
            </div>
            <p class="footer-note">
              Serving outpatient appointments, walk-in consultations, digital prescriptions, and transparent OPD billing at our hospital campus.
            </p>
          </div>

          <div>
            <h4>Quick Links</h4>
            <ul>
              <li><a routerLink="/about">About Hospital</a></li>
              <li><a routerLink="/departments">Departments &amp; Services</a></li>
              <li><a routerLink="/doctors">Doctor Directory</a></li>
              <li><a routerLink="/book-appointment">Online OPD Booking</a></li>
              <li><a routerLink="/register">Patient Registration</a></li>
            </ul>
          </div>

          <div>
            <h4>OPD Contact &amp; Location</h4>
            <ul class="contact-list">
              <li><mat-icon>call</mat-icon> OPD Desk: {{ settings()?.phone || '+91 80 4123 9000' }}</li>
              <li><mat-icon>emergency</mat-icon> Emergency: {{ settings()?.emergencyPhone || '+91 80 4123 9111' }}</li>
              <li><mat-icon>mail</mat-icon> {{ settings()?.email || 'care@shhospital.in' }}</li>
              <li>
                <mat-icon>location_on</mat-icon>
                <a [href]="settings()?.mapUrl || 'https://share.google/RwUtNoO8Bq6Seh1Gy'" target="_blank" rel="noopener noreferrer" class="map-link">
                  {{ settings()?.addressLine || 'SH Hospital Campus' }}, {{ settings()?.city || 'Bengaluru' }} &mdash; View on Google Maps
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div class="footer-bottom">
          <div class="pub-container bottom-inner">
            <span>&copy; {{ currentYear }} {{ settings()?.hospitalName || 'SH Multi-Specialty Hospital' }}. All rights reserved.</span>
            <a href="https://share.google/RwUtNoO8Bq6Seh1Gy" target="_blank" rel="noopener noreferrer">Hospital Location: https://share.google/RwUtNoO8Bq6Seh1Gy</a>
          </div>
        </div>
      </footer>
    </div>
  `,
  styles: [`
    .public-wrapper { min-height: 100vh; display: flex; flex-direction: column; background: var(--sh-bg); }
    .pub-container { max-width: 1240px; margin: 0 auto; padding: 0 20px; width: 100%; }
    .pub-header {
      position: sticky; top: 0; z-index: 40;
      background: rgba(255,255,255,0.96);
      backdrop-filter: blur(8px);
      border-bottom: 1px solid var(--sh-border);
    }
    .header-inner { height: 68px; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
    .brand { display: flex; align-items: center; gap: 11px; text-decoration: none; color: inherit; }
    .brand img { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; }
    .brand-name { font-weight: 700; font-size: 15.5px; color: var(--sh-navy); }
    .brand-sub { font-size: 11.5px; color: var(--sh-text-subtle); }
    .pub-nav { display: flex; gap: 22px; align-items: center; }
    .pub-nav a { text-decoration: none; color: var(--sh-text-muted); font-size: 14px; font-weight: 500; padding: 6px 2px; border-bottom: 2px solid transparent; }
    .pub-nav a:hover, .pub-nav a.active { color: var(--sh-navy); border-bottom-color: var(--sh-teal); }
    .header-actions { display: flex; gap: 10px; align-items: center; }
    .book-btn { border-color: var(--sh-teal) !important; color: var(--sh-teal) !important; }
    @media (max-width: 900px) { .pub-nav { display: none; } }

    .pub-main { flex: 1; }

    .pub-footer { background: #0f294a; color: #cbd5e1; margin-top: 48px; padding-top: 44px; }
    .footer-grid { display: grid; grid-template-columns: 1.4fr 1fr 1.2fr; gap: 32px; padding-bottom: 32px; }
    @media (max-width: 820px) { .footer-grid { grid-template-columns: 1fr; } }
    .footer-brand { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
    .footer-brand img { width: 42px; height: 42px; border-radius: 50%; background: #fff; }
    .footer-brand strong { color: #fff; font-size: 16px; }
    .footer-brand p { margin: 2px 0 0; font-size: 12.5px; color: #94a3b8; }
    .footer-note { font-size: 13px; line-height: 1.6; color: #94a3b8; max-width: 380px; }
    .pub-footer h4 { color: #fff; font-size: 14px; margin: 0 0 12px; font-weight: 600; }
    .pub-footer ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; font-size: 13.5px; }
    .pub-footer a { color: #cbd5e1; text-decoration: none; }
    .pub-footer a:hover { color: #5eead4; text-decoration: underline; }
    .contact-list li { display: flex; align-items: flex-start; gap: 8px; }
    .contact-list mat-icon { font-size: 17px; width: 17px; height: 17px; color: #5eead4; margin-top: 2px; }
    .map-link { color: #5eead4 !important; font-weight: 500; }
    .footer-bottom { border-top: 1px solid rgba(255,255,255,0.12); padding: 14px 0; font-size: 12.5px; color: #94a3b8; }
    .bottom-inner { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 10px; }
  `]
})
export class PublicLayoutComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  readonly settings = signal<HospitalSettingDto | null>(null);
  readonly currentYear = new Date().getFullYear();

  ngOnInit(): void {
    this.api.getHospitalSettings().subscribe({
      next: (s) => this.settings.set(s),
      error: () => {}
    });
  }
}
