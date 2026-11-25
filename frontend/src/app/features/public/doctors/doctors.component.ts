import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ApiService } from '../../../core/services/api.service';
import { DepartmentDto, DoctorDto } from '../../../core/models/hospital.models';

@Component({
  selector: 'app-public-doctors',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  template: `
    <div class="pub-container">
      <div class="head-row">
        <div>
          <h1>OPD Doctor Directory</h1>
          <p>Browse specialist schedules, qualifications, and book your outpatient appointment.</p>
        </div>
        <div class="filters">
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Department</mat-label>
            <mat-select [(ngModel)]="departmentId" (ngModelChange)="load()">
              <mat-option [value]="undefined">All Departments</mat-option>
              @for (d of departments(); track d.id) {
                <mat-option [value]="d.id">{{ d.name }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-icon matPrefix>search</mat-icon>
            <input matInput placeholder="Search doctor or specialty" [(ngModel)]="search" (ngModelChange)="load()" />
          </mat-form-field>
        </div>
      </div>

      @if (loading()) {
        <div class="sh-state-box">Loading doctors...</div>
      } @else if (doctors().length === 0) {
        <div class="sh-card sh-state-box">No doctors found for your filter criteria.</div>
      } @else {
        <div class="sh-grid-3">
          @for (doc of doctors(); track doc.id) {
            <div class="sh-card doc-card">
              <div class="doc-top">
                <div class="doc-avatar">{{ doc.fullName.replace('Dr. ', '').slice(0, 2).toUpperCase() }}</div>
                <div>
                  <h3>{{ doc.fullName }}</h3>
                  <span class="spec">{{ doc.specialization }}</span>
                </div>
              </div>
              <p class="bio">{{ doc.bio }}</p>
              <div class="facts">
                <div><strong>Department:</strong> {{ doc.departmentName }} ({{ doc.roomNumber }})</div>
                <div><strong>Qualification:</strong> {{ doc.qualification }}</div>
                <div><strong>Experience:</strong> {{ doc.experienceYears }} years &bull; Reg: {{ doc.registrationNumber }}</div>
                <div><strong>Consultation Fee:</strong> ₹{{ doc.consultationFee }}</div>
              </div>
              <a mat-flat-button class="sh-btn-primary"
                [routerLink]="['/book-appointment']"
                [queryParams]="{ doctorId: doc.id, departmentId: doc.departmentId }">
                Book Appointment
              </a>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .pub-container { max-width: 1240px; margin: 0 auto; padding: 32px 20px; }
    .head-row { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
    h1 { margin: 0 0 6px; font-size: 28px; color: var(--sh-navy); }
    p { margin: 0; color: var(--sh-text-muted); font-size: 14.5px; }
    .filters { display: flex; gap: 10px; flex-wrap: wrap; }
    .doc-card { padding: 20px; display: flex; flex-direction: column; gap: 12px; }
    .doc-top { display: flex; align-items: center; gap: 12px; }
    .doc-avatar { width: 46px; height: 46px; border-radius: 10px; background: var(--sh-navy); color: #fff; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    h3 { margin: 0; font-size: 16.5px; color: var(--sh-navy); }
    .spec { font-size: 12.5px; color: var(--sh-teal); font-weight: 600; }
    .bio { font-size: 13px; color: var(--sh-text-muted); line-height: 1.5; margin: 0; }
    .facts { font-size: 12.8px; color: var(--sh-text); display: flex; flex-direction: column; gap: 5px; background: #f8fafc; padding: 10px; border-radius: 6px; flex: 1; }
  `]
})
export class PublicDoctorsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);

  readonly loading = signal(true);
  readonly doctors = signal<DoctorDto[]>([]);
  readonly departments = signal<DepartmentDto[]>([]);
  departmentId?: number;
  search = '';

  ngOnInit(): void {
    const qDept = this.route.snapshot.queryParamMap.get('departmentId');
    if (qDept) this.departmentId = Number(qDept);
    this.api.getDepartments(true).subscribe({ next: (d) => this.departments.set(d), error: () => {} });
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.api.getDoctors({ departmentId: this.departmentId, isActive: true, search: this.search, page: 1, pageSize: 50 }).subscribe({
      next: (res) => { this.doctors.set(res.items); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }
}
