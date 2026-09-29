import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SubscriptionService, PlanUsage } from '../../../core/services/subscription.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { Invoice } from '../../../core/models/plan.model';
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
              Formule STARTER (999 FCFA / mois)
            }
          </h2>

          <p class="plan-desc">
            @if (authService.subscriptionTier() === 'FREE') {
              Accès gratuit pour tester les fonctionnalités et animer de petits groupes d'élèves.
            } @else {
              Quiz illimités, 100 générations IA par mois, Live jusqu'à 300 joueurs •
              @if (authService.currentUser()?.subscriptionExpiresAt; as expiresAt) {
                Actif jusqu'au <strong>{{ expiresAt | date:'dd/MM/yyyy' }}</strong> : renouvelable depuis la page Tarifs.
              } @else {
                Attribué par l'administration, sans date de fin.
              }
            }
          </p>
        </div>

        <div class="plan-side">
          <a routerLink="/tarifs" class="btn btn-outline btn-sm">
            Voir le comparatif des forfaits
          </a>
        </div>
      </div>

      <!-- 3. QUOTAS : valeurs appliquées par le serveur -->
      @if (usage(); as u) {
        <div class="quotas-grid">
          <!-- Quota 1 : quiz créés sur la plateforme -->
          <div class="card quota-item">
            <div class="quota-row">
              <span class="quota-title">Quiz créés</span>
              <span class="quota-badge">{{ u.quizzesCreated }} / {{ u.quizzesLimit ?? 'Illimité' }}</span>
            </div>
            <div class="bar-track">
              <div class="bar-fill fill-navy" [style.width]="percent(u.quizzesCreated, u.quizzesLimit) + '%'"></div>
            </div>
            <span class="quota-note">
              @if (u.quizzesLimit === null) {
                <span class="success-txt">✓ Création de quiz illimitée</span>
              } @else if (u.quizzesCreated >= u.quizzesLimit) {
                <span class="danger-txt">Quota atteint ({{ u.quizzesCreated }}/{{ u.quizzesLimit }}) : passez au forfait STARTER pour créer d'autres quiz</span>
              } @else {
                <span class="success-txt">✓ {{ u.quizzesLimit - u.quizzesCreated }} création(s) restante(s) sur votre forfait</span>
              }
            </span>
            @if (u.quizzesImported > 0) {
              <span class="quota-note quota-imported">+ {{ u.quizzesImported }} quiz importé(s) de l'ancien QuizzBoard, non comptés dans le quota</span>
            }
          </div>

          <!-- Quota 2 : générations IA du mois -->
          <div class="card quota-item">
            <div class="quota-row">
              <span class="quota-title">Générations IA (Mois)</span>
              <span class="quota-badge">{{ u.aiGenerationsUsed }} / {{ u.aiGenerationsLimit ?? 'Illimité' }}</span>
            </div>
            <div class="bar-track">
              <div class="bar-fill fill-primary" [style.width]="percent(u.aiGenerationsUsed, u.aiGenerationsLimit) + '%'"></div>
            </div>
            <span class="quota-note">
              @if (u.aiGenerationsLimit === null) {
                <span class="success-txt">✓ Générations IA illimitées</span>
              } @else if (u.aiGenerationsUsed >= u.aiGenerationsLimit) {
                <span class="danger-txt">Quota mensuel IA atteint ({{ u.aiGenerationsUsed }}/{{ u.aiGenerationsLimit }})</span>
              } @else {
                <span class="success-txt">✓ {{ u.aiGenerationsLimit - u.aiGenerationsUsed }} génération(s) IA restante(s) ce mois-ci</span>
              }
            </span>
          </div>

          <!-- Quota 3 : joueurs Live -->
          <div class="card quota-item">
            <div class="quota-row">
              <span class="quota-title">Capacité Joueurs Live</span>
              <span class="quota-badge">{{ u.liveParticipantsLimit }} Joueurs</span>
            </div>
            <div class="bar-track">
              <div class="bar-fill fill-green" style="width: 100%"></div>
            </div>
            <span class="quota-note">
              <span class="success-txt">
                @if (u.tier === 'FREE') {
                  Format TD & petits groupes ({{ u.liveParticipantsLimit }} max)
                } @else {
                  ✓ Promotions & grands amphis jusqu'à {{ u.liveParticipantsLimit }} participants
                }
              </span>
            </span>
          </div>
        </div>
      } @else {
        <div class="card quota-item"><span class="quota-note">Chargement de votre consommation...</span></div>
      }

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
                  <td><strong style="color: var(--color-navy);">{{ inv.reference || inv.id }}</strong></td>
                  <td class="body-small">{{ inv.date | date:'dd/MM/yyyy' }}</td>
                  <td>
                    <span class="badge badge-primary">
                      {{ inv.planName }}
                    </span>
                  </td>
                  <td><strong>{{ inv.amountFcfa | number }} FCFA</strong></td>
                  <td>
                    {{ paymentMethodLabel(inv.paymentMethod) }}
                  </td>
                  <td>
                    <span class="status-pill-paid">
                      <app-icon name="check" [size]="11" color="#16A34A"></app-icon>
                      Payé
                    </span>
                  </td>
                  <td style="text-align: right;">
                    <button class="btn btn-outline btn-sm btn-pdf" (click)="downloadReceipt(inv)" title="Imprimer ou enregistrer le reçu en PDF">
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

      .quota-imported { display: block; margin-top: 6px; color: var(--color-text-secondary); font-size: 11.5px; }

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
  `]
})
export class CreatorSubscriptionComponent {
  public authService = inject(AuthService);
  private subService = inject(SubscriptionService);
  private toast = inject(ToastService);

  invoices = this.subService.getInvoices();

  usage = signal<PlanUsage | null>(null);

  constructor() {
    this.subService.loadUsage().then(u => this.usage.set(u));
  }

  percent(used: number, limit: number | null): number {
    if (limit === null || limit <= 0) return 100;
    return Math.min(100, Math.round((used / limit) * 100));
  }

  paymentMethodLabel(method: string): string {
    switch (method) {
      case 'PAYDUNYA': return 'PayDunya';
      case 'WAVE': return 'Wave Money';
      case 'ORANGE_MONEY': return 'Orange Money';
      case 'STRIPE': return 'Carte bancaire';
      default: return method || '—';
    }
  }

  /** Reçu de paiement imprimable (le navigateur propose « Enregistrer au format PDF »). */
  downloadReceipt(inv: Invoice) {
    const w = window.open('', '_blank', 'width=760,height=900');
    if (!w) {
      this.toast.error('Autorisez les fenêtres pop-up de QuizzBoard pour obtenir le reçu.');
      return;
    }
    const esc = (v: unknown) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const user = this.authService.currentUser();
    const date = new Date(inv.date).toLocaleDateString('fr-FR');
    const rows: [string, string][] = [
      ['Référence', inv.reference || inv.id],
      ['Date', date],
      ['Client', `${user?.prenom ?? ''} ${user?.nom ?? ''}`.trim()],
      ['Email', user?.email ?? ''],
      ['Forfait', inv.planName],
      ['Montant', `${(inv.amountFcfa ?? 0).toLocaleString('fr-FR')} FCFA`],
      ['Mode de paiement', this.paymentMethodLabel(inv.paymentMethod)],
      ['Statut', inv.status === 'PAID' ? 'Payé' : inv.status]
    ];
    w.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Reçu QuizzBoard ${esc(inv.reference || inv.id)}</title>
      <style>body{font-family:Segoe UI,Arial,sans-serif;color:#0F172A;margin:40px}h1{margin:0;font-size:22px}
      .brand{color:#F59E0B;font-weight:900;letter-spacing:1px}table{border-collapse:collapse;width:100%;margin-top:24px}
      td{border:1px solid #CBD5E1;padding:10px 12px;font-size:14px}td:first-child{background:#F1F5F9;width:35%;font-weight:600}
      p{color:#475569;font-size:12px;margin-top:24px}</style></head><body>
      <div class="brand">QUIZZBOARD</div><h1>Reçu de paiement</h1>
      <table>${rows.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}</table>
      <p>IA Horizon Plus Consulting — QuizzBoard. Reçu généré le ${new Date().toLocaleDateString('fr-FR')}.</p>
      </body></html>`);
    w.document.close();
    w.focus();
    w.print();
  }
}
