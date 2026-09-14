import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { UserRole } from '../../../core/models/user.model';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { extractFieldErrors, getGeneralErrorMessage } from '../../../core/utils/form-error.util';
import { environment } from '../../../../environments/environment';

declare const google: any;

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, IconComponent],
  template: `
    <div class="auth-page animate-fade-in">
      <div class="auth-grid-container">
        <!-- LEFT COLUMN: MINIMAL PITCH -->
        <div class="auth-left-col">
          <div class="badge badge-primary">
            <app-icon name="sparkles" [size]="14" color="var(--color-navy)"></app-icon>
            <span>INSCRIPTION GRATUITE</span>
          </div>

          <h1 class="auth-pitch-title">
            Rejoignez l'arène <br>
            <span class="highlight">pédagogique moderne.</span>
          </h1>

          <div class="minimal-perks">
            <div class="perk-item">
              <div class="perk-icon">
                <app-icon name="cpu" [size]="16" color="var(--color-navy)"></app-icon>
              </div>
              <span>Générateur IA par sujet ou PDF</span>
            </div>

            <div class="perk-item">
              <div class="perk-icon">
                <app-icon name="users" [size]="16" color="var(--color-navy)"></app-icon>
              </div>
              <span>Cohortes privées & forum d'entraide</span>
            </div>

            <div class="perk-item">
              <div class="perk-icon">
                <app-icon name="shield" [size]="16" color="var(--color-navy)"></app-icon>
              </div>
              <span>Gratuit, sans carte bancaire</span>
            </div>
          </div>
        </div>

        <!-- RIGHT COLUMN: MINIMAL SIGNUP FORM DIRECT ON PAGE -->
        <div class="auth-right-col">
          <div class="form-wrapper">
            <h2 class="h2" style="margin-bottom: 6px;">Créer un compte</h2>
            <p class="body-small" style="margin-bottom: 18px;">Gratuit pour les formateurs et les apprenants.</p>

            <!-- Google button -->
            <button type="button" class="btn-google" [disabled]="isGoogleLoading || isLoading" (click)="signupWithGoogle()">
              @if (isGoogleLoading) {
                <span class="btn-spinner"></span>
                <span>Inscription Google en cours...</span>
              } @else {
                <app-icon name="google" [size]="18"></app-icon>
                <span>S'inscrire avec Google</span>
              }
            </button>

            <div class="divider">
              <span>ou avec email</span>
            </div>

            <!-- Role toggle pills -->
            <div class="role-pills">
              <button 
                type="button" 
                class="role-pill" 
                [class.active]="selectedRole === 'CREATOR'"
                (click)="selectedRole = 'CREATOR'">
                <app-icon name="user" [size]="14"></app-icon>
                <span>Formateur</span>
              </button>
              <button 
                type="button" 
                class="role-pill" 
                [class.active]="selectedRole === 'LEARNER'"
                (click)="selectedRole = 'LEARNER'">
                <app-icon name="award" [size]="14"></app-icon>
                <span>Apprenant</span>
              </button>
            </div>

            @if (errorMessage) {
              <div class="alert-error animate-fade-in" style="margin-bottom: 16px; padding: 12px 14px; border-radius: 8px; background: #fee2e2; border: 1px solid #f87171; color: #991b1b; font-size: 13px; display: flex; align-items: center; gap: 8px;">
                <app-icon name="x-circle" [size]="16" color="#991b1b"></app-icon>
                <span>{{ errorMessage }}</span>
              </div>
            }

            <form (ngSubmit)="handleManualSignup()" class="auth-form-clean">
              <div class="grid-2">
                <div class="form-group">
                  <label>Prénom</label>
                  <input 
                    type="text" 
                    [(ngModel)]="prenom" 
                    name="prenom" 
                    class="input-field" 
                    [class.input-error]="fieldErrors['prenom']"
                    (input)="clearFieldError('prenom')"
                    placeholder="Amadou" 
                    required>
                  @if (fieldErrors['prenom']) {
                    <span class="field-error-msg animate-fade-in">
                      <app-icon name="alert-circle" [size]="12" color="#DC2626"></app-icon>
                      <span>{{ fieldErrors['prenom'] }}</span>
                    </span>
                  }
                </div>
                <div class="form-group">
                  <label>Nom</label>
                  <input 
                    type="text" 
                    [(ngModel)]="nom" 
                    name="nom" 
                    class="input-field" 
                    [class.input-error]="fieldErrors['nom']"
                    (input)="clearFieldError('nom')"
                    placeholder="Diallo" 
                    required>
                  @if (fieldErrors['nom']) {
                    <span class="field-error-msg animate-fade-in">
                      <app-icon name="alert-circle" [size]="12" color="#DC2626"></app-icon>
                      <span>{{ fieldErrors['nom'] }}</span>
                    </span>
                  }
                </div>
              </div>

              <div class="form-group">
                <label>Email</label>
                <input 
                  type="email" 
                  [(ngModel)]="email" 
                  name="email" 
                  class="input-field" 
                  [class.input-error]="fieldErrors['email']"
                  (input)="clearFieldError('email')"
                  placeholder="amadou.diallo@exemple.com" 
                  required>
                @if (fieldErrors['email']) {
                  <span class="field-error-msg animate-fade-in">
                    <app-icon name="alert-circle" [size]="12" color="#DC2626"></app-icon>
                    <span>{{ fieldErrors['email'] }}</span>
                  </span>
                }
              </div>

              <div class="form-group">
                <label>Mot de passe</label>
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

              <div class="form-group">
                <label>Confirmer le mot de passe</label>
                <div class="password-input-wrapper">
                  <input 
                    [type]="showConfirmPassword ? 'text' : 'password'" 
                    [(ngModel)]="confirmPassword" 
                    name="confirmPassword" 
                    class="input-field" 
                    [class.input-error]="fieldErrors['confirmPassword']"
                    (input)="clearFieldError('confirmPassword')"
                    placeholder="••••••••" 
                    required>
                  <button 
                    type="button" 
                    class="toggle-eye-btn" 
                    (click)="showConfirmPassword = !showConfirmPassword" 
                    [attr.aria-label]="showConfirmPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'">
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

              @if (selectedRole === 'CREATOR') {
                <div class="plans-selector-box animate-fade-in">
                  <div class="plans-selector-header">
                    <span class="plans-label">Formule Formateur :</span>
                  </div>
                  <div class="plans-selector-grid">
                    <!-- Option 1: FREE -->
                    <div 
                      class="plan-card-option is-active" 
                      style="cursor: pointer;">
                      <div class="plan-option-top">
                        <span class="radio-circle selected"></span>
                        <div class="plan-info">
                          <span class="plan-title">Formule Découverte</span>
                          <span class="plan-price-tag">0 FCFA <small>(Actif)</small></span>
                        </div>
                      </div>
                      <p class="plan-detail">Idéal pour démarrer : 3 quiz, 5 IA / mois, sessions live</p>
                    </div>

                    <!-- Option 2: STARTER (DÉSACTIVÉ) -->
                    <div 
                      class="plan-card-option is-starter disabled-option" 
                      style="opacity: 0.55; cursor: not-allowed; pointer-events: none; background: #F8FAFC;"
                      title="Ce forfait est temporairement indisponible">
                      <div class="starter-badge" style="background: #94A3B8; color: #FFFFFF;">Bientôt disponible</div>
                      <div class="plan-option-top">
                        <span class="radio-circle" style="border-color: #CBD5E1;"></span>
                        <div class="plan-info">
                          <span class="plan-title" style="color: #64748B;">Formule STARTER</span>
                          <span class="plan-price-tag" style="color: #64748B;">9 900 FCFA <small>/mois</small></span>
                        </div>
                      </div>
                      <p class="plan-detail">Forfait formateur payant bientôt disponible • Inscription en formule gratuite</p>
                    </div>
                  </div>
                </div>
              }

              <button type="submit" class="btn btn-primary btn-full btn-lg" [class.is-loading]="isLoading" [disabled]="isLoading || isGoogleLoading" style="margin-top: 10px;">
                @if (isLoading) {
                  <span class="btn-spinner"></span>
                  <span>Création de votre compte...</span>
                } @else {
                  <app-icon name="sparkles" [size]="16" color="var(--color-navy)"></app-icon>
                  <span>Créer mon Compte Gratuit</span>
                }
              </button>
            </form>

            <div class="switch-link">
              Déjà un compte ? 
              <a routerLink="/connexion">Se connecter</a>
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
      grid-template-columns: 1fr 1.05fr;
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
        max-width: 400px;
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
      margin: 16px 0;

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

    .role-pills {
      display: flex;
      gap: 8px;
      margin-bottom: 14px;

      .role-pill {
        flex: 1;
        height: 36px;
        border-radius: var(--radius-md);
        border: 1.5px solid var(--color-border);
        background: #FFFFFF;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        font-size: 13px;
        font-weight: 700;
        color: var(--color-text-secondary);
        cursor: pointer;
        transition: all 0.15s ease;

        &.active {
          border-color: var(--color-primary);
          background-color: var(--color-primary-light);
          color: var(--color-navy);
        }
      }
    }

    .auth-form-clean {
      display: flex;
      flex-direction: column;
      gap: 12px;

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

    /* Plan selection in signup */
    .plans-selector-box {
      margin-top: 14px;
      margin-bottom: 6px;
    }

    .plans-selector-header {
      margin-bottom: 8px;
      .plans-label {
        font-size: 13px;
        font-weight: 700;
        color: var(--color-navy);
      }
    }

    .plans-selector-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }

    .plan-card-option {
      border: 1.5px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: 10px 12px;
      cursor: pointer;
      position: relative;
      background: #FFFFFF;
      transition: all 0.2s ease;

      &:hover {
        border-color: var(--color-navy);
      }

      &.is-active {
        border-color: var(--color-navy);
        background: #F8FAFC;
        box-shadow: 0 0 0 1px var(--color-navy);
      }

      &.is-starter.is-active {
        border-color: var(--color-orange);
        box-shadow: 0 0 0 1px var(--color-orange);
      }

      .starter-badge {
        position: absolute;
        top: -8px;
        right: 8px;
        font-size: 9px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        background: var(--color-orange);
        color: #FFFFFF;
        padding: 1px 6px;
        border-radius: 999px;
      }

      .plan-option-top {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .radio-circle {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        border: 1.5px solid var(--color-border);
        position: relative;
        flex-shrink: 0;

        &.selected {
          border-color: var(--color-navy);
          &::after {
            content: '';
            position: absolute;
            top: 2px;
            left: 2px;
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: var(--color-navy);
          }
        }
      }

      .plan-info {
        display: flex;
        flex-direction: column;
        line-height: 1.2;
      }

      .plan-title {
        font-size: 12px;
        font-weight: 700;
        color: var(--color-navy);
      }

      .plan-price-tag {
        font-size: 13px;
        font-weight: 800;
        color: var(--color-navy);
        small {
          font-size: 10px;
          font-weight: 500;
          color: var(--color-text-secondary);
        }
      }

      .plan-detail {
        margin: 6px 0 0 0;
        font-size: 10.5px;
        color: var(--color-text-secondary);
        line-height: 1.3;
      }
    }
  `]
})
export class SignupComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  selectedRole: UserRole = 'CREATOR';
  selectedPlan: 'FREE' | 'STARTER' = 'FREE';
  prenom = '';
  nom = '';
  email = '';
  password = '';
  confirmPassword = '';
  showPassword = false;
  showConfirmPassword = false;
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

  signupWithGoogle() {
    this.errorMessage = null;
    this.fieldErrors = {};

    if (typeof google === 'undefined' || !google?.accounts?.id) {
      this.errorMessage = 'Le service Google Identity Services est en cours de chargement. Veuillez patienter ou remplir le formulaire ci-dessous.';
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
                this.errorMessage = err?.error?.message || 'Échec de l\'inscription avec Google.';
                this.cdr.markForCheck();
              }
            });
          }
        }
      });

      google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed()) {
          this.errorMessage = 'Veuillez autoriser les fenêtres contextuelles ou les cookies tiers pour vous inscrire avec Google.';
          this.cdr.markForCheck();
        }
      });
    } catch (e) {
      this.errorMessage = 'Erreur lors de l\'initialisation de Google Auth.';
      this.cdr.markForCheck();
    }
  }

  handleManualSignup() {
    this.fieldErrors = {};
    this.errorMessage = null;

    if (!this.prenom.trim()) {
      this.fieldErrors['prenom'] = 'Le prénom est obligatoire.';
    }
    if (!this.nom.trim()) {
      this.fieldErrors['nom'] = 'Le nom est obligatoire.';
    }
    if (!this.email.trim()) {
      this.fieldErrors['email'] = 'L\'adresse email est obligatoire.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim())) {
      this.fieldErrors['email'] = 'L\'adresse email renseignée n\'est pas valide (ex: amadou.diallo@exemple.com).';
    }
    if (!this.password) {
      this.fieldErrors['password'] = 'Le mot de passe est obligatoire.';
    } else if (this.password.length < 6) {
      this.fieldErrors['password'] = 'Le mot de passe doit comporter au moins 6 caractères.';
    }
    if (!this.confirmPassword) {
      this.fieldErrors['confirmPassword'] = 'Veuillez confirmer votre mot de passe.';
    } else if (this.password !== this.confirmPassword) {
      this.fieldErrors['confirmPassword'] = 'Les deux mots de passe ne correspondent pas.';
    }

    if (Object.keys(this.fieldErrors).length > 0) {
      this.errorMessage = 'Veuillez corriger les erreurs indiquées dans les champs ci-dessous.';
      this.cdr.markForCheck();
      return;
    }

    this.isLoading = true;
    this.cdr.markForCheck();

    this.authService.signup({
      prenom: this.prenom.trim(),
      nom: this.nom.trim(),
      email: this.email.trim().toLowerCase(),
      password: this.password,
      role: this.selectedRole
    }).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.cdr.markForCheck();
        if (this.selectedRole === 'CREATOR') {
          this.router.navigate(['/app/dashboard']);
        } else {
          this.router.navigate(['/app/learner/dashboard']);
        }
      },
      error: (err) => {
        this.isLoading = false;
        // Extraction automatique des erreurs ciblées par champ depuis la base de données / backend
        this.fieldErrors = extractFieldErrors(err);
        this.errorMessage = getGeneralErrorMessage(err, 'Une erreur est survenue lors de la création de votre compte.');
        this.cdr.markForCheck();
      }
    });
  }
}
