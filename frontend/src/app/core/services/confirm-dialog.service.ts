import { Injectable, signal } from '@angular/core';
import { IconName } from '../../shared/components/icon/icon.component';

export interface ConfirmModalOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary' | 'success';
  icon?: IconName;
}

interface ConfirmState {
  isOpen: boolean;
  options: ConfirmModalOptions;
  resolve?: (value: boolean) => void;
}

@Injectable({
  providedIn: 'root'
})
export class ConfirmDialogService {
  state = signal<ConfirmState>({
    isOpen: false,
    options: {
      title: '',
      message: ''
    }
  });

  /**
   * Ouvre une modale de confirmation moderne et retourne une promesse avec le choix de l'utilisateur
   */
  confirm(options: ConfirmModalOptions): Promise<boolean> {
    return new Promise(resolve => {
      this.state.set({
        isOpen: true,
        options: {
          confirmText: 'Confirmer',
          cancelText: 'Annuler',
          variant: 'primary',
          icon: 'help-circle',
          ...options
        },
        resolve
      });
    });
  }

  handleConfirm(): void {
    const current = this.state();
    if (current.resolve) {
      current.resolve(true);
    }
    this.close();
  }

  handleCancel(): void {
    const current = this.state();
    if (current.resolve) {
      current.resolve(false);
    }
    this.close();
  }

  private close(): void {
    this.state.set({
      isOpen: false,
      options: {
        title: '',
        message: ''
      }
    });
  }
}
