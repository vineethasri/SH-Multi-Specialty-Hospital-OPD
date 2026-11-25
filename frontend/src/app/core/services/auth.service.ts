import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { AuthResponse, UserInfo, UserRole } from '../models/hospital.models';
import { AuthApiService } from './auth-api.service';

const ACCESS_TOKEN_KEY = 'sh_opd_access_token';
const REFRESH_TOKEN_KEY = 'sh_opd_refresh_token';
const USER_KEY = 'sh_opd_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly authApi = inject(AuthApiService);
  private readonly router = inject(Router);

  private readonly _user = signal<UserInfo | null>(this.loadStoredUser());
  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => !!this._user() && !!this.accessToken);
  readonly role = computed(() => this._user()?.role ?? null);

  get accessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  get refreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  hasRole(...roles: UserRole[]): boolean {
    const current = this._user()?.role;
    return !!current && roles.includes(current);
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.authApi.login(email, password).pipe(tap((res) => this.persistSession(res)));
  }

  registerPatient(payload: Record<string, unknown>): Observable<AuthResponse> {
    return this.authApi.registerPatient(payload).pipe(tap((res) => this.persistSession(res)));
  }

  refresh(): Observable<AuthResponse> {
    return this.authApi.refresh(this.refreshToken ?? '').pipe(tap((res) => this.persistSession(res)));
  }

  changePassword(currentPassword: string, newPassword: string): Observable<void> {
    return this.authApi.changePassword(currentPassword, newPassword);
  }

  logout(): void {
    const rt = this.refreshToken;
    if (rt && this.accessToken) {
      this.authApi.logout(rt).subscribe({ error: () => {} });
    }
    this.clearSession();
    void this.router.navigate(['/login']);
  }

  clearSession(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this._user.set(null);
  }

  getDefaultRouteForRole(role?: UserRole | null): string {
    switch (role ?? this._user()?.role) {
      case 'Admin': return '/admin/dashboard';
      case 'Receptionist': return '/reception/dashboard';
      case 'Doctor': return '/doctor/dashboard';
      case 'Patient': return '/patient/dashboard';
      default: return '/';
    }
  }

  private persistSession(res: AuthResponse): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, res.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, res.refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    this._user.set(res.user);
  }

  private loadStoredUser(): UserInfo | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as UserInfo) : null;
    } catch {
      return null;
    }
  }
}
