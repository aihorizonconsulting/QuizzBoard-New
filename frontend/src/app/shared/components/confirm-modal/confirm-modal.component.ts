import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-confirm-modal',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    @if (confirmService.state().isOpen) {
      <div class="modal-backdrop animate-fade-in" (click)="confirmService.handleCancel()">
        <div class="confirm-dialog-card card animate-scale-up" (click)="$event.stopPropagation()">
          <div class="confirm-header">
            <div class="confirm-icon-box" [ngClass]="'icon-' + (confirmService.state().options.variant || 'primary')">
              <app-icon 
                [name]="confirmService.state().options.icon || getDefaultIcon()" 
                [size]="22">
              </app-icon>
            </div>
            <div class="confirm-title-area">
              <h3 class="confirm-title">{{ confirmService.state().options.title }}</h3>
            </div>
          </div>

          <div class="confirm-body">
            <p class="confirm-message">{{ confirmService.state().options.message }}</p>
          </div>

          <div class="confirm-actions">
            <button 
              type="button" 
              class="btn btn-outline btn-cancel" 
              (click)="confirmService.handleCancel()">
              {{ confirmService.state().options.cancelText || 'Annuler' }}
            </button>
            <button 
              type="button" 
              class="btn btn-confirm" 
              [ngClass]="'btn-' + (confirmService.state().options.variant || 'primary')"
              (click)="confirmService.handleConfirm()">
              {{ confirmService.state().options.confirmText || 'Confirmer' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(3, 36, 71, 0.55);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      padding: 20px;
    }

    .confirm-dialog-card {
      width: 100%;
      max-width: 480px;
      background: #FFFFFF;
      border-radius: var(--radius-lg, 16px);
      box-shadow: 0 20px 40px -15px rgba(3, 36, 71, 0.35);
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      border: 1px solid rgba(226, 232, 240, 0.8);
      position: relative;
    }

    .confirm-header {
      display: flex;
      align-items: flex-start;
      gap: 14px;
    }

    .confirm-icon-box {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      &.icon-warning {
        background: #FEF3C7;
        color: #D97706;
      }
      &.icon-danger {
        background: #FEE2E2;
        color: #DC2626;
      }
      &.icon-primary {
        background: #E0E7FF;
        color: var(--color-navy, #032447);
      }
      &.icon-success {
        background: #DCFCE7;
        color: #16A34A;
      }
    }

    .confirm-title-area {
      flex: 1;
      padding-top: 2px;

      .confirm-title {
        font-size: 17px;
        font-weight: 800;
        color: var(--color-navy, #032447);
        margin: 0;
        line-height: 1.3;
      }
    }

    .confirm-body {
      padding-left: 58px;

      .confirm-message {
        font-size: 13.5px;
        line-height: 1.55;
        color: var(--color-text-secondary, #475569);
        margin: 0;
        white-space: pre-line;
      }
    }

    .confirm-actions {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 8px;
      padding-top: 14px;
      border-top: 1px solid #F1F5F9;

      .btn-cancel {
        min-width: 100px;
        font-weight: 600;
      }

      .btn-confirm {
        min-width: 120px;
        font-weight: 700;
        padding: 8px 18px;
        border-radius: var(--radius-sm, 8px);
        cursor: pointer;
        border: none;
        transition: all 0.15s ease;

        &.btn-primary {
          background: var(--color-primary, #FFC107);
          color: var(--color-navy, #032447);
          &:hover {
            background: #F0B800;
            transform: translateY(-1px);
          }
        }

        &.btn-warning {
          background: #F59E0B;
          color: #FFFFFF;
          &:hover {
            background: #D97706;
            transform: translateY(-1px);
          }
        }

        &.btn-danger {
          background: #EF4444;
          color: #FFFFFF;
          &:hover {
            background: #DC2626;
            transform: translateY(-1px);
          }
        }

        &.btn-success {
          background: #10B981;
          color: #FFFFFF;
          &:hover {
            background: #059669;
            transform: translateY(-1px);
          }
        }
      }
    }

    @media (max-width: 640px) {
      .confirm-body {
        padding-left: 0;
      }
      .confirm-actions {
        flex-direction: column-reverse;
        .btn-cancel, .btn-confirm {
          width: 100%;
        }
      }
    }
  `]
})
export class ConfirmModalComponent {
  public confirmService = inject(ConfirmDialogService);

  getDefaultIcon(): any {
    const variant = this.confirmService.state().options.variant;
    switch (variant) {
      case 'danger': return 'trash';
      case 'warning': return 'lock';
      case 'success': return 'check-circle';
      default: return 'help-circle';
    }
  }
}
