import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ApiService } from '../../../core/services/api.service';
import { BillingReportSummaryDto, PaymentDto } from '../../../core/models/hospital.models';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatCardComponent } from '../../../shared/components/stat-card/stat-card.component';
import { DataTableShellComponent } from '../../../shared/components/data-table/data-table.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { extractApiError } from '../../../core/interceptors/auth.interceptor';

@Component({
  selector: 'app-admin-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, PageHeaderComponent, StatCardComponent, DataTableShellComponent, StatusBadgeComponent],
  template: `
    <app-page-header title="Billing &amp; Payment Reports" subtitle="Revenue breakdown by payment method and clinical department">
      <mat-form-field appearance="outline" subscriptSizing="dynamic"><mat-label>From</mat-label><input matInput type="date" [(ngModel)]="fromDate" /></mat-form-field>
      <mat-form-field appearance="outline" subscriptSizing="dynamic"><mat-label>To</mat-label><input matInput type="date" [(ngModel)]="toDate" /></mat-form-field>
      <button mat-flat-button class="sh-btn-primary" (click)="loadAll()">Apply Range</button>
    </app-page-header>

    @if (summary(); as s) {
      <div class="sh-grid-4" style="margin-bottom:18px;">
        <app-stat-card label="Total Bills" [value]="s.totalBills" icon="receipt" tone="navy" />
        <app-stat-card label="Total Billed" [value]="'₹' + s.totalBilledAmount.toFixed(2)" icon="request_quote" tone="blue" />
        <app-stat-card label="Collected" [value]="'₹' + s.totalCollectedAmount.toFixed(2)" icon="payments" tone="green" />
        <app-stat-card label="Outstanding" [value]="'₹' + s.totalPendingAmount.toFixed(2)" icon="pending_actions" tone="amber" />
      </div>

      <div class="sh-grid-2" style="margin-bottom:18px;">
        <div class="sh-card panel">
          <h3>Collections by Payment Method</h3>
          <table class="sh-table">
            <thead><tr><th>Method</th><th>Amount Collected</th></tr></thead>
            <tbody>
              @for (entry of paymentMethods(s); track entry[0]) {
                <tr><td><strong>{{ entry[0] }}</strong></td><td>₹{{ entry[1].toFixed(2) }}</td></tr>
              }
              @if (paymentMethods(s).length === 0) {
                <tr><td colspan="2" style="color:#64748b;">No payments in selected range.</td></tr>
              }
            </tbody>
          </table>
        </div>
        <div class="sh-card panel">
          <h3>Department Revenue Breakdown</h3>
          <table class="sh-table">
            <thead><tr><th>Department</th><th>Bills</th><th>Collected Revenue</th></tr></thead>
            <tbody>
              @for (d of s.departmentBreakdown; track d.departmentId) {
                <tr><td><strong>{{ d.departmentName }}</strong></td><td>{{ d.patientVisitsCount }}</td><td>₹{{ d.revenue.toFixed(2) }}</td></tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    }

    <app-data-table-shell
      [loading]="loadingPayments()" [error]="error()" [totalCount]="totalPayments()" [page]="page()" [pageSize]="15"
      [search]="search" searchPlaceholder="Search receipt#, bill#, patient..."
      (searchChange)="search = $event; page.set(1); loadPayments()" (pageChange)="page.set($event); loadPayments()" (retry)="loadPayments()">
      <table class="sh-table">
        <thead><tr><th>Receipt #</th><th>Bill #</th><th>Patient</th><th>Method</th><th>Amount</th><th>Status</th><th>Paid At</th></tr></thead>
        <tbody>
          @for (p of payments(); track p.id) {
            <tr>
              <td><code>{{ p.receiptNumber }}</code></td>
              <td><code>{{ p.billNumber }}</code></td>
              <td>{{ p.patientName }} ({{ p.patientCode }})</td>
              <td>{{ p.method }}</td>
              <td><strong>₹{{ p.amount.toFixed(2) }}</strong></td>
              <td><app-status-badge [status]="p.status" /></td>
              <td>{{ p.paidAt | date:'medium' }}</td>
            </tr>
          }
        </tbody>
      </table>
    </app-data-table-shell>
  `,
  styles: [`.panel { padding: 18px; } .panel h3 { margin: 0 0 12px; font-size: 15.5px; color: var(--sh-navy); }`]
})
export class AdminReportsComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly summary = signal<BillingReportSummaryDto | null>(null);
  readonly payments = signal<PaymentDto[]>([]);
  readonly totalPayments = signal(0);
  readonly page = signal(1);
  readonly loadingPayments = signal(true);
  readonly error = signal<string | null>(null);

  toDate = new Date().toISOString().split('T')[0];
  fromDate = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
  search = '';

  ngOnInit(): void { this.loadAll(); }

  loadAll(): void {
    this.api.getBillingReport(this.fromDate, this.toDate).subscribe({ next: (s) => this.summary.set(s), error: () => {} });
    this.loadPayments();
  }

  loadPayments(): void {
    this.loadingPayments.set(true);
    this.api.getPayments({ page: this.page(), pageSize: 15, search: this.search, fromDate: this.fromDate, toDate: this.toDate }).subscribe({
      next: (r) => { this.payments.set(r.items); this.totalPayments.set(r.totalCount); this.loadingPayments.set(false); },
      error: (err) => { this.error.set(extractApiError(err)); this.loadingPayments.set(false); }
    });
  }

  paymentMethods(s: BillingReportSummaryDto): [string, number][] {
    return Object.entries(s.revenueByPaymentMethod || {});
  }
}
