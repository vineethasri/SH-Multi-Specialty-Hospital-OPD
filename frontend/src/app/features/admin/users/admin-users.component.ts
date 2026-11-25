import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { UserDto } from '../../../core/models/hospital.models';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { DataTableShellComponent } from '../../../shared/components/data-table/data-table.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { extractApiError } from '../../../core/interceptors/auth.interceptor';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatSlideToggleModule,
    PageHeaderComponent, DataTableShellComponent, StatusBadgeComponent
  ],
  template: `
    <app-page-header title="User, Role &amp; Receptionist Management" subtitle="Manage staff accounts, roles, and active status">
      <button mat-flat-button class="sh-btn-primary" (click)="toggleCreate()">
        <mat-icon>{{ showForm() ? 'close' : 'person_add' }}</mat-icon>
        {{ showForm() ? 'Close Form' : 'Add Staff User' }}
      </button>
    </app-page-header>

    @if (showForm()) {
      <div class="sh-card form-card">
        <h3>{{ editingUser() ? 'Edit User: ' + editingUser()!.email : 'Create New User / Receptionist' }}</h3>
        <form [formGroup]="form" (ngSubmit)="saveUser()">
          <div class="sh-grid-3">
            <mat-form-field appearance="outline"><mat-label>Full Name</mat-label><input matInput formControlName="fullName" /></mat-form-field>
            @if (!editingUser()) {
              <mat-form-field appearance="outline"><mat-label>Email</mat-label><input matInput type="email" formControlName="email" /></mat-form-field>
            }
            <mat-form-field appearance="outline"><mat-label>Phone Number</mat-label><input matInput formControlName="phoneNumber" /></mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Role</mat-label>
              <mat-select formControlName="roleName">
                <mat-option value="Admin">Admin</mat-option>
                <mat-option value="Receptionist">Receptionist</mat-option>
                <mat-option value="Patient">Patient</mat-option>
              </mat-select>
            </mat-form-field>
            @if (!editingUser()) {
              <mat-form-field appearance="outline"><mat-label>Password</mat-label><input matInput type="password" formControlName="password" /></mat-form-field>
            } @else {
              <div style="display:flex;align-items:center;padding:8px 0;">
                <mat-slide-toggle formControlName="isActive">Account Active</mat-slide-toggle>
              </div>
            }
          </div>
          <div style="display:flex;justify-content:flex-end;gap:10px;">
            <button mat-button type="button" (click)="cancelForm()">Cancel</button>
            <button mat-flat-button class="sh-btn-teal" type="submit" [disabled]="saving() || form.invalid">
              {{ saving() ? 'Saving...' : 'Save User' }}
            </button>
          </div>
        </form>
      </div>
    }

    <app-data-table-shell
      [loading]="loading()"
      [error]="error()"
      [totalCount]="totalCount()"
      [page]="page()"
      [pageSize]="15"
      [search]="search"
      searchPlaceholder="Search by name, email, phone..."
      (searchChange)="search = $event; page.set(1); load()"
      (pageChange)="page.set($event); load()"
      (retry)="load()">
      <ng-container filters>
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>Role</mat-label>
          <mat-select [(ngModel)]="roleFilter" (ngModelChange)="page.set(1); load()">
            <mat-option value="">All Roles</mat-option>
            <mat-option value="Admin">Admin</mat-option>
            <mat-option value="Receptionist">Receptionist</mat-option>
            <mat-option value="Doctor">Doctor</mat-option>
            <mat-option value="Patient">Patient</mat-option>
          </mat-select>
        </mat-form-field>
      </ng-container>

      <table class="sh-table">
        <thead>
          <tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Status</th><th>Last Login</th><th>Actions</th></tr>
        </thead>
        <tbody>
          @for (u of users(); track u.id) {
            <tr>
              <td><strong>{{ u.fullName }}</strong></td>
              <td>{{ u.email }}</td>
              <td>{{ u.phoneNumber }}</td>
              <td>{{ u.role }}</td>
              <td><app-status-badge [status]="u.isActive ? 'Active' : 'Inactive'" /></td>
              <td>{{ u.lastLoginAt ? (u.lastLoginAt | date:'short') : 'Never' }}</td>
              <td>
                <button mat-stroked-button (click)="startEdit(u)">Edit</button>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </app-data-table-shell>
  `,
  styles: [`.form-card { padding: 20px; margin-bottom: 18px; } .form-card h3 { margin: 0 0 14px; color: var(--sh-navy); }`]
})
export class AdminUsersComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly users = signal<UserDto[]>([]);
  readonly totalCount = signal(0);
  readonly page = signal(1);
  readonly showForm = signal(false);
  readonly editingUser = signal<UserDto | null>(null);

  search = '';
  roleFilter = '';

  readonly form = this.fb.nonNullable.group({
    fullName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phoneNumber: ['', Validators.required],
    roleName: ['Receptionist', Validators.required],
    password: ['Reception@123', Validators.minLength(6)],
    isActive: [true]
  });

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.getUsers({ page: this.page(), pageSize: 15, search: this.search, role: this.roleFilter }).subscribe({
      next: (res) => { this.users.set(res.items); this.totalCount.set(res.totalCount); this.loading.set(false); },
      error: (err) => { this.error.set(extractApiError(err)); this.loading.set(false); }
    });
  }

  toggleCreate(): void {
    if (this.showForm()) { this.cancelForm(); return; }
    this.editingUser.set(null);
    this.form.reset({ fullName: '', email: '', phoneNumber: '', roleName: 'Receptionist', password: '', isActive: true });
    this.form.controls.email.setValidators([Validators.required, Validators.email]);
    this.form.controls.password.setValidators([Validators.required, Validators.minLength(8)]);
    this.form.updateValueAndValidity();
    this.showForm.set(true);
  }

  startEdit(u: UserDto): void {
    this.editingUser.set(u);
    this.form.controls.email.clearValidators();
    this.form.controls.password.clearValidators();
    this.form.patchValue({ fullName: u.fullName, email: u.email, phoneNumber: u.phoneNumber, roleName: u.role, password: 'unchanged', isActive: u.isActive });
    this.form.updateValueAndValidity();
    this.showForm.set(true);
  }

  cancelForm(): void {
    this.showForm.set(false);
    this.editingUser.set(null);
  }

  saveUser(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    const val = this.form.getRawValue();
    const editing = this.editingUser();

    const obs = editing
      ? this.api.updateUser(editing.id, { fullName: val.fullName, phoneNumber: val.phoneNumber, roleName: val.roleName, isActive: val.isActive })
      : this.api.createUser(val);

    obs.subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success(editing ? 'User updated.' : 'User created.');
        this.cancelForm();
        this.load();
      },
      error: (err) => { this.saving.set(false); this.toast.error(extractApiError(err)); }
    });
  }
}
