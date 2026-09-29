import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AdminService } from '../../../core/services/admin.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, IconComponent],
  template: `
    <div class="admin-dashboard animate-fade-in">
      <!-- HEADER -->
      <div class="page-header">
        <div>
          <div class="superadmin-badge-strip">
            <span class="badge badge-orange">
              <app-icon name="shield" [size]="13" color="var(--color-orange)"></app-icon>
              <span>SUPERADMINISTRATION GLOBALE</span>
            </span>
            @if (stats()) {
              <span class="health-pill" [class.warn]="health().warnings > 0 && health().down === 0" [class.down]="health().down > 0">
                <span class="pulse-dot"></span>
                <span>{{ health().label }}</span>
              </span>
            }
          </div>
          <h1 class="h1" style="margin-top: 8px;">Supervision & Pilotage Central</h1>
          <p class="body-small">
            Indicateurs calculés à partir des données réelles de la plateforme.
            @if (stats(); as s) { Mis à jour le {{ s.checkedAt | date:'dd/MM/yyyy à HH:mm' }}. }
          </p>
        </div>

        <div class="header-actions">
          <button type="button" class="btn btn-outline btn-sm" (click)="refresh()" [disabled]="loading()">
            <app-icon name="refresh-cw" [size]="15"></app-icon>
            <span>{{ loading() ? 'Actualisation...' : 'Actualiser' }}</span>
          </button>
          <a routerLink="/admin/users" class="btn btn-outline btn-sm">
            <app-icon name="users" [size]="15"></app-icon>
            <span>Gérer les Utilisateurs</span>
          </a>
          <a routerLink="/admin/finances" class="btn btn-primary btn-sm">
            <app-icon name="credit-card" [size]="15" color="var(--color-navy)"></app-icon>
            <span>Rapports Financiers</span>
          </a>
        </div>
      </div>

      @if (stats(); as s) {
        <!-- 4 KPI CARDS -->
        <div class="kpi-grid">
          <div class="kpi-card card">
            <div class="kpi-top">
              <span class="kpi-title">Utilisateurs inscrits</span>
              <span class="kpi-trend" [class.positive]="s.newUsersThisMonth > 0" [class.neutral]="s.newUsersThisMonth === 0">+{{ s.newUsersThisMonth }} ce mois</span>
            </div>
            <div class="kpi-val">{{ s.totalUsers | number }}</div>
            <div class="kpi-breakdown">
              <span><strong>{{ s.creatorsCount | number }}</strong> Formateurs</span>
              <span>•</span>
              <span><strong>{{ s.learnersCount | number }}</strong> Apprenants</span>
              <span>•</span>
              <span><strong>{{ s.adminsCount }}</strong> Admin</span>
            </div>
          </div>

          <div class="kpi-card card">
            <div class="kpi-top">
              <span class="kpi-title">Revenus du mois</span>
              <span class="kpi-trend neutral">Mois dernier : {{ s.revenueLastMonthFcfa | number }} F</span>
            </div>
            <div class="kpi-val highlight-green">{{ s.revenueThisMonthFcfa | number }} F</div>
            <div class="kpi-breakdown">
              <span>Total encaissé : <strong>{{ s.totalRevenueFcfa | number }} F</strong></span>
              <span>•</span>
              <span><strong>{{ s.paidTransactionsCount }}</strong> paiement(s) confirmé(s)</span>
            </div>
          </div>

          <div class="kpi-card card">
            <div class="kpi-top">
              <span class="kpi-title">Quiz & Cours hébergés</span>
              <span class="kpi-trend neutral">{{ s.completedParticipationsThisMonth | number }} quiz joués ce mois</span>
            </div>
            <div class="kpi-val">{{ s.totalQuizzes | number }}</div>
            <div class="kpi-breakdown">
              <span><strong>{{ s.totalCourses | number }}</strong> Cours</span>
              <span>•</span>
              <span><strong>{{ s.totalQuestions | number }}</strong> Questions</span>
              <span>•</span>
              <span><strong>{{ s.completedParticipations | number }}</strong> quiz terminés au total</span>
            </div>
          </div>

          <div class="kpi-card card">
            <div class="kpi-top">
              <span class="kpi-title">Générations IA (mois)</span>
              <span class="kpi-trend" [class.positive]="aiReady()" [class.warning]="!aiReady()">{{ aiReady() ? 'Gemini opérationnel' : 'IA de secours' }}</span>
            </div>
            <div class="kpi-val highlight-orange">{{ s.aiGenerationsThisMonth | number }}</div>
            <div class="kpi-breakdown">
              <span>Quiz et cours générés ce mois</span>
              <span>•</span>
              <span>Gemini : <strong>{{ serviceShort('gemini') }}</strong></span>
            </div>
          </div>
        </div>

        <!-- CHARTS SECTION -->
        <div class="charts-admin-grid">
          <!-- DIAGRAMME 1: REVENUS ENCAISSÉS (6 MOIS) -->
          <div class="card chart-card">
            <div class="chart-header">
              <div>
                <h3 class="chart-title">Revenus encaissés (6 derniers mois)</h3>
                <p class="chart-subtitle">Paiements confirmés des forfaits, en FCFA</p>
              </div>
              <div class="chart-tag-pill">
                <app-icon name="trending-up" [size]="14" color="var(--color-success)"></app-icon>
                <span>{{ revenueTrendLabel() }}</span>
              </div>
            </div>

            @if (revenueSixMonths() === 0) {
              <p class="empty-note">Aucun paiement encaissé sur les 6 derniers mois.</p>
            }
            <div class="chart-bars-wrap">
              @for (m of revenueBars(); track m.month) {
                <div class="bar-col" [class.is-current]="m.isCurrent">
                  <div class="bar-val-tip">{{ m.amountLabel }}</div>
                  <div class="bar-track">
                    <div class="bar-fill-inner" [style.height]="m.percent + '%'"></div>
                  </div>
                  <div class="bar-month-label">{{ m.label }}</div>
                </div>
              }
            </div>

            <div class="chart-legend-row">
              <div class="legend-item">
                <span class="legend-dot dot-current"></span>
                <span>Mois en cours : <strong>{{ s.revenueThisMonthFcfa | number }} FCFA</strong></span>
              </div>
              <div class="legend-item">
                <span class="legend-dot dot-prev"></span>
                <span>Moyenne sur 6 mois : <strong>{{ revenueSixMonths() / 6 | number:'1.0-0' }} FCFA</strong></span>
              </div>
            </div>
          </div>

          <!-- DIAGRAMME 2: RÉPARTITION DES COMPTES -->
          <div class="card chart-card">
            <div class="chart-header">
              <div>
                <h3 class="chart-title">Répartition des Utilisateurs</h3>
                <p class="chart-subtitle">Forfaits en cours de validité, par type de compte</p>
              </div>
              <div class="chart-tag-pill">
                <span>{{ s.totalUsers | number }} Comptes</span>
              </div>
            </div>

            <div class="distribution-bars-wrap">
              @for (row of distribution(); track row.name) {
                <div class="dist-row">
                  <div class="dist-label">
                    <span class="dist-name">{{ row.name }}</span>
                    <span class="dist-val">{{ row.count | number }} ({{ row.percent | number:'1.0-1' }}%)</span>
                  </div>
                  <div class="dist-progress-track">
                    <div class="dist-fill" [ngClass]="row.css" [style.width.%]="row.percent"></div>
                  </div>
                </div>
              }
            </div>

            <div class="quick-stat-box">
              <div class="stat-mini">
                <span class="stat-lbl">Formateurs passés au payant :</span>
                <strong class="stat-num text-success">{{ conversionRate() | number:'1.0-1' }}%</strong>
              </div>
              <div class="stat-mini">
                <span class="stat-lbl">Sessions Live en cours :</span>
                <strong class="stat-num text-primary">{{ s.activeLiveSessions }} ({{ s.activeLivePlayers }} joueurs)</strong>
              </div>
            </div>
          </div>
        </div>

        <!-- BOTTOM SECTION: ÉTAT DES SERVICES & JOURNAL D'AUDIT -->
        <div class="bottom-admin-grid">
          <div class="card status-card">
            <div class="card-head">
              <h3 class="h3" style="margin: 0; font-size: 16px;">État des services</h3>
              <span class="badge badge-primary">Vérifié à {{ s.checkedAt | date:'HH:mm' }}</span>
            </div>

            <div class="services-list">
              @for (svc of s.services; track svc.id) {
                <div class="service-row">
                  <div class="service-info">
                    <span class="service-dot" [class.online]="svc.status === 'UP'" [class.warn]="svc.status === 'WARNING'" [class.down]="svc.status === 'DOWN'"></span>
                    <strong>{{ svc.name }}</strong>
                  </div>
                  <span class="service-status">{{ svc.detail }}</span>
                </div>
              }
            </div>
          </div>

          <div class="card logs-card">
            <div class="card-head">
              <h3 class="h3" style="margin: 0; font-size: 16px;">Journal d'Audit Récent</h3>
              <a routerLink="/admin/system" class="view-all-link">Voir tout le journal →</a>
            </div>

            <div class="logs-compact-list">
              @for (log of auditLogs().slice(0, 5); track log.id) {
                <div class="log-item">
                  <div class="log-badge" [ngClass]="'sev-' + (log.severity || 'INFO').toLowerCase()">
                    {{ log.severity || 'INFO' }}
                  </div>
                  <div class="log-content">
                    <div class="log-title">{{ log.action }}</div>
                    <div class="log-target">{{ log.target }}</div>
                    <div class="log-meta">{{ log.timestamp | date:'dd/MM/yyyy HH:mm' }} • Par {{ log.adminName }}</div>
                  </div>
                </div>
              } @empty {
                <p class="empty-note">Aucune action enregistrée pour le moment.</p>
              }
            </div>
          </div>
        </div>
      } @else if (error()) {
        <div class="card empty-state-card">
          <p class="empty-note">{{ error() }}</p>
          <button type="button" class="btn btn-primary btn-sm" (click)="refresh()">Réessayer</button>
        </div>
      } @else {
        <div class="card empty-state-card"><p class="empty-note">Calcul des indicateurs...</p></div>
      }
    </div>
  `,
  styles: [`
    .empty-note {
      font-size: 13px;
      color: var(--color-text-secondary);
      margin: 8px 0;
    }

    .empty-state-card {
      padding: 28px;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;
    }

    .admin-dashboard {
      display: flex;
      flex-direction: column;
      gap: 28px;
    }

    .superadmin-badge-strip {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .health-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 11.5px;
      font-weight: 700;
      color: var(--color-success);
      background: rgba(16, 185, 129, 0.1);
      padding: 4px 10px;
      border-radius: var(--radius-full);

      &.warn { color: #B45309; background: rgba(245, 158, 11, 0.12); .pulse-dot { background-color: #F59E0B; } }
      &.down { color: #B91C1C; background: rgba(239, 68, 68, 0.12); .pulse-dot { background-color: #EF4444; } }

      .pulse-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background-color: var(--color-success);
        box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.3);
      }
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      flex-wrap: wrap;

      .header-actions {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }
    }

    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 18px;

      @media (max-width: 1200px) {
        grid-template-columns: repeat(2, 1fr);
      }

      @media (max-width: 640px) {
        grid-template-columns: 1fr;
      }

      .kpi-card {
        padding: 22px;
        display: flex;
        flex-direction: column;
        gap: 6px;
        border: 1px solid var(--color-border);
        border-radius: var(--radius-lg);

        .kpi-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .kpi-title {
          font-size: 12.5px;
          font-weight: 700;
          color: var(--color-text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .kpi-trend {
          font-size: 11px;
          font-weight: 800;
          padding: 2px 7px;
          border-radius: var(--radius-full);

          &.positive {
            background: rgba(16, 185, 129, 0.12);
            color: var(--color-success);
          }
          &.warning {
            background: rgba(249, 115, 22, 0.12);
            color: var(--color-orange);
          }
          &.neutral {
            background: rgba(3, 36, 71, 0.08);
            color: var(--color-navy);
          }
        }

        .kpi-val {
          font-size: 30px;
          font-weight: 900;
          color: var(--color-navy);
          letter-spacing: -0.02em;

          &.highlight-green {
            color: var(--color-success);
          }
          &.highlight-orange {
            color: var(--color-orange);
          }
        }

        .kpi-breakdown {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: var(--color-text-secondary);
          flex-wrap: wrap;

          .payment-badge {
            font-size: 10px;
            font-weight: 800;
            padding: 2px 6px;
            border-radius: 4px;

            &.wave {
              background: #00D2D3;
              color: #FFFFFF;
            }
            &.om {
              background: #FF6600;
              color: #FFFFFF;
            }
          }
        }
      }
    }

    /* CHARTS GRID */
    .charts-admin-grid {
      display: grid;
      grid-template-columns: 1.3fr 1fr;
      gap: 20px;

      @media (max-width: 992px) {
        grid-template-columns: 1fr;
      }

      .chart-card {
        padding: 24px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        gap: 20px;

        .chart-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;

          .chart-title {
            font-size: 16px;
            font-weight: 800;
            color: var(--color-navy);
            margin: 0;
          }

          .chart-subtitle {
            font-size: 12.5px;
            color: var(--color-text-secondary);
            margin: 3px 0 0 0;
          }

          .chart-tag-pill {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            font-size: 11.5px;
            font-weight: 800;
            color: var(--color-navy);
            background: var(--color-primary-light);
            padding: 4px 10px;
            border-radius: var(--radius-full);
            white-space: nowrap;
          }
        }

        .chart-bars-wrap {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          height: 150px;
          padding: 10px 0 0 0;
          gap: 12px;

          .bar-col {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            height: 100%;
            justify-content: flex-end;
            position: relative;

            .bar-val-tip {
              font-size: 10px;
              font-weight: 800;
              color: var(--color-text-secondary);
              margin-bottom: 6px;
              white-space: nowrap;
            }

            .bar-track {
              width: 100%;
              max-width: 38px;
              height: 100px;
              background: #F1F5F9;
              border-radius: 6px 6px 0 0;
              display: flex;
              align-items: flex-end;
              overflow: hidden;

              .bar-fill-inner {
                width: 100%;
                background: #CBD5E1;
                border-radius: 6px 6px 0 0;
                transition: height 0.6s cubic-bezier(0.16, 1, 0.3, 1);
              }
            }

            &.is-current {
              .bar-val-tip {
                color: var(--color-navy);
                font-weight: 900;
              }
              .bar-track .bar-fill-inner {
                background: linear-gradient(180deg, var(--color-primary) 0%, #D97706 100%);
              }
            }

            .bar-month-label {
              font-size: 11px;
              font-weight: 700;
              color: var(--color-text-secondary);
              margin-top: 8px;
            }
          }
        }

        .chart-legend-row {
          display: flex;
          align-items: center;
          gap: 20px;
          border-top: 1px solid var(--color-border);
          padding-top: 12px;
          font-size: 12px;
          color: var(--color-text-secondary);
          flex-wrap: wrap;

          .legend-item {
            display: inline-flex;
            align-items: center;
            gap: 6px;

            .legend-dot {
              width: 9px;
              height: 9px;
              border-radius: 50%;

              &.dot-current { background: var(--color-primary); }
              &.dot-prev { background: #CBD5E1; }
            }
          }
        }

        /* Distribution bars */
        .distribution-bars-wrap {
          display: flex;
          flex-direction: column;
          gap: 14px;

          .dist-row {
            display: flex;
            flex-direction: column;
            gap: 5px;

            .dist-label {
              display: flex;
              justify-content: space-between;
              font-size: 12.5px;
              font-weight: 700;
              color: var(--color-navy);
            }

            .dist-progress-track {
              width: 100%;
              height: 10px;
              background: #F1F5F9;
              border-radius: var(--radius-full);
              overflow: hidden;

              .dist-fill {
                height: 100%;
                border-radius: var(--radius-full);

                &.fill-starter { background: var(--color-primary); }
                &.fill-free { background: var(--color-navy); }
                &.fill-learner { background: #3B82F6; }
                &.fill-admin { background: #94A3B8; }
              }
            }
          }
        }

        .quick-stat-box {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: var(--color-background);
          border-radius: var(--radius-md);
          padding: 12px 16px;
          gap: 12px;
          flex-wrap: wrap;

          .stat-mini {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 12px;
            color: var(--color-text-secondary);

            .stat-num {
              font-weight: 800;

              &.text-success { color: var(--color-success); }
              &.text-primary { color: var(--color-navy); }
            }
          }
        }
      }
    }

    /* BOTTOM GRID */
    .bottom-admin-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;

      @media (max-width: 992px) {
        grid-template-columns: 1fr;
      }

      .card-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;

        .view-all-link {
          font-size: 12px;
          font-weight: 700;
          color: var(--color-navy);
          text-decoration: none;

          &:hover {
            text-decoration: underline;
          }
        }
      }

      .services-list {
        display: flex;
        flex-direction: column;
        gap: 10px;

        .service-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 14px;
          background: var(--color-background);
          border-radius: var(--radius-sm);
          font-size: 13px;
          gap: 12px;
          flex-wrap: wrap;

          .service-info {
            display: flex;
            align-items: center;
            gap: 8px;
            color: var(--color-navy);

            .service-dot {
              width: 8px;
              height: 8px;
              border-radius: 50%;

              &.online { background-color: var(--color-success); }
              &.warn { background-color: #F59E0B; }
              &.down { background-color: #EF4444; }
            }
          }

          .service-status {
            font-size: 11.5px;
            font-weight: 700;
            color: var(--color-text-secondary);
          }
        }
      }

      .logs-compact-list {
        display: flex;
        flex-direction: column;
        gap: 10px;

        .log-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 10px 12px;
          border-bottom: 1px solid var(--color-border);

          &:last-child {
            border-bottom: none;
          }

          .log-badge {
            font-size: 9.5px;
            font-weight: 800;
            padding: 2px 6px;
            border-radius: 4px;
            text-transform: uppercase;

            &.sev-info { background: #E0F2FE; color: #0369A1; }
            &.sev-warning { background: #FEF3C7; color: #B45309; }
            &.sev-critical { background: #FEE2E2; color: #B91C1C; }
          }

          .log-content {
            flex: 1;

            .log-title {
              font-size: 13px;
              font-weight: 700;
              color: var(--color-navy);
            }

            .log-target {
              font-size: 12px;
              color: var(--color-text-secondary);
            }

            .log-meta {
              font-size: 11px;
              color: #94A3B8;
              margin-top: 2px;
            }
          }
        }
      }
    }
  `]
})
export class AdminDashboardComponent {
  private adminService = inject(AdminService);
  stats = this.adminService.getDashboard();
  loading = this.adminService.isDashboardLoading();
  error = this.adminService.getDashboardError();
  auditLogs = this.adminService.getAuditLogs();

  private readonly MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

  constructor() {
    // Indicateurs recalculés à chaque ouverture de la page (services vérifiés en direct)
    this.refresh();
  }

  refresh(): void {
    this.adminService.loadDashboard();
    this.adminService.loadAuditLogs();
  }

  /** Synthèse de l'état des services pour la pastille d'en-tête. */
  health = computed(() => {
    const services = this.stats()?.services ?? [];
    const down = services.filter(svc => svc.status === 'DOWN').length;
    const warnings = services.filter(svc => svc.status === 'WARNING').length;
    const label = down > 0
      ? `${down} service(s) en panne`
      : warnings > 0 ? `${warnings} point(s) à vérifier` : 'Tous les services opérationnels';
    return { down, warnings, label };
  });

  serviceShort(id: string): string {
    const svc = this.stats()?.services.find(x => x.id === id);
    if (!svc) return '—';
    return svc.status === 'UP' ? 'opérationnel' : (svc.status === 'DOWN' ? 'clé refusée' : 'clé absente');
  }

  aiReady = computed(() => (this.stats()?.services ?? []).some(svc => svc.id === 'gemini' && svc.status === 'UP'));

  revenueSixMonths = computed(() => (this.stats()?.monthlyRevenue ?? []).reduce((sum, m) => sum + m.amountFcfa, 0));

  revenueBars = computed(() => {
    const months = this.stats()?.monthlyRevenue ?? [];
    const max = Math.max(...months.map(m => m.amountFcfa), 0);
    return months.map((m, i) => {
      const [year, month] = m.month.split('-').map(Number);
      return {
        month: m.month,
        label: `${this.MONTHS[month - 1]} ${String(year).slice(2)}`,
        amountLabel: this.shortAmount(m.amountFcfa),
        percent: max > 0 ? Math.max(2, Math.round((m.amountFcfa / max) * 100)) : 2,
        isCurrent: i === months.length - 1
      };
    });
  });

  revenueTrendLabel = computed(() => {
    const s = this.stats();
    if (!s) return '';
    if (s.revenueLastMonthFcfa > 0) {
      const change = ((s.revenueThisMonthFcfa - s.revenueLastMonthFcfa) / s.revenueLastMonthFcfa) * 100;
      return `${change >= 0 ? '+' : ''}${change.toFixed(1).replace('.', ',')} % vs mois dernier`;
    }
    return s.revenueThisMonthFcfa > 0 ? 'Premiers revenus ce mois' : 'Aucun revenu ce mois';
  });

  distribution = computed(() => {
    const s = this.stats();
    if (!s) return [];
    const total = Math.max(1, s.totalUsers);
    const rows = [
      { name: 'Formateurs STARTER (payant)', count: s.paidCreatorsCount, css: 'fill-starter' },
      { name: 'Formateurs FREE (gratuit)', count: s.freeCreatorsCount, css: 'fill-free' },
      { name: s.paidLearnersCount > 0 ? `Apprenants (dont ${s.paidLearnersCount} Apprenant Plus)` : 'Apprenants', count: s.learnersCount, css: 'fill-learner' },
      { name: 'Administrateurs', count: s.adminsCount, css: 'fill-admin' }
    ];
    return rows.map(r => ({ ...r, percent: (r.count / total) * 100 }));
  });

  conversionRate = computed(() => {
    const s = this.stats();
    return s && s.creatorsCount > 0 ? (s.paidCreatorsCount / s.creatorsCount) * 100 : 0;
  });

  private shortAmount(amount: number): string {
    if (amount >= 1_000_000) return (amount / 1_000_000).toFixed(1).replace('.', ',') + ' M';
    if (amount >= 1000) return Math.round(amount / 1000) + ' k';
    return String(Math.round(amount));
  }
}
