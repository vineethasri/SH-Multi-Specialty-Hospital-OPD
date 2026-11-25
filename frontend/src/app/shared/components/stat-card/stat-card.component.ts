import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="stat-card sh-card">
      <div class="stat-top">
        <span class="label">{{ label() }}</span>
        <div class="icon-box" [ngClass]="'tone-' + tone()">
          <mat-icon>{{ icon() }}</mat-icon>
        </div>
      </div>
      <div class="value">{{ value() }}</div>
      @if (hint()) {
        <div class="hint">{{ hint() }}</div>
      }
    </div>
  `,
  styles: [`
    .stat-card { padding: 16px 18px; display: flex; flex-direction: column; gap: 8px; }
    .stat-top { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
    .label { font-size: 12.5px; font-weight: 600; color: var(--sh-text-muted); text-transform: uppercase; letter-spacing: 0.03em; }
    .icon-box { width: 34px; height: 34px; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
    .icon-box mat-icon { font-size: 19px; width: 19px; height: 19px; }
    .tone-navy { background: #e2e8f0; color: #0f294a; }
    .tone-teal { background: #ccfbf1; color: #0d9488; }
    .tone-blue { background: #dbeafe; color: #2563eb; }
    .tone-amber { background: #fef3c7; color: #b45309; }
    .tone-green { background: #dcfce7; color: #15803d; }
    .value { font-size: 24px; font-weight: 700; color: var(--sh-text); letter-spacing: -0.02em; }
    .hint { font-size: 12px; color: var(--sh-text-subtle); }
  `]
})
export class StatCardComponent {
  label = input.required<string>();
  value = input.required<string | number>();
  icon = input<string>('analytics');
  hint = input<string>('');
  tone = input<'navy' | 'teal' | 'blue' | 'amber' | 'green'>('navy');
}
