import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { ApiService } from '../../../core/services/api.service';
import { NotificationDto } from '../../../core/models/hospital.models';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-patient-notifications',
  standalone: true,
  imports: [CommonModule, MatButtonModule, PageHeaderComponent, StatusBadgeComponent],
  template: `
    <app-page-header title="Notifications" subtitle="Appointment updates, queue token alerts, and billing notifications">
      <button mat-stroked-button (click)="markAll()">Mark All Read</button>
    </app-page-header>

    <div class="sh-card">
      @if (loading()) {
        <div class="sh-state-box">Loading notifications...</div>
      } @else if (items().length === 0) {
        <div class="sh-state-box">You have no notifications yet.</div>
      } @else {
        @for (n of items(); track n.id) {
          <div class="notif-row" [class.unread]="!n.isRead">
            <div>
              <div style="display:flex;align-items:center;gap:8px;">
                <strong>{{ n.title }}</strong>
                <app-status-badge [status]="n.type" />
              </div>
              <p style="margin:4px 0;font-size:13.5px;color:var(--sh-text-muted);">{{ n.message }}</p>
              <small style="color:var(--sh-text-subtle);">{{ n.createdAt | date:'medium' }}</small>
            </div>
            @if (!n.isRead) {
              <button mat-stroked-button (click)="markRead(n)">Mark Read</button>
            }
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .notif-row { padding: 14px 18px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; gap: 12px; }
    .notif-row.unread { background: #eff6ff; }
  `]
})
export class PatientNotificationsComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly loading = signal(true);
  readonly items = signal<NotificationDto[]>([]);

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.api.getNotifications({ page: 1, pageSize: 30 }).subscribe({
      next: (r) => { this.items.set(r.items); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  markRead(n: NotificationDto): void {
    this.api.markNotificationRead(n.id).subscribe({
      next: () => this.items.update((list) => list.map((x) => x.id === n.id ? { ...x, isRead: true } : x))
    });
  }

  markAll(): void {
    this.api.markAllNotificationsRead().subscribe({
      next: () => this.items.update((list) => list.map((x) => ({ ...x, isRead: true })))
    });
  }
}
