import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-data-table-shell',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="sh-card table-card">
      <div class="table-toolbar">
        <div class="search-box">
          @if (showSearch()) {
            <mat-form-field appearance="outline" subscriptSizing="dynamic" class="search-field">
              <mat-icon matPrefix>search</mat-icon>
              <input matInput [placeholder]="searchPlaceholder()" [ngModel]="search()" (ngModelChange)="onSearchInput($event)" />
              @if (search()) {
                <button mat-icon-button matSuffix (click)="onSearchInput('')" aria-label="Clear search">
                  <mat-icon>close</mat-icon>
                </button>
              }
            </mat-form-field>
          }
          <ng-content select="[filters]" />
        </div>
        <div class="toolbar-actions">
          <ng-content select="[toolbarActions]" />
        </div>
      </div>

      @if (loading()) {
        <div class="sh-state-box">
          <mat-spinner diameter="32" />
          <span>Loading records...</span>
        </div>
      } @else if (error()) {
        <div class="sh-state-box error-box">
          <mat-icon color="warn">error_outline</mat-icon>
          <span>{{ error() }}</span>
          <button mat-stroked-button (click)="retry.emit()">Retry</button>
        </div>
      } @else if (totalCount() === 0) {
        <div class="sh-state-box">
          <mat-icon>inbox</mat-icon>
          <strong>{{ emptyTitle() }}</strong>
          <span>{{ emptySubtitle() }}</span>
        </div>
      } @else {
        <div class="sh-table-wrap">
          <ng-content />
        </div>

        @if (showPagination()) {
          <div class="pagination-bar">
            <span class="page-summary">
              Showing page {{ page() }} of {{ totalPages() }} ({{ totalCount() }} total)
            </span>
            <div class="page-buttons">
              <button mat-stroked-button [disabled]="page() <= 1" (click)="pageChange.emit(page() - 1)">
                <mat-icon>chevron_left</mat-icon> Prev
              </button>
              <button mat-stroked-button [disabled]="page() >= totalPages()" (click)="pageChange.emit(page() + 1)">
                Next <mat-icon>chevron_right</mat-icon>
              </button>
            </div>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .table-card { overflow: hidden; }
    .table-toolbar {
      padding: 14px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
      border-bottom: 1px solid var(--sh-border);
      background: #ffffff;
    }
    .search-box { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; flex: 1; }
    .search-field { min-width: 240px; max-width: 340px; width: 100%; }
    .toolbar-actions { display: flex; gap: 8px; align-items: center; }
    .error-box { color: var(--sh-danger); }
    .pagination-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 16px;
      border-top: 1px solid var(--sh-border);
      font-size: 13px;
      color: var(--sh-text-muted);
      background: #fafafa;
      flex-wrap: wrap;
      gap: 10px;
    }
    .page-buttons { display: flex; gap: 8px; }
  `]
})
export class DataTableShellComponent {
  showSearch = input<boolean>(true);
  search = input<string>('');
  searchPlaceholder = input<string>('Search...');
  loading = input<boolean>(false);
  error = input<string | null>(null);
  totalCount = input<number>(0);
  page = input<number>(1);
  pageSize = input<number>(15);
  showPagination = input<boolean>(true);
  emptyTitle = input<string>('No records found');
  emptySubtitle = input<string>('Try adjusting your search or filter criteria.');

  searchChange = output<string>();
  pageChange = output<number>();
  retry = output<void>();

  totalPages(): number {
    return Math.max(1, Math.ceil(this.totalCount() / Math.max(1, this.pageSize())));
  }

  onSearchInput(val: string): void {
    this.searchChange.emit(val);
  }
}
