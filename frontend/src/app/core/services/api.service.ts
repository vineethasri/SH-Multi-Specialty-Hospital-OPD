import { inject, Injectable } from '@angular/core';
import { AuthApiService } from './auth-api.service';
import { PatientApiService } from './patient-api.service';
import { DoctorApiService } from './doctor-api.service';
import { DepartmentApiService } from './department-api.service';
import { AppointmentApiService } from './appointment-api.service';
import { VisitApiService } from './visit-api.service';
import { ConsultationApiService } from './consultation-api.service';
import { PrescriptionApiService } from './prescription-api.service';
import { BillingApiService } from './billing-api.service';
import { DashboardApiService } from './dashboard-api.service';
import { HospitalSettingDto } from '../models/hospital.models';

/**
 * Facade delegating to dedicated domain API services.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly authApi = inject(AuthApiService);
  private readonly patientApi = inject(PatientApiService);
  private readonly doctorApi = inject(DoctorApiService);
  private readonly departmentApi = inject(DepartmentApiService);
  private readonly appointmentApi = inject(AppointmentApiService);
  private readonly visitApi = inject(VisitApiService);
  private readonly consultationApi = inject(ConsultationApiService);
  private readonly prescriptionApi = inject(PrescriptionApiService);
  private readonly billingApi = inject(BillingApiService);
  private readonly dashboardApi = inject(DashboardApiService);

  getHospitalSettings = () => this.departmentApi.getHospitalSettings();
  updateHospitalSettings = (payload: Partial<HospitalSettingDto>) => this.departmentApi.updateHospitalSettings(payload);
  getDepartments = (isActive?: boolean, search?: string) => this.departmentApi.getAll(isActive, search);
  createDepartment = (payload: Record<string, unknown>) => this.departmentApi.create(payload);
  updateDepartment = (id: number, payload: Record<string, unknown>) => this.departmentApi.update(id, payload);

  getUsers = (q: { page?: number; pageSize?: number; search?: string; role?: string; isActive?: boolean }) => this.authApi.getUsers(q);
  createUser = (payload: Record<string, unknown>) => this.authApi.createUser(payload);
  updateUser = (id: number, payload: Record<string, unknown>) => this.authApi.updateUser(id, payload);

  getDoctors = (q: { page?: number; pageSize?: number; search?: string; departmentId?: number; isActive?: boolean; onlineOnly?: boolean }) => this.doctorApi.getDoctors(q);
  getDoctorById = (id: number) => this.doctorApi.getById(id);
  createDoctor = (payload: Record<string, unknown>) => this.doctorApi.create(payload);
  updateDoctor = (id: number, payload: Record<string, unknown>) => this.doctorApi.update(id, payload);
  getDoctorSlots = (doctorId: number, date: string) => this.doctorApi.getAvailableSlots(doctorId, date);
  getSchedules = (doctorId?: number) => this.doctorApi.getSchedules(doctorId);
  createSchedule = (payload: Record<string, unknown>) => this.doctorApi.createSchedule(payload);
  deleteSchedule = (id: number) => this.doctorApi.deleteSchedule(id);

  getPatients = (q: { page?: number; pageSize?: number; search?: string; sortBy?: string; sortDirection?: string }) => this.patientApi.getPatients(q);
  getMyPatientProfile = () => this.patientApi.getMyProfile();
  getPatientById = (id: number) => this.patientApi.getById(id);
  createPatient = (payload: Record<string, unknown>) => this.patientApi.create(payload);
  updatePatient = (id: number, payload: Record<string, unknown>) => this.patientApi.update(id, payload);

  getAppointments = (q: { page?: number; pageSize?: number; search?: string; date?: string; doctorId?: number; departmentId?: number; patientId?: number; status?: string }) => this.appointmentApi.getAppointments(q);
  bookAppointment = (payload: Record<string, unknown>) => this.appointmentApi.book(payload);
  confirmAppointment = (id: number) => this.appointmentApi.confirm(id);
  cancelAppointment = (id: number, reason: string) => this.appointmentApi.cancel(id, reason);
  markNoShow = (id: number) => this.appointmentApi.markNoShow(id);

  getVisits = (q: { page?: number; pageSize?: number; search?: string; date?: string; doctorId?: number; departmentId?: number; patientId?: number; status?: string }) => this.visitApi.getVisits(q);
  getDoctorQueue = (doctorId?: number, date?: string) => this.visitApi.getQueue(doctorId, date);
  checkInAppointment = (appointmentId: number, chiefComplaint?: string, notes?: string) => this.visitApi.checkInAppointment(appointmentId, chiefComplaint, notes);
  checkInWalkIn = (payload: { patientId: number; doctorId: number; departmentId: number; chiefComplaint?: string; notes?: string }) => this.visitApi.checkInWalkIn(payload);
  updateVisitStatus = (id: number, status: string, reason?: string, notes?: string) => this.visitApi.updateStatus(id, status, reason, notes);
  checkOutVisit = (id: number, notes?: string) => this.visitApi.checkOut(id, notes);

  getConsultations = (q: { page?: number; pageSize?: number; search?: string; doctorId?: number; patientId?: number }) => this.consultationApi.getConsultations(q);
  getConsultationById = (id: number) => this.consultationApi.getById(id);
  getConsultationByVisitId = (visitId: number) => this.consultationApi.getByVisitId(visitId);
  startConsultation = (visitId: number) => this.consultationApi.start(visitId);
  saveConsultation = (id: number, payload: Record<string, unknown>) => this.consultationApi.save(id, payload);
  completeConsultation = (id: number, payload?: Record<string, unknown>) => this.consultationApi.complete(id, payload);

  savePrescription = (payload: Record<string, unknown>) => this.prescriptionApi.save(payload);
  getPrescriptions = (q: { page?: number; pageSize?: number; search?: string; patientId?: number; doctorId?: number }) => this.prescriptionApi.getPrescriptions(q);

  getBills = (q: { page?: number; pageSize?: number; search?: string; patientId?: number; status?: string; fromDate?: string; toDate?: string }) => this.billingApi.getBills(q);
  getBillByVisitId = (visitId: number) => this.billingApi.getBillByVisitId(visitId);
  generateBill = (payload: Record<string, unknown>) => this.billingApi.generateBill(payload);
  recordPayment = (payload: Record<string, unknown>) => this.billingApi.recordPayment(payload);
  getPayments = (q: { page?: number; pageSize?: number; search?: string; patientId?: number; method?: string; fromDate?: string; toDate?: string }) => this.billingApi.getPayments(q);

  getDashboard = (date?: string) => this.dashboardApi.getDashboard(date);
  getBillingReport = (fromDate?: string, toDate?: string) => this.dashboardApi.getBillingReport(fromDate, toDate);
  getAuditLogs = (q: { page?: number; pageSize?: number; search?: string; action?: string; entityName?: string }) => this.dashboardApi.getAuditLogs(q);
  getNotifications = (q: { page?: number; pageSize?: number; unreadOnly?: boolean }) => this.dashboardApi.getNotifications(q);
  markNotificationRead = (id: number) => this.dashboardApi.markNotificationRead(id);
  markAllNotificationsRead = () => this.dashboardApi.markAllNotificationsRead();
}
