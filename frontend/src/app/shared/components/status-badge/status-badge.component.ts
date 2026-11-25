import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="badge" [ngClass]="variantClass()">
      {{ formatLabel(status()) }}
    </span>
  `,
  styles: [`
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 3px 9px;
      border-radius: 999px;
      font-size: 11.5px;
      font-weight: 600;
      letter-spacing: 0.01em;
      white-space: nowrap;
    }
    .variant-success { background: #dcfce7; color: #15803d; }
    .variant-teal    { background: #ccfbf1; color: #0f766e; }
    .variant-blue    { background: #dbeafe; color: #1d4ed8; }
    .variant-warning { background: #fef3c7; color: #b45309; }
    .variant-danger  { background: #fee2e2; color: #b91c1c; }
    .variant-neutral { background: #f1f5f9; color: #475569; }
  `]
})
export class StatusBadgeComponent {
  status = input.required<string>();

  variantClass(): string {
    const s = (this.status() || '').toLowerCase();
    if (['checkedout', 'completed', 'paid', 'active', 'confirmed'].includes(s)) return 'variant-success';
    if (['readyforcheckout', 'inconsultation', 'inprogress', 'checkedin'].includes(s)) return 'variant-teal';
    if (['booked', 'scheduled', 'waiting', 'online', 'appointment'].includes(s)) return 'variant-blue';
    if (['billingpending', 'pending', 'partiallypaid', 'walkin', 'reception'].includes(s)) return 'variant-warning';
    if (['cancelled', 'noshow', 'failed', 'inactive', 'refunded'].includes(s)) return 'variant-danger';
    return 'variant-neutral';
  }

  formatLabel(val: string): string {
    return (val || '').replace(/([a-z])([A-Z])/g, '$1 $2');
  }
}
