import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '../../../core/services/auth.service';
import { ApiService } from '../../../core/services/api.service';
import { NotificationDto, UserRole } from '../../../core/models/hospital.models';

interface NavItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatBadgeModule,
    MatDividerModule
  ],
  template: `
    <mat-sidenav-container class="shell-container">
      <mat-sidenav
        [mode]="isMobile() ? 'over' : 'side'"
        [opened]="!isMobile() || mobileMenuOpen()"
        (closedStart)="mobileMenuOpen.set(false)"
        class="sidebar">
        <div class="sidebar-brand">
          <img src="assets/logo.png" alt="SH Hospital Logo" class="brand-logo" />
          <div class="brand-text">
            <span class="brand-title">SH Hospital</span>
            <span class="brand-sub">OPD Management</span>
          </div>
        </div>

        <div class="role-pill">{{ user()?.role }} Portal</div>

        <mat-nav-list class="nav-list">
          @for (item of navItems(); track item.route) {
            <a mat-list-item
               [routerLink]="item.route"
               routerLinkActive="active-nav"
               (click)="isMobile() && mobileMenuOpen.set(false)">
              <mat-icon matListItemIcon>{{ item.icon }}</mat-icon>
              <span matListItemTitle>{{ item.label }}</span>
            </a>
          }
        </mat-nav-list>

        <div class="sidebar-footer">
          <a mat-list-item routerLink="/">
            <mat-icon matListItemIcon>public</mat-icon>
            <span matListItemTitle>Public Website</span>
          </a>
        </div>
      </mat-sidenav>

      <mat-sidenav-content class="main-content">
        <header class="topbar no-print">
          <div class="topbar-left">
            @if (isMobile()) {
              <button mat-icon-button (click)="mobileMenuOpen.set(!mobileMenuOpen())" aria-label="Toggle navigation">
                <mat-icon>menu</mat-icon>
              </button>
            }
            <div class="hospital-chip">
              <span class="dot"></span>
              <span>OPD Live Desk &middot; {{ todayLabel }}</span>
            </div>
          </div>

          <div class="topbar-right">
            <button mat-icon-button [matMenuTriggerFor]="notifMenu" (click)="loadNotifications()" aria-label="Notifications">
              <mat-icon [matBadge]="unreadCount()" [matBadgeHidden]="unreadCount() === 0" matBadgeColor="warn" matBadgeSize="small">
                notifications_none
              </mat-icon>
            </button>

            <mat-menu #notifMenu="matMenu" class="notif-menu">
              <div class="notif-header" (click)="$event.stopPropagation()">
                <strong>Notifications</strong>
                @if (unreadCount() > 0) {
                  <button mat-button color="primary" (click)="markAllRead()">Mark all read</button>
                }
              </div>
              <mat-divider />
              @if (notifications().length === 0) {
                <div class="notif-empty">No notifications yet.</div>
              } @else {
                @for (n of notifications(); track n.id) {
                  <button mat-menu-item (click)="markRead(n)" [class.unread-notif]="!n.isRead">
                    <div class="notif-item">
                      <div class="notif-title">{{ n.title }}</div>
                      <div class="notif-msg">{{ n.message }}</div>
                    </div>
                  </button>
                }
              }
            </mat-menu>

            <button mat-button [matMenuTriggerFor]="userMenu" class="user-btn">
              <div class="avatar">{{ initials() }}</div>
              <div class="user-meta">
                <span class="user-name">{{ user()?.fullName }}</span>
                <span class="user-role">{{ user()?.role }}</span>
              </div>
              <mat-icon>expand_more</mat-icon>
            </button>

            <mat-menu #userMenu="matMenu">
              @if (user()?.role === 'Patient') {
                <button mat-menu-item (click)="router.navigate(['/patient/profile'])">
                  <mat-icon>person</mat-icon> My Profile
                </button>
              }
              <button mat-menu-item (click)="router.navigate(['/'])">
                <mat-icon>home</mat-icon> Public Portal
              </button>
              <mat-divider />
              <button mat-menu-item (click)="auth.logout()">
                <mat-icon>logout</mat-icon> Sign Out
              </button>
            </mat-menu>
          </div>
        </header>

        <main class="workspace">
          <div class="sh-page-container">
            <router-outlet />
          </div>
        </main>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [`
    .shell-container { height: 100vh; background: var(--sh-bg); }
    .sidebar {
      width: 262px;
      background: #0f294a;
      color: #e2e8f0;
      border-right: none;
      display: flex;
      flex-direction: column;
      --mdc-list-list-item-label-text-color: #e2e8f0;
      --mdc-list-list-item-hover-label-text-color: #ffffff;
      --mdc-list-list-item-focus-label-text-color: #ffffff;
      --mat-list-list-item-label-text-color: #e2e8f0;
      --mat-list-list-item-hover-label-text-color: #ffffff;
      --mat-list-list-item-focus-label-text-color: #ffffff;
    }
    ::ng-deep .sidebar .mdc-list-item__primary-text {
      color: #e2e8f0 !important;
      font-size: 13.5px !important;
      font-weight: 500 !important;
    }
    ::ng-deep .sidebar a.active-nav .mdc-list-item__primary-text {
      color: #ffffff !important;
      font-weight: 600 !important;
    }
    .sidebar-brand {
      display: flex;
      align-items: center;
      gap: 11px;
      padding: 18px 18px 12px;
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }
    .brand-logo { width: 38px; height: 38px; border-radius: 50%; object-fit: cover; background: #fff; }
    .brand-text { display: flex; flex-direction: column; }
    .brand-title { font-weight: 700; font-size: 15px; color: #ffffff; letter-spacing: -0.01em; }
    .brand-sub { font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.06em; }
    .role-pill {
      margin: 12px 16px 6px;
      padding: 5px 10px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      border-radius: 6px;
      background: rgba(13, 148, 136, 0.2);
      color: #5eead4;
      border: 1px solid rgba(94, 234, 212, 0.25);
    }
    .nav-list { padding: 6px 8px; flex: 1; }
    .nav-list a {
      border-radius: 7px;
      margin-bottom: 2px;
      color: #cbd5e1 !important;
      font-size: 13.5px;
      height: 42px;
    }
    .nav-list a mat-icon { color: #94a3b8 !important; font-size: 20px; }
    .nav-list a:hover { background: rgba(255,255,255,0.08); color: #ffffff !important; }
    .nav-list a.active-nav {
      background: rgba(13, 148, 136, 0.28) !important;
      color: #ffffff !important;
      font-weight: 600;
    }
    .nav-list a.active-nav mat-icon { color: #5eead4 !important; }
    .sidebar-footer {
      border-top: 1px solid rgba(255,255,255,0.1);
      padding: 6px 8px;
    }
    .sidebar-footer a { color: #cbd5e1 !important; border-radius: 7px; font-size: 13px; }
    .sidebar-footer mat-icon { color: #94a3b8 !important; }

    .main-content { display: flex; flex-direction: column; height: 100vh; }
    .topbar {
      height: 58px;
      background: #ffffff;
      border-bottom: 1px solid var(--sh-border);
      padding: 0 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
    }
    .topbar-left { display: flex; align-items: center; gap: 10px; }
    .hospital-chip {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 12.5px;
      font-weight: 500;
      color: var(--sh-text-muted);
      background: #f1f5f9;
      padding: 5px 11px;
      border-radius: 999px;
    }
    .hospital-chip .dot { width: 8px; height: 8px; border-radius: 50%; background: #0d9488; }
    .topbar-right { display: flex; align-items: center; gap: 8px; }
    .user-btn { height: 42px; padding: 0 8px; border-radius: 8px; }
    .avatar {
      width: 30px; height: 30px; border-radius: 50%;
      background: var(--sh-navy); color: #fff;
      font-size: 12px; font-weight: 600;
      display: inline-flex; align-items: center; justify-content: center;
      margin-right: 8px;
    }
    .user-meta { display: inline-flex; flex-direction: column; align-items: flex-start; line-height: 1.2; text-align: left; }
    .user-name { font-size: 13px; font-weight: 600; color: var(--sh-text); }
    .user-role { font-size: 11px; color: var(--sh-text-subtle); }
    @media (max-width: 640px) { .user-meta { display: none; } }

    .workspace { flex: 1; overflow-y: auto; padding: 22px; }
    .notif-header { display: flex; justify-content: space-between; align-items: center; padding: 8px 14px; min-width: 290px; }
    .notif-empty { padding: 18px 16px; color: var(--sh-text-subtle); font-size: 13px; text-align: center; }
    .notif-item { white-space: normal; line-height: 1.35; padding: 4px 0; max-width: 300px; }
    .notif-title { font-size: 12.5px; font-weight: 600; color: var(--sh-text); }
    .notif-msg { font-size: 12px; color: var(--sh-text-muted); }
    .unread-notif { background: #eff6ff; }
  `]
})
export class AppShellComponent implements OnInit {
  readonly auth = inject(AuthService);
  readonly router = inject(Router);
  private readonly api = inject(ApiService);
  private readonly breakpointObserver = inject(BreakpointObserver);

  readonly user = this.auth.user;
  readonly isMobile = signal(false);
  readonly mobileMenuOpen = signal(false);
  readonly notifications = signal<NotificationDto[]>([]);
  readonly unreadCount = computed(() => this.notifications().filter((n) => !n.isRead).length);
  readonly todayLabel = new Date().toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });

  private readonly roleMenus: Record<UserRole, NavItem[]> = {
    Admin: [
      { label: 'Analytics Dashboard', icon: 'dashboard', route: '/admin/dashboard' },
      { label: 'Users & Receptionists', icon: 'manage_accounts', route: '/admin/users' },
      { label: 'Doctors & Schedules', icon: 'medical_services', route: '/admin/doctors' },
      { label: 'Departments', icon: 'apartment', route: '/admin/departments' },
      { label: 'Appointments', icon: 'event_note', route: '/admin/appointments' },
      { label: 'Patient Records', icon: 'groups', route: '/admin/patients' },
      { label: 'OPD Visit Monitor', icon: 'monitor_heart', route: '/admin/visits' },
      { label: 'Billing Reports', icon: 'assessment', route: '/admin/reports' },
      { label: 'Audit Logs', icon: 'security', route: '/admin/audit-logs' },
      { label: 'Hospital Settings', icon: 'settings', route: '/admin/settings' }
    ],
    Receptionist: [
      { label: 'Reception Dashboard', icon: 'dashboard', route: '/reception/dashboard' },
      { label: 'Patients & Walk-Ins', icon: 'person_add', route: '/reception/patients' },
      { label: 'Appointments & Check-In', icon: 'event_available', route: '/reception/appointments' },
      { label: 'Doctor Waiting Queue', icon: 'queue', route: '/reception/queue' },
      { label: 'Billing & Checkout', icon: 'receipt_long', route: '/reception/billing' }
    ],
    Doctor: [
      { label: 'Doctor Dashboard', icon: 'dashboard', route: '/doctor/dashboard' },
      { label: 'OPD Queue & Consults', icon: 'stethoscope', route: '/doctor/queue' }
    ],
    Patient: [
      { label: 'Patient Dashboard', icon: 'dashboard', route: '/patient/dashboard' },
      { label: 'Book Appointment', icon: 'add_circle_outline', route: '/patient/book' },
      { label: 'My Appointments', icon: 'event', route: '/patient/appointments' },
      { label: 'Visit & Token Status', icon: 'confirmation_number', route: '/patient/visits' },
      { label: 'Prescriptions', icon: 'medication', route: '/patient/prescriptions' },
      { label: 'Bills & Receipts', icon: 'receipt', route: '/patient/billing' },
      { label: 'Notifications', icon: 'notifications', route: '/patient/notifications' },
      { label: 'My Profile', icon: 'person', route: '/patient/profile' }
    ]
  };

  readonly navItems = computed(() => {
    const r = this.user()?.role;
    return r ? this.roleMenus[r] ?? [] : [];
  });

  readonly initials = computed(() => {
    const name = this.user()?.fullName || 'SH';
    return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');
  });

  ngOnInit(): void {
    this.breakpointObserver.observe([Breakpoints.Handset, Breakpoints.TabletPortrait]).subscribe((res) => {
      this.isMobile.set(res.matches);
    });
    this.loadNotifications();
  }

  loadNotifications(): void {
    if (!this.auth.isAuthenticated()) return;
    this.api.getNotifications({ page: 1, pageSize: 8 }).subscribe({
      next: (res) => this.notifications.set(res.items),
      error: () => {}
    });
  }

  markRead(n: NotificationDto): void {
    if (n.isRead) return;
    this.api.markNotificationRead(n.id).subscribe({
      next: () => this.notifications.update((list) => list.map((x) => x.id === n.id ? { ...x, isRead: true } : x))
    });
  }

  markAllRead(): void {
    this.api.markAllNotificationsRead().subscribe({
      next: () => this.notifications.update((list) => list.map((x) => ({ ...x, isRead: true })))
    });
  }
}
