import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { extractFieldErrors, getGeneralErrorMessage } from '../../../../core/utils/form-error.util';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, IconComponent],
  template: `
    <div class="auth-page animate-fade-in">
      <div class="auth-card-container">
        <div class="card form-card">
          <!-- En-tête -->
          <div class="badge badge-navy" style="margin-bottom: 16px;">
            <app-icon name="lock" [size]="14" color="var(--color-navy)"></app-icon>
            <span>SÉCURITÉ DU COMPTE</span>
          </div>

          <h1 class="h2" style="margin-bottom: 8px;">Mot de passe oublié ?</h1>
          <p class="body-small" style="margin-bottom: 24px; color: var(--color-text-secondary);">
            Indiquez l'adresse email associée à votre compte QuizzBoard. Nous vous enverrons un lien sécurisé valable 15 minutes pour réinitialiser votre mot de passe.
          </p>

          <!-- Notification d'erreur générale -->
          @if (generalError) {
            <div class="alert-error animate-fade-in" style="margin-bottom: 16px; padding: 10px 14px; border-radius: 8px; background: #fee2e2; border: 1px solid #f87171; color: #991b1b; font-size: 13px; display: flex; align-items: center; gap: 8px;">
              <app-icon name="alert-circle" [size]="16" color="#991b1b"></app-icon>
              <span>{{ generalError }}</span>
            </div>
          }

          <!-- Notification de confirmation d'envoi -->
          @if (successMessage) {
            <div class="success-box animate-fade-in">
              <div class="icon-circle">
                <app-icon name="check-circle" [size]="36" color="#16A34A"></app-icon>
              </div>
              <h3 class="success-title">Email de réinitialisation envoyé !</h3>
              <p class="success-desc">
                {{ successMessage }}
              </p>
              <p class="body-small" style="color: var(--color-text-secondary); margin-top: 10px;">
                Vérifiez votre boîte de réception et vos courriers indésirables (spam).
              </p>

              <div style="margin-top: 24px;">
                <a routerLink="/connexion" class="btn btn-outline btn-full">
                  <app-icon name="arrow-left" [size]="15" color="var(--color-navy)"></app-icon>
                  <span>Retourner à la connexion</span>
                </a>
              </div>
            </div>
          } @else {
            <!-- Formulaire -->
            <form (ngSubmit)="submitForgotPassword()" class="clean-form">
              <div class="form-group">
                <label>Adresse email *</label>
                <input 
                  type="email" 
                  [(ngModel)]="email" 
                  name="email" 
                  class="input-field" 
                  [class.input-error]="fieldErrors['email']"
                  (input)="clearFieldError('email')"
                  placeholder="amadou.diallo@quizzboard.com" 
                  required>
                @if (fieldErrors['email']) {
                  <span class="field-error-msg animate-fade-in">
                    <app-icon name="alert-circle" [size]="12" color="#DC2626"></app-icon>
                    <span>{{ fieldErrors['email'] }}</span>
                  </span>
                }
              </div>

              <button 
                type="submit" 
                class="btn btn-primary btn-full btn-lg" 
                [disabled]="isLoading || !email.trim()"
                style="margin-top: 12px;">
                @if (isLoading) {
                  <span class="btn-spinner"></span>
                  <span>Envoi en cours...</span>
                } @else {
                  <app-icon name="file-text" [size]="16" color="var(--color-navy)"></app-icon>
                  <span>Envoyer le lien de réinitialisation</span>
                }
              </button>
            </form>

            <div class="auth-footer" style="margin-top: 24px; text-align: center;">
              <a routerLink="/connexion" class="back-link">
                <app-icon name="arrow-left" [size]="14" color="var(--color-navy)"></app-icon>
                <span>Retour à la page de connexion</span>
              </a>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-page {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: calc(100vh - 160px);
      padding: 40px 20px;
    }

    .auth-card-container {
      max-width: 480px;
      width: 100%;
    }

    .form-card {
      padding: 40px 32px;
      border-radius: 16px;
      background-color: #FFFFFF;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08);
      border: 1px solid var(--color-border);
    }

    .clean-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
      text-align: left;

      label {
        font-size: 13px;
        font-weight: 700;
        color: var(--color-navy);
      }
    }

    .input-field {
      width: 100%;
      height: 44px;
      padding: 0 14px;
      border-radius: 8px;
      border: 1.5px solid var(--color-border);
      font-size: 14px;
      color: var(--color-navy);
      transition: all 0.15s ease;

      &:focus {
        border-color: var(--color-primary);
        outline: none;
      }

      &.input-error {
        border-color: #DC2626 !important;
        background-color: #FEF2F2;
      }
    }

    .field-error-msg {
      display: flex;
      align-items: center;
      gap: 5px;
      color: #DC2626;
      font-size: 12px;
      font-weight: 600;
      margin-top: 3px;
    }

    .btn-full {
      width: 100%;
      justify-content: center;
    }

    .btn-spinner {
      width: 18px;
      height: 18px;
      border: 2px solid rgba(15, 23, 42, 0.2);
      border-top-color: var(--color-navy);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      display: inline-block;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .success-box {
      text-align: center;
      padding: 16px 0;
    }

    .icon-circle {
      width: 68px;
      height: 68px;
      border-radius: 50%;
      background-color: #DCFCE7;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 16px;
    }

    .success-title {
      font-size: 18px;
      font-weight: 800;
      color: var(--color-navy);
      margin: 0 0 8px 0;
    }

    .success-desc {
      font-size: 14px;
      color: #334155;
      line-height: 1.5;
      margin: 0;
    }

    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      font-weight: 700;
      color: var(--color-navy);
      text-decoration: none;

      &:hover {
        text-decoration: underline;
      }
    }
  `]
})
export class ForgotPasswordComponent {
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  email = '';
  isLoading = false;
  successMessage = '';
  generalError = '';
  fieldErrors: Record<string, string> = {};

  clearFieldError(field: string): void {
    if (this.fieldErrors[field]) {
      const updated = { ...this.fieldErrors };
      delete updated[field];
      this.fieldErrors = updated;
      this.cdr.markForCheck();
    }
  }

  submitForgotPassword(): void {
    this.fieldErrors = {};
    this.generalError = '';

    const cleanEmail = this.email.trim();
    if (!cleanEmail) {
      this.fieldErrors['email'] = 'L\'adresse email est obligatoire.';
      this.cdr.markForCheck();
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      this.fieldErrors['email'] = 'Veuillez saisir une adresse email valide.';
      this.cdr.markForCheck();
      return;
    }

    this.isLoading = true;
    this.cdr.markForCheck();

    this.authService.forgotPassword(cleanEmail).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.successMessage = res.message || 'Si cette adresse email est enregistrée, un lien de réinitialisation vous a été envoyé par email.';
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.isLoading = false;
        this.fieldErrors = extractFieldErrors(err);
        this.generalError = getGeneralErrorMessage(err, 'Une erreur est survenue lors de l\'envoi de la demande. Veuillez réessayer.');
        this.cdr.markForCheck();
      }
    });
  }
}
