import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { DepartmentDto } from '../../../core/models/hospital.models';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { DataTableShellComponent } from '../../../shared/components/data-table/data-table.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { extractApiError } from '../../../core/interceptors/auth.interceptor';

@Component({
  selector: 'app-admin-departments',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatSlideToggleModule,
    PageHeaderComponent, DataTableShellComponent, StatusBadgeComponent
  ],
  template: `
    <app-page-header title="Department Management" subtitle="Configure clinical departments, floor locations, and default consultation fees">
      <button mat-flat-button class="sh-btn-primary" (click)="openCreate()">
        <mat-icon>add</mat-icon> Add Department
      </button>
    </app-page-header>

    @if (showForm()) {
      <div class="sh-card form-card">
        <h3>{{ editing() ? 'Edit Department: ' + editing()!.name : 'New Department' }}</h3>
        <form [formGroup]="form" (ngSubmit)="save()">
          <div class="sh-grid-4">
            <mat-form-field appearance="outline"><mat-label>Code</mat-label><input matInput formControlName="code" /></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Name</mat-label><input matInput formControlName="name" /></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Floor Location</mat-label><input matInput formControlName="floorLocation" /></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Default Fee (₹)</mat-label><input matInput type="number" formControlName="consultationFeeDefault" /></mat-form-field>
          </div>
          <mat-form-field appearance="outline" style="width:100%"><mat-label>Description</mat-label><textarea matInput rows="2" formControlName="description"></textarea></mat-form-field>
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <mat-slide-toggle formControlName="isActive">Active</mat-slide-toggle>
            <div style="display:flex;gap:10px;">
              <button mat-button type="button" (click)="showForm.set(false)">Cancel</button>
              <button mat-flat-button class="sh-btn-teal" type="submit" [disabled]="saving() || form.invalid">Save</button>
            </div>
          </div>
        </form>
      </div>
    }

    <app-data-table-shell
      [loading]="loading()"
      [error]="error()"
      [totalCount]="departments().length"
      [showPagination]="false"
      [search]="search"
      searchPlaceholder="Filter departments..."
      (searchChange)="search = $event; load()"
      (retry)="load()">
      <table class="sh-table">
        <thead>
          <tr><th>Code</th><th>Name</th><th>Floor</th><th>Default Fee</th><th>Active Doctors</th><th>Status</th><th>Action</th></tr>
        </thead>
        <tbody>
          @for (d of departments(); track d.id) {
            <tr>
              <td><code>{{ d.code }}</code></td>
              <td><strong>{{ d.name }}</strong><br/><small style="color:#64748b;">{{ d.description }}</small></td>
              <td>{{ d.floorLocation }}</td>
              <td>₹{{ d.consultationFeeDefault }}</td>
              <td>{{ d.activeDoctorsCount }}</td>
              <td><app-status-badge [status]="d.isActive ? 'Active' : 'Inactive'" /></td>
              <td><button mat-stroked-button (click)="openEdit(d)">Edit</button></td>
            </tr>
          }
        </tbody>
      </table>
    </app-data-table-shell>
  `,
  styles: [`.form-card { padding: 20px; margin-bottom: 18px; } .form-card h3 { margin: 0 0 14px; color: var(--sh-navy); }`]
})
export class AdminDepartmentsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly departments = signal<DepartmentDto[]>([]);
  readonly showForm = signal(false);
  readonly editing = signal<DepartmentDto | null>(null);
  search = '';

  readonly form = this.fb.nonNullable.group({
    code: ['', Validators.required],
    name: ['', Validators.required],
    floorLocation: ['', Validators.required],
    consultationFeeDefault: [500, Validators.min(0)],
    description: [''],
    isActive: [true]
  });

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.api.getDepartments(undefined, this.search).subscribe({
      next: (list) => { this.departments.set(list); this.loading.set(false); },
      error: (err) => { this.error.set(extractApiError(err)); this.loading.set(false); }
    });
  }

  openCreate(): void {
    this.editing.set(null);
    this.form.reset({ code: '', name: '', floorLocation: '', consultationFeeDefault: 500, description: '', isActive: true });
    this.showForm.set(true);
  }

  openEdit(d: DepartmentDto): void {
    this.editing.set(d);
    this.form.patchValue(d);
    this.showForm.set(true);
  }

  save(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    const ed = this.editing();
    const obs = ed ? this.api.updateDepartment(ed.id, this.form.getRawValue()) : this.api.createDepartment(this.form.getRawValue());
    obs.subscribe({
      next: () => { this.saving.set(false); this.toast.success('Department saved.'); this.showForm.set(false); this.load(); },
      error: (err) => { this.saving.set(false); this.toast.error(extractApiError(err)); }
    });
  }
}
