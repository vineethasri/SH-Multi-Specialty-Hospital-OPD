import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DepartmentDto, HospitalSettingDto } from '../models/hospital.models';
import { buildHttpParams } from './http-params.util';

@Injectable({ providedIn: 'root' })
export class DepartmentApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/departments`;

  getAll(isActive?: boolean, search?: string): Observable<DepartmentDto[]> {
    return this.http.get<DepartmentDto[]>(this.baseUrl, { params: buildHttpParams({ isActive, search }) });
  }

  getById(id: number): Observable<DepartmentDto> {
    return this.http.get<DepartmentDto>(`${this.baseUrl}/${id}`);
  }

  create(payload: Record<string, unknown>): Observable<DepartmentDto> {
    return this.http.post<DepartmentDto>(this.baseUrl, payload);
  }

  update(id: number, payload: Record<string, unknown>): Observable<DepartmentDto> {
    return this.http.put<DepartmentDto>(`${this.baseUrl}/${id}`, payload);
  }

  getHospitalSettings(): Observable<HospitalSettingDto> {
    return this.http.get<HospitalSettingDto>(`${this.baseUrl}/hospital-settings`);
  }

  updateHospitalSettings(payload: Partial<HospitalSettingDto>): Observable<HospitalSettingDto> {
    return this.http.put<HospitalSettingDto>(`${this.baseUrl}/hospital-settings`, payload);
  }
}
