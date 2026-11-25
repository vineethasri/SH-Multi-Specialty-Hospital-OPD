import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../../core/services/api.service';
import { BillDto } from '../../../core/models/hospital.models';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { DataTableShellComponent } from '../../../shared/components/data-table/data-table.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { extractApiError } from '../../../core/interceptors/auth.interceptor';

@Component({
  selector: 'app-patient-billing',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, PageHeaderComponent, DataTableShellComponent, StatusBadgeComponent],
  template: `
    <app-page-header title="My OPD Bills &amp; Receipts" subtitle="Download and print itemized OPD bills and payment receipts" />

    @if (selected(); as b) {
      <div class="sh-card" style="padding:22px;margin-bottom:18px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;" class="no-print">
          <h3 style="margin:0;color:var(--sh-navy);">OPD Bill &amp; Receipt &mdash; {{ b.billNumber }}</h3>
          <div style="display:flex;gap:8px;">
            <button mat-stroked-button (click)="print()"><mat-icon>print</mat-icon> Print Receipt</button>
            <button mat-button (click)="selected.set(null)">Close</button>
          </div>
        </div>
        <div style="margin-bottom:12px;font-size:13.5px;">
          <strong>{{ b.patientName }} ({{ b.patientCode }})</strong> &bull; Visit: <code>{{ b.visitNumber }}</code> &bull; Doctor: {{ b.doctorName }}
        </div>
        <table class="sh-table">
          <thead><tr><th>Service</th><th>Qty</th><th>Unit</th><th>Total</th></tr></thead>
          <tbody>
            @for (i of b.items; track i.id) {
              <tr><td>{{ i.description }}</td><td>{{ i.quantity }}</td><td>₹{{ i.unitPrice.toFixed(2) }}</td><td>₹{{ i.totalPrice.toFixed(2) }}</td></tr>
            }
          </tbody>
        </table>
        <div style="margin-top:12px;font-size:13.5px;">
          <strong>Total: ₹{{ b.totalAmount.toFixed(2) }}</strong> &bull;
          <span style="color:#15803d;">Paid: ₹{{ b.paidAmount.toFixed(2) }}</span> &bull;
          <span style="color:#b91c1c;">Balance: ₹{{ b.balanceAmount.toFixed(2) }}</span>
        </div>
        @if (b.payments.length > 0) {
          <h4 style="margin:14px 0 8px;color:var(--sh-navy);font-size:14px;">Payment Receipts</h4>
          <table class="sh-table">
            <thead><tr><th>Receipt #</th><th>Method</th><th>Ref</th><th>Date</th><th>Amount</th></tr></thead>
            <tbody>
              @for (p of b.payments; track p.id) {
                <tr><td><code>{{ p.receiptNumber }}</code></td><td>{{ p.method }}</td><td>{{ p.transactionReference || '-' }}</td><td>{{ p.paidAt | date:'short' }}</td><td>₹{{ p.amount.toFixed(2) }}</td></tr>
              }
            </tbody>
          </table>
        }
      </div>
    }

    <app-data-table-shell
      [loading]="loading()" [error]="error()" [totalCount]="totalCount()" [page]="page()" [pageSize]="15"
      [search]="search" searchPlaceholder="Search bill# or visit#..."
      (searchChange)="search = $event; page.set(1); load()" (pageChange)="page.set($event); load()" (retry)="load()">
      <table class="sh-table">
        <thead><tr><th>Bill #</th><th>Visit #</th><th>Issued</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th><th>Action</th></tr></thead>
        <tbody>
          @for (b of items(); track b.id) {
            <tr>
              <td><code>{{ b.billNumber }}</code></td>
              <td><code>{{ b.visitNumber }}</code></td>
              <td>{{ b.issuedAt | date:'mediumDate' }}</td>
              <td>₹{{ b.totalAmount.toFixed(2) }}</td>
              <td>₹{{ b.paidAmount.toFixed(2) }}</td>
              <td><strong>₹{{ b.balanceAmount.toFixed(2) }}</strong></td>
              <td><app-status-badge [status]="b.status" /></td>
              <td><button mat-stroked-button (click)="selected.set(b)">View Receipt</button></td>
            </tr>
          }
        </tbody>
      </table>
    </app-data-table-shell>
  `
})
export class PatientBillingComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly items = signal<BillDto[]>([]);
  readonly selected = signal<BillDto | null>(null);
  readonly totalCount = signal(0);
  readonly page = signal(1);
  search = '';

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.api.getBills({ page: this.page(), pageSize: 15, search: this.search }).subscribe({
      next: (r) => { this.items.set(r.items); this.totalCount.set(r.totalCount); this.loading.set(false); },
      error: (err) => { this.error.set(extractApiError(err)); this.loading.set(false); }
    });
  }

  print(): void { window.print(); }
}
