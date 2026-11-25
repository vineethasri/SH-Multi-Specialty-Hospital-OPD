import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { DepartmentDto, DoctorDto, PatientDto } from '../../../core/models/hospital.models';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { DataTableShellComponent } from '../../../shared/components/data-table/data-table.component';
import { extractApiError } from '../../../core/interceptors/auth.interceptor';
import { formatIsoDate } from '../../../core/services/http-params.util';
import { BLOOD_GROUPS, COUNTRY_CODES, formatPhoneWithCode } from '../../../core/constants/form-options';

@Component({
  selector: 'app-reception-patients',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatDatepickerModule, PageHeaderComponent, DataTableShellComponent],
  template: `
    <app-page-header title="Patient Search &amp; Walk-In Registration" subtitle="Search existing patients, register new patients, and issue walk-in OPD queue tokens">
      <button mat-flat-button class="sh-btn-teal" (click)="showRegister.set(!showRegister())">
        <mat-icon>{{ showRegister() ? 'close' : 'person_add' }}</mat-icon>
        {{ showRegister() ? 'Close Registration' : 'New Patient Registration' }}
      </button>
    </app-page-header>

    @if (showRegister()) {
      <div class="sh-card form-card">
        <h3>Register New / Walk-In Patient</h3>
        <form [formGroup]="regForm" (ngSubmit)="registerPatient()">
          <div class="sh-grid-3">
            <mat-form-field appearance="outline"><mat-label>First Name</mat-label><input matInput formControlName="firstName" /></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Last Name</mat-label><input matInput formControlName="lastName" /></mat-form-field>
            <div class="phone-group">
              <mat-form-field appearance="outline" class="code-field">
                <mat-label>Code</mat-label>
                <mat-select formControlName="countryCode">
                  @for (c of countryCodes; track c.code + c.iso) {
                    <mat-option [value]="c.code">{{ c.code }} ({{ c.iso }})</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline" class="num-field">
                <mat-label>Phone Number</mat-label>
                <input matInput formControlName="phoneNumber" />
              </mat-form-field>
            </div>
            <mat-form-field appearance="outline">
              <mat-label>Date of Birth</mat-label>
              <input matInput [matDatepicker]="recDob" [max]="maxDate" formControlName="dateOfBirth" />
              <mat-datepicker-toggle matIconSuffix [for]="recDob" />
              <mat-datepicker #recDob startView="multi-year" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Gender</mat-label>
              <mat-select formControlName="gender">
                <mat-option value="Male">Male</mat-option>
                <mat-option value="Female">Female</mat-option>
                <mat-option value="Other">Other</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Blood Group</mat-label>
              <mat-select formControlName="bloodGroup">
                <mat-option value="">Not Known</mat-option>
                @for (bg of bloodGroups; track bg) {
                  <mat-option [value]="bg">{{ bg }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Email (Optional)</mat-label><input matInput type="email" formControlName="email" /></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>City</mat-label><input matInput formControlName="city" /></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Allergies</mat-label><input matInput formControlName="allergies" /></mat-form-field>
          </div>
          <div style="display:flex;justify-content:flex-end;gap:10px;">
            <button mat-button type="button" (click)="showRegister.set(false)">Cancel</button>
            <button mat-flat-button class="sh-btn-teal" type="submit" [disabled]="saving() || regForm.invalid">
              {{ saving() ? 'Saving...' : 'Save Patient Record' }}
            </button>
          </div>
        </form>
      </div>
    }

    @if (walkInPatient(); as wp) {
      <div class="sh-card form-card" style="background:#f0fdfa; border-color:#99f6e4;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <h3 style="margin:0;">Walk-In Check-In &amp; Token Generation &mdash; {{ wp.fullName }} ({{ wp.patientCode }})</h3>
          <button mat-button (click)="walkInPatient.set(null)">Close</button>
        </div>
        <form [formGroup]="walkInForm" (ngSubmit)="submitWalkIn()">
          <div class="sh-grid-3">
            <mat-form-field appearance="outline">
              <mat-label>Department</mat-label>
              <mat-select formControlName="departmentId" (selectionChange)="onWalkInDeptChange()">
                @for (d of departments(); track d.id) {
                  <mat-option [value]="d.id">{{ d.name }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Doctor</mat-label>
              <mat-select formControlName="doctorId">
                @for (doc of filteredDoctors(); track doc.id) {
                  <mat-option [value]="doc.id">{{ doc.fullName }} ({{ doc.roomNumber }})</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Chief Complaint</mat-label>
              <input matInput formControlName="chiefComplaint" placeholder="Reason for walk-in" />
            </mat-form-field>
          </div>
          <div style="display:flex;justify-content:flex-end;">
            <button mat-flat-button class="sh-btn-primary" type="submit" [disabled]="saving() || walkInForm.invalid">
              Issue Walk-In Queue Token
            </button>
          </div>
        </form>
      </div>
    }

    <app-data-table-shell
      [loading]="loading()" [error]="error()" [totalCount]="totalCount()" [page]="page()" [pageSize]="15"
      [search]="search" searchPlaceholder="Search by patient name, code, or phone..."
      (searchChange)="search = $event; page.set(1); load()" (pageChange)="page.set($event); load()" (retry)="load()">
      <table class="sh-table">
        <thead><tr><th>Code</th><th>Patient</th><th>Age/Gender</th><th>Phone</th><th>City</th><th>Action</th></tr></thead>
        <tbody>
          @for (p of patients(); track p.id) {
            <tr>
              <td><code>{{ p.patientCode }}</code></td>
              <td><strong>{{ p.fullName }}</strong><br/><small style="color:#64748b;">{{ p.email || 'Walk-in profile' }}</small></td>
              <td>{{ p.age }}y / {{ p.gender }}</td>
              <td>{{ p.phoneNumber }}</td>
              <td>{{ p.city || '-' }}</td>
              <td>
                <button mat-flat-button class="sh-btn-teal" (click)="openWalkIn(p)">Walk-In Check-In</button>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </app-data-table-shell>
  `,
  styles: [`
    .form-card { padding: 20px; margin-bottom: 18px; }
    .form-card h3 { margin: 0 0 14px; color: var(--sh-navy); }
    .phone-group { display: flex; gap: 8px; }
    .code-field { width: 118px; flex-shrink: 0; }
    .num-field { flex: 1; }
  `]
})
export class ReceptionPatientsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly patients = signal<PatientDto[]>([]);
  readonly totalCount = signal(0);
  readonly page = signal(1);
  readonly showRegister = signal(false);
  readonly walkInPatient = signal<PatientDto | null>(null);
  readonly departments = signal<DepartmentDto[]>([]);
  readonly allDoctors = signal<DoctorDto[]>([]);
  readonly filteredDoctors = signal<DoctorDto[]>([]);
  readonly maxDate = new Date();
  readonly bloodGroups = BLOOD_GROUPS;
  readonly countryCodes = COUNTRY_CODES;
  search = '';

  readonly regForm = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    countryCode: ['+91', Validators.required],
    phoneNumber: ['', Validators.required],
    dateOfBirth: [null as Date | null, Validators.required],
    gender: ['Male', Validators.required],
    bloodGroup: [''],
    email: [''],
    city: ['Bengaluru'],
    allergies: ['']
  });

  readonly walkInForm = this.fb.nonNullable.group({
    departmentId: [0, [Validators.required, Validators.min(1)]],
    doctorId: [0, [Validators.required, Validators.min(1)]],
    chiefComplaint: ['', Validators.required]
  });

  ngOnInit(): void {
    this.api.getDepartments(true).subscribe({ next: (d) => this.departments.set(d) });
    this.api.getDoctors({ isActive: true, page: 1, pageSize: 100 }).subscribe({ next: (r) => this.allDoctors.set(r.items) });
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.api.getPatients({ page: this.page(), pageSize: 15, search: this.search }).subscribe({
      next: (r) => { this.patients.set(r.items); this.totalCount.set(r.totalCount); this.loading.set(false); },
      error: (err) => { this.error.set(extractApiError(err)); this.loading.set(false); }
    });
  }

  registerPatient(): void {
    if (this.regForm.invalid) return;
    this.saving.set(true);
    const raw = this.regForm.getRawValue();
    this.api.createPatient({
      firstName: raw.firstName,
      lastName: raw.lastName,
      phoneNumber: formatPhoneWithCode(raw.countryCode || '+91', raw.phoneNumber || ''),
      dateOfBirth: formatIsoDate(raw.dateOfBirth),
      gender: raw.gender,
      bloodGroup: raw.bloodGroup,
      email: raw.email,
      city: raw.city,
      allergies: raw.allergies
    }).subscribe({
      next: (p) => {
        this.saving.set(false);
        this.toast.success(`Registered ${p.fullName} (${p.patientCode})`);
        this.showRegister.set(false);
        this.regForm.reset({ countryCode: '+91', gender: 'Male', city: 'Bengaluru', bloodGroup: '' });
        this.load();
        this.openWalkIn(p);
      },
      error: (err) => { this.saving.set(false); this.toast.error(extractApiError(err)); }
    });
  }

  openWalkIn(p: PatientDto): void {
    this.walkInPatient.set(p);
    const deptId = this.departments()[0]?.id ?? 1;
    this.walkInForm.patchValue({ departmentId: deptId, chiefComplaint: '' });
    this.onWalkInDeptChange();
  }

  onWalkInDeptChange(): void {
    const deptId = this.walkInForm.value.departmentId;
    const docs = this.allDoctors().filter((d) => d.departmentId === deptId);
    this.filteredDoctors.set(docs);
    this.walkInForm.patchValue({ doctorId: docs[0]?.id ?? 0 });
  }

  submitWalkIn(): void {
    const wp = this.walkInPatient();
    if (!wp || this.walkInForm.invalid) return;
    this.saving.set(true);
    const val = this.walkInForm.getRawValue();
    this.api.checkInWalkIn({ patientId: wp.id, ...val }).subscribe({
      next: (visit) => {
        this.saving.set(false);
        this.toast.success(`Walk-in checked in! Token ${visit.tokenDisplay} (${visit.visitNumber})`);
        this.walkInPatient.set(null);
      },
      error: (err) => { this.saving.set(false); this.toast.error(extractApiError(err)); }
    });
  }
}
