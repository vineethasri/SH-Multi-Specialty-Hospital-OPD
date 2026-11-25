import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BillDto, PagedResponse, PaymentDto } from '../models/hospital.models';
import { buildHttpParams } from './http-params.util';

@Injectable({ providedIn: 'root' })
export class BillingApiService {
  private readonly http = inject(HttpClient);
  private readonly billsUrl = `${environment.apiUrl}/bills`;
  private readonly paymentsUrl = `${environment.apiUrl}/payments`;

  getBills(query: {
    page?: number;
    pageSize?: number;
    search?: string;
    patientId?: number;
    status?: string;
    fromDate?: string;
    toDate?: string;
  }): Observable<PagedResponse<BillDto>> {
    return this.http.get<PagedResponse<BillDto>>(this.billsUrl, { params: buildHttpParams(query) });
  }

  getBillById(id: number): Observable<BillDto> {
    return this.http.get<BillDto>(`${this.billsUrl}/${id}`);
  }

  getBillByVisitId(visitId: number): Observable<BillDto> {
    return this.http.get<BillDto>(`${this.billsUrl}/by-visit/${visitId}`);
  }

  generateBill(payload: Record<string, unknown>): Observable<BillDto> {
    return this.http.post<BillDto>(this.billsUrl, payload);
  }

  recordPayment(payload: Record<string, unknown>): Observable<PaymentDto> {
    return this.http.post<PaymentDto>(this.paymentsUrl, payload);
  }

  getPayments(query: {
    page?: number;
    pageSize?: number;
    search?: string;
    patientId?: number;
    method?: string;
    fromDate?: string;
    toDate?: string;
  }): Observable<PagedResponse<PaymentDto>> {
    return this.http.get<PagedResponse<PaymentDto>>(this.paymentsUrl, { params: buildHttpParams(query) });
  }

  getGatewayStatus(): Observable<{ provider: string; isConfigured: boolean }> {
    return this.http.get<{ provider: string; isConfigured: boolean }>(`${this.paymentsUrl}/gateway-status`);
  }
}
