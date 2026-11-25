import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ApiService } from '../../../core/services/api.service';
import { VisitDto } from '../../../core/models/hospital.models';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { DataTableShellComponent } from '../../../shared/components/data-table/data-table.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { extractApiError } from '../../../core/interceptors/auth.interceptor';

@Component({
  selector: 'app-admin-visits',
  standalone: true,
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, PageHeaderComponent, DataTableShellComponent, StatusBadgeComponent],
  template: `
    <app-page-header title="OPD Visit Monitoring" subtitle="Live tracking of outpatient visits from check-in through checkout" />

    <app-data-table-shell
      [loading]="loading()" [error]="error()" [totalCount]="totalCount()" [page]="page()" [pageSize]="15"
      [search]="search" searchPlaceholder="Search visit#, token, patient, doctor..."
      (searchChange)="search = $event; page.set(1); load()" (pageChange)="page.set($event); load()" (retry)="load()">
      <ng-container filters>
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>Date</mat-label>
          <input matInput type="date" [(ngModel)]="dateFilter" (change)="page.set(1); load()" />
        </mat-form-field>
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>Visit Status</mat-label>
          <mat-select [(ngModel)]="statusFilter" (ngModelChange)="page.set(1); load()">
            <mat-option value="">All Statuses</mat-option>
            <mat-option value="Waiting">Waiting</mat-option>
            <mat-option value="InConsultation">InConsultation</mat-option>
            <mat-option value="ConsultationCompleted">ConsultationCompleted</mat-option>
            <mat-option value="BillingPending">BillingPending</mat-option>
            <mat-option value="ReadyForCheckout">ReadyForCheckout</mat-option>
            <mat-option value="CheckedOut">CheckedOut</mat-option>
            <mat-option value="Cancelled">Cancelled</mat-option>
          </mat-select>
        </mat-form-field>
      </ng-container>

      <table class="sh-table">
        <thead><tr><th>Visit #</th><th>Token</th><th>Date</th><th>Patient</th><th>Doctor / Dept</th><th>Type</th><th>Status</th><th>Billing</th></tr></thead>
        <tbody>
          @for (v of items(); track v.id) {
            <tr>
              <td><code>{{ v.visitNumber }}</code></td>
              <td><strong>{{ v.tokenDisplay }}</strong></td>
              <td>{{ v.visitDate }}</td>
              <td>{{ v.patientName }}<br/><small>{{ v.patientCode }}</small></td>
              <td>{{ v.doctorName }}<br/><small>{{ v.departmentName }}</small></td>
              <td><app-status-badge [status]="v.visitType" /></td>
              <td><app-status-badge [status]="v.status" /></td>
              <td>
                @if (v.billId) {
                  <span>₹{{ v.billTotalAmount?.toFixed(2) }} ({{ v.billStatus }})</span>
                } @else {
                  <span style="color:#94a3b8;">Not billed</span>
                }
              </td>
            </tr>
          }
        </tbody>
      </table>
    </app-data-table-shell>
  `
})
export class AdminVisitsComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly items = signal<VisitDto[]>([]);
  readonly totalCount = signal(0);
  readonly page = signal(1);
  search = '';
  dateFilter = '';
  statusFilter = '';

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.api.getVisits({ page: this.page(), pageSize: 15, search: this.search, date: this.dateFilter, status: this.statusFilter }).subscribe({
      next: (r) => { this.items.set(r.items); this.totalCount.set(r.totalCount); this.loading.set(false); },
      error: (err) => { this.error.set(extractApiError(err)); this.loading.set(false); }
    });
  }
}
