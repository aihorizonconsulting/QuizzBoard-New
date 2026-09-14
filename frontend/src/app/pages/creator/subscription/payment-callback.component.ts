import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { SubscriptionService } from '../../../core/services/subscription.service';
import { AuthService } from '../../../core/services/auth.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';

@Component({
  selector: 'app-payment-callback',
  standalone: true,
  imports: [CommonModule, RouterLink, IconComponent],
  template: `
    <div class="callback-container animate-fade-in">
      <div class="callback-card card">
        <!-- État : Chargement / Vérification -->
        @if (status() === 'loading') {
          <div class="status-box loading-box">
            <div class="spinner-large"></div>
            <h2 class="title">Vérification de votre paiement...</h2>
            <p class="subtitle">
              Nous vérifions la confirmation de la transaction auprès de la passerelle PayDunya.
              Veuillez patienter quelques secondes.
            </p>
          </div>
        }

        <!-- État : Succès -->
        @if (status() === 'success') {
          <div class="status-box success-box">
            <div class="icon-circle success-circle">
              <app-icon name="check-circle" [size]="48" color="#16A34A"></app-icon>
            </div>

            <div class="badge badge-success" style="margin-top: 16px;">
              <span>PAIEMENT VALIDÉ AVEC SUCCÈS</span>
            </div>

            <h2 class="title" style="margin-top: 12px;">Abonnement STARTER Activé ! 🎉</h2>

            <p class="subtitle">
              Félicitations <strong>{{ authService.currentUser()?.prenom || 'Cher Formateur' }}</strong> ! Votre compte a été mis à niveau avec succès.
              Vous bénéficiez désormais d'un accès <strong>illimité</strong> à toutes les fonctionnalités de QuizzBoard.
            </p>

            @if (invoiceDetails()) {
              <div class="invoice-summary">
                <div class="summary-row">
                  <span>Référence :</span>
                  <strong>{{ invoiceDetails()?.reference }}</strong>
                </div>
                <div class="summary-row">
                  <span>Forfait :</span>
                  <strong>{{ invoiceDetails()?.planName }}</strong>
                </div>
                <div class="summary-row">
                  <span>Montant réglé :</span>
                  <strong style="color: var(--color-primary);">
                    {{ invoiceDetails()?.amountFcfa ? (invoiceDetails()?.amountFcfa | number) + ' FCFA' : invoiceDetails()?.amountUsd + ' USD' }}
                  </strong>
                </div>
                <div class="summary-row">
                  <span>Mode de règlement :</span>
                  <strong>{{ invoiceDetails()?.paymentMethod }}</strong>
                </div>
              </div>
            }

            <div class="actions-row">
              <a routerLink="/app/dashboard" class="btn btn-primary">
                <app-icon name="bar-chart" [size]="16" color="var(--color-navy)"></app-icon>
                <span>Accéder au Dashboard</span>
              </a>

              <a routerLink="/app/subscription" class="btn btn-outline">
                <app-icon name="credit-card" [size]="16" color="var(--color-navy)"></app-icon>
                <span>Consulter mes Factures</span>
              </a>
            </div>
          </div>
        }

        <!-- État : Échec ou Annulation -->
        @if (status() === 'error') {
          <div class="status-box error-box">
            <div class="icon-circle error-circle">
              <app-icon name="alert-circle" [size]="48" color="#DC2626"></app-icon>
            </div>

            <div class="badge badge-danger" style="margin-top: 16px;">
              <span>PAIEMENT NON FINALISÉ</span>
            </div>

            <h2 class="title" style="margin-top: 12px;">Échec de la validation</h2>

            <p class="subtitle">
              {{ errorMessage() || "La transaction n'a pas pu être validée par la passerelle de paiement ou a été annulée." }}
            </p>

            <div class="actions-row">
              <a routerLink="/tarifs" class="btn btn-primary">
                <app-icon name="refresh-cw" [size]="16" color="var(--color-navy)"></app-icon>
                <span>Réessayer le paiement</span>
              </a>

              <a routerLink="/app/subscription" class="btn btn-outline">
                <span>Retourner à mon compte</span>
              </a>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .callback-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: calc(100vh - 180px);
      padding: 40px 24px;
    }

    .callback-card {
      max-width: 580px;
      width: 100%;
      padding: 48px 36px;
      text-align: center;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08);
      border-radius: 16px;
      background-color: #FFFFFF;
    }

    .status-box {
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .icon-circle {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .success-circle {
      background-color: #DCFCE7;
    }

    .error-circle {
      background-color: #FEE2E2;
    }

    .spinner-large {
      width: 54px;
      height: 54px;
      border: 4px solid #E2E8F0;
      border-top-color: var(--color-primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-bottom: 24px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .title {
      font-size: 22px;
      font-weight: 800;
      color: var(--color-navy);
      margin: 12px 0 8px 0;
    }

    .subtitle {
      font-size: 14px;
      color: var(--color-text-secondary);
      line-height: 1.6;
      max-width: 460px;
      margin: 0 auto 24px auto;
    }

    .invoice-summary {
      width: 100%;
      background-color: #F8FAFC;
      border: 1px solid var(--color-border);
      border-radius: 10px;
      padding: 16px 20px;
      margin-bottom: 28px;
      text-align: left;
    }

    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px dashed var(--color-border);
      font-size: 13px;
      color: #475569;

      &:last-child {
        border-bottom: none;
      }
    }

    .actions-row {
      display: flex;
      justify-content: center;
      gap: 14px;
      flex-wrap: wrap;
    }

    .badge-success {
      background-color: #DCFCE7;
      color: #16A34A;
      font-weight: 800;
      font-size: 11px;
      padding: 4px 12px;
      border-radius: 20px;
    }

    .badge-danger {
      background-color: #FEE2E2;
      color: #DC2626;
      font-weight: 800;
      font-size: 11px;
      padding: 4px 12px;
      border-radius: 20px;
    }
  `]
})
export class PaymentCallbackComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private subService = inject(SubscriptionService);
  public authService = inject(AuthService);

  status = signal<'loading' | 'success' | 'error'>('loading');
  errorMessage = signal<string>('');
  invoiceDetails = signal<any>(null);

  ngOnInit(): void {
    this.route.queryParams.subscribe(async (params) => {
      const token = params['token'];
      const queryStatus = params['status'];

      if (queryStatus === 'cancelled' || queryStatus === 'failed') {
        this.status.set('error');
        this.errorMessage.set('Le paiement a été annulé avant confirmation.');
        return;
      }

      if (!token) {
        this.status.set('error');
        this.errorMessage.set('Aucun jeton de transaction fourni par la passerelle de paiement.');
        return;
      }

      try {
        const invoice = await this.subService.confirmPayDunyaPayment(token);
        this.invoiceDetails.set(invoice);
        this.status.set('success');
      } catch (err: any) {
        console.error('Erreur lors de la confirmation PayDunya:', err);
        this.status.set('error');
        this.errorMessage.set(
          err?.error?.message ||
          'Impossible de valider la transaction auprès de PayDunya. Veuillez contacter le support ou réessayer.'
        );
      }
    });
  }
}
