import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTabsModule } from '@angular/material/tabs';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConsultationDto } from '../../../core/models/hospital.models';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { extractApiError } from '../../../core/interceptors/auth.interceptor';

@Component({
  selector: 'app-doctor-consultation',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatTabsModule, PageHeaderComponent, StatusBadgeComponent],
  template: `
    <app-page-header
      [title]="'Consultation: ' + (consultation()?.patientName || 'Loading...')"
      [subtitle]="consultation() ? (consultation()!.visitNumber + ' • Token ' + consultation()!.tokenDisplay + ' • ' + consultation()!.patientCode) : ''">
      <button mat-stroked-button (click)="router.navigate(['/doctor/queue'])">Back to Queue</button>
    </app-page-header>

    @if (loading()) {
      <div class="sh-card sh-state-box">Loading clinical consultation...</div>
    } @else if (consultation(); as c) {
      <div class="sh-card patient-banner">
        <div>
          <strong>{{ c.patientName }}</strong> ({{ c.patientAge }}y / {{ c.patientGender }}) &bull; <code>{{ c.patientCode }}</code>
          <div class="alerts">
            <span><strong>Allergies:</strong> {{ c.allergies || 'None reported' }}</span> &bull;
            <span><strong>Chronic Conditions:</strong> {{ c.chronicConditions || 'None reported' }}</span>
          </div>
        </div>
        <app-status-badge [status]="c.status" />
      </div>

      <mat-tab-group class="sh-card" style="padding: 12px 18px;">
        <mat-tab label="Clinical Notes &amp; Vitals">
          <form [formGroup]="consultForm" style="padding-top:16px;">
            <h4 class="sec-title">Vital Signs</h4>
            <div class="sh-grid-4">
              <mat-form-field appearance="outline"><mat-label>Blood Pressure</mat-label><input matInput formControlName="bloodPressure" placeholder="120/80 mmHg" /></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Temp (°C)</mat-label><input matInput type="number" step="0.1" formControlName="temperatureCelsius" /></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Pulse (bpm)</mat-label><input matInput type="number" formControlName="pulseRate" /></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>SpO2 (%)</mat-label><input matInput type="number" formControlName="spO2" /></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Resp Rate</mat-label><input matInput type="number" formControlName="respiratoryRate" /></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Weight (kg)</mat-label><input matInput type="number" step="0.1" formControlName="weightKg" /></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Height (cm)</mat-label><input matInput type="number" step="0.1" formControlName="heightCm" /></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Follow-Up Date</mat-label><input matInput type="date" formControlName="recommendedFollowUpDate" /></mat-form-field>
            </div>

            <h4 class="sec-title">Clinical Assessment</h4>
            <div class="sh-grid-2">
              <mat-form-field appearance="outline"><mat-label>Presenting Symptoms *</mat-label><textarea matInput rows="3" formControlName="symptoms"></textarea></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Clinical Examination</mat-label><textarea matInput rows="3" formControlName="clinicalExamination"></textarea></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Diagnosis *</mat-label><textarea matInput rows="2" formControlName="diagnosis"></textarea></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>ICD-10 Code (Optional)</mat-label><input matInput formControlName="icdCode" placeholder="e.g. J06.9" /></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Consultation Notes</mat-label><textarea matInput rows="2" formControlName="consultationNotes"></textarea></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Follow-Up Instructions</mat-label><textarea matInput rows="2" formControlName="followUpInstructions"></textarea></mat-form-field>
            </div>

            <div style="display:flex;justify-content:flex-end;gap:10px;padding-bottom:10px;">
              <button mat-stroked-button type="button" (click)="saveNotes()" [disabled]="saving() || consultForm.invalid">Save Draft</button>
              @if (c.status !== 'Completed') {
                <button mat-flat-button class="sh-btn-teal" type="button" (click)="completeConsult()" [disabled]="saving() || consultForm.invalid">
                  Complete Consultation &amp; Send to Billing
                </button>
              }
            </div>
          </form>
        </mat-tab>

        <mat-tab label="Digital Prescription">
          <form [formGroup]="rxForm" (ngSubmit)="savePrescription()" style="padding-top:16px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
              <h4 class="sec-title" style="margin:0;">Medications</h4>
              <button mat-stroked-button type="button" (click)="addRxItem()"><mat-icon>add</mat-icon> Add Medicine</button>
            </div>

            <div formArrayName="items" style="display:flex;flex-direction:column;gap:10px;">
              @for (ctrl of rxItems.controls; track $index; let i = $index) {
                <div [formGroupName]="i" class="rx-row">
                  <mat-form-field appearance="outline"><mat-label>Medicine Name</mat-label><input matInput formControlName="medicineName" /></mat-form-field>
                  <mat-form-field appearance="outline"><mat-label>Dosage</mat-label><input matInput formControlName="dosage" placeholder="500 mg" /></mat-form-field>
                  <mat-form-field appearance="outline"><mat-label>Frequency</mat-label><input matInput formControlName="frequency" placeholder="1-0-1" /></mat-form-field>
                  <mat-form-field appearance="outline"><mat-label>Days</mat-label><input matInput type="number" formControlName="durationDays" /></mat-form-field>
                  <mat-form-field appearance="outline"><mat-label>Timing</mat-label><input matInput formControlName="timingInstruction" placeholder="After food" /></mat-form-field>
                  <button mat-icon-button color="warn" type="button" (click)="rxItems.removeAt(i)" [disabled]="rxItems.length <= 1">
                    <mat-icon>delete</mat-icon>
                  </button>
                </div>
              }
            </div>

            <mat-form-field appearance="outline" style="width:100%;margin-top:12px;">
              <mat-label>General Dietary / Lifestyle Instructions</mat-label>
              <textarea matInput rows="2" formControlName="generalInstructions"></textarea>
            </mat-form-field>

            <div style="display:flex;justify-content:flex-end;padding-bottom:10px;">
              <button mat-flat-button class="sh-btn-primary" type="submit" [disabled]="saving() || rxForm.invalid">
                Save Prescription
              </button>
            </div>
          </form>
        </mat-tab>

        <mat-tab label="Patient Medical History ({{ history().length }})">
          <div style="padding-top:16px;">
            @if (history().length === 0) {
              <div class="sh-state-box">No prior consultation history found for this patient.</div>
            } @else {
              @for (h of history(); track h.id) {
                <div class="hist-card">
                  <div style="display:flex;justify-content:space-between;">
                    <strong>{{ h.startedAt | date:'mediumDate' }} &bull; {{ h.doctorName }} ({{ h.departmentName }})</strong>
                    <code>{{ h.visitNumber }}</code>
                  </div>
                  <p><strong>Diagnosis:</strong> {{ h.diagnosis || 'Pending' }} &bull; <strong>Symptoms:</strong> {{ h.symptoms }}</p>
                  @if (h.prescription) {
                    <div style="font-size:12.5px;color:var(--sh-text-muted);">
                      <strong>Rx {{ h.prescription.prescriptionNumber }}:</strong>
                      @for (item of h.prescription.items; track item.id) {
                        <span>{{ item.medicineName }} ({{ item.dosage }}, {{ item.frequency }} x {{ item.durationDays }}d); </span>
                      }
                    </div>
                  }
                </div>
              }
            }
          </div>
        </mat-tab>
      </mat-tab-group>
    }
  `,
  styles: [`
    .patient-banner { padding: 16px 20px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; background: #eff6ff; border-color: #bfdbfe; }
    .alerts { font-size: 13px; color: var(--sh-text-muted); margin-top: 4px; }
    .sec-title { margin: 8px 0 10px; font-size: 14px; font-weight: 700; color: var(--sh-navy); text-transform: uppercase; letter-spacing: 0.03em; }
    .rx-row { display: grid; grid-template-columns: 2fr 1fr 1fr 0.7fr 1.3fr auto; gap: 8px; align-items: center; }
    @media (max-width: 900px) { .rx-row { grid-template-columns: 1fr; } }
    .hist-card { padding: 12px 14px; border: 1px solid var(--sh-border); border-radius: 8px; margin-bottom: 10px; background: #fafafa; }
    .hist-card p { margin: 6px 0; font-size: 13.5px; }
  `]
})
export class DoctorConsultationComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  readonly router = inject(Router);
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly consultation = signal<ConsultationDto | null>(null);
  readonly history = signal<ConsultationDto[]>([]);

  readonly consultForm = this.fb.group({
    symptoms: ['', Validators.required],
    bloodPressure: [''],
    temperatureCelsius: [null as number | null],
    pulseRate: [null as number | null],
    respiratoryRate: [null as number | null],
    spO2: [null as number | null],
    weightKg: [null as number | null],
    heightCm: [null as number | null],
    clinicalExamination: [''],
    diagnosis: ['', Validators.required],
    icdCode: [''],
    consultationNotes: [''],
    followUpInstructions: [''],
    recommendedFollowUpDate: ['']
  });

  readonly rxForm = this.fb.group({
    generalInstructions: [''],
    items: this.fb.array([])
  });

  get rxItems(): FormArray {
    return this.rxForm.get('items') as FormArray;
  }

  ngOnInit(): void {
    const visitId = Number(this.route.snapshot.paramMap.get('visitId'));
    this.api.getConsultationByVisitId(visitId).subscribe({
      next: (c) => this.bindConsultation(c),
      error: () => {
        this.api.startConsultation(visitId).subscribe({
          next: (c) => this.bindConsultation(c),
          error: (err) => { this.toast.error(extractApiError(err)); this.loading.set(false); }
        });
      }
    });
  }

  private bindConsultation(c: ConsultationDto): void {
    this.consultation.set(c);
    this.consultForm.patchValue({
      symptoms: c.symptoms,
      bloodPressure: c.bloodPressure || '',
      temperatureCelsius: c.temperatureCelsius ?? null,
      pulseRate: c.pulseRate ?? null,
      respiratoryRate: c.respiratoryRate ?? null,
      spO2: c.spO2 ?? null,
      weightKg: c.weightKg ?? null,
      heightCm: c.heightCm ?? null,
      clinicalExamination: c.clinicalExamination || '',
      diagnosis: c.diagnosis || '',
      icdCode: c.icdCode || '',
      consultationNotes: c.consultationNotes || '',
      followUpInstructions: c.followUpInstructions || '',
      recommendedFollowUpDate: c.recommendedFollowUpDate || ''
    });

    this.rxItems.clear();
    if (c.prescription?.items?.length) {
      this.rxForm.patchValue({ generalInstructions: c.prescription.generalInstructions || '' });
      for (const item of c.prescription.items) {
        this.rxItems.push(this.createRxRow(item));
      }
    } else {
      this.addRxItem();
    }

    this.api.getConsultations({ patientId: c.patientId, page: 1, pageSize: 20 }).subscribe({
      next: (r) => this.history.set(r.items.filter((x) => x.id !== c.id))
    });
    this.loading.set(false);
  }

  createRxRow(initial?: Partial<{ medicineName: string; dosage: string; frequency: string; durationDays: number; timingInstruction: string | null }>) {
    return this.fb.group({
      medicineName: [initial?.medicineName || '', Validators.required],
      dosage: [initial?.dosage || '', Validators.required],
      frequency: [initial?.frequency || '1-0-1', Validators.required],
      durationDays: [initial?.durationDays || 5, [Validators.required, Validators.min(1)]],
      route: ['Oral'],
      timingInstruction: [initial?.timingInstruction || 'After food']
    });
  }

  addRxItem(): void {
    this.rxItems.push(this.createRxRow());
  }

  private cleanConsultPayload() {
    const raw = this.consultForm.getRawValue();
    return {
      ...raw,
      recommendedFollowUpDate: raw.recommendedFollowUpDate ? raw.recommendedFollowUpDate : null
    };
  }

  saveNotes(): void {
    const c = this.consultation();
    if (!c) return;
    this.saving.set(true);
    this.api.saveConsultation(c.id, this.cleanConsultPayload()).subscribe({
      next: (updated) => { this.saving.set(false); this.consultation.set(updated); this.toast.success('Consultation notes saved.'); },
      error: (err) => { this.saving.set(false); this.toast.error(extractApiError(err)); }
    });
  }

  completeConsult(): void {
    const c = this.consultation();
    if (!c || this.consultForm.invalid) return;
    this.saving.set(true);
    this.api.completeConsultation(c.id, this.cleanConsultPayload()).subscribe({
      next: (updated) => {
        this.saving.set(false);
        this.consultation.set(updated);
        this.toast.success('Consultation completed and sent to OPD billing.');
      },
      error: (err) => { this.saving.set(false); this.toast.error(extractApiError(err)); }
    });
  }

  savePrescription(): void {
    const c = this.consultation();
    if (!c || this.rxForm.invalid) return;
    this.saving.set(true);
    const val = this.rxForm.getRawValue();
    this.api.savePrescription({
      consultationId: c.id,
      generalInstructions: val.generalInstructions,
      items: val.items
    }).subscribe({
      next: (rx) => {
        this.saving.set(false);
        this.consultation.update((cur) => cur ? { ...cur, prescription: rx } : cur);
        this.toast.success(`Prescription ${rx.prescriptionNumber} saved.`);
      },
      error: (err) => { this.saving.set(false); this.toast.error(extractApiError(err)); }
    });
  }
}
