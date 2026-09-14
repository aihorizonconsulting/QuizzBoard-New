import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { QuizService } from '../../../core/services/quiz.service';
import { AuthService } from '../../../core/services/auth.service';
import { PromotionService } from '../../../core/services/promotion.service';
import { Quiz } from '../../../core/models/quiz.model';
import { IconComponent } from '../../../shared/components/icon/icon.component';

@Component({
  selector: 'app-creator-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, IconComponent],
  template: `
    <div class="creator-dashboard animate-fade-in">
      <!-- DASHBOARD HEADER -->
      <div class="dash-header">
        <div>
          <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
            <h1 class="h1">Tableau de Bord Formateur</h1>
            <span class="badge badge-primary" style="display: inline-flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 800;">
              <app-icon name="school" [size]="13" color="var(--color-navy)"></app-icon>
              {{ promotionService.activePromotionLabel() }}
            </span>
          </div>
          <p class="body-small">Pilotez vos évaluations, vos sessions en direct et vos promotions d'étudiants.</p>
        </div>

        <div class="dash-header-actions">
          @if (promotionService.isGlobalReadOnly()) {
            <span class="locked-action-pill" title="La promotion active est archivée. Les actions de création et sessions Live sont désactivées.">
              <app-icon name="lock" [size]="14" color="#64748B"></app-icon>
              <span>Mode Historique (Lecture seule)</span>
            </span>
          } @else {
            <button class="btn btn-secondary" (click)="launchFirstLive()" title="Lancer une arène interactive en direct">
              <app-icon name="play" [size]="14" color="#FFFFFF"></app-icon>
              <span>Lancer un Live</span>
            </button>
            <a routerLink="/app/quizzes/create" class="btn btn-primary">
              <app-icon name="sparkles" [size]="15" color="var(--color-navy)"></app-icon>
              <span>Créer un Quiz avec l'IA</span>
            </a>
          }
        </div>
      </div>

      <!-- 4 KPI STATS CARDS -->
      <div class="kpi-grid">
        <div class="kpi-card card">
          <div class="kpi-header">
            <span class="kpi-title">Quiz Créés</span>
            <span class="kpi-icon" style="background: var(--color-navy-light); color: var(--color-navy);">
              <app-icon name="file-text" [size]="15"></app-icon>
            </span>
          </div>
          <div class="kpi-val" style="color: var(--color-navy);">{{ myQuizzes().length }}</div>
          <div class="kpi-sub"><span>+{{ recentQuizzesCount() }}</span> ce mois-ci</div>
        </div>

        <div class="kpi-card card">
          <div class="kpi-header">
            <span class="kpi-title">Participants Totaux</span>
            <span class="kpi-icon" style="background: var(--color-primary-light); color: var(--color-navy);">
              <app-icon name="users" [size]="15"></app-icon>
            </span>
          </div>
          <div class="kpi-val" style="color: var(--color-navy);">{{ statsLoading() ? '...' : stats().totalParticipants }}</div>
          <div class="kpi-sub" [style.color]="stats().totalParticipants > 0 ? 'var(--color-success)' : ''">
            <span>{{ stats().totalParticipants > 0 ? 'Participations réelles' : 'Aucune participation' }}</span>
          </div>
        </div>

        <div class="kpi-card card">
          <div class="kpi-header">
            <span class="kpi-title">Taux de Réussite</span>
            <span class="kpi-icon" style="background: var(--color-orange-light); color: var(--color-orange);">
              <app-icon name="award" [size]="15" color="var(--color-orange)"></app-icon>
            </span>
          </div>
          <div class="kpi-val" style="color: var(--color-orange);">{{ statsLoading() ? '...' : stats().averageSuccessRate + '%' }}</div>
          <div class="kpi-sub">{{ stats().averageSuccessRate >= 70 ? 'Excellent niveau' : stats().averageSuccessRate >= 50 ? 'Bon niveau' : 'Aucune donnée' }}</div>
        </div>

        <div class="kpi-card card">
          <div class="kpi-header">
            <span class="kpi-title">Quiz Terminés</span>
            <span class="kpi-icon" style="background: var(--color-success-light); color: var(--color-success);">
              <app-icon name="check-circle" [size]="15" color="var(--color-success)"></app-icon>
            </span>
          </div>
          <div class="kpi-val" style="color: var(--color-success);">{{ statsLoading() ? '...' : stats().completedQuizzes }}</div>
          <div class="kpi-sub">Quiz avec participations réelles</div>
        </div>
      </div>

      <!-- DEUX CARTES ANALYTIQUES ÉPURÉES ET MODERNES (GAUCHE : BARRES / DROITE : CIRCULAIRE) -->
      <div class="charts-simple-grid">
        <!-- CARTE GAUCHE : GRAPHIQUE EN BARRES D'ACTIVITÉ DYNAMIQUE -->
        <div class="simple-chart-card card">
          <div class="card-top-row">
            <div>
              <span class="card-eyebrow">Activité hebdomadaire</span>
              <h3 class="card-title">Participations aux Quiz</h3>
            </div>
            <span class="trend-badge">7 jours</span>
          </div>

          <div class="big-metric-wrap">
            <span class="big-metric-val">{{ statsLoading() ? '...' : stats().totalParticipants }}</span>
            <span class="big-metric-unit">{{ stats().totalParticipants === 1 ? 'élève évalué au total' : 'élèves évalués au total' }}</span>
          </div>

          @if (stats().totalParticipants === 0 && !statsLoading()) {
            <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:32px 0; gap:8px; color:#94A3B8;">
              <app-icon name="bar-chart" [size]="36" color="#CBD5E1"></app-icon>
              <span style="font-size:13px; font-weight:600;">Aucune participation enregistrée</span>
              <span style="font-size:11px;">Les données s'afficheront après les premières évaluations</span>
            </div>
          } @else {
            <!-- Diagramme en barres interactif dynamique -->
            <div class="barchart-area">
              <div class="barchart-grid">
                <!-- Lignes guides horizontales -->
                <div class="grid-line" style="bottom: 75%;"><span>{{ weeklyMax() }}</span></div>
                <div class="grid-line" style="bottom: 50%;"><span>{{ (weeklyMax() / 2) | number:'1.0-0' }}</span></div>
                <div class="grid-line" style="bottom: 25%;"><span>{{ (weeklyMax() / 4) | number:'1.0-0' }}</span></div>
                <div class="grid-line" style="bottom: 0%;"><span>0</span></div>

                <!-- Colonnes de barres -->
                <div class="bars-container">
                  @for (day of weekDays(); track day.label; let i = $index) {
                    <div class="bar-col" [class.is-peak]="day.count === weeklyMax() && weeklyMax() > 0">
                      <div class="bar-track">
                        <div class="bar-fill"
                          [class.fill-peak]="day.count === weeklyMax() && weeklyMax() > 0"
                          [style.height]="weeklyMax() > 0 ? (day.count / weeklyMax() * 95) + '%' : '2%'">
                          @if (day.count > 0) {
                            <span class="bar-tooltip" [class.peak-tip]="day.count === weeklyMax() && weeklyMax() > 0">
                              {{ day.count }}{{ day.count === weeklyMax() && weeklyMax() > 0 ? ' (Pic)' : '' }}
                            </span>
                          }
                        </div>
                      </div>
                      <span class="bar-day" [class.peak-label]="day.count === weeklyMax() && weeklyMax() > 0">{{ day.label }}</span>
                    </div>
                  }
                </div>
              </div>
            </div>
          }
        </div>

        <!-- CARTE DROITE : TAUX DE RÉUSSITE DYNAMIQUE -->
        <div class="simple-chart-card card">
          <div class="card-top-row">
            <div>
              <span class="card-eyebrow">Assimilation pédagogique</span>
              <h3 class="card-title">Répartition des Résultats</h3>
            </div>
            @if (!statsLoading() && stats().totalParticipants > 0) {
              <span class="trend-badge success">{{ stats().averageSuccessRate }}% moy.</span>
            }
          </div>

          <div class="big-metric-wrap">
            <span class="big-metric-val">{{ statsLoading() ? '...' : stats().averageSuccessRate + '%' }}</span>
            <span class="big-metric-unit">taux de réussite moyen (seuil : 70%)</span>
          </div>

          @if (stats().totalParticipants === 0 && !statsLoading()) {
            <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:32px 0; gap:8px; color:#94A3B8;">
              <app-icon name="pie-chart" [size]="36" color="#CBD5E1"></app-icon>
              <span style="font-size:13px; font-weight:600;">Aucun résultat à analyser</span>
              <span style="font-size:11px;">Vos statistiques apparaîtront après les premières participations</span>
            </div>
          } @else {
            <!-- Diagramme circulaire & légende -->
            <div class="donut-chart-layout">
              <!-- LE DONUT SVG -->
              <div class="donut-wrapper">
                <svg class="donut-svg" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="45" fill="none" stroke="#F1F5F9" stroke-width="14"/>
                  <!-- Tranche Excellence >= 85% -->
                  <circle cx="60" cy="60" r="45" fill="none" stroke="#032447" stroke-width="14"
                    [attr.stroke-dasharray]="excellenceDash() + ' 282.74'"
                    stroke-dashoffset="0"
                    transform="rotate(-90 60 60)" class="donut-segment"/>
                  <!-- Tranche Validé 70-84% -->
                  <circle cx="60" cy="60" r="45" fill="none" stroke="#FFC400" stroke-width="14"
                    [attr.stroke-dasharray]="valideDash() + ' 282.74'"
                    [attr.stroke-dashoffset]="-excellenceDash()"
                    transform="rotate(-90 60 60)" class="donut-segment"/>
                  <!-- Tranche A consolider 50-69% -->
                  <circle cx="60" cy="60" r="45" fill="none" stroke="#F4510B" stroke-width="14"
                    [attr.stroke-dasharray]="consoliderDash() + ' 282.74'"
                    [attr.stroke-dashoffset]="-(excellenceDash() + valideDash())"
                    transform="rotate(-90 60 60)" class="donut-segment"/>
                  <!-- Tranche Non validé <50% -->
                  <circle cx="60" cy="60" r="45" fill="none" stroke="#CBD5E1" stroke-width="14"
                    [attr.stroke-dasharray]="nonValideDash() + ' 282.74'"
                    [attr.stroke-dashoffset]="-(excellenceDash() + valideDash() + consoliderDash())"
                    transform="rotate(-90 60 60)" class="donut-segment"/>
                </svg>
                <div class="donut-center-info">
                  <span class="center-pct">{{ stats().averageSuccessRate }}%</span>
                  <span class="center-sub">Réussite</span>
                </div>
              </div>

              <!-- LÉGENDE -->
              <div class="donut-legend-grid">
                <div class="legend-item">
                  <span class="legend-bullet bullet-navy"></span>
                  <div class="legend-details">
                    <div class="legend-top">
                      <span class="legend-name">Excellence (≥ 85%)</span>
                      <strong class="legend-val">{{ excellencePct() }}%</strong>
                    </div>
                    <span class="legend-sub">{{ excellenceCount() }} élèves</span>
                  </div>
                </div>
                <div class="legend-item">
                  <span class="legend-bullet bullet-gold"></span>
                  <div class="legend-details">
                    <div class="legend-top">
                      <span class="legend-name">Validé (70-84%)</span>
                      <strong class="legend-val">{{ validePct() }}%</strong>
                    </div>
                    <span class="legend-sub">{{ valideCount() }} élèves</span>
                  </div>
                </div>
                <div class="legend-item">
                  <span class="legend-bullet bullet-orange"></span>
                  <div class="legend-details">
                    <div class="legend-top">
                      <span class="legend-name">À consolider</span>
                      <strong class="legend-val">{{ consoliderPct() }}%</strong>
                    </div>
                    <span class="legend-sub">{{ consoliderCount() }} élèves</span>
                  </div>
                </div>
                <div class="legend-item">
                  <span class="legend-bullet bullet-gray"></span>
                  <div class="legend-details">
                    <div class="legend-top">
                      <span class="legend-name">Non validé</span>
                      <strong class="legend-val">{{ nonValidePct() }}%</strong>
                    </div>
                    <span class="legend-sub">{{ nonValideCount() }} élèves</span>
                  </div>
                </div>
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .creator-dashboard {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .dash-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;

      .h1 { font-size: 22px; margin-bottom: 2px; }
      .body-small { font-size: 12px; }
    }

    .dash-header-actions {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;

      .btn {
        font-size: 13px;
        font-weight: 700;
        padding: 7px 14px;
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }

      .locked-action-pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 7px 14px;
        background: #F1F5F9;
        border: 1px solid #CBD5E1;
        border-radius: var(--radius-sm);
        font-size: 12.5px;
        font-weight: 700;
        color: #475569;
        cursor: not-allowed;
      }
    }

    /* 4 KPI STATS CARDS */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
      gap: 14px;
    }

    .kpi-card {
      padding: 16px 18px;
      border-radius: var(--radius-lg);
      border: 1px solid var(--color-border);
      background: #FFFFFF;
      box-shadow: var(--shadow-sm);
      transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);

      &:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-md);
        border-color: #CBD5E1;
      }

      .kpi-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;

        .kpi-title {
          font-size: 12.5px;
          font-weight: 650;
          color: var(--color-text-secondary);
        }

        .kpi-icon {
          width: 32px;
          height: 32px;
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
        }
      }

      .kpi-val {
        font-size: 24px;
        font-weight: 800;
        line-height: 1.2;
        margin-bottom: 2px;
        color: var(--color-navy);
      }

      .kpi-sub {
        font-size: 11.5px;
        font-weight: 600;
        color: var(--color-text-secondary);
      }
    }

    /* DEUX CARTES ANALYTIQUES SEULEMENT (GAUCHE & DROITE) */
    .charts-simple-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      align-items: stretch;
    }

    .simple-chart-card {
      padding: 22px 24px;
      background: #FFFFFF;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-sm);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: 280px;

      .card-top-row {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 10px;

        .card-eyebrow {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--color-text-secondary);
          display: block;
          margin-bottom: 2px;
        }

        .card-title {
          font-size: 16px;
          font-weight: 800;
          color: var(--color-navy);
          margin: 0;
        }

        .trend-badge {
          font-size: 11px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: var(--radius-xs);
          background: var(--color-success-light);
          color: var(--color-success);

          &.navy {
            background: var(--color-navy-light);
            color: var(--color-navy);
          }
        }
      }

      .big-metric-wrap {
        display: flex;
        align-items: baseline;
        gap: 8px;
        margin-bottom: 16px;

        .big-metric-val {
          font-size: 26px;
          font-weight: 800;
          color: var(--color-navy);
          line-height: 1;
        }

        .big-metric-unit {
          font-size: 12px;
          color: var(--color-text-secondary);
          font-weight: 500;
        }
      }
    }

    /* CARTE GAUCHE : DIAGRAMME EN BARRES */
    .barchart-area {
      display: flex;
      flex-direction: column;
      margin-top: auto;
      padding-top: 6px;

      .barchart-grid {
        position: relative;
        height: 125px;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;

        .grid-line {
          position: absolute;
          left: 0;
          right: 0;
          height: 1px;
          border-top: 1px dashed #F1F5F9;
          display: flex;
          align-items: center;
          pointer-events: none;

          span {
            position: absolute;
            left: 0;
            top: -7px;
            font-size: 9px;
            font-weight: 600;
            color: #94A3B8;
            opacity: 0.7;
          }
        }

        .bars-container {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          height: 100px;
          padding: 0 10px 0 28px;
          z-index: 1;

          .bar-col {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            flex: 1;
            height: 100%;
            justify-content: flex-end;

            .bar-track {
              width: 100%;
              max-width: 28px;
              height: 100%;
              background: #F8FAFC;
              border-radius: 6px 6px 0 0;
              display: flex;
              align-items: flex-end;
              position: relative;

              .bar-fill {
                width: 100%;
                background: var(--color-navy);
                border-radius: 6px 6px 0 0;
                transition: height 0.4s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.2s ease;
                position: relative;
                cursor: pointer;

                &:hover {
                  background: #06345F;
                  .bar-tooltip {
                    opacity: 1;
                    transform: translateX(-50%) translateY(-4px);
                    visibility: visible;
                  }
                }

                &.fill-peak {
                  background: var(--color-primary);
                  box-shadow: 0 2px 8px rgba(255, 196, 0, 0.35);

                  &:hover {
                    background: var(--color-primary-hover);
                  }
                }

                .bar-tooltip {
                  position: absolute;
                  top: -24px;
                  left: 50%;
                  transform: translateX(-50%) translateY(0);
                  background: var(--color-navy);
                  color: #FFFFFF;
                  font-size: 10px;
                  font-weight: 800;
                  padding: 2px 6px;
                  border-radius: 4px;
                  white-space: nowrap;
                  opacity: 0;
                  visibility: hidden;
                  transition: all 0.15s ease;
                  pointer-events: none;
                  z-index: 10;

                  &.peak-tip {
                    background: #032447;
                    color: var(--color-primary);
                  }
                }
              }
            }

            .bar-day {
              font-size: 11px;
              font-weight: 600;
              color: var(--color-text-secondary);
              text-align: center;

              &.peak-label {
                color: var(--color-navy);
                font-weight: 800;
              }
            }
          }
        }
      }
    }

    /* CARTE DROITE : DIAGRAMME CIRCULAIRE (DONUT) */
    .donut-chart-layout {
      display: flex;
      align-items: center;
      gap: 18px;
      margin-top: auto;
      padding-top: 4px;

      .donut-wrapper {
        position: relative;
        width: 120px;
        height: 120px;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;

        .donut-svg {
          width: 100%;
          height: 100%;

          .donut-segment {
            transition: stroke-width 0.2s ease, opacity 0.2s ease;
            cursor: pointer;

            &:hover {
              stroke-width: 16;
              opacity: 0.9;
            }
          }
        }

        .donut-center-info {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          pointer-events: none;

          .center-pct {
            font-size: 18px;
            font-weight: 900;
            color: var(--color-navy);
            line-height: 1.1;
          }

          .center-sub {
            font-size: 10px;
            font-weight: 700;
            color: var(--color-text-secondary);
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
        }
      }

      .donut-legend-grid {
        flex: 1;
        min-width: 0;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px 14px;

        .legend-item {
          display: flex;
          align-items: flex-start;
          gap: 7px;

          .legend-bullet {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            margin-top: 3px;
            flex-shrink: 0;

            &.bullet-navy { background: var(--color-navy); }
            &.bullet-gold { background: var(--color-primary); }
            &.bullet-orange { background: var(--color-orange); }
            &.bullet-gray { background: #CBD5E1; }
          }

          .legend-details {
            display: flex;
            flex-direction: column;
            min-width: 0;

            .legend-top {
              display: flex;
              align-items: baseline;
              justify-content: space-between;
              gap: 4px;

              .legend-name {
                font-size: 11px;
                font-weight: 600;
                color: #334155;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
              }

              .legend-val {
                font-size: 12px;
                font-weight: 800;
                color: var(--color-navy);
              }
            }

            .legend-sub {
              font-size: 10px;
              color: var(--color-text-secondary);
              font-weight: 500;
            }
          }
        }
      }
    }

    /* RESPONSIVE */
    @media (max-width: 960px) {
      .charts-simple-grid {
        grid-template-columns: 1fr;
      }
      .dash-header {
        flex-direction: column;
        align-items: flex-start;
      }
      .dash-header-actions {
        width: 100%;
        .btn { flex: 1; justify-content: center; }
      }
      .donut-chart-layout {
        flex-direction: row;
        align-items: center;
      }
    }

    @media (max-width: 540px) {
      .donut-chart-layout {
        flex-direction: column;
        align-items: center;
      }
      .donut-legend-grid {
        grid-template-columns: 1fr;
        width: 100%;
      }
    }
  `]
})
export class DashboardComponent implements OnInit {
  private quizService = inject(QuizService);
  public authService = inject(AuthService);
  public promotionService = inject(PromotionService);
  private router = inject(Router);

  quizzes = this.quizService.getQuizzes();

  myQuizzes = computed(() => {
    const user = this.authService.currentUser();
    if (!user) return [];
    return this.quizzes().filter(q =>
      (q.creatorId && (q.creatorId === user.id || q.creatorId === user.email)) ||
      ((q as any).creatorEmail && (q as any).creatorEmail === user.email)
    );
  });

  statsLoading = signal(true);
  stats = signal({ totalParticipants: 0, averageSuccessRate: 0, completedQuizzes: 0, quizzesCount: 0, weeklyActivity: [0,0,0,0,0,0,0] });

  private readonly DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  weekDays = () => this.DAY_LABELS.map((label, i) => ({
    label,
    count: this.stats().weeklyActivity[i] ?? 0
  }));

  weeklyMax = () => Math.max(...(this.stats().weeklyActivity ?? [0]), 1);

  recentQuizzesCount = () => this.myQuizzes().filter(q => {
    const d = new Date(q.createdAt);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  // Computed stats for donut
  private get allParts(): number { return this.stats().totalParticipants; }

  excellenceCount = () => 0; // placeholder - would require more granular API
  valideCount = () => 0;
  consoliderCount = () => 0;
  nonValideCount = () => 0;

  // Taux simple basé sur le taux de réussite moyen pour le donut
  excellencePct = () => this.stats().averageSuccessRate >= 85 ? Math.round(this.stats().averageSuccessRate) : Math.max(0, Math.round(this.stats().averageSuccessRate - 15));
  validePct = () => this.stats().averageSuccessRate >= 70 ? Math.min(40, Math.round(100 - this.stats().averageSuccessRate)) : 0;
  consoliderPct = () => Math.max(0, Math.round((100 - this.stats().averageSuccessRate) * 0.6));
  nonValidePct = () => Math.max(0, 100 - this.excellencePct() - this.validePct() - this.consoliderPct());

  private readonly CIRCUMFERENCE = 282.74;
  excellenceDash = () => Math.round(this.excellencePct() / 100 * this.CIRCUMFERENCE * 10) / 10;
  valideDash = () => Math.round(this.validePct() / 100 * this.CIRCUMFERENCE * 10) / 10;
  consoliderDash = () => Math.round(this.consoliderPct() / 100 * this.CIRCUMFERENCE * 10) / 10;
  nonValideDash = () => Math.round(this.nonValidePct() / 100 * this.CIRCUMFERENCE * 10) / 10;

  async ngOnInit() {
    this.statsLoading.set(true);
    try {
      const data = await this.quizService.getCreatorStats();
      this.stats.set(data);
    } catch {
      // Keep defaults
    } finally {
      this.statsLoading.set(false);
    }
  }

  startLive(quiz: Quiz) {
    this.quizService.startLiveSession(quiz);
    this.router.navigate(['/app/live/host']);
  }

  launchFirstLive() {
    const list = this.myQuizzes();
    if (list.length > 0) {
      this.startLive(list[0]);
    } else {
      this.router.navigate(['/app/live']);
    }
  }
}
