import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { ApiService } from '../../../core/services/api.service';
import { PatientDto } from '../../../core/models/hospital.models';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { DataTableShellComponent } from '../../../shared/components/data-table/data-table.component';
import { extractApiError } from '../../../core/interceptors/auth.interceptor';

@Component({
  selector: 'app-admin-patients',
  standalone: true,
  imports: [CommonModule, MatButtonModule, PageHeaderComponent, DataTableShellComponent],
  template: `
    <app-page-header title="Patient Registry" subtitle="Complete directory of registered and walk-in outpatients" />

    @if (selected(); as p) {
      <div class="sh-card detail-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <h3 style="margin:0;color:var(--sh-navy);">{{ p.fullName }} ({{ p.patientCode }})</h3>
          <button mat-button (click)="selected.set(null)">Close</button>
        </div>
        <div class="sh-grid-3" style="font-size:13.5px;color:var(--sh-text-muted);">
          <div><strong>Age / Gender:</strong> {{ p.age }} yrs / {{ p.gender }}</div>
          <div><strong>Blood Group:</strong> {{ p.bloodGroup || 'Not recorded' }}</div>
          <div><strong>Phone:</strong> {{ p.phoneNumber }}</div>
          <div><strong>Email:</strong> {{ p.email || 'None' }}</div>
          <div><strong>Allergies:</strong> {{ p.allergies || 'None recorded' }}</div>
          <div><strong>Chronic Conditions:</strong> {{ p.chronicConditions || 'None recorded' }}</div>
        </div>
      </div>
    }

    <app-data-table-shell
      [loading]="loading()" [error]="error()" [totalCount]="totalCount()" [page]="page()" [pageSize]="15"
      [search]="search" searchPlaceholder="Search patient name, code, phone..."
      (searchChange)="search = $event; page.set(1); load()" (pageChange)="page.set($event); load()" (retry)="load()">
      <table class="sh-table">
        <thead><tr><th>Patient Code</th><th>Full Name</th><th>Age / Gender</th><th>Phone</th><th>City</th><th>Allergies</th><th>Action</th></tr></thead>
        <tbody>
          @for (p of items(); track p.id) {
            <tr>
              <td><code>{{ p.patientCode }}</code></td>
              <td><strong>{{ p.fullName }}</strong><br/><small style="color:#64748b;">{{ p.email || 'Walk-in / No portal' }}</small></td>
              <td>{{ p.age }}y / {{ p.gender }}</td>
              <td>{{ p.phoneNumber }}</td>
              <td>{{ p.city || '-' }}</td>
              <td>{{ p.allergies || 'None' }}</td>
              <td><button mat-stroked-button (click)="selected.set(p)">View Details</button></td>
            </tr>
          }
        </tbody>
      </table>
    </app-data-table-shell>
  `,
  styles: [`.detail-card { padding: 18px; margin-bottom: 16px; background: #eff6ff; border-color: #bfdbfe; }`]
})
export class AdminPatientsComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly items = signal<PatientDto[]>([]);
  readonly selected = signal<PatientDto | null>(null);
  readonly totalCount = signal(0);
  readonly page = signal(1);
  search = '';

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.api.getPatients({ page: this.page(), pageSize: 15, search: this.search }).subscribe({
      next: (r) => { this.items.set(r.items); this.totalCount.set(r.totalCount); this.loading.set(false); },
      error: (err) => { this.error.set(extractApiError(err)); this.loading.set(false); }
    });
  }
}
