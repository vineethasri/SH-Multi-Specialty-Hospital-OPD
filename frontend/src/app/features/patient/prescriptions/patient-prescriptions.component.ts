import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../../core/services/api.service';
import { PrescriptionDto } from '../../../core/models/hospital.models';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { DataTableShellComponent } from '../../../shared/components/data-table/data-table.component';
import { extractApiError } from '../../../core/interceptors/auth.interceptor';

@Component({
  selector: 'app-patient-prescriptions',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, PageHeaderComponent, DataTableShellComponent],
  template: `
    <app-page-header title="My Prescriptions" subtitle="View and print digital prescriptions issued by your consulting doctors" />

    @if (selected(); as rx) {
      <div class="sh-card" style="padding:22px;margin-bottom:18px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;" class="no-print">
          <h3 style="margin:0;color:var(--sh-navy);">Prescription {{ rx.prescriptionNumber }}</h3>
          <div style="display:flex;gap:8px;">
            <button mat-stroked-button (click)="print()"><mat-icon>print</mat-icon> Print Rx</button>
            <button mat-button (click)="selected.set(null)">Close</button>
          </div>
        </div>
        <div style="border-bottom:1px solid #e2e8f0;padding-bottom:10px;margin-bottom:12px;display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;">
          <div>
            <strong>SH Multi-Specialty Hospital</strong><br/>
            <small>{{ rx.doctorName }} (Reg: {{ rx.doctorRegistrationNumber }}) &bull; {{ rx.departmentName }}</small>
          </div>
          <div>
            <strong>{{ rx.patientName }} ({{ rx.patientCode }})</strong><br/>
            <small>{{ rx.patientAge }}y / {{ rx.patientGender }} &bull; Issued {{ rx.issuedAt | date:'mediumDate' }}</small>
          </div>
        </div>
        <p style="margin:0 0 10px;font-size:13.5px;"><strong>Diagnosis:</strong> {{ rx.diagnosis || '-' }}</p>
        <table class="sh-table">
          <thead><tr><th>Medicine</th><th>Dosage</th><th>Frequency</th><th>Duration</th><th>Timing</th></tr></thead>
          <tbody>
            @for (i of rx.items; track i.id) {
              <tr>
                <td><strong>{{ i.medicineName }}</strong></td>
                <td>{{ i.dosage }}</td>
                <td>{{ i.frequency }}</td>
                <td>{{ i.durationDays }} days</td>
                <td>{{ i.timingInstruction || '-' }}</td>
              </tr>
            }
          </tbody>
        </table>
        @if (rx.generalInstructions) {
          <p style="margin:12px 0 0;font-size:13px;color:var(--sh-text-muted);"><strong>Instructions:</strong> {{ rx.generalInstructions }}</p>
        }
      </div>
    }

    <app-data-table-shell
      [loading]="loading()" [error]="error()" [totalCount]="totalCount()" [page]="page()" [pageSize]="15"
      [search]="search" searchPlaceholder="Search prescription# or doctor..."
      (searchChange)="search = $event; page.set(1); load()" (pageChange)="page.set($event); load()" (retry)="load()">
      <table class="sh-table">
        <thead><tr><th>Rx #</th><th>Date</th><th>Doctor / Dept</th><th>Diagnosis</th><th>Medicines</th><th>Action</th></tr></thead>
        <tbody>
          @for (rx of items(); track rx.id) {
            <tr>
              <td><code>{{ rx.prescriptionNumber }}</code></td>
              <td>{{ rx.issuedAt | date:'mediumDate' }}</td>
              <td>{{ rx.doctorName }}<br/><small>{{ rx.departmentName }}</small></td>
              <td>{{ rx.diagnosis || '-' }}</td>
              <td>{{ rx.items.length }} items</td>
              <td><button mat-stroked-button (click)="selected.set(rx)">View / Print</button></td>
            </tr>
          }
        </tbody>
      </table>
    </app-data-table-shell>
  `
})
export class PatientPrescriptionsComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly items = signal<PrescriptionDto[]>([]);
  readonly selected = signal<PrescriptionDto | null>(null);
  readonly totalCount = signal(0);
  readonly page = signal(1);
  search = '';

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.api.getPrescriptions({ page: this.page(), pageSize: 15, search: this.search }).subscribe({
      next: (r) => { this.items.set(r.items); this.totalCount.set(r.totalCount); this.loading.set(false); },
      error: (err) => { this.error.set(extractApiError(err)); this.loading.set(false); }
    });
  }

  print(): void { window.print(); }
}
