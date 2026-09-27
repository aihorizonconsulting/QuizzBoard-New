import { Component, inject } from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  template: `
    <div class="toast-stack" aria-live="polite">
      @for (toast of toastService.toasts(); track toast.id) {
        <div class="toast" [class]="'toast toast-' + toast.kind" role="status">
          <span class="toast-icon">{{ toast.kind === 'error' ? '!' : (toast.kind === 'success' ? '✓' : 'i') }}</span>
          <span class="toast-message">{{ toast.message }}</span>
          <button type="button" class="toast-close" (click)="toastService.dismiss(toast.id)" aria-label="Fermer">×</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-stack {
      position: fixed;
      top: 16px;
      right: 16px;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-width: min(420px, calc(100vw - 32px));
    }
    .toast {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 12px 14px;
      border-radius: 10px;
      background: var(--color-surface, #fff);
      border: 1px solid var(--color-border, #E2E8F0);
      box-shadow: 0 10px 30px rgba(15, 23, 42, 0.15);
      font-size: 14px;
      line-height: 1.4;
      color: var(--color-text-primary, #0F172A);
      animation: toastIn 0.2s ease-out;
    }
    .toast-error { border-left: 4px solid var(--color-danger, #DC2626); }
    .toast-success { border-left: 4px solid var(--color-success, #16A34A); }
    .toast-info { border-left: 4px solid var(--color-info, #2563EB); }
    .toast-icon {
      flex-shrink: 0;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 13px;
      color: #fff;
      background: var(--color-info, #2563EB);
    }
    .toast-error .toast-icon { background: var(--color-danger, #DC2626); }
    .toast-success .toast-icon { background: var(--color-success, #16A34A); }
    .toast-message { flex: 1; word-break: break-word; }
    .toast-close {
      border: none;
      background: transparent;
      font-size: 18px;
      line-height: 1;
      cursor: pointer;
      color: var(--color-text-secondary, #64748B);
    }
    @keyframes toastIn {
      from { opacity: 0; transform: translateY(-6px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class ToastContainerComponent {
  toastService = inject(ToastService);
}
