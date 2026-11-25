import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ConsultationDto, PagedResponse } from '../models/hospital.models';
import { buildHttpParams } from './http-params.util';

@Injectable({ providedIn: 'root' })
export class ConsultationApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/consultations`;

  getConsultations(query: {
    page?: number;
    pageSize?: number;
    search?: string;
    doctorId?: number;
    patientId?: number;
  }): Observable<PagedResponse<ConsultationDto>> {
    return this.http.get<PagedResponse<ConsultationDto>>(this.baseUrl, { params: buildHttpParams(query) });
  }

  getById(id: number): Observable<ConsultationDto> {
    return this.http.get<ConsultationDto>(`${this.baseUrl}/${id}`);
  }

  getByVisitId(visitId: number): Observable<ConsultationDto> {
    return this.http.get<ConsultationDto>(`${this.baseUrl}/by-visit/${visitId}`);
  }

  start(visitId: number): Observable<ConsultationDto> {
    return this.http.post<ConsultationDto>(`${this.baseUrl}/start`, { visitId });
  }

  save(id: number, payload: Record<string, unknown>): Observable<ConsultationDto> {
    return this.http.put<ConsultationDto>(`${this.baseUrl}/${id}`, payload);
  }

  complete(id: number, payload?: Record<string, unknown>): Observable<ConsultationDto> {
    return this.http.post<ConsultationDto>(`${this.baseUrl}/${id}/complete`, payload ?? null);
  }
}
