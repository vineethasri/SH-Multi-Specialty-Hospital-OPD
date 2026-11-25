import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, PagedResponse, UserDto, UserInfo } from '../models/hospital.models';
import { buildHttpParams } from './http-params.util';

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly http = inject(HttpClient);
  private readonly authUrl = `${environment.apiUrl}/auth`;
  private readonly usersUrl = `${environment.apiUrl}/users`;

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.authUrl}/login`, { email, password });
  }

  registerPatient(payload: Record<string, unknown>): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.authUrl}/register`, payload);
  }

  refresh(refreshToken: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.authUrl}/refresh`, { refreshToken });
  }

  logout(refreshToken: string): Observable<void> {
    return this.http.post<void>(`${this.authUrl}/logout`, { refreshToken });
  }

  changePassword(currentPassword: string, newPassword: string): Observable<void> {
    return this.http.post<void>(`${this.authUrl}/change-password`, { currentPassword, newPassword });
  }

  me(): Observable<UserInfo> {
    return this.http.get<UserInfo>(`${this.authUrl}/me`);
  }

  getUsers(query: { page?: number; pageSize?: number; search?: string; role?: string; isActive?: boolean }): Observable<PagedResponse<UserDto>> {
    return this.http.get<PagedResponse<UserDto>>(this.usersUrl, { params: buildHttpParams(query) });
  }

  createUser(payload: Record<string, unknown>): Observable<UserDto> {
    return this.http.post<UserDto>(this.usersUrl, payload);
  }

  updateUser(id: number, payload: Record<string, unknown>): Observable<UserDto> {
    return this.http.put<UserDto>(`${this.usersUrl}/${id}`, payload);
  }
}
