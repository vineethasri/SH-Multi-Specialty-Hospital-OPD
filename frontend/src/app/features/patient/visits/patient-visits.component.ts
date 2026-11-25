import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../core/services/api.service';
import { VisitDto } from '../../../core/models/hospital.models';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { DataTableShellComponent } from '../../../shared/components/data-table/data-table.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { extractApiError } from '../../../core/interceptors/auth.interceptor';

@Component({
  selector: 'app-patient-visits',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, DataTableShellComponent, StatusBadgeComponent],
  template: `
    <app-page-header title="My OPD Visits &amp; Live Check-In Status" subtitle="Track your queue token, room number, and visit completion history" />

    <app-data-table-shell
      [loading]="loading()" [error]="error()" [totalCount]="totalCount()" [page]="page()" [pageSize]="15"
      [search]="search" searchPlaceholder="Search by visit# or token..."
      (searchChange)="search = $event; page.set(1); load()" (pageChange)="page.set($event); load()" (retry)="load()">
      <table class="sh-table">
        <thead><tr><th>Visit #</th><th>Token</th><th>Date</th><th>Doctor &amp; Room</th><th>Type</th><th>Visit Status</th><th>Billing</th></tr></thead>
        <tbody>
          @for (v of items(); track v.id) {
            <tr>
              <td><code>{{ v.visitNumber }}</code></td>
              <td><strong>{{ v.tokenDisplay }}</strong></td>
              <td>{{ v.visitDate }}</td>
              <td>{{ v.doctorName }}<br/><small>{{ v.departmentName }} &bull; {{ v.doctorRoomNumber }}</small></td>
              <td><app-status-badge [status]="v.visitType" /></td>
              <td><app-status-badge [status]="v.status" /></td>
              <td>{{ v.billTotalAmount != null ? ('₹' + v.billTotalAmount.toFixed(2) + ' (' + v.billStatus + ')') : 'Pending' }}</td>
            </tr>
          }
        </tbody>
      </table>
    </app-data-table-shell>
  `
})
export class PatientVisitsComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly items = signal<VisitDto[]>([]);
  readonly totalCount = signal(0);
  readonly page = signal(1);
  search = '';

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.api.getVisits({ page: this.page(), pageSize: 15, search: this.search }).subscribe({
      next: (r) => { this.items.set(r.items); this.totalCount.set(r.totalCount); this.loading.set(false); },
      error: (err) => { this.error.set(extractApiError(err)); this.loading.set(false); }
    });
  }
}
