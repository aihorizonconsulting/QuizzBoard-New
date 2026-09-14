import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { extractFieldErrors, getGeneralErrorMessage } from '../../../core/utils/form-error.util';
import { environment } from '../../../../environments/environment';

declare const google: any;

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, IconComponent],
  template: `
    <div class="auth-page animate-fade-in">
      <div class="auth-grid-container">
        <!-- LEFT COLUMN: MINIMAL PITCH -->
        <div class="auth-left-col">
          <div class="badge badge-navy">
            <app-icon name="sparkles" [size]="14" color="var(--color-navy)"></app-icon>
            <span>QUIZZBOARD AUTH</span>
          </div>

          <h1 class="auth-pitch-title">
            Évaluez, animez et <br>
            <span class="highlight">progressez en direct.</span>
          </h1>

          <div class="minimal-perks">
            <div class="perk-item">
              <div class="perk-icon">
                <app-icon name="sparkles" [size]="16" color="var(--color-navy)"></app-icon>
              </div>
              <span>Quiz IA prêts en 30 secondes</span>
            </div>

            <div class="perk-item">
              <div class="perk-icon">
                <app-icon name="play" [size]="16" color="var(--color-navy)"></app-icon>
              </div>
              <span>Sessions Live multijoueurs sur smartphone</span>
            </div>

            <div class="perk-item">
              <div class="perk-icon">
                <app-icon name="award" [size]="16" color="var(--color-navy)"></app-icon>
              </div>
              <span>Certificats nominatifs et classement</span>
            </div>
          </div>
        </div>

        <!-- RIGHT COLUMN: MINIMAL FORM DIRECT ON PAGE -->
        <div class="auth-right-col">
          <div class="form-wrapper">
            <h2 class="h2" style="margin-bottom: 6px;">Connexion</h2>
            <p class="body-small" style="margin-bottom: 20px;">Accédez à votre espace formateur ou élève.</p>

            <!-- Google button -->
            <button type="button" class="btn-google" [disabled]="isGoogleLoading || isLoading" (click)="loginWithGoogle()">
              @if (isGoogleLoading) {
                <span class="btn-spinner"></span>
                <span>Authentification Google...</span>
              } @else {
                <app-icon name="google" [size]="18"></app-icon>
                <span>Continuer avec Google</span>
              }
            </button>

            <div class="divider">
              <span>ou avec email</span>
            </div>

            @if (errorMessage) {
              <div class="alert-error animate-fade-in" style="margin-bottom: 16px; padding: 12px 14px; border-radius: 8px; background: #fee2e2; border: 1px solid #f87171; color: #991b1b; font-size: 13px; display: flex; align-items: center; gap: 8px;">
                <app-icon name="x-circle" [size]="16" color="#991b1b" style="flex-shrink: 0;"></app-icon>
                <span style="font-weight: 600; line-height: 1.4;">{{ errorMessage }}</span>
              </div>
            }

            <form (ngSubmit)="handleManualLogin()" class="auth-form-clean">
              <div class="form-group">
                <label>Email</label>
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

              <div class="form-group">
                <div class="label-row">
                  <label>Mot de passe</label>
                  <a routerLink="/mot-de-passe-oublie" class="forgot-link">Oublié ?</a>
                </div>
                <div class="password-input-wrapper">
                  <input 
                    [type]="showPassword ? 'text' : 'password'" 
                    [(ngModel)]="password" 
                    name="password" 
                    class="input-field" 
                    [class.input-error]="fieldErrors['password']"
                    (input)="clearFieldError('password')"
                    placeholder="••••••••"
                    required>
                  <button 
                    type="button" 
                    class="toggle-eye-btn" 
                    (click)="showPassword = !showPassword" 
                    [attr.aria-label]="showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'">
                    <app-icon [name]="showPassword ? 'eye-off' : 'eye'" [size]="16" color="#64748B"></app-icon>
                  </button>
                </div>
                @if (fieldErrors['password']) {
                  <span class="field-error-msg animate-fade-in">
                    <app-icon name="alert-circle" [size]="12" color="#DC2626"></app-icon>
                    <span>{{ fieldErrors['password'] }}</span>
                  </span>
                }
              </div>

              <button type="submit" class="btn btn-primary btn-full btn-lg" [class.is-loading]="isLoading" [disabled]="isLoading || isGoogleLoading" style="margin-top: 4px;">
                @if (isLoading) {
                  <span class="btn-spinner"></span>
                  <span>Connexion en cours...</span>
                } @else {
                  <span>Se Connecter</span>
                  <app-icon name="arrow-right" [size]="16" color="var(--color-navy)"></app-icon>
                }
              </button>
            </form>

            <div class="switch-link">
              Pas encore de compte ? 
              <a routerLink="/inscription">Créer un compte</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-page {
      padding: 60px 24px 80px 24px;
      background: #FFFFFF;
    }

    .auth-grid-container {
      max-width: 1040px;
      margin: 0 auto;
      display: grid;
      grid-template-columns: 1fr 1fr;
      align-items: center;
      gap: 64px;
    }

    /* LEFT MINIMAL PITCH */
    .auth-left-col {
      display: flex;
      flex-direction: column;
      gap: 20px;

      .auth-pitch-title {
        font-size: 38px;
        font-weight: 900;
        color: var(--color-navy);
        line-height: 1.15;
        letter-spacing: -0.02em;

        .highlight {
          color: var(--color-orange);
        }
      }

      .minimal-perks {
        display: flex;
        flex-direction: column;
        gap: 14px;
        margin-top: 8px;

        .perk-item {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 14px;
          font-weight: 600;
          color: var(--color-navy);

          .perk-icon {
            width: 32px;
            height: 32px;
            border-radius: var(--radius-sm);
            background: var(--color-background);
            border: 1px solid var(--color-border);
            display: flex;
            align-items: center;
            justify-content: center;
          }
        }
      }
    }

    /* RIGHT MINIMAL FORM */
    .auth-right-col {
      .form-wrapper {
        max-width: 380px;
        margin-left: auto;
      }
    }

    .btn-google {
      width: 100%;
      height: 44px;
      border: 1px solid var(--color-border);
      background: #FFFFFF;
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      font-size: 14px;
      font-weight: 700;
      color: var(--color-navy);
      cursor: pointer;
      transition: all 0.15s ease;

      &:hover {
        background-color: var(--color-background);
        border-color: var(--color-navy);
      }
    }

    .divider {
      text-align: center;
      position: relative;
      margin: 18px 0;

      &::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 0;
        right: 0;
        height: 1px;
        background: var(--color-border);
      }

      span {
        position: relative;
        background: #FFFFFF;
        padding: 0 10px;
        font-size: 11px;
        color: var(--color-text-secondary);
        font-weight: 600;
      }
    }

    .auth-form-clean {
      display: flex;
      flex-direction: column;
      gap: 14px;

      .label-row {
        display: flex;
        justify-content: space-between;
        align-items: center;

        .forgot-link {
          font-size: 11px;
          color: var(--color-navy);
          font-weight: 600;
          &:hover { text-decoration: underline; }
        }
      }

      .password-input-wrapper {
        position: relative;
        display: flex;
        align-items: center;

        .input-field {
          width: 100%;
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
          color: #64748B;
          transition: color 0.15s ease;

          &:hover {
            color: var(--color-navy);
          }
        }
      }

      .btn-full { width: 100%; }
    }

    .switch-link {
      text-align: center;
      margin-top: 18px;
      font-size: 13px;
      color: var(--color-text-secondary);

      a {
        color: var(--color-navy);
        font-weight: 800;
        text-decoration: underline;
        margin-left: 4px;
      }
    }

    @media (max-width: 800px) {
      .auth-grid-container {
        grid-template-columns: 1fr;
        gap: 36px;
      }
      .auth-right-col .form-wrapper {
        margin: 0 auto;
      }
    }
  `]
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  email = '';
  password = '';
  showPassword = false;
  errorMessage: string | null = null;
  fieldErrors: Record<string, string> = {};
  isLoading = false;
  isGoogleLoading = false;

  clearFieldError(field: string) {
    if (this.fieldErrors[field]) {
      delete this.fieldErrors[field];
      this.cdr.markForCheck();
    }
  }

  loginWithGoogle() {
    this.errorMessage = null;
    this.fieldErrors = {};

    if (typeof google === 'undefined' || !google?.accounts?.id) {
      this.errorMessage = 'Le service Google Identity Services est en cours de chargement. Veuillez réessayer dans quelques secondes ou utiliser la connexion par email.';
      this.cdr.markForCheck();
      return;
    }

    try {
      google.accounts.id.initialize({
        client_id: (environment as any).googleClientId || '385748483146-1r3b7ab8tmhetu1t4pshvelc35lalabg.apps.googleusercontent.com',
        callback: (response: any) => {
          if (response?.credential) {
            this.isGoogleLoading = true;
            this.cdr.markForCheck();

            this.authService.loginWithGoogle(response.credential).subscribe({
              next: (authRes) => {
                this.isGoogleLoading = false;
                const target = authRes.user.role === 'ADMIN' ? '/admin/dashboard' : '/app/dashboard';
                this.router.navigate([target]);
              },
              error: (err) => {
                this.isGoogleLoading = false;
                this.errorMessage = err?.error?.message || 'Échec de l\'authentification avec Google.';
                this.cdr.markForCheck();
              }
            });
          }
        }
      });

      google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed()) {
          this.errorMessage = 'Veuillez autoriser les fenêtres contextuelles ou les cookies tiers pour vous connecter avec Google.';
          this.cdr.markForCheck();
        }
      });
    } catch (e) {
      this.errorMessage = 'Erreur lors de l\'initialisation de Google Auth.';
      this.cdr.markForCheck();
    }
  }

  handleManualLogin() {
    this.fieldErrors = {};
    this.errorMessage = null;

    if (!this.email.trim()) {
      this.fieldErrors['email'] = 'L\'adresse email est obligatoire.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim())) {
      this.fieldErrors['email'] = 'Veuillez saisir une adresse email valide.';
    }

    if (!this.password) {
      this.fieldErrors['password'] = 'Le mot de passe est obligatoire.';
    }

    if (Object.keys(this.fieldErrors).length > 0) {
      this.errorMessage = 'Veuillez corriger les champs requis ci-dessous.';
      this.cdr.markForCheck();
      return;
    }

    this.isLoading = true;
    this.cdr.markForCheck();

    this.authService.login(this.email, this.password).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.cdr.markForCheck();
        const role = res.user?.role;
        if (role === 'ADMIN') {
          this.router.navigate(['/admin/dashboard']);
        } else if (role === 'LEARNER') {
          this.router.navigate(['/app/learner/dashboard']);
        } else {
          this.router.navigate(['/app/dashboard']);
        }
      },
      error: (err: any) => {
        this.isLoading = false;
        // Extraction des erreurs de champs renvoyées par le backend (ex: email, password)
        this.fieldErrors = extractFieldErrors(err);

        const statusCode = err?.status ?? err?.error?.status;
        if (statusCode === 0) {
          this.errorMessage = 'Impossible de contacter le serveur backend (http://localhost:8080). Vérifiez que les conteneurs sont bien démarrés.';
        } else {
          this.errorMessage = err?.userFriendlyMessage || err?.error?.message || getGeneralErrorMessage(err, 'Identifiants invalides : veuillez vérifier votre adresse email et mot de passe.');
        }
        this.cdr.markForCheck();
      }
    });
  }
}
