import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AppointmentDto, PagedResponse } from '../models/hospital.models';
import { buildHttpParams } from './http-params.util';

@Injectable({ providedIn: 'root' })
export class AppointmentApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/appointments`;

  getAppointments(query: {
    page?: number;
    pageSize?: number;
    search?: string;
    date?: string;
    doctorId?: number;
    departmentId?: number;
    patientId?: number;
    status?: string;
  }): Observable<PagedResponse<AppointmentDto>> {
    return this.http.get<PagedResponse<AppointmentDto>>(this.baseUrl, { params: buildHttpParams(query) });
  }

  book(payload: Record<string, unknown>): Observable<AppointmentDto> {
    return this.http.post<AppointmentDto>(this.baseUrl, payload);
  }

  confirm(id: number): Observable<AppointmentDto> {
    return this.http.post<AppointmentDto>(`${this.baseUrl}/${id}/confirm`, {});
  }

  cancel(id: number, reason: string): Observable<AppointmentDto> {
    return this.http.post<AppointmentDto>(`${this.baseUrl}/${id}/cancel`, { reason });
  }

  markNoShow(id: number): Observable<AppointmentDto> {
    return this.http.post<AppointmentDto>(`${this.baseUrl}/${id}/no-show`, {});
  }
}
