import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PagedResponse, PatientDto } from '../models/hospital.models';
import { buildHttpParams } from './http-params.util';

@Injectable({ providedIn: 'root' })
export class PatientApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/patients`;

  getPatients(query: {
    page?: number;
    pageSize?: number;
    search?: string;
    sortBy?: string;
    sortDirection?: string;
  }): Observable<PagedResponse<PatientDto>> {
    return this.http.get<PagedResponse<PatientDto>>(this.baseUrl, { params: buildHttpParams(query) });
  }

  getMyProfile(): Observable<PatientDto> {
    return this.http.get<PatientDto>(`${this.baseUrl}/me`);
  }

  getById(id: number): Observable<PatientDto> {
    return this.http.get<PatientDto>(`${this.baseUrl}/${id}`);
  }

  create(payload: Record<string, unknown>): Observable<PatientDto> {
    return this.http.post<PatientDto>(this.baseUrl, payload);
  }

  update(id: number, payload: Record<string, unknown>): Observable<PatientDto> {
    return this.http.put<PatientDto>(`${this.baseUrl}/${id}`, payload);
  }
}
