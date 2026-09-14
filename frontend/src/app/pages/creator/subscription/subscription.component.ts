import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SubscriptionService } from '../../../core/services/subscription.service';
import { AuthService } from '../../../core/services/auth.service';
import { QuizService } from '../../../core/services/quiz.service';
import { CourseService } from '../../../core/services/course.service';
import { SubscriptionTier } from '../../../core/models/user.model';
import { IconComponent } from '../../../shared/components/icon/icon.component';

@Component({
  selector: 'app-creator-subscription',
  standalone: true,
  imports: [CommonModule, RouterLink, IconComponent],
  template: `
    <div class="subscription-page animate-fade-in">
      <!-- 1. HEADER (SAME AS OTHER PAGES) -->
      <div class="page-header">
        <div>
          <h1 class="h1">Mon Forfait & Facturation</h1>
          <p class="body-small">Gérez votre formule, suivez vos quotas de consommation et consultez vos factures.</p>
        </div>

        <a routerLink="/tarifs" class="btn btn-outline btn-sm">
          <app-icon name="sparkles" [size]="14" color="var(--color-navy)"></app-icon>
          <span>Consulter les Tarifs</span>
        </a>
      </div>

      <!-- 2. CURRENT PLAN CARD (SIMPLE, FLAT, NO GRADIENT) -->
      <div class="card plan-card">
        <div class="plan-main">
          <div class="plan-tags">
            <span class="badge" [ngClass]="authService.subscriptionTier() === 'STARTER' ? 'badge-primary' : 'badge-navy'">
              FORFAIT {{ authService.subscriptionTier() }}
            </span>
            <span class="active-pill">
              <span class="dot"></span>
              Abonnement Actif
            </span>
          </div>

          <h2 class="plan-name">
            @if (authService.subscriptionTier() === 'FREE') {
              Formule Découverte (Gratuit)
            } @else {
              Formule STARTER Illimité (9 900 FCFA / mois)
            }
          </h2>

          <p class="plan-desc">
            @if (authService.subscriptionTier() === 'FREE') {
              Accès gratuit pour tester les fonctionnalités et animer de petits groupes d'élèves.
            } @else {
              Accès complet illimité • Prochain renouvellement le <strong>15 du mois prochain</strong> (PayDunya).
            }
          </p>
        </div>

        <div class="plan-side">
          <a routerLink="/tarifs" class="btn btn-outline btn-sm">
            Voir le comparatif des forfaits
          </a>
        </div>
      </div>

      <!-- 3. QUOTAS (3 SIMPLE CLEAN CARDS) -->
      <div class="quotas-grid">
        <!-- Quota 1 -->
        <div class="card quota-item">
          <div class="quota-row">
            <span class="quota-title">Quiz & Cours Hébergés</span>
            <span class="quota-badge">
              {{ authService.subscriptionTier() === 'FREE' ? (totalHosted() + ' / 3') : (totalHosted() + ' (Illimités)') }}
            </span>
          </div>
          <div class="bar-track">
            <div class="bar-fill fill-navy" [style.width]="hostedPercent() + '%'"></div>
          </div>
          <span class="quota-note">
            @if (authService.subscriptionTier() === 'FREE') {
              @if (totalHosted() >= 3) {
                <span class="danger-txt">Quota atteint (3/3)</span>
              } @else {
                <span class="success-txt">✓ {{ 3 - totalHosted() }} création(s) restante(s) sur votre forfait</span>
              }
            } @else {
              <span class="success-txt">✓ Création de quiz et cours illimitée</span>
            }
          </span>
        </div>

        <!-- Quota 2 -->
        <div class="card quota-item">
          <div class="quota-row">
            <span class="quota-title">Générations IA (Mois)</span>
            <span class="quota-badge">
              {{ authService.subscriptionTier() === 'FREE' ? (aiGenerationsUsed() + ' / 5') : (aiGenerationsUsed() + ' / 100') }}
            </span>
          </div>
          <div class="bar-track">
            <div class="bar-fill fill-primary" [style.width]="aiGenerationsPercent() + '%'"></div>
          </div>
          <span class="quota-note">
            @if (authService.subscriptionTier() === 'FREE') {
              @if (aiGenerationsUsed() >= 5) {
                <span class="danger-txt">Quota mensuel IA atteint (5/5)</span>
              } @else {
                <span class="success-txt">✓ {{ 5 - aiGenerationsUsed() }} génération(s) IA restante(s) ce mois-ci</span>
              }
            } @else {
              <span class="success-txt">✓ {{ 100 - aiGenerationsUsed() }} générations IA restantes sur votre forfait STARTER</span>
            }
          </span>
        </div>

        <!-- Quota 3 -->
        <div class="card quota-item">
          <div class="quota-row">
            <span class="quota-title">Capacité Joueurs Live</span>
            <span class="quota-badge">
              {{ authService.subscriptionTier() === 'FREE' ? '25 Joueurs' : '200 Joueurs' }}
            </span>
          </div>
          <div class="bar-track">
            <div class="bar-fill fill-green" [style.width]="authService.subscriptionTier() === 'FREE' ? '100%' : '25%'"></div>
          </div>
          <span class="quota-note">
            <span class="success-txt">
              @if (authService.subscriptionTier() === 'STARTER') {
                ✓ Promotions & grands amphis jusqu'à 200 participants
              } @else {
                Format TD & petits groupes (25 max)
              }
            </span>
          </span>
        </div>
      </div>

      <!-- 4. INVOICES TABLE (SAME AS ALL OTHER TABLES) -->
      <div class="card table-card">
        <div class="table-header-title">
          <h3 class="h3" style="font-size: 15px; margin: 0;">Historique des Factures</h3>
          <span class="body-small text-muted">{{ invoices().length }} factures émises</span>
        </div>

        <div class="table-wrapper">
          <table class="simple-table">
            <thead>
              <tr>
                <th>RÉFÉRENCE</th>
                <th>DATE</th>
                <th>FORFAIT</th>
                <th>MONTANT</th>
                <th>MODE DE PAIEMENT</th>
                <th>STATUT</th>
                <th style="text-align: right;">REÇU</th>
              </tr>
            </thead>
            <tbody>
              @for (inv of invoices(); track inv.id) {
                <tr>
                  <td><strong style="color: var(--color-navy);">{{ inv.id }}</strong></td>
                  <td class="body-small">{{ inv.date }}</td>
                  <td>
                    <span class="badge badge-primary">
                      {{ inv.planName }}
                    </span>
                  </td>
                  <td><strong>{{ inv.amountFcfa | number }} FCFA</strong></td>
                  <td>
                    {{ inv.paymentMethod === 'WAVE' ? 'Wave Money' : (inv.paymentMethod === 'ORANGE_MONEY' ? 'Orange Money' : 'Carte Bancaire') }}
                  </td>
                  <td>
                    <span class="status-pill-paid">
                      <app-icon name="check" [size]="11" color="#16A34A"></app-icon>
                      Payé
                    </span>
                  </td>
                  <td style="text-align: right;">
                    <button class="btn btn-outline btn-sm btn-pdf" (click)="downloadReceipt(inv.id)">
                      <app-icon name="download" [size]="12"></app-icon>
                      <span>PDF</span>
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <!-- 5. DISCRETE TESTER BAR -->
      <div class="card tester-card">
        <span class="tester-title">Tester les vues forfaits :</span>
        <div class="tester-btns">
          <button 
            type="button" 
            class="pill-btn" 
            [class.active]="authService.subscriptionTier() === 'FREE'"
            (click)="switchTier('FREE')">
            Plan FREE (0 F)
          </button>
          <button 
            type="button" 
            class="pill-btn" 
            [class.active]="authService.subscriptionTier() === 'STARTER'"
            (click)="switchTier('STARTER')">
            Plan STARTER (9 900 F)
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .subscription-page {
      display: flex;
      flex-direction: column;
      gap: 20px;
      width: 100%;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
    }

    /* 2. CURRENT PLAN CARD */
    .plan-card {
      padding: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 20px;
      background: #FFFFFF;

      .plan-main {
        display: flex;
        flex-direction: column;
        gap: 8px;
        flex: 1;
        min-width: 260px;

        .plan-tags {
          display: flex;
          align-items: center;
          gap: 10px;

          .active-pill {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            font-size: 11.5px;
            font-weight: 700;
            color: #166534;
            background: #DCFCE7;
            padding: 2px 8px;
            border-radius: var(--radius-full);

            .dot {
              width: 6px;
              height: 6px;
              border-radius: 50%;
              background: #16A34A;
            }
          }
        }

        .plan-name {
          font-size: 18px;
          font-weight: 800;
          color: var(--color-navy);
          margin: 0;
        }

        .plan-desc {
          font-size: 13px;
          color: var(--color-text-secondary);
          margin: 0;
          line-height: 1.4;
        }
      }

      .plan-side {
        display: flex;
        align-items: center;
      }
    }

    /* 3. QUOTAS GRID */
    .quotas-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 16px;

      .quota-item {
        padding: 16px 18px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        background: #FFFFFF;

        .quota-row {
          display: flex;
          justify-content: space-between;
          align-items: center;

          .quota-title {
            font-size: 13px;
            font-weight: 700;
            color: var(--color-navy);
          }

          .quota-badge {
            font-size: 12px;
            font-weight: 800;
            color: var(--color-navy);
            background: var(--color-background);
            padding: 2px 8px;
            border-radius: var(--radius-xs);
            border: 1px solid var(--color-border);
          }
        }

        .bar-track {
          width: 100%;
          height: 6px;
          background: #F1F5F9;
          border-radius: var(--radius-full);
          overflow: hidden;

          .bar-fill {
            height: 100%;
            border-radius: var(--radius-full);
            transition: width 0.3s ease;

            &.fill-navy { background: var(--color-navy); }
            &.fill-primary { background: var(--color-primary); }
            &.fill-green { background: #10B981; }
          }
        }

        .quota-note {
          font-size: 11.5px;
          font-weight: 600;

          .success-txt { color: #166534; }
          .danger-txt { color: #DC2626; }
        }
      }
    }

    /* 4. INVOICES TABLE */
    .table-card {
      padding: 0;
      overflow: hidden;
      background: #FFFFFF;

      .table-header-title {
        padding: 14px 18px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid var(--color-border);
        background: #FFFFFF;
      }

      .table-wrapper {
        overflow-x: auto;
      }

      .simple-table {
        width: 100%;
        border-collapse: collapse;
        text-align: left;

        th {
          background: #F8FAFC;
          color: var(--color-text-secondary);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.04em;
          padding: 10px 18px;
          border-bottom: 1px solid var(--color-border);
        }

        td {
          padding: 12px 18px;
          border-bottom: 1px solid var(--color-border);
          font-size: 13px;
        }

        tr:last-child td {
          border-bottom: none;
        }

        .status-pill-paid {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: #DCFCE7;
          color: #166534;
          font-size: 11px;
          font-weight: 700;
          padding: 2px 7px;
          border-radius: var(--radius-full);
        }

        .btn-pdf {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 8px;
          font-size: 11.5px;
        }
      }
    }

    /* 5. TESTER CARD */
    .tester-card {
      padding: 10px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
      background: #FFFFFF;

      .tester-title {
        font-size: 12px;
        font-weight: 700;
        color: var(--color-text-secondary);
      }

      .tester-btns {
        display: flex;
        gap: 6px;

        .pill-btn {
          background: #FFFFFF;
          border: 1px solid var(--color-border);
          padding: 4px 12px;
          border-radius: var(--radius-full);
          font-size: 11.5px;
          font-weight: 600;
          color: var(--color-text-secondary);
          cursor: pointer;
          transition: all 0.15s ease;

          &:hover { background: var(--color-background); }
          &.active {
            background: var(--color-navy);
            color: #FFFFFF;
            border-color: var(--color-navy);
          }
        }
      }
    }
  `]
})
export class CreatorSubscriptionComponent {
  public authService = inject(AuthService);
  private subService = inject(SubscriptionService);
  private quizService = inject(QuizService);
  private courseService = inject(CourseService);

  invoices = this.subService.getInvoices();

  userQuizzesCount = computed(() => {
    const user = this.authService.currentUser();
    if (!user) return 0;
    return this.quizService.getQuizzes()().filter(q =>
      (q.creatorId && (q.creatorId === user.id || q.creatorId === user.email)) ||
      ((q as any).creatorEmail && (q as any).creatorEmail === user.email)
    ).length;
  });

  userCoursesCount = computed(() => {
    const user = this.authService.currentUser();
    if (!user) return 0;
    return this.courseService.getCourses()().filter(c =>
      c.creatorId && (c.creatorId === user.id || c.creatorId === user.email)
    ).length;
  });

  totalHosted = computed(() => this.userQuizzesCount() + this.userCoursesCount());

  hostedPercent = computed(() => {
    if (this.authService.subscriptionTier() === 'STARTER') {
      return Math.min(100, Math.round((this.totalHosted() / 50) * 100));
    }
    return Math.min(100, Math.round((this.totalHosted() / 3) * 100));
  });

  aiGenerationsUsed = computed(() => {
    const user = this.authService.currentUser();
    if (!user) return 0;
    try {
      const stored = localStorage.getItem(`quizzboard_ai_gens_${user.id || user.email}`);
      return stored ? parseInt(stored, 10) : 0;
    } catch {
      return 0;
    }
  });

  aiGenerationsPercent = computed(() => {
    const max = this.authService.subscriptionTier() === 'STARTER' ? 100 : 5;
    return Math.min(100, Math.round((this.aiGenerationsUsed() / max) * 100));
  });

  switchTier(tier: SubscriptionTier) {
    this.authService.updateSubscription(tier).subscribe();
  }

  downloadReceipt(id: string) {
    alert(`Téléchargement de la facture ${id} au format PDF.`);
  }
}
