import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SubscriptionService } from '../../../core/services/subscription.service';
import { AuthService } from '../../../core/services/auth.service';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { SubscriptionPlan } from '../../../core/models/plan.model';
import { IconComponent } from '../../../shared/components/icon/icon.component';

@Component({
  selector: 'app-pricing',
  standalone: true,
  imports: [CommonModule, IconComponent, RouterLink],
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
            <div class="pricing-card card" [class.card-featured]="plan.isPopular" [class.card-current]="isCurrentPlan(plan)">
              @if (isCurrentPlan(plan)) {
                <div class="plan-badge badge-current">Votre forfait actuel</div>
              } @else if (plan.badge) {
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
                @if (isCurrentPlan(plan)) {
                  <button type="button" class="btn btn-full plan-cta cta-current" disabled>
                    <app-icon name="check-circle" [size]="15" color="#166534"></app-icon>
                    <span>{{ currentPlanLabel() }}</span>
                  </button>
                } @else if (plan.id === 'FREE') {
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
                    class="btn btn-full plan-cta"
                    [class.cta-starter]="plan.id === 'STARTER'"
                    [class.cta-learner]="plan.id === 'LEARNER_PLUS'"
                    [class.is-loading]="subService.pendingCheckout() === plan.id"
                    [disabled]="subService.pendingCheckout() !== null"
                    (click)="choosePaidPlan(plan)">
                    @if (subService.pendingCheckout() === plan.id) {
                      <span class="btn-spinner spinner-sm" aria-hidden="true"></span>
                      <span>Redirection vers PayDunya...</span>
                    } @else {
                      <app-icon name="shield" [size]="15" color="#FFFFFF"></app-icon>
                      <span>Choisir {{ plan.name }}</span>
                    }
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
      max-width: 1180px;
      margin: 40px auto 0 auto;
      padding: 0 24px;
    }

    .pricing-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 22px;
      max-width: 1120px;
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

      .card-current {
        border: 2px solid #16A34A !important;
      }

      .badge-current {
        background: #16A34A !important;
        color: #FFFFFF !important;
      }

      .cta-current {
        background: #DCFCE7 !important;
        color: #166534 !important;
        border: 1px solid #16A34A !important;
        cursor: default;
      }

      .plan-cta {
        border: 0;
        color: #FFFFFF;
        box-shadow: var(--shadow-sm);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;

        &.cta-starter {
          background: #0F766E;
        }

        &.cta-starter:hover {
          background: #115E59;
        }

        &.cta-learner {
          background: #7C3AED;
        }

        &.cta-learner:hover {
          background: #6D28D9;
        }
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

    @media (max-width: 1050px) {
      .pricing-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 700px) {
      .pricing-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class PricingComponent implements OnInit {
  public authService = inject(AuthService);
  public subService = inject(SubscriptionService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);

  billingCycle: 'MONTHLY' | 'YEARLY' = 'MONTHLY';
  currency: 'FCFA' | 'USD' = 'FCFA';
  plans = this.subService.getPlans();

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const targetPlan = params['plan'];
      if (targetPlan) {
        const found = this.plans().find(p => p.id === targetPlan);
        if (found && found.id === 'FREE') {
          this.selectPlan(found);
        } else if (found && !this.isCurrentPlan(found)) {
          this.choosePaidPlan(found);
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
      // Déjà connecté : on ouvre simplement l'espace (un abonné payant ne doit pas perdre son forfait par ce bouton)
      this.router.navigate([this.authService.dashboardUrl()]);
    }
  }

  /** Le forfait de l'utilisateur connecté est signalé sur sa carte (et ne peut pas être racheté). */
  isCurrentPlan(plan: SubscriptionPlan): boolean {
    return this.authService.isAuthenticated() && this.authService.subscriptionTier() === plan.id;
  }

  currentPlanLabel(): string {
    const expiresAt = this.authService.currentUser()?.subscriptionExpiresAt;
    return expiresAt ? `Forfait actif jusqu'au ${new Date(expiresAt).toLocaleDateString('fr-FR')}` : 'Forfait actif';
  }

  /** Forfait payant : départ direct vers le guichet PayDunya (PayDunya demande lui-même téléphone et email). */
  choosePaidPlan(plan: SubscriptionPlan) {
    if (plan.id === 'FREE') return;
    this.subService.goToCheckout(plan.id);
  }
}
