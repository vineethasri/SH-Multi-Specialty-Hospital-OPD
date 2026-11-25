import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PagedResponse, VisitDto } from '../models/hospital.models';
import { buildHttpParams } from './http-params.util';

@Injectable({ providedIn: 'root' })
export class VisitApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/visits`;

  getVisits(query: {
    page?: number;
    pageSize?: number;
    search?: string;
    date?: string;
    doctorId?: number;
    departmentId?: number;
    patientId?: number;
    status?: string;
  }): Observable<PagedResponse<VisitDto>> {
    return this.http.get<PagedResponse<VisitDto>>(this.baseUrl, { params: buildHttpParams(query) });
  }

  getQueue(doctorId?: number, date?: string): Observable<VisitDto[]> {
    return this.http.get<VisitDto[]>(`${this.baseUrl}/queue`, { params: buildHttpParams({ doctorId, date }) });
  }

  checkInAppointment(appointmentId: number, chiefComplaint?: string, notes?: string): Observable<VisitDto> {
    return this.http.post<VisitDto>(`${this.baseUrl}/check-in`, { appointmentId, chiefComplaint, notes });
  }

  checkInWalkIn(payload: {
    patientId: number;
    doctorId: number;
    departmentId: number;
    chiefComplaint?: string;
    notes?: string;
  }): Observable<VisitDto> {
    return this.http.post<VisitDto>(`${this.baseUrl}/walk-in`, payload);
  }

  updateStatus(id: number, status: string, reason?: string, notes?: string): Observable<VisitDto> {
    return this.http.patch<VisitDto>(`${this.baseUrl}/${id}/status`, { status, reason, notes });
  }

  checkOut(id: number, notes?: string): Observable<VisitDto> {
    return this.http.post<VisitDto>(`${this.baseUrl}/${id}/checkout`, { notes });
  }
}
