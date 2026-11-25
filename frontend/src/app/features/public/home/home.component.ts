import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../../core/services/api.service';
import { DepartmentDto, DoctorDto, HospitalSettingDto } from '../../../core/models/hospital.models';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule, MatIconModule],
  template: `
    <section class="hero">
      <div class="pub-container hero-grid">
        <div class="hero-copy">
          <span class="hero-pill">Outpatient Care &bull; Online &amp; Walk-In OPD</span>
          <h1>Modern Outpatient Healthcare Built Around Your Time.</h1>
          <p>
            Book specialist appointments online, receive instant OPD queue tokens at reception, access digital prescriptions, and manage transparent billing in one unified portal.
          </p>
          <div class="hero-cta">
            <a mat-flat-button class="sh-btn-teal cta-btn" routerLink="/book-appointment">
              <mat-icon>event_available</mat-icon> Book Appointment
            </a>
            <a mat-stroked-button class="cta-btn-outline" routerLink="/doctors">
              Find a Doctor
            </a>
          </div>
          <div class="hero-meta">
            <div><strong>OPD Hours:</strong> {{ settings()?.opdStartTime?.slice(0,5) || '09:00' }} &ndash; {{ settings()?.opdEndTime?.slice(0,5) || '18:00' }}</div>
            <div><strong>Emergency:</strong> {{ settings()?.emergencyPhone || '+91 80 4123 9111' }}</div>
          </div>
        </div>

        <div class="hero-panel sh-card">
          <div class="panel-header">
            <img src="assets/logo.png" alt="SH Hospital" />
            <div>
              <strong>{{ settings()?.hospitalName || 'SH Multi-Specialty Hospital' }}</strong>
              <span>Same-Day Walk-In &amp; Scheduled OPD</span>
            </div>
          </div>
          <div class="workflow-steps">
            <div class="wf-step"><span class="num">1</span><div><strong>Book or Walk In</strong><p>Choose your department, specialist, and live time slot.</p></div></div>
            <div class="wf-step"><span class="num">2</span><div><strong>Instant Check-In &amp; Token</strong><p>Reception issues your doctor-wise queue token immediately.</p></div></div>
            <div class="wf-step"><span class="num">3</span><div><strong>Digital Consultation &amp; Rx</strong><p>Vitals, clinical diagnosis, and printable prescriptions saved to your portal.</p></div></div>
            <div class="wf-step"><span class="num">4</span><div><strong>Transparent Billing &amp; Receipts</strong><p>Pay via Cash, UPI, or Card and download receipts anytime.</p></div></div>
          </div>
        </div>
      </div>
    </section>

    <section class="section pub-container">
      <div class="sec-head">
        <div>
          <h2>Clinical Departments</h2>
          <p>Specialized outpatient clinics with dedicated doctors and transparent consultation fees.</p>
        </div>
        <a mat-button color="primary" routerLink="/departments">View All Departments &rarr;</a>
      </div>

      @if (loading()) {
        <div class="sh-state-box">Loading departments...</div>
      } @else {
        <div class="sh-grid-3">
          @for (dept of departments().slice(0, 6); track dept.id) {
            <div class="sh-card dept-card">
              <div class="dept-top">
                <span class="dept-code">{{ dept.code }}</span>
                <span class="dept-fee">₹{{ dept.consultationFeeDefault }}</span>
              </div>
              <h3>{{ dept.name }}</h3>
              <p>{{ dept.description }}</p>
              <div class="dept-foot">
                <span><mat-icon>location_on</mat-icon> {{ dept.floorLocation }}</span>
                <span>{{ dept.activeDoctorsCount }} Doctors</span>
              </div>
            </div>
          }
        </div>
      }
    </section>

    <section class="section pub-container">
      <div class="sec-head">
        <div>
          <h2>Featured OPD Specialists</h2>
          <p>Experienced consultants across General Medicine, Cardiology, Orthopedics, Pediatrics, and more.</p>
        </div>
        <a mat-button color="primary" routerLink="/doctors">All Doctors &rarr;</a>
      </div>

      <div class="sh-grid-3">
        @for (doc of doctors().slice(0, 3); track doc.id) {
          <div class="sh-card doc-card">
            <div class="doc-head">
              <div class="doc-avatar">{{ doc.fullName.replace('Dr. ', '').slice(0, 2).toUpperCase() }}</div>
              <div>
                <h3>{{ doc.fullName }}</h3>
                <span class="doc-spec">{{ doc.specialization }}</span>
              </div>
            </div>
            <div class="doc-meta">
              <div><mat-icon>apartment</mat-icon> {{ doc.departmentName }} &bull; Room {{ doc.roomNumber }}</div>
              <div><mat-icon>school</mat-icon> {{ doc.qualification }} ({{ doc.experienceYears }} yrs exp)</div>
              <div><mat-icon>payments</mat-icon> Consultation Fee: ₹{{ doc.consultationFee }}</div>
            </div>
            <a mat-flat-button class="sh-btn-primary" [routerLink]="['/book-appointment']" [queryParams]="{ doctorId: doc.id, departmentId: doc.departmentId }">
              Book Appointment
            </a>
          </div>
        }
      </div>
    </section>
  `,
  styles: [`
    .pub-container { max-width: 1240px; margin: 0 auto; padding: 0 20px; }
    .hero { background: #ffffff; border-bottom: 1px solid var(--sh-border); padding: 48px 0 56px; }
    .hero-grid { display: grid; grid-template-columns: 1.15fr 0.85fr; gap: 36px; align-items: center; }
    @media (max-width: 900px) { .hero-grid { grid-template-columns: 1fr; } }
    .hero-pill {
      display: inline-block; padding: 5px 12px; border-radius: 999px;
      background: var(--sh-teal-soft); color: var(--sh-teal); border: 1px solid #99f6e4;
      font-size: 12px; font-weight: 600; margin-bottom: 14px;
    }
    .hero h1 { font-size: clamp(28px, 3.6vw, 42px); line-height: 1.15; margin: 0 0 14px; color: var(--sh-navy); letter-spacing: -0.025em; }
    .hero p { font-size: 15.5px; line-height: 1.65; color: var(--sh-text-muted); margin: 0 0 22px; max-width: 580px; }
    .hero-cta { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 22px; }
    .cta-btn { height: 44px; padding: 0 20px !important; }
    .cta-btn-outline { height: 44px; padding: 0 20px !important; border-color: var(--sh-navy) !important; color: var(--sh-navy) !important; }
    .hero-meta { display: flex; gap: 24px; flex-wrap: wrap; font-size: 13px; color: var(--sh-text-muted); }

    .hero-panel { padding: 22px; background: #f8fafc; }
    .panel-header { display: flex; align-items: center; gap: 12px; padding-bottom: 14px; border-bottom: 1px solid var(--sh-border); margin-bottom: 14px; }
    .panel-header img { width: 42px; height: 42px; border-radius: 50%; }
    .panel-header strong { display: block; color: var(--sh-navy); font-size: 15px; }
    .panel-header span { font-size: 12px; color: var(--sh-teal); font-weight: 600; }
    .workflow-steps { display: flex; flex-direction: column; gap: 12px; }
    .wf-step { display: flex; gap: 12px; align-items: flex-start; }
    .wf-step .num {
      width: 26px; height: 26px; border-radius: 50%; background: var(--sh-navy); color: #fff;
      font-size: 12px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .wf-step strong { font-size: 13.5px; color: var(--sh-text); }
    .wf-step p { margin: 2px 0 0; font-size: 12.5px; color: var(--sh-text-muted); }

    .section { padding: 42px 20px 10px; }
    .sec-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
    .sec-head h2 { margin: 0; font-size: 23px; color: var(--sh-navy); }
    .sec-head p { margin: 4px 0 0; font-size: 14px; color: var(--sh-text-muted); }

    .dept-card { padding: 18px; display: flex; flex-direction: column; gap: 10px; }
    .dept-top { display: flex; justify-content: space-between; align-items: center; }
    .dept-code { font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 5px; background: var(--sh-blue-soft); color: var(--sh-blue); }
    .dept-fee { font-size: 14px; font-weight: 700; color: var(--sh-teal); }
    .dept-card h3 { margin: 0; font-size: 16.5px; color: var(--sh-navy); }
    .dept-card p { margin: 0; font-size: 13px; line-height: 1.5; color: var(--sh-text-muted); flex: 1; }
    .dept-foot { display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: var(--sh-text-subtle); padding-top: 8px; border-top: 1px solid #f1f5f9; }
    .dept-foot mat-icon { font-size: 15px; width: 15px; height: 15px; vertical-align: middle; }

    .doc-card { padding: 18px; display: flex; flex-direction: column; gap: 14px; }
    .doc-head { display: flex; align-items: center; gap: 12px; }
    .doc-avatar { width: 46px; height: 46px; border-radius: 10px; background: var(--sh-navy); color: #fff; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .doc-head h3 { margin: 0; font-size: 16px; color: var(--sh-navy); }
    .doc-spec { font-size: 12.5px; color: var(--sh-teal); font-weight: 500; }
    .doc-meta { display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: var(--sh-text-muted); flex: 1; }
    .doc-meta div { display: flex; align-items: center; gap: 7px; }
    .doc-meta mat-icon { font-size: 16px; width: 16px; height: 16px; color: var(--sh-navy); }
  `]
})
export class HomeComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly loading = signal(true);
  readonly departments = signal<DepartmentDto[]>([]);
  readonly doctors = signal<DoctorDto[]>([]);
  readonly settings = signal<HospitalSettingDto | null>(null);

  ngOnInit(): void {
    this.api.getHospitalSettings().subscribe({ next: (s) => this.settings.set(s), error: () => {} });
    this.api.getDepartments(true).subscribe({
      next: (d) => { this.departments.set(d); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
    this.api.getDoctors({ isActive: true, page: 1, pageSize: 6 }).subscribe({
      next: (r) => this.doctors.set(r.items),
      error: () => {}
    });
  }
}
