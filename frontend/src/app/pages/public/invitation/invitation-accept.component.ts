import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { InvitationService, InvitationData } from '../../../core/services/invitation.service';
import { AuthService } from '../../../core/services/auth.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';

@Component({
  selector: 'app-invitation-accept',
  standalone: true,
  imports: [CommonModule, RouterLink, IconComponent],
  template: `
    <div class="invitation-container animate-fade-in">
      <div class="invitation-card card">
        <!-- État : Chargement -->
        @if (loading()) {
          <div class="state-box">
            <div class="spinner"></div>
            <p class="loading-txt">Vérification de votre invitation en cours...</p>
          </div>
        }

        <!-- État : Erreur ou Expirée -->
        @if (!loading() && error()) {
          <div class="state-box">
            <div class="icon-circle error-circle">
              <app-icon name="alert-circle" [size]="44" color="#DC2626"></app-icon>
            </div>
            <h2 class="h2" style="margin-top: 16px; color: var(--color-navy);">Invitation non disponible</h2>
            <p class="body-text" style="color: var(--color-text-secondary); max-width: 440px; margin: 8px auto 24px auto;">
              {{ error() }}
            </p>
            <a routerLink="/" class="btn btn-primary">
              <app-icon name="arrow-left" [size]="16" color="var(--color-navy)"></app-icon>
              <span>Retourner à l'accueil</span>
            </a>
          </div>
        }

        <!-- État : Invitation Valide -->
        @if (!loading() && invitation() && !isSuccess()) {
          <div class="invitation-content">
            <div class="badge badge-primary" style="margin-bottom: 16px;">
              <app-icon name="sparkles" [size]="14" color="var(--color-navy)"></app-icon>
              <span>INVITATION OFFICIELLE QUIZZBOARD</span>
            </div>

            <div class="inviter-badge">
              <div class="avatar-circle">
                {{ (invitation()?.inviterName || 'F').charAt(0).toUpperCase() }}
              </div>
              <div class="inviter-info">
                <span class="inviter-name">{{ invitation()?.inviterName }}</span>
                <span class="inviter-email">{{ invitation()?.inviterEmail }}</span>
              </div>
            </div>

            <h1 class="invitation-title">
              Vous invite à rejoindre {{ invitation()?.resourceName }}
            </h1>

            <div class="resource-pill">
              <span class="pill-type">
                @switch (invitation()?.type) {
                  @case ('CLASS') { 🏫 Classe Pédagogique }
                  @case ('COMMUNITY') { 👥 Communauté d'Apprenants }
                  @case ('LIVE_QUIZ') { ⚡ Session Quiz Live }
                }
              </span>
              <span class="pill-role">Rôle : {{ invitation()?.role || 'Apprenant' }}</span>
            </div>

            @if (invitation()?.message) {
              <div class="custom-msg">
                « {{ invitation()?.message }} »
              </div>
            }

            <div class="expiry-notice">
              <app-icon name="clock" [size]="14" color="var(--color-text-secondary)"></app-icon>
              <span>Ce lien est valable jusqu'au {{ invitation()?.expiresAt | date:'dd/MM/yyyy à HH:mm' }}</span>
            </div>

            <!-- Actions selon l'état d'authentification -->
            <div class="action-buttons">
              @if (authService.isAuthenticated()) {
                <button 
                  class="btn btn-primary btn-lg btn-full" 
                  (click)="acceptInvitation()" 
                  [disabled]="isProcessing()">
                  <app-icon name="check-circle" [size]="18" color="var(--color-navy)"></app-icon>
                  <span>{{ isProcessing() ? 'Validation en cours...' : "Accepter et Rejoindre" }}</span>
                </button>
              } @else {
                <a 
                  [routerLink]="['/connexion']" 
                  [queryParams]="{ returnUrl: '/invitation/' + invitation()?.token }" 
                  class="btn btn-primary btn-lg btn-full">
                  <app-icon name="log-out" [size]="18" color="var(--color-navy)"></app-icon>
                  <span>Se connecter pour accepter</span>
                </a>

                <a 
                  [routerLink]="['/inscription']" 
                  [queryParams]="{ returnUrl: '/invitation/' + invitation()?.token, email: invitation()?.targetEmail }" 
                  class="btn btn-outline btn-full" style="margin-top: 10px;">
                  <span>Créer un compte QuizzBoard</span>
                </a>
              }
            </div>
          </div>
        }

        <!-- État : Succès d'acceptation -->
        @if (isSuccess()) {
          <div class="state-box">
            <div class="icon-circle success-circle">
              <app-icon name="check-circle" [size]="48" color="#16A34A"></app-icon>
            </div>
            <h2 class="h2" style="margin-top: 16px; color: var(--color-navy);">Bienvenue ! 🎉</h2>
            <p class="body-text" style="color: var(--color-text-secondary); margin: 8px 0 24px 0;">
              {{ successMessage() }}
            </p>
            <button class="btn btn-primary" (click)="goToResource()">
              <span>Accéder à mon espace</span>
              <app-icon name="arrow-right" [size]="16" color="var(--color-navy)"></app-icon>
            </button>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .invitation-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: calc(100vh - 160px);
      padding: 40px 20px;
    }

    .invitation-card {
      max-width: 560px;
      width: 100%;
      padding: 44px 36px;
      border-radius: 16px;
      background: #FFFFFF;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
      text-align: center;
    }

    .state-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 20px 0;
    }

    .spinner {
      width: 44px;
      height: 44px;
      border: 4px solid #E2E8F0;
      border-top-color: var(--color-primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .loading-txt {
      margin-top: 16px;
      font-size: 14px;
      color: var(--color-text-secondary);
      font-weight: 600;
    }

    .icon-circle {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .error-circle { background-color: #FEE2E2; }
    .success-circle { background-color: #DCFCE7; }

    .inviter-badge {
      display: inline-flex;
      align-items: center;
      gap: 12px;
      background-color: var(--color-background);
      border: 1px solid var(--color-border);
      padding: 8px 16px;
      border-radius: 30px;
      margin-bottom: 20px;
    }

    .avatar-circle {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background-color: var(--color-navy);
      color: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 14px;
    }

    .inviter-info {
      text-align: left;
      display: flex;
      flex-direction: column;
    }

    .inviter-name {
      font-weight: 700;
      font-size: 13px;
      color: var(--color-navy);
    }

    .inviter-email {
      font-size: 11px;
      color: var(--color-text-secondary);
    }

    .invitation-title {
      font-size: 22px;
      font-weight: 800;
      color: var(--color-navy);
      margin: 0 0 16px 0;
      line-height: 1.35;
    }

    .resource-pill {
      display: flex;
      justify-content: center;
      gap: 12px;
      margin-bottom: 20px;
      font-size: 13px;
      font-weight: 700;
    }

    .pill-type {
      background-color: var(--color-primary-light);
      color: var(--color-navy);
      padding: 6px 14px;
      border-radius: 20px;
      border: 1px solid var(--color-border);
    }

    .pill-role {
      background-color: #F1F5F9;
      color: #475569;
      padding: 6px 14px;
      border-radius: 20px;
    }

    .custom-msg {
      background-color: #F8FAFC;
      border-left: 3px solid var(--color-primary);
      padding: 14px 18px;
      border-radius: 6px;
      font-size: 13px;
      font-style: italic;
      color: #334155;
      text-align: left;
      margin-bottom: 20px;
    }

    .expiry-notice {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      font-size: 12px;
      color: var(--color-text-secondary);
      margin-bottom: 28px;
    }

    .action-buttons {
      display: flex;
      flex-direction: column;
    }

    .btn-full {
      width: 100%;
      justify-content: center;
    }
  `]
})
export class InvitationAcceptComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private invitationService = inject(InvitationService);
  public authService = inject(AuthService);

  loading = signal(true);
  error = signal<string | null>(null);
  invitation = signal<InvitationData | null>(null);
  isProcessing = signal(false);
  isSuccess = signal(false);
  successMessage = signal('');
  redirectUrl = signal('/app/dashboard');

  ngOnInit(): void {
    const token = this.route.snapshot.paramMap.get('token');
    if (!token) {
      this.loading.set(false);
      this.error.set("Aucun jeton d'invitation trouvé dans le lien.");
      return;
    }

    this.invitationService.verifyInvitation(token)
      .then(data => {
        this.invitation.set(data);
        this.loading.set(false);
      })
      .catch(err => {
        this.loading.set(false);
        this.error.set(
          err?.error?.message ||
          "Cette invitation est invalide, a expiré ou a déjà été acceptée."
        );
      });
  }

  async acceptInvitation(): Promise<void> {
    const token = this.invitation()?.token;
    if (!token) return;

    this.isProcessing.set(true);
    try {
      const res = await this.invitationService.acceptInvitation(token);
      this.isProcessing.set(false);
      this.isSuccess.set(true);
      this.successMessage.set(res.message);
      this.redirectUrl.set(res.redirectUrl);
    } catch (err: any) {
      this.isProcessing.set(false);
      this.error.set(err?.error?.message || "Impossible de finaliser l'acceptation de l'invitation.");
    }
  }

  goToResource(): void {
    this.router.navigateByUrl(this.redirectUrl());
  }
}
