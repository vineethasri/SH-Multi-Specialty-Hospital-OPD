import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ApiService } from '../../../core/services/api.service';
import { DepartmentDto } from '../../../core/models/hospital.models';

@Component({
  selector: 'app-public-departments',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule],
  template: `
    <div class="pub-container">
      <div class="head-row">
        <div>
          <h1>Departments &amp; Outpatient Services</h1>
          <p>Explore our clinical specialties, floor locations, and consultation fee structure.</p>
        </div>
        <mat-form-field appearance="outline" subscriptSizing="dynamic" class="search">
          <mat-icon matPrefix>search</mat-icon>
          <input matInput placeholder="Search department..." [(ngModel)]="search" (ngModelChange)="load()" />
        </mat-form-field>
      </div>

      @if (loading()) {
        <div class="sh-state-box">Loading departments...</div>
      } @else if (departments().length === 0) {
        <div class="sh-card sh-state-box">No active departments matched your search.</div>
      } @else {
        <div class="sh-grid-3">
          @for (d of departments(); track d.id) {
            <div class="sh-card dept-card">
              <div class="top">
                <span class="code">{{ d.code }}</span>
                <span class="fee">Default Fee: ₹{{ d.consultationFeeDefault }}</span>
              </div>
              <h3>{{ d.name }}</h3>
              <p>{{ d.description }}</p>
              <div class="meta">
                <span><mat-icon>location_on</mat-icon> {{ d.floorLocation }}</span>
                <span><mat-icon>medical_services</mat-icon> {{ d.activeDoctorsCount }} Specialists</span>
              </div>
              <a mat-stroked-button color="primary" [routerLink]="['/doctors']" [queryParams]="{ departmentId: d.id }">
                View Specialists
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
    .search { min-width: 260px; }
    .dept-card { padding: 20px; display: flex; flex-direction: column; gap: 10px; }
    .top { display: flex; justify-content: space-between; align-items: center; }
    .code { font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 5px; background: var(--sh-blue-soft); color: var(--sh-blue); }
    .fee { font-size: 13px; font-weight: 600; color: var(--sh-teal); }
    h3 { margin: 0; font-size: 17px; color: var(--sh-navy); }
    .dept-card p { flex: 1; font-size: 13.5px; line-height: 1.55; }
    .meta { display: flex; justify-content: space-between; font-size: 12.5px; color: var(--sh-text-subtle); padding-top: 8px; border-top: 1px solid #f1f5f9; }
    .meta mat-icon { font-size: 15px; width: 15px; height: 15px; vertical-align: middle; }
  `]
})
export class PublicDepartmentsComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly loading = signal(true);
  readonly departments = signal<DepartmentDto[]>([]);
  search = '';

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.api.getDepartments(true, this.search).subscribe({
      next: (list) => { this.departments.set(list); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }
}
