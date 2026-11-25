export type UserRole = 'Admin' | 'Receptionist' | 'Doctor' | 'Patient';

export interface PagedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

export interface UserInfo {
  id: number;
  fullName: string;
  email: string;
  phoneNumber: string;
  role: UserRole;
  patientId?: number | null;
  doctorId?: number | null;
  patientCode?: string | null;
  doctorCode?: string | null;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
  user: UserInfo;
}

export interface UserDto {
  id: number;
  fullName: string;
  email: string;
  phoneNumber: string;
  role: string;
  roleId: number;
  isActive: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
}

export interface DepartmentDto {
  id: number;
  code: string;
  name: string;
  description: string;
  floorLocation: string;
  consultationFeeDefault: number;
  isActive: boolean;
  activeDoctorsCount: number;
}

export interface HospitalSettingDto {
  id: number;
  hospitalName: string;
  tagline: string;
  phone: string;
  emergencyPhone: string;
  email: string;
  addressLine: string;
  city: string;
  state: string;
  postalCode: string;
  mapUrl: string;
  registrationFee: number;
  taxPercentage: number;
  currencyCode: string;
  opdStartTime: string;
  opdEndTime: string;
  defaultSlotMinutes: number;
  allowOnlineBooking: boolean;
  requireFullPaymentBeforeCheckout: boolean;
  updatedAt: string;
}

export interface DoctorScheduleDto {
  id: number;
  doctorId: number;
  doctorName: string;
  dayOfWeek: number;
  dayName: string;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
  maxPatientsPerSlot: number;
  isActive: boolean;
}

export interface DoctorDto {
  id: number;
  userId: number;
  departmentId: number;
  departmentName: string;
  doctorCode: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  specialization: string;
  qualification: string;
  registrationNumber: string;
  experienceYears: number;
  consultationFee: number;
  bio: string;
  roomNumber: string;
  averageConsultationMinutes: number;
  isAvailableForOnlineBooking: boolean;
  isActive: boolean;
  schedules: DoctorScheduleDto[];
}

export interface TimeSlotDto {
  startTime: string;
  endTime: string;
  label: string;
  isAvailable: boolean;
  remainingCapacity: number;
}

export interface PatientDto {
  id: number;
  userId?: number | null;
  patientCode: string;
  firstName: string;
  lastName: string;
  fullName: string;
  dateOfBirth: string;
  age: number;
  gender: string;
  bloodGroup?: string | null;
  phoneNumber: string;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  allergies?: string | null;
  chronicConditions?: string | null;
  createdAt: string;
}

export interface AppointmentDto {
  id: number;
  appointmentNumber: string;
  patientId: number;
  patientCode: string;
  patientName: string;
  patientPhone: string;
  doctorId: number;
  doctorCode: string;
  doctorName: string;
  departmentId: number;
  departmentName: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  bookingSource: string;
  status: string;
  reasonForVisit: string;
  cancellationReason?: string | null;
  visitId?: number | null;
  createdAt: string;
}

export interface VisitDto {
  id: number;
  visitNumber: string;
  appointmentId?: number | null;
  appointmentNumber?: string | null;
  patientId: number;
  patientCode: string;
  patientName: string;
  patientPhone: string;
  patientAge: number;
  patientGender: string;
  doctorId: number;
  doctorCode: string;
  doctorName: string;
  doctorRoomNumber: string;
  departmentId: number;
  departmentName: string;
  visitDate: string;
  visitType: string;
  tokenNumber: number;
  tokenDisplay: string;
  status: string;
  checkedInAt?: string | null;
  consultationStartedAt?: string | null;
  consultationCompletedAt?: string | null;
  checkedOutAt?: string | null;
  chiefComplaint?: string | null;
  notes?: string | null;
  consultationId?: number | null;
  billId?: number | null;
  billStatus?: string | null;
  billTotalAmount?: number | null;
  billBalanceAmount?: number | null;
}

export interface PrescriptionItemDto {
  id: number;
  medicineName: string;
  dosage: string;
  frequency: string;
  durationDays: number;
  route: string;
  timingInstruction?: string | null;
  quantity?: number | null;
  notes?: string | null;
}

export interface PrescriptionDto {
  id: number;
  prescriptionNumber: string;
  consultationId: number;
  visitId: number;
  visitNumber: string;
  doctorId: number;
  doctorName: string;
  doctorRegistrationNumber: string;
  departmentName: string;
  patientId: number;
  patientCode: string;
  patientName: string;
  patientAge: number;
  patientGender: string;
  diagnosis: string;
  generalInstructions?: string | null;
  issuedAt: string;
  items: PrescriptionItemDto[];
}

export interface ConsultationDto {
  id: number;
  visitId: number;
  visitNumber: string;
  tokenDisplay: string;
  doctorId: number;
  doctorName: string;
  departmentName: string;
  patientId: number;
  patientCode: string;
  patientName: string;
  patientAge: number;
  patientGender: string;
  allergies?: string | null;
  chronicConditions?: string | null;
  status: string;
  symptoms: string;
  bloodPressure?: string | null;
  temperatureCelsius?: number | null;
  pulseRate?: number | null;
  respiratoryRate?: number | null;
  spO2?: number | null;
  weightKg?: number | null;
  heightCm?: number | null;
  clinicalExamination?: string | null;
  diagnosis: string;
  icdCode?: string | null;
  consultationNotes?: string | null;
  followUpInstructions?: string | null;
  recommendedFollowUpDate?: string | null;
  startedAt: string;
  completedAt?: string | null;
  prescription?: PrescriptionDto | null;
}

export interface BillItemDto {
  id: number;
  serviceCode: string;
  description: string;
  category: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface PaymentDto {
  id: number;
  receiptNumber: string;
  billId: number;
  billNumber: string;
  patientId: number;
  patientName: string;
  patientCode: string;
  amount: number;
  method: string;
  status: string;
  transactionReference?: string | null;
  paidAt: string;
  notes?: string | null;
}

export interface BillDto {
  id: number;
  billNumber: string;
  visitId: number;
  visitNumber: string;
  visitStatus: string;
  patientId: number;
  patientCode: string;
  patientName: string;
  patientPhone: string;
  doctorName: string;
  departmentName: string;
  subTotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  status: string;
  notes?: string | null;
  issuedAt: string;
  items: BillItemDto[];
  payments: PaymentDto[];
}

export interface NotificationDto {
  id: number;
  title: string;
  message: string;
  type: string;
  relatedEntityType?: string | null;
  relatedEntityId?: number | null;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
}

export interface AuditLogDto {
  id: number;
  userId?: number | null;
  userEmail?: string | null;
  userRole?: string | null;
  action: string;
  entityName: string;
  entityId?: string | null;
  details?: string | null;
  ipAddress?: string | null;
  timestamp: string;
}

export interface DepartmentStatDto {
  departmentId: number;
  departmentName: string;
  patientVisitsCount: number;
  appointmentsCount: number;
  revenue: number;
}

export interface DoctorStatDto {
  doctorId: number;
  doctorName: string;
  departmentName: string;
  totalAppointments: number;
  waitingCount: number;
  completedConsultations: number;
}

export interface DailyTrendDto {
  date: string;
  label: string;
  appointmentsCount: number;
  visitsCount: number;
  revenue: number;
}

export interface DashboardAnalyticsDto {
  totalRegisteredPatients: number;
  todayAppointments: number;
  todayCheckIns: number;
  patientsWaiting: number;
  patientsInConsultation: number;
  completedConsultations: number;
  checkedOutPatients: number;
  pendingBillsCount: number;
  pendingBillsAmount: number;
  todayRevenue: number;
  monthRevenue: number;
  totalRevenue: number;
  departmentStats: DepartmentStatDto[];
  doctorStats: DoctorStatDto[];
  last7DaysTrend: DailyTrendDto[];
}

export interface BillingReportSummaryDto {
  fromDate: string;
  toDate: string;
  totalBills: number;
  totalBilledAmount: number;
  totalCollectedAmount: number;
  totalPendingAmount: number;
  revenueByPaymentMethod: Record<string, number>;
  departmentBreakdown: DepartmentStatDto[];
}
