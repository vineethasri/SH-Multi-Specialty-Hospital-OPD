import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PagedResponse, PrescriptionDto } from '../models/hospital.models';
import { buildHttpParams } from './http-params.util';

@Injectable({ providedIn: 'root' })
export class PrescriptionApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/prescriptions`;

  getPrescriptions(query: {
    page?: number;
    pageSize?: number;
    search?: string;
    patientId?: number;
    doctorId?: number;
  }): Observable<PagedResponse<PrescriptionDto>> {
    return this.http.get<PagedResponse<PrescriptionDto>>(this.baseUrl, { params: buildHttpParams(query) });
  }

  getById(id: number): Observable<PrescriptionDto> {
    return this.http.get<PrescriptionDto>(`${this.baseUrl}/${id}`);
  }

  save(payload: Record<string, unknown>): Observable<PrescriptionDto> {
    return this.http.post<PrescriptionDto>(this.baseUrl, payload);
  }
}
