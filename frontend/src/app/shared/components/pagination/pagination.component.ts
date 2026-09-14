import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    @if (totalItems > 0) {
      <div class="pagination-bar animate-fade-in">
        <div class="page-info">
          Affichage de <strong>{{ startItem }}</strong> à <strong>{{ endItem }}</strong> sur <strong>{{ totalItems }}</strong> élément{{ totalItems > 1 ? 's' : '' }}
        </div>

        <div class="page-controls">
          <button 
            type="button" 
            class="page-btn nav-btn" 
            [disabled]="currentPage <= 1" 
            (click)="goToPage(currentPage - 1)">
            <app-icon name="arrow-left" [size]="12"></app-icon>
            <span class="hide-on-mobile">Précédent</span>
          </button>

          @for (page of visiblePages(); track page) {
            <button 
              type="button" 
              class="page-btn num-btn" 
              [class.active]="page === currentPage" 
              (click)="goToPage(page)">
              {{ page }}
            </button>
          }

          <button 
            type="button" 
            class="page-btn nav-btn" 
            [disabled]="currentPage >= totalPages" 
            (click)="goToPage(currentPage + 1)">
            <span class="hide-on-mobile">Suivant</span>
            <app-icon name="arrow-right" [size]="12"></app-icon>
          </button>
        </div>
      </div>
    }
  `,
  styles: [`
    .pagination-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      background: #FFFFFF;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      margin-top: 18px;
      flex-wrap: wrap;
      gap: 12px;
    }

    .page-info {
      font-size: 12px;
      color: var(--color-text-secondary);

      strong {
        color: var(--color-navy);
      }
    }

    .page-controls {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .page-btn {
      height: 28px;
      min-width: 28px;
      padding: 0 8px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--color-border);
      background: #FFFFFF;
      color: var(--color-navy);
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      transition: all 0.15s ease;

      &:hover:not(:disabled) {
        background: var(--color-navy-light);
        border-color: var(--color-navy);
      }

      &.active {
        background: var(--color-navy);
        color: #FFFFFF;
        border-color: var(--color-navy);
      }

      &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
    }
  `]
})
export class PaginationComponent {
  @Input() currentPage: number = 1;
  @Input() pageSize: number = 8;
  @Input() totalItems: number = 0;

  @Output() pageChange = new EventEmitter<number>();

  get totalPages(): number {
    return Math.ceil(this.totalItems / this.pageSize) || 1;
  }

  get startItem(): number {
    if (this.totalItems === 0) return 0;
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get endItem(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalItems);
  }

  visiblePages(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(this.totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.pageChange.emit(page);
    }
  }
}
