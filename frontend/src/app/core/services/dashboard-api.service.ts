import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AuditLogDto,
  BillingReportSummaryDto,
  DashboardAnalyticsDto,
  NotificationDto,
  PagedResponse
} from '../models/hospital.models';
import { buildHttpParams } from './http-params.util';

@Injectable({ providedIn: 'root' })
export class DashboardApiService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  getDashboard(date?: string): Observable<DashboardAnalyticsDto> {
    return this.http.get<DashboardAnalyticsDto>(`${this.api}/dashboard`, { params: buildHttpParams({ date }) });
  }

  getBillingReport(fromDate?: string, toDate?: string): Observable<BillingReportSummaryDto> {
    return this.http.get<BillingReportSummaryDto>(`${this.api}/reports/billing`, { params: buildHttpParams({ fromDate, toDate }) });
  }

  getAuditLogs(query: {
    page?: number;
    pageSize?: number;
    search?: string;
    action?: string;
    entityName?: string;
  }): Observable<PagedResponse<AuditLogDto>> {
    return this.http.get<PagedResponse<AuditLogDto>>(`${this.api}/reports/audit-logs`, { params: buildHttpParams(query) });
  }

  getNotifications(query: { page?: number; pageSize?: number; unreadOnly?: boolean }): Observable<PagedResponse<NotificationDto>> {
    return this.http.get<PagedResponse<NotificationDto>>(`${this.api}/notifications`, { params: buildHttpParams(query) });
  }

  markNotificationRead(id: number): Observable<void> {
    return this.http.post<void>(`${this.api}/notifications/${id}/read`, {});
  }

  markAllNotificationsRead(): Observable<void> {
    return this.http.post<void>(`${this.api}/notifications/read-all`, {});
  }
}
