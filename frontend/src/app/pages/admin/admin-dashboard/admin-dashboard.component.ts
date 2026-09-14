import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AdminService } from '../../../core/services/admin.service';
import { QuizService } from '../../../core/services/quiz.service';
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
            <span class="health-pill">
              <span class="pulse-dot"></span>
              <span>Plateforme 100% Opérationnelle</span>
            </span>
          </div>
          <h1 class="h1" style="margin-top: 8px;">Supervision & Pilotage Central</h1>
          <p class="body-small">Surveillance temps réel des indicateurs financiers, des utilisateurs et des quotas de la plateforme.</p>
        </div>

        <div class="header-actions">
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

      <!-- 4 KPI CARDS -->
      <div class="kpi-grid">
        <div class="kpi-card card">
          <div class="kpi-top">
            <span class="kpi-title">Utilisateurs Actifs</span>
            <span class="kpi-trend positive">+14% ce mois</span>
          </div>
          <div class="kpi-val">{{ metrics().totalUsers | number }}</div>
          <div class="kpi-breakdown">
            <span><strong>{{ metrics().creatorsCount }}</strong> Formateurs</span>
            <span>•</span>
            <span><strong>{{ metrics().learnersCount }}</strong> Élèves</span>
          </div>
        </div>

        <div class="kpi-card card">
          <div class="kpi-top">
            <span class="kpi-title">Revenu Mensuel (MRR)</span>
            <span class="kpi-trend positive">+22% ce mois</span>
          </div>
          <div class="kpi-val highlight-green">{{ (metrics().mrrFcfa | number) }} F</div>
          <div class="kpi-breakdown">
            <span>~{{ metrics().mrrUsd }} $ USD</span>
            <span>•</span>
            <span class="payment-badge wave">Wave 65%</span>
            <span class="payment-badge om">OM 25%</span>
          </div>
        </div>

        <div class="kpi-card card">
          <div class="kpi-top">
            <span class="kpi-title">Quiz & Cours Hébergés</span>
            <span class="kpi-trend neutral">Actifs</span>
          </div>
          <div class="kpi-val">{{ metrics().totalQuizzes | number }}</div>
          <div class="kpi-breakdown">
            <span><strong>{{ metrics().totalCourses }}</strong> Cours structurés</span>
            <span>•</span>
            <span><strong>{{ (metrics().totalQuestions || 0) | number }}</strong> Questions</span>
          </div>
        </div>

        <div class="kpi-card card">
          <div class="kpi-top">
            <span class="kpi-title">Appels IA & OCR (Mois)</span>
            <span class="kpi-trend warning">{{ metrics().geminiLatencyMs }}ms moy.</span>
          </div>
          <div class="kpi-val highlight-orange">{{ metrics().aiCallsMonth | number }}</div>
          <div class="kpi-breakdown">
            <span>Gemini 1.5 Flash</span>
            <span>•</span>
            <span>Groq LLaMA 3.3</span>
          </div>
        </div>
      </div>

      <!-- CHARTS SECTION: 2 DIAGRAMMES SIMPLES & ÉLÉGANTS -->
      <div class="charts-admin-grid">
        <!-- DIAGRAMME 1: ÉVOLUTION DES REVENUS MRR (6 MOIS) -->
        <div class="card chart-card">
          <div class="chart-header">
            <div>
              <h3 class="chart-title">Croissance des Revenus Mensuels (FCFA)</h3>
              <p class="chart-subtitle">Progression des souscriptions STARTER via Wave et Orange Money</p>
            </div>
            <div class="chart-tag-pill">
              <app-icon name="trending-up" [size]="14" color="var(--color-success)"></app-icon>
              <span>+18.4% MRR</span>
            </div>
          </div>

          <!-- MINI BAR CHART DES REVENUS -->
          <div class="chart-bars-wrap">
            @for (m of monthlyRevenues; track m.month) {
              <div class="bar-col" [class.is-current]="m.isCurrent">
                <div class="bar-val-tip">{{ m.amountLabel }}</div>
                <div class="bar-track">
                  <div class="bar-fill-inner" [style.height]="m.percent + '%'"></div>
                </div>
                <div class="bar-month-label">{{ m.month }}</div>
              </div>
            }
          </div>

          <div class="chart-legend-row">
            <div class="legend-item">
              <span class="legend-dot dot-current"></span>
              <span>Mois en cours : <strong>1 480 000 FCFA</strong></span>
            </div>
            <div class="legend-item">
              <span class="legend-dot dot-prev"></span>
              <span>Moyenne trimestrielle : <strong>1 190 000 FCFA</strong></span>
            </div>
          </div>
        </div>

        <!-- DIAGRAMME 2: RÉPARTITION DES COMPTES PAR FORFAIT -->
        <div class="card chart-card">
          <div class="chart-header">
            <div>
              <h3 class="chart-title">Répartition des Utilisateurs</h3>
              <p class="chart-subtitle">Formateurs abonnés, gratuits et apprenants</p>
            </div>
            <div class="chart-tag-pill">
              <span>{{ metrics().totalUsers }} Comptes</span>
            </div>
          </div>

          <!-- DONUT & DISTRIBUTION BARS -->
          <div class="distribution-bars-wrap">
            <div class="dist-row">
              <div class="dist-label">
                <span class="dist-name">Formateurs STARTER (Payant)</span>
                <span class="dist-val">420 (34%)</span>
              </div>
              <div class="dist-progress-track">
                <div class="dist-fill fill-starter" style="width: 34%;"></div>
              </div>
            </div>

            <div class="dist-row">
              <div class="dist-label">
                <span class="dist-name">Formateurs FREE (Gratuit)</span>
                <span class="dist-val">430 (34%)</span>
              </div>
              <div class="dist-progress-track">
                <div class="dist-fill fill-free" style="width: 34%;"></div>
              </div>
            </div>

            <div class="dist-row">
              <div class="dist-label">
                <span class="dist-name">Apprenants & Étudiants</span>
                <span class="dist-val">398 (32%)</span>
              </div>
              <div class="dist-progress-track">
                <div class="dist-fill fill-learner" style="width: 32%;"></div>
              </div>
            </div>
          </div>

          <div class="quick-stat-box">
            <div class="stat-mini">
              <span class="stat-lbl">Taux de Conversion :</span>
              <strong class="stat-num text-success">49.4%</strong>
            </div>
            <div class="stat-mini">
              <span class="stat-lbl">Sessions Live en Direct :</span>
              <strong class="stat-num text-primary">{{ metrics().activeLiveArenas }} actives</strong>
            </div>
          </div>
        </div>
      </div>

      <!-- BOTTOM SECTION: SERVICES HEALTH & RECENT AUDIT LOGS -->
      <div class="bottom-admin-grid">
        <!-- 1. HEALTH STATUS -->
        <div class="card status-card">
          <div class="card-head">
            <h3 class="h3" style="margin: 0; font-size: 16px;">Santé des Passerelles & Services</h3>
            <span class="badge badge-primary">SLA 99.9%</span>
          </div>

          <div class="services-list">
            <div class="service-row">
              <div class="service-info">
                <span class="service-dot online"></span>
                <strong>Passerelle Wave Mobile Money</strong>
              </div>
              <span class="service-status">Opérationnel (< 300ms)</span>
            </div>

            <div class="service-row">
              <div class="service-info">
                <span class="service-dot online"></span>
                <strong>Passerelle Orange Money</strong>
              </div>
              <span class="service-status">Opérationnel (API v2)</span>
            </div>

            <div class="service-row">
              <div class="service-info">
                <span class="service-dot online"></span>
                <strong>API IA Générative (Google Gemini & Groq)</strong>
              </div>
              <span class="service-status">Temps de réponse: {{ metrics().geminiLatencyMs }}ms</span>
            </div>

            <div class="service-row">
              <div class="service-info">
                <span class="service-dot online"></span>
                <strong>Serveur WebSockets Live (STOMP)</strong>
              </div>
              <span class="service-status">{{ metrics().connectedLiveStudents }} étudiants connectés</span>
            </div>

            <div class="service-row">
              <div class="service-info">
                <span class="service-dot online"></span>
                <strong>Cluster Base de Données (PostgreSQL ACID)</strong>
              </div>
              <span class="service-status">{{ metrics().databaseHealthPercent }}% Uptime</span>
            </div>
          </div>
        </div>

        <!-- 2. RECENT SECURITY AUDIT LOG -->
        <div class="card logs-card">
          <div class="card-head">
            <h3 class="h3" style="margin: 0; font-size: 16px;">Journal d'Audit de Sécurité Récent</h3>
            <a routerLink="/admin/system" class="view-all-link">Voir tout le journal →</a>
          </div>

          <div class="logs-compact-list">
            @for (log of auditLogs().slice(0, 4); track log.id) {
              <div class="log-item">
                <div class="log-badge" [ngClass]="'sev-' + log.severity.toLowerCase()">
                  {{ log.severity }}
                </div>
                <div class="log-content">
                  <div class="log-title">{{ log.action }}</div>
                  <div class="log-target">{{ log.target }}</div>
                  <div class="log-meta">{{ log.timestamp }} • Par {{ log.adminName }}</div>
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
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
              &.busy { background-color: var(--color-orange); }
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
  metrics = this.adminService.getMetrics();
  auditLogs = this.adminService.getAuditLogs();

  monthlyRevenues = [
    { month: 'Oct 25', amountLabel: '790k', percent: 53, isCurrent: false },
    { month: 'Nov 25', amountLabel: '920k', percent: 62, isCurrent: false },
    { month: 'Déc 25', amountLabel: '1.05M', percent: 71, isCurrent: false },
    { month: 'Jan 26', amountLabel: '1.18M', percent: 80, isCurrent: false },
    { month: 'Fév 26', amountLabel: '1.34M', percent: 90, isCurrent: false },
    { month: 'Mars 26', amountLabel: '1.48M', percent: 100, isCurrent: true }
  ];
}
