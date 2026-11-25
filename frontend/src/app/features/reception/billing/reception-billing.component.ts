import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { BillDto, VisitDto } from '../../../core/models/hospital.models';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { extractApiError } from '../../../core/interceptors/auth.interceptor';

@Component({
  selector: 'app-reception-billing',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule, PageHeaderComponent, StatusBadgeComponent],
  template: `
    <app-page-header title="OPD Billing, Payments &amp; Check-Out" subtitle="Generate bills for completed consultations, record Cash/UPI/Card payments, print receipts, and check out patients" />

    @if (pendingBillVisits().length > 0) {
      <div class="sh-card" style="padding:18px;margin-bottom:18px;background:#fefce8;border-color:#fde68a;">
        <h3 style="margin:0 0 10px;color:#854d0e;font-size:15.5px;">Visits Ready for Bill Generation ({{ pendingBillVisits().length }})</h3>
        <div class="sh-table-wrap">
          <table class="sh-table">
            <thead><tr><th>Visit #</th><th>Token</th><th>Patient</th><th>Doctor</th><th>Action</th></tr></thead>
            <tbody>
              @for (v of pendingBillVisits(); track v.id) {
                <tr>
                  <td><code>{{ v.visitNumber }}</code></td>
                  <td><strong>{{ v.tokenDisplay }}</strong></td>
                  <td>{{ v.patientName }} ({{ v.patientCode }})</td>
                  <td>{{ v.doctorName }}</td>
                  <td>
                    <button mat-flat-button class="sh-btn-primary" (click)="openGenerateBill(v)">Generate Bill</button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    }

    @if (billTargetVisit(); as bv) {
      <div class="sh-card" style="padding:20px;margin-bottom:18px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <h3 style="margin:0;color:var(--sh-navy);">Generate Bill &mdash; {{ bv.patientName }} ({{ bv.visitNumber }})</h3>
          <button mat-button (click)="billTargetVisit.set(null)">Cancel</button>
        </div>
        <div class="sh-grid-3">
          <mat-form-field appearance="outline"><mat-label>Discount (₹)</mat-label><input matInput type="number" [(ngModel)]="discountAmount" /></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Extra Service Description (Optional)</mat-label><input matInput [(ngModel)]="extraDesc" placeholder="e.g. ECG / Dressing" /></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Extra Service Price (₹)</mat-label><input matInput type="number" [(ngModel)]="extraPrice" /></mat-form-field>
        </div>
        <div style="display:flex;justify-content:flex-end;">
          <button mat-flat-button class="sh-btn-teal" (click)="submitGenerateBill()">Create OPD Bill</button>
        </div>
      </div>
    }

    @if (selectedBill(); as sb) {
      <div class="sh-card" style="padding:22px;margin-bottom:18px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;" class="no-print">
          <h3 style="margin:0;color:var(--sh-navy);">Bill &amp; Receipt &mdash; {{ sb.billNumber }}</h3>
          <div style="display:flex;gap:8px;">
            <button mat-stroked-button (click)="printReceipt()"><mat-icon>print</mat-icon> Print Receipt</button>
            <button mat-button (click)="selectedBill.set(null)">Close</button>
          </div>
        </div>

        <div class="receipt-box">
          <div style="display:flex;justify-content:space-between;border-bottom:1px solid #e2e8f0;padding-bottom:12px;margin-bottom:12px;">
            <div>
              <strong style="font-size:17px;color:var(--sh-navy);">SH Multi-Specialty Hospital</strong><br/>
              <small>OPD Bill: {{ sb.billNumber }} &bull; Visit: {{ sb.visitNumber }}</small>
            </div>
            <div style="text-align:right;">
              <strong>{{ sb.patientName }} ({{ sb.patientCode }})</strong><br/>
              <small>Doctor: {{ sb.doctorName }} &bull; {{ sb.departmentName }}</small>
            </div>
          </div>

          <table class="sh-table">
            <thead><tr><th>Code</th><th>Description</th><th>Qty</th><th>Unit</th><th>Amount</th></tr></thead>
            <tbody>
              @for (item of sb.items; track item.id) {
                <tr>
                  <td><code>{{ item.serviceCode }}</code></td>
                  <td>{{ item.description }}</td>
                  <td>{{ item.quantity }}</td>
                  <td>₹{{ item.unitPrice.toFixed(2) }}</td>
                  <td>₹{{ item.totalPrice.toFixed(2) }}</td>
                </tr>
              }
            </tbody>
          </table>

          <div style="display:flex;justify-content:flex-end;margin-top:12px;">
            <div style="min-width:250px;font-size:13.5px;display:flex;flex-direction:column;gap:4px;">
              <div style="display:flex;justify-content:space-between;"><span>Subtotal:</span><strong>₹{{ sb.subTotal.toFixed(2) }}</strong></div>
              <div style="display:flex;justify-content:space-between;"><span>Discount:</span><span>- ₹{{ sb.discountAmount.toFixed(2) }}</span></div>
              <div style="display:flex;justify-content:space-between;"><span>Tax:</span><span>₹{{ sb.taxAmount.toFixed(2) }}</span></div>
              <div style="display:flex;justify-content:space-between;font-size:15px;border-top:1px solid #cbd5e1;padding-top:4px;">
                <strong>Total:</strong><strong>₹{{ sb.totalAmount.toFixed(2) }}</strong>
              </div>
              <div style="display:flex;justify-content:space-between;color:#15803d;"><span>Paid:</span><strong>₹{{ sb.paidAmount.toFixed(2) }}</strong></div>
              <div style="display:flex;justify-content:space-between;color:#b91c1c;"><span>Balance Due:</span><strong>₹{{ sb.balanceAmount.toFixed(2) }}</strong></div>
            </div>
          </div>
        </div>

        @if (sb.balanceAmount > 0) {
          <form [formGroup]="payForm" (ngSubmit)="submitPayment()" class="no-print" style="margin-top:18px;padding-top:14px;border-top:1px solid #e2e8f0;">
            <h4 style="margin:0 0 10px;color:var(--sh-navy);">Record Payment (Cash / UPI / Card)</h4>
            <div class="sh-grid-4">
              <mat-form-field appearance="outline"><mat-label>Amount (₹)</mat-label><input matInput type="number" formControlName="amount" /></mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Method</mat-label>
                <mat-select formControlName="method">
                  <mat-option value="Cash">Cash</mat-option>
                  <mat-option value="UPI">UPI</mat-option>
                  <mat-option value="Card">Card</mat-option>
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Transaction Ref (UPI/Card)</mat-label><input matInput formControlName="transactionReference" /></mat-form-field>
              <div style="display:flex;align-items:center;">
                <button mat-flat-button class="sh-btn-teal" type="submit" [disabled]="payForm.invalid">Record Payment</button>
              </div>
            </div>
          </form>
        } @else if (sb.visitStatus !== 'CheckedOut') {
          <div class="no-print" style="margin-top:16px;display:flex;justify-content:flex-end;">
            <button mat-flat-button class="sh-btn-primary" (click)="checkOut(sb.visitId)">
              Complete Patient Check-Out
            </button>
          </div>
        }
      </div>
    }

    <div class="sh-card">
      <div style="padding:14px 16px;border-bottom:1px solid var(--sh-border);display:flex;justify-content:space-between;align-items:center;">
        <strong>Recent OPD Bills</strong>
        <button mat-stroked-button (click)="load()"><mat-icon>refresh</mat-icon> Refresh</button>
      </div>
      <div class="sh-table-wrap">
        <table class="sh-table">
          <thead><tr><th>Bill #</th><th>Visit #</th><th>Patient</th><th>Total</th><th>Paid</th><th>Balance</th><th>Bill Status</th><th>Visit Status</th><th>Actions</th></tr></thead>
          <tbody>
            @for (b of bills(); track b.id) {
              <tr>
                <td><code>{{ b.billNumber }}</code></td>
                <td><code>{{ b.visitNumber }}</code></td>
                <td><strong>{{ b.patientName }}</strong><br/><small>{{ b.patientCode }}</small></td>
                <td>₹{{ b.totalAmount.toFixed(2) }}</td>
                <td>₹{{ b.paidAmount.toFixed(2) }}</td>
                <td><strong>₹{{ b.balanceAmount.toFixed(2) }}</strong></td>
                <td><app-status-badge [status]="b.status" /></td>
                <td><app-status-badge [status]="b.visitStatus" /></td>
                <td style="white-space:nowrap;">
                  <button mat-stroked-button (click)="openBill(b)" style="margin-right:6px;">View / Pay</button>
                  @if (b.balanceAmount === 0 && b.visitStatus !== 'CheckedOut') {
                    <button mat-flat-button class="sh-btn-teal" (click)="checkOut(b.visitId)">Check Out</button>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `
})
export class ReceptionBillingComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);

  readonly bills = signal<BillDto[]>([]);
  readonly pendingBillVisits = signal<VisitDto[]>([]);
  readonly billTargetVisit = signal<VisitDto | null>(null);
  readonly selectedBill = signal<BillDto | null>(null);

  discountAmount = 0;
  extraDesc = '';
  extraPrice = 0;

  readonly payForm = this.fb.nonNullable.group({
    amount: [0, [Validators.required, Validators.min(1)]],
    method: ['UPI', Validators.required],
    transactionReference: ['']
  });

  ngOnInit(): void { this.load(); }

  load(): void {
    this.api.getBills({ page: 1, pageSize: 25 }).subscribe({ next: (r) => this.bills.set(r.items) });
    this.api.getDoctorQueue().subscribe({
      next: (q) => this.pendingBillVisits.set(q.filter((v) => !v.billId && (v.status === 'BillingPending' || v.status === 'ConsultationCompleted')))
    });
  }

  openGenerateBill(v: VisitDto): void {
    this.billTargetVisit.set(v);
    this.discountAmount = 0;
    this.extraDesc = '';
    this.extraPrice = 0;
  }

  submitGenerateBill(): void {
    const v = this.billTargetVisit();
    if (!v) return;
    const additionalItems = this.extraDesc.trim() && this.extraPrice > 0
      ? [{ serviceCode: 'OPD-PROC', description: this.extraDesc.trim(), category: 'Procedure', quantity: 1, unitPrice: this.extraPrice }]
      : [];

    this.api.generateBill({ visitId: v.id, discountAmount: this.discountAmount || 0, notes: 'OPD Visit Billing', additionalItems }).subscribe({
      next: (bill) => {
        this.toast.success(`Bill ${bill.billNumber} generated.`);
        this.billTargetVisit.set(null);
        this.openBill(bill);
        this.load();
      },
      error: (err) => this.toast.error(extractApiError(err))
    });
  }

  openBill(b: BillDto): void {
    this.selectedBill.set(b);
    this.payForm.patchValue({ amount: b.balanceAmount, method: 'UPI', transactionReference: '' });
  }

  submitPayment(): void {
    const b = this.selectedBill();
    if (!b || this.payForm.invalid) return;
    const val = this.payForm.getRawValue();
    this.api.recordPayment({ billId: b.id, ...val, notes: 'Recorded at reception desk' }).subscribe({
      next: (pay) => {
        this.toast.success(`Payment recorded! Receipt: ${pay.receiptNumber}`);
        this.api.getBillByVisitId(b.visitId).subscribe({ next: (updated) => this.openBill(updated) });
        this.load();
      },
      error: (err) => this.toast.error(extractApiError(err))
    });
  }

  checkOut(visitId: number): void {
    this.api.checkOutVisit(visitId, 'Settled and checked out at reception').subscribe({
      next: (v) => {
        this.toast.success(`Visit ${v.visitNumber} checked out!`);
        this.selectedBill.set(null);
        this.load();
      },
      error: (err) => this.toast.error(extractApiError(err))
    });
  }

  printReceipt(): void {
    window.print();
  }
}
