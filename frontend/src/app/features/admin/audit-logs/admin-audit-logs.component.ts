import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ApiService } from '../../../core/services/api.service';
import { AuditLogDto } from '../../../core/models/hospital.models';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { DataTableShellComponent } from '../../../shared/components/data-table/data-table.component';
import { extractApiError } from '../../../core/interceptors/auth.interceptor';

@Component({
  selector: 'app-admin-audit-logs',
  standalone: true,
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule, PageHeaderComponent, DataTableShellComponent],
  template: `
    <app-page-header title="Security &amp; Audit Logs" subtitle="Immutable trail of sensitive clinical access, authentication, and billing operations" />

    <app-data-table-shell
      [loading]="loading()" [error]="error()" [totalCount]="totalCount()" [page]="page()" [pageSize]="20"
      [search]="search" searchPlaceholder="Search user email, action, details..."
      (searchChange)="search = $event; page.set(1); load()" (pageChange)="page.set($event); load()" (retry)="load()">
      <table class="sh-table">
        <thead><tr><th>Timestamp</th><th>User</th><th>Role</th><th>Action</th><th>Entity</th><th>Details</th><th>IP</th></tr></thead>
        <tbody>
          @for (log of logs(); track log.id) {
            <tr>
              <td style="white-space:nowrap;">{{ log.timestamp | date:'short' }}</td>
              <td>{{ log.userEmail || 'System' }}</td>
              <td>{{ log.userRole || '-' }}</td>
              <td><code>{{ log.action }}</code></td>
              <td>{{ log.entityName }} #{{ log.entityId || '-' }}</td>
              <td>{{ log.details }}</td>
              <td><code>{{ log.ipAddress || '-' }}</code></td>
            </tr>
          }
        </tbody>
      </table>
    </app-data-table-shell>
  `
})
export class AdminAuditLogsComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly logs = signal<AuditLogDto[]>([]);
  readonly totalCount = signal(0);
  readonly page = signal(1);
  search = '';

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.api.getAuditLogs({ page: this.page(), pageSize: 20, search: this.search }).subscribe({
      next: (r) => { this.logs.set(r.items); this.totalCount.set(r.totalCount); this.loading.set(false); },
      error: (err) => { this.error.set(extractApiError(err)); this.loading.set(false); }
    });
  }
}
