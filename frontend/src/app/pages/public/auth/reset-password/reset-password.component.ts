import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { extractFieldErrors, getGeneralErrorMessage } from '../../../../core/utils/form-error.util';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, IconComponent],
  template: `
    <div class="auth-page animate-fade-in">
      <div class="auth-card-container">
        <div class="card form-card">
          <!-- En-tête -->
          <div class="badge badge-primary" style="margin-bottom: 16px;">
            <app-icon name="shield" [size]="14" color="var(--color-navy)"></app-icon>
            <span>RÉINITIALISATION DU MOT DE PASSE</span>
          </div>

          <h1 class="h2" style="margin-bottom: 8px;">Définir un nouveau mot de passe</h1>
          <p class="body-small" style="margin-bottom: 24px; color: var(--color-text-secondary);">
            Choisissez un mot de passe robuste d'au moins 6 caractères pour sécuriser l'accès à votre compte QuizzBoard.
          </p>

          <!-- Notification d'erreur générale -->
          @if (generalError) {
            <div class="alert-error animate-fade-in" style="margin-bottom: 16px; padding: 10px 14px; border-radius: 8px; background: #fee2e2; border: 1px solid #f87171; color: #991b1b; font-size: 13px; display: flex; align-items: center; gap: 8px;">
              <app-icon name="alert-circle" [size]="16" color="#991b1b"></app-icon>
              <span>{{ generalError }}</span>
            </div>
          }

          <!-- Notification de succès -->
          @if (isSuccess) {
            <div class="success-box animate-fade-in">
              <div class="icon-circle">
                <app-icon name="check-circle" [size]="36" color="#16A34A"></app-icon>
              </div>
              <h3 class="success-title">Mot de passe réinitialisé avec succès ! 🎉</h3>
              <p class="success-desc">
                Votre nouveau mot de passe est immédiatement actif. Vous allez être redirigé vers la page de connexion...
              </p>

              <div style="margin-top: 24px;">
                <a routerLink="/connexion" class="btn btn-primary btn-full">
                  <app-icon name="log-out" [size]="15" color="var(--color-navy)"></app-icon>
                  <span>Se connecter maintenant</span>
                </a>
              </div>
            </div>
          } @else {
            <!-- Formulaire -->
            <form (ngSubmit)="submitResetPassword()" class="clean-form">
              <div class="form-group">
                <label>Nouveau mot de passe *</label>
                <div class="input-password-wrapper">
                  <input 
                    [type]="showPassword ? 'text' : 'password'" 
                    [(ngModel)]="newPassword" 
                    name="newPassword" 
                    class="input-field" 
                    [class.input-error]="fieldErrors['newPassword']"
                    (input)="clearFieldError('newPassword')"
                    placeholder="Au moins 6 caractères" 
                    required>
                  <button type="button" class="toggle-eye-btn" (click)="showPassword = !showPassword">
                    <app-icon [name]="showPassword ? 'eye-off' : 'eye'" [size]="16" color="#64748B"></app-icon>
                  </button>
                </div>
                @if (fieldErrors['newPassword']) {
                  <span class="field-error-msg animate-fade-in">
                    <app-icon name="alert-circle" [size]="12" color="#DC2626"></app-icon>
                    <span>{{ fieldErrors['newPassword'] }}</span>
                  </span>
                }
              </div>

              <div class="form-group">
                <label>Confirmer le mot de passe *</label>
                <div class="input-password-wrapper">
                  <input 
                    [type]="showConfirmPassword ? 'text' : 'password'" 
                    [(ngModel)]="confirmPassword" 
                    name="confirmPassword" 
                    class="input-field" 
                    [class.input-error]="fieldErrors['confirmPassword']"
                    (input)="clearFieldError('confirmPassword')"
                    placeholder="Répétez le mot de passe" 
                    required>
                  <button type="button" class="toggle-eye-btn" (click)="showConfirmPassword = !showConfirmPassword" [attr.aria-label]="showConfirmPassword ? 'Masquer' : 'Afficher'">
                    <app-icon [name]="showConfirmPassword ? 'eye-off' : 'eye'" [size]="16" color="#64748B"></app-icon>
                  </button>
                </div>
                @if (fieldErrors['confirmPassword']) {
                  <span class="field-error-msg animate-fade-in">
                    <app-icon name="alert-circle" [size]="12" color="#DC2626"></app-icon>
                    <span>{{ fieldErrors['confirmPassword'] }}</span>
                  </span>
                }
              </div>

              <button 
                type="submit" 
                class="btn btn-primary btn-full btn-lg" 
                [disabled]="isLoading || !newPassword.trim() || !confirmPassword.trim()"
                style="margin-top: 12px;">
                @if (isLoading) {
                  <span class="btn-spinner"></span>
                  <span>Mise à jour en cours...</span>
                } @else {
                  <app-icon name="check-circle" [size]="16" color="var(--color-navy)"></app-icon>
                  <span>Valider mon nouveau mot de passe</span>
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

    .input-password-wrapper {
      position: relative;
      display: flex;
      align-items: center;

      .input-field {
        padding-right: 42px;
      }

      .toggle-eye-btn {
        position: absolute;
        right: 12px;
        background: none;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 4px;
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
export class ResetPasswordComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  token = '';
  newPassword = '';
  confirmPassword = '';
  showPassword = false;
  showConfirmPassword = false;
  isLoading = false;
  isSuccess = false;
  generalError = '';
  fieldErrors: Record<string, string> = {};

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.token = params['token'] || '';
      if (!this.token) {
        this.generalError = 'Aucun jeton de réinitialisation détecté. Veuillez utiliser le lien reçu par email.';
      }
      this.cdr.markForCheck();
    });
  }

  clearFieldError(field: string): void {
    if (this.fieldErrors[field]) {
      const updated = { ...this.fieldErrors };
      delete updated[field];
      this.fieldErrors = updated;
      this.cdr.markForCheck();
    }
  }

  submitResetPassword(): void {
    this.fieldErrors = {};
    this.generalError = '';

    if (!this.token) {
      this.generalError = 'Jeton de réinitialisation manquant. Veuillez utiliser le lien reçu par email.';
      this.cdr.markForCheck();
      return;
    }

    if (!this.newPassword.trim()) {
      this.fieldErrors['newPassword'] = 'Le nouveau mot de passe est obligatoire.';
    } else if (this.newPassword.trim().length < 6) {
      this.fieldErrors['newPassword'] = 'Le mot de passe doit comporter au moins 6 caractères.';
    }

    if (!this.confirmPassword.trim()) {
      this.fieldErrors['confirmPassword'] = 'Veuillez confirmer votre mot de passe.';
    } else if (this.newPassword !== this.confirmPassword) {
      this.fieldErrors['confirmPassword'] = 'Les deux mots de passe ne correspondent pas.';
    }

    if (Object.keys(this.fieldErrors).length > 0) {
      this.cdr.markForCheck();
      return;
    }

    this.isLoading = true;
    this.cdr.markForCheck();

    this.authService.resetPassword(this.token, this.newPassword.trim()).subscribe({
      next: () => {
        this.isLoading = false;
        this.isSuccess = true;
        this.cdr.markForCheck();
        setTimeout(() => {
          this.router.navigate(['/connexion']);
        }, 2500);
      },
      error: (err) => {
        this.isLoading = false;
        this.fieldErrors = extractFieldErrors(err);
        this.generalError = getGeneralErrorMessage(err, 'Le lien de réinitialisation est invalide ou a expiré. Veuillez refaire une demande.');
        this.cdr.markForCheck();
      }
    });
  }
}
