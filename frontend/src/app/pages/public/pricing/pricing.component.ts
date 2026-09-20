import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SubscriptionService } from '../../../core/services/subscription.service';
import { AuthService } from '../../../core/services/auth.service';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { SubscriptionPlan } from '../../../core/models/plan.model';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { extractFieldErrors, getGeneralErrorMessage } from '../../../core/utils/form-error.util';

@Component({
  selector: 'app-pricing',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, RouterLink],
  template: `
    <div class="pricing-page">
      <!-- HEADER -->
      <section class="pricing-header">
        <div class="header-container">
          <div class="badge badge-primary">
            <app-icon name="shield" [size]="14" color="var(--color-navy)"></app-icon>
            <span>TRANSPARENCE TOTALE • SANS ENGAGEMENT</span>
          </div>
          <h1 class="display-title" style="margin-top: 16px;">Choisissez votre Plan</h1>
          <p class="body-lead" style="max-width: 680px; margin: 12px auto 28px auto;">
            Des tarifs pensés pour les formateurs indépendants, universités et entreprises en Afrique et à l'international.
          </p>

          <!-- Currency Switcher -->
          <div class="currency-toggle">
            <button 
              type="button" 
              [class.active]="currency === 'FCFA'" 
              (click)="currency = 'FCFA'">
              Franc CFA (FCFA)
            </button>
            <button 
              type="button" 
              [class.active]="currency === 'USD'" 
              (click)="currency = 'USD'">
              Dollars ($ USD)
            </button>
          </div>
        </div>
      </section>

      <!-- PRICING CARDS -->
      <section class="pricing-cards-section">
        <div class="pricing-grid">
          @for (plan of plans(); track plan.id) {
            <div class="pricing-card card" [class.card-featured]="plan.isPopular">
              @if (plan.badge) {
                <div class="plan-badge">{{ plan.badge }}</div>
              }

              <div class="plan-header">
                <h3 class="plan-name">{{ plan.name }}</h3>
                <p class="plan-desc">{{ plan.description }}</p>
                <div class="plan-price">
                  @if (currency === 'FCFA') {
                    <span class="amount">{{ plan.priceFcfa === 0 ? 'Gratuit' : (plan.priceFcfa | number) + ' F' }}</span>
                    @if (plan.priceFcfa > 0) { <span class="period">/ mois</span> }
                  } @else {
                    <span class="amount">{{ plan.priceUsd === 0 ? 'Gratuit' : '$' + plan.priceUsd }}</span>
                    @if (plan.priceUsd > 0) { <span class="period">/ mois</span> }
                  }
                </div>
              </div>

              <!-- Action CTA -->
              <div class="plan-action">
                @if (plan.id === 'FREE') {
                  <a 
                    [routerLink]="authService.isAuthenticated() ? authService.dashboardUrl() : '/inscription'"
                    [queryParams]="authService.isAuthenticated() ? {} : { plan: 'FREE' }"
                    class="btn btn-primary btn-full"
                    style="display: flex; align-items: center; justify-content: center; text-decoration: none; gap: 8px; font-weight: 700; width: 100%; box-sizing: border-box;">
                    <app-icon name="sparkles" [size]="16" color="var(--color-navy)"></app-icon>
                    <span>{{ authService.isAuthenticated() ? 'Accéder à mon Espace (Gratuit)' : 'Commencer Gratuitement' }}</span>
                  </a>
                } @else {
                  <button 
                    type="button" 
                    class="btn btn-outline btn-full"
                    (click)="openPaymentModal(plan)">
                    <app-icon name="shield" [size]="15" color="var(--color-navy)"></app-icon>
                    <span>Choisir {{ plan.name }}</span>
                  </button>
                }
              </div>

              <!-- Feature List -->
              <div class="plan-features">
                <div class="features-title">Ce qui est inclus :</div>
                <ul>
                  @for (feat of plan.features; track feat.text) {
                    <li [class.disabled]="!feat.included" [class.highlight]="feat.highlight">
                      <span class="feat-icon">
                        <app-icon [name]="feat.included ? 'check' : 'x-circle'" [size]="15" [color]="feat.included ? 'var(--color-success)' : 'var(--color-disabled)'"></app-icon>
                      </span>
                      <span class="feat-text">{{ feat.text }}</span>
                    </li>
                  }
                </ul>
              </div>
            </div>
          }
        </div>
      </section>

      <!-- PAYMENT MODAL -->
      @if (selectedPlanForPayment) {
        <div class="modal-backdrop" (click)="selectedPlanForPayment = null">
          <div class="modal-card card" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3 class="h2">Souscription au Plan {{ selectedPlanForPayment.name }}</h3>
              <button class="close-btn" (click)="selectedPlanForPayment = null">✕</button>
            </div>

            <div class="modal-body">
              <div class="summary-box">
                <div class="summary-row">
                  <span>Montant à régler :</span>
                  <span class="summary-val">
                    {{ currency === 'FCFA' ? (selectedPlanForPayment.priceFcfa | number) + ' FCFA' : '$' + selectedPlanForPayment.priceUsd }} / mois
                  </span>
                </div>
                <div class="summary-row" style="font-size: 12px; color: var(--color-text-secondary);">
                  <span>Renouvellement automatique • Résiliable à tout moment en 1 clic</span>
                </div>
              </div>

              <div class="payment-methods">
                <label class="section-lbl">Passerelle de paiement sécurisée :</label>

                <!-- PayDunya Unique Gateway -->
                <div class="payment-option selected" style="cursor: default;">
                  <div class="option-left">
                    <div class="pay-logo-badge" style="background: #0284C7;">
                      <app-icon name="shield" [size]="18" color="#FFFFFF"></app-icon>
                    </div>
                    <div>
                      <div class="pay-title" style="display: flex; align-items: center; gap: 6px;">
                        <span>PayDunya Passerelle Globale</span>
                        <span class="badge badge-primary" style="font-size: 10px; padding: 2px 6px;">Sécurisé</span>
                      </div>
                      <div class="pay-sub">Accepte Wave, Orange Money, Free Money et Carte Bancaire (Visa / Mastercard)</div>
                    </div>
                  </div>
                  <input type="radio" checked readonly>
                </div>
              </div>

              <!-- Input fields with real-time field errors -->
              <div class="form-group" style="margin-top: 16px;">
                <label class="section-lbl" style="display: block; margin-bottom: 6px;">
                  Numéro de téléphone mobile (optionnel)
                </label>
                <input 
                  type="tel"
                  [(ngModel)]="paymentPhone"
                  (input)="clearFieldError('phoneNumber')"
                  [class.input-error]="fieldErrors['phoneNumber']"
                  placeholder="ex: 77 123 45 67 ou +221 77 123 45 67"
                  class="input-field"
                  style="width: 100%; padding: 10px 14px; border-radius: 8px; border: 1.5px solid var(--color-border); font-size: 14px; font-weight: 600;">
                <span style="display: block; font-size: 12px; color: var(--color-text-secondary); margin-top: 4px;">
                  Préremplit automatiquement votre contact sur le guichet sécurisé PayDunya.
                </span>
                @if (fieldErrors['phoneNumber']) {
                  <span class="field-error-msg animate-fade-in">
                    <app-icon name="alert-circle" [size]="13" color="#DC2626"></app-icon>
                    <span>{{ fieldErrors['phoneNumber'] }}</span>
                  </span>
                }
              </div>

              @if (generalError) {
                <div class="alert-error animate-fade-in" style="margin-top: 14px; padding: 10px 14px; border-radius: 8px; background: #fee2e2; border: 1px solid #f87171; color: #991b1b; font-size: 13px; display: flex; align-items: center; gap: 8px;">
                  <app-icon name="alert-circle" [size]="15" color="#991b1b"></app-icon>
                  <span>{{ generalError }}</span>
                </div>
              }

              @if (isProcessing) {
                <div class="processing-box">
                  <div class="spinner"></div>
                  <p>Redirection vers la passerelle sécurisée PayDunya en cours...</p>
                </div>
              }
            </div>

            <div class="modal-footer">
              <button class="btn btn-outline" (click)="selectedPlanForPayment = null" [disabled]="isProcessing">
                Annuler
              </button>
              <button class="btn btn-primary" (click)="confirmPayment()" [disabled]="isProcessing">
                <app-icon name="shield" [size]="16" color="var(--color-navy)"></app-icon>
                <span>{{ isProcessing ? 'Initialisation...' : 'Payer avec PayDunya' }}</span>
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .pricing-page {
      padding-bottom: 80px;
    }

    .pricing-header {
      padding: 60px 24px 40px 24px;
      text-align: center;
      background-color: #FFFFFF;
      border-bottom: 1px solid var(--color-border);
    }

    .header-container {
      max-width: 900px;
      margin: 0 auto;
    }

    .currency-toggle {
      display: inline-flex;
      background-color: var(--color-background);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-full);
      padding: 4px;
      gap: 4px;

      button {
        padding: 8px 20px;
        border-radius: var(--radius-full);
        font-size: 13px;
        font-weight: 700;
        color: var(--color-text-secondary);
        transition: all 0.15s ease;

        &.active {
          background-color: var(--color-navy);
          color: #FFFFFF;
        }
      }
    }

    .pricing-cards-section {
      max-width: 960px;
      margin: 40px auto 0 auto;
      padding: 0 24px;
    }

    .pricing-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 32px;
      max-width: 820px;
      margin: 0 auto;
      align-items: stretch;
    }

    .pricing-card {
      display: flex;
      flex-direction: column;
      position: relative;
      background: #FFFFFF;

      &.card-featured {
        border: 2px solid var(--color-primary);
        box-shadow: var(--shadow-lg);
      }

      .plan-badge {
        position: absolute;
        top: -14px;
        left: 50%;
        transform: translateX(-50%);
        background-color: var(--color-primary);
        color: var(--color-navy);
        font-size: 11px;
        font-weight: 800;
        padding: 4px 14px;
        border-radius: var(--radius-full);
        letter-spacing: 0.05em;
      }
    }

    .plan-header {
      padding-bottom: 24px;
      border-bottom: 1px solid var(--color-border);

      .plan-name {
        font-size: 22px;
        font-weight: 800;
        margin-bottom: 6px;
      }

      .plan-desc {
        font-size: 13px;
        color: var(--color-text-secondary);
        min-height: 40px;
        margin-bottom: 16px;
      }

      .plan-price {
        .amount {
          font-size: 36px;
          font-weight: 800;
          color: var(--color-navy);
        }
        .period {
          font-size: 14px;
          font-weight: 600;
          color: var(--color-text-secondary);
          margin-left: 4px;
        }
      }
    }

    .plan-action {
      padding: 24px 0;

      .btn-full {
        width: 100%;
      }
    }

    .plan-features {
      flex: 1;

      .features-title {
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--color-navy);
        margin-bottom: 12px;
      }

      ul {
        list-style: none;
        padding: 0;

        li {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          font-size: 14px;
          margin-bottom: 10px;
          color: var(--color-text-primary);

          &.disabled {
            color: var(--color-disabled);
          }

          &.highlight {
            font-weight: 700;
            color: var(--color-navy);
          }
        }
      }
    }

    /* Modal Styles */
    .modal-backdrop {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      background: rgba(3, 36, 71, 0.65) !important;
      backdrop-filter: blur(6px) !important;
      -webkit-backdrop-filter: blur(6px) !important;
      z-index: 999999 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      padding: 16px !important;
      margin: 0 !important;
    }

    .modal-card {
      width: 100%;
      max-width: 560px;
      background: #FFFFFF;
      border-radius: var(--radius-xl);
      padding: 32px;
      box-shadow: var(--shadow-xl);
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;

      .close-btn {
        font-size: 20px;
        color: var(--color-text-secondary);
        cursor: pointer;
        &:hover { color: var(--color-navy); }
      }
    }

    .summary-box {
      background: var(--color-background);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: 16px;
      margin-bottom: 24px;

      .summary-row {
        display: flex;
        justify-content: space-between;
        font-weight: 600;
        font-size: 15px;

        .summary-val {
          color: var(--color-navy);
          font-weight: 800;
        }
      }
    }

    .payment-methods {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 24px;

      .section-lbl {
        font-size: 13px;
        font-weight: 700;
        color: var(--color-navy);
      }

      .payment-option {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 14px 16px;
        border: 1.5px solid var(--color-border);
        border-radius: var(--radius-md);
        cursor: pointer;
        transition: all 0.15s ease;

        &:hover { border-color: var(--color-navy); }
        &.selected {
          border-color: var(--color-primary);
          background-color: var(--color-primary-light);
        }

        .option-left {
          display: flex;
          align-items: center;
          gap: 12px;

          .pay-logo-badge {
            width: 36px;
            height: 36px;
            border-radius: var(--radius-md);
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .pay-title {
            font-weight: 700;
            font-size: 14px;
            color: var(--color-navy);
          }

          .pay-sub {
            font-size: 12px;
            color: var(--color-text-secondary);
          }
        }
      }
    }

    .processing-box {
      text-align: center;
      padding: 20px;
      font-weight: 600;
      color: var(--color-navy);
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding-top: 16px;
      border-top: 1px solid var(--color-border);
    }
  `]
})
export class PricingComponent implements OnInit {
  public authService = inject(AuthService);
  private subService = inject(SubscriptionService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);

  billingCycle: 'MONTHLY' | 'YEARLY' = 'MONTHLY';
  currency: 'FCFA' | 'USD' = 'FCFA';
  plans = this.subService.getPlans();
  selectedPlanForPayment: SubscriptionPlan | null = null;
  selectedMethod: 'PAYDUNYA' = 'PAYDUNYA';
  paymentPhone = '';
  fieldErrors: Record<string, string> = {};
  generalError = '';
  isProcessing = false;

  clearFieldError(field: string): void {
    if (this.fieldErrors[field]) {
      const updated = { ...this.fieldErrors };
      delete updated[field];
      this.fieldErrors = updated;
      this.cdr.markForCheck();
    }
  }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const targetPlan = params['plan'];
      if (targetPlan) {
        const found = this.plans().find(p => p.id === targetPlan);
        if (found && found.id === 'FREE') {
          this.selectPlan(found);
        } else if (found) {
          this.openPaymentModal(found);
        }
      }
      this.cdr.markForCheck();
    });
  }

  selectPlan(plan: SubscriptionPlan) {
    if (plan.id === 'FREE') {
      if (!this.authService.isAuthenticated()) {
        this.router.navigate(['/inscription'], { queryParams: { plan: 'FREE' } });
        return;
      }
      this.authService.updateSubscription('FREE').subscribe({ error: () => {} });
      this.router.navigate([this.authService.dashboardUrl()]);
    }
  }

  openPaymentModal(plan: SubscriptionPlan) {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/connexion']);
      return;
    }
    this.fieldErrors = {};
    this.generalError = '';
    this.paymentPhone = '';
    this.selectedPlanForPayment = plan;
    this.cdr.markForCheck();
  }

  confirmPayment() {
    if (!this.selectedPlanForPayment) return;
    this.fieldErrors = {};
    this.generalError = '';

    if (this.paymentPhone.trim()) {
      const digits = this.paymentPhone.trim().replace(/[\s\-\(\)\+]/g, '');
      if (digits.length < 8) {
        this.fieldErrors['phoneNumber'] = 'Veuillez saisir un numéro de téléphone valide (au moins 8 chiffres).';
      }
    }

    if (Object.keys(this.fieldErrors).length > 0) {
      this.cdr.markForCheck();
      return;
    }

    this.isProcessing = true;
    this.cdr.markForCheck();

    this.subService.subscribeToPlan(this.selectedPlanForPayment.id, 'PAYDUNYA', this.paymentPhone)
      .then((started) => {
        this.isProcessing = false;
        if (!started) {
          this.generalError = 'Impossible de créer une session PayDunya réelle. Vérifiez la configuration de paiement et réessayez.';
          this.cdr.markForCheck();
          return;
        }
        this.cdr.markForCheck();
      })
      .catch((err) => {
        this.isProcessing = false;
        this.fieldErrors = extractFieldErrors(err);
        this.generalError = getGeneralErrorMessage(err, 'La connexion avec la passerelle PayDunya a échoué. Veuillez réessayer.');
        this.cdr.markForCheck();
      });
  }
}
