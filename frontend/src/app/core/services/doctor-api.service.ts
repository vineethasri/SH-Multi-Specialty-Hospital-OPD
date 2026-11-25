import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DoctorDto, DoctorScheduleDto, PagedResponse, TimeSlotDto } from '../models/hospital.models';
import { buildHttpParams } from './http-params.util';

@Injectable({ providedIn: 'root' })
export class DoctorApiService {
  private readonly http = inject(HttpClient);
  private readonly doctorsUrl = `${environment.apiUrl}/doctors`;
  private readonly schedulesUrl = `${environment.apiUrl}/schedules`;

  getDoctors(query: {
    page?: number;
    pageSize?: number;
    search?: string;
    departmentId?: number;
    isActive?: boolean;
    onlineOnly?: boolean;
  }): Observable<PagedResponse<DoctorDto>> {
    return this.http.get<PagedResponse<DoctorDto>>(this.doctorsUrl, { params: buildHttpParams(query) });
  }

  getById(id: number): Observable<DoctorDto> {
    return this.http.get<DoctorDto>(`${this.doctorsUrl}/${id}`);
  }

  create(payload: Record<string, unknown>): Observable<DoctorDto> {
    return this.http.post<DoctorDto>(this.doctorsUrl, payload);
  }

  update(id: number, payload: Record<string, unknown>): Observable<DoctorDto> {
    return this.http.put<DoctorDto>(`${this.doctorsUrl}/${id}`, payload);
  }

  getAvailableSlots(doctorId: number, date: string): Observable<TimeSlotDto[]> {
    return this.http.get<TimeSlotDto[]>(`${this.doctorsUrl}/${doctorId}/slots`, { params: buildHttpParams({ date }) });
  }

  getSchedules(doctorId?: number): Observable<DoctorScheduleDto[]> {
    return this.http.get<DoctorScheduleDto[]>(this.schedulesUrl, { params: buildHttpParams({ doctorId }) });
  }

  createSchedule(payload: Record<string, unknown>): Observable<DoctorScheduleDto> {
    return this.http.post<DoctorScheduleDto>(this.schedulesUrl, payload);
  }

  deleteSchedule(id: number): Observable<void> {
    return this.http.delete<void>(`${this.schedulesUrl}/${id}`);
  }
}
