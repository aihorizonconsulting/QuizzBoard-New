import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ParticipationService } from '../../../core/services/participation.service';
import { ClasseService } from '../../../core/services/classe.service';
import { CourseService } from '../../../core/services/course.service';
import { QuizService } from '../../../core/services/quiz.service';
import { JoinModalService } from '../../../core/services/join-modal.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';

@Component({
  selector: 'app-learner-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, IconComponent],
  template: `
    <div class="learner-dashboard-page animate-fade-in">
      <!-- 1. HEADER HERO: BIENVENUE, XP & SÉRIE -->
      <div class="card hero-card">
        <div class="hero-main">
          <div class="hero-tag-row">
            <span class="badge badge-primary">Espace Apprenant</span>
            <span class="badge badge-navy">Niveau {{ authService.currentUser()?.level || 1 }}</span>
          </div>

          <h1 class="h1" style="margin: 8px 0 4px 0;">
            Bonjour, {{ authService.currentUser()?.prenom || 'Étudiant' }} ! 👋
          </h1>
          <p class="body-small text-muted" style="margin: 0;">
            {{ authService.currentUser()?.organization || 'Université Virtuelle' }} • Prêt pour vos évaluations du jour ?
          </p>
        </div>

        <div class="hero-stats">
          <div class="stat-pill">
            <div class="stat-icon-wrap zap">
              <app-icon name="zap" [size]="18" color="var(--color-navy)"></app-icon>
            </div>
            <div class="stat-data">
              <span class="val">{{ authService.currentUser()?.xpPoints ?? 0 }}</span>
              <span class="lbl">Points d'XP</span>
            </div>
          </div>

          <div class="stat-pill">
            <div class="stat-icon-wrap flame">
              <app-icon name="award" [size]="18" color="var(--color-orange)"></app-icon>
            </div>
            <div class="stat-data">
              <span class="val">{{ authService.currentUser()?.streakDays ?? 0 }} Jours</span>
              <span class="lbl">Série Active</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 2. QUICK ACTION: ENTER LIVE QUIZ PIN -->
      <div class="card join-action-strip">
        <div class="join-info">
          <div class="join-icon">
            <app-icon name="play" [size]="20" color="var(--color-navy)"></app-icon>
          </div>
          <div>
            <h3 class="h3" style="font-size: 15px; margin: 0;">Vous avez un Code PIN pour un Quiz Live ?</h3>
            <p class="body-small text-muted" style="margin: 2px 0 0 0;">Rejoignez immédiatement la session en direct lancée par votre enseignant.</p>
          </div>
        </div>

        <button type="button" (click)="joinModalService.open()" class="btn btn-primary btn-sm btn-join">
          <app-icon name="play" [size]="14" color="var(--color-navy)"></app-icon>
          <span>Rejoindre la Session</span>
        </button>
      </div>

      <!-- 3. DEUX DIAGRAMMES TRÈS SIMPLES (ACTIVITÉ HEBDOMADAIRE & TAUX DE RÉUSSITE) -->
      <div class="charts-simple-grid">
        <!-- DIAGRAMME 1 : ACTIVITÉ HEBDOMADAIRE -->
        <div class="simple-chart-card card">
          <div class="card-top-row">
            <div>
              <span class="card-eyebrow">Progression continue</span>
              <h3 class="card-title">Activité de la Semaine</h3>
            </div>
            <span class="trend-badge success">+{{ weeklyXpTotal() }} XP gagnés</span>
          </div>

          <div class="big-metric-wrap">
            <span class="big-metric-val">{{ participations().length }} {{ participations().length > 1 ? 'Quiz complétés' : 'Quiz complété' }}</span>
            <span class="big-metric-unit">• Régularité exemplaire</span>
          </div>

          <div class="chart-area-bars">
            <div class="chart-bars-wrap">
              <div class="guidelines">
                <div class="gl line-100"><span>100 XP</span></div>
                <div class="gl line-50"><span>50 XP</span></div>
              </div>

              <div class="bars-container">
                <!-- Lundi -->
                <div class="bar-col">
                  <div class="bar-track">
                    <div class="bar-fill" style="height: 45%;">
                      <span class="bar-tooltip">45 XP</span>
                    </div>
                  </div>
                  <span class="bar-day">Lun</span>
                </div>

                <!-- Mardi -->
                <div class="bar-col">
                  <div class="bar-track">
                    <div class="bar-fill" style="height: 70%;">
                      <span class="bar-tooltip">70 XP</span>
                    </div>
                  </div>
                  <span class="bar-day">Mar</span>
                </div>

                <!-- Mercredi -->
                <div class="bar-col">
                  <div class="bar-track">
                    <div class="bar-fill" style="height: 55%;">
                      <span class="bar-tooltip">55 XP</span>
                    </div>
                  </div>
                  <span class="bar-day">Mer</span>
                </div>

                <!-- Jeudi (Jour fort : surbrillance jaune) -->
                <div class="bar-col is-peak">
                  <div class="bar-track">
                    <div class="bar-fill bar-fill-highlight" style="height: 95%;">
                      <span class="bar-tooltip">120 XP 🔥</span>
                    </div>
                  </div>
                  <span class="bar-day peak-day">Jeu</span>
                </div>

                <!-- Vendredi -->
                <div class="bar-col">
                  <div class="bar-track">
                    <div class="bar-fill" style="height: 65%;">
                      <span class="bar-tooltip">65 XP</span>
                    </div>
                  </div>
                  <span class="bar-day">Ven</span>
                </div>

                <!-- Samedi -->
                <div class="bar-col">
                  <div class="bar-track">
                    <div class="bar-fill" style="height: 35%;">
                      <span class="bar-tooltip">35 XP</span>
                    </div>
                  </div>
                  <span class="bar-day">Sam</span>
                </div>

                <!-- Dimanche -->
                <div class="bar-col">
                  <div class="bar-track">
                    <div class="bar-fill" style="height: 50%;">
                      <span class="bar-tooltip">50 XP</span>
                    </div>
                  </div>
                  <span class="bar-day">Dim</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- DIAGRAMME 2 : TAUX DE RÉUSSITE GLOBAL (DONUT ÉPURÉ) -->
        <div class="simple-chart-card card">
          <div class="card-top-row">
            <div>
              <span class="card-eyebrow">Maîtrise des acquis</span>
              <h3 class="card-title">Taux de Réussite Global</h3>
            </div>
            <span class="trend-badge success">Niveau Avancé</span>
          </div>

          <div class="big-metric-wrap">
            <span class="big-metric-val">{{ averageScore() }}%</span>
            <span class="big-metric-unit">moyenne générale des évaluations</span>
          </div>

          <div class="donut-chart-layout">
            <!-- DONUT SVG -->
            <div class="donut-wrapper">
              <svg class="donut-svg" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="45" fill="none" stroke="#F1F5F9" stroke-width="14" />
                <!-- Segment Réussi (85%) -->
                <circle 
                  cx="60" cy="60" r="45" 
                  fill="none" 
                  stroke="#032447" 
                  stroke-width="14" 
                  stroke-dasharray="240.3 282.74" 
                  stroke-dashoffset="0"
                  transform="rotate(-90 60 60)"
                  class="donut-segment"
                />
                <!-- Segment Notions complémentaires (15%) -->
                <circle 
                  cx="60" cy="60" r="45" 
                  fill="none" 
                  stroke="#FFC400" 
                  stroke-width="14" 
                  stroke-dasharray="42.4 282.74" 
                  stroke-dashoffset="-240.3"
                  transform="rotate(-90 60 60)"
                  class="donut-segment"
                />
              </svg>

              <div class="donut-center-info">
                <span class="center-pct">{{ averageScore() }}%</span>
                <span class="center-sub">Succès</span>
              </div>
            </div>

            <!-- LÉGENDE DEUX LIGNES TRÈS SIMPLE -->
            <div class="donut-simple-legend">
              <div class="legend-row">
                <span class="bullet bullet-navy"></span>
                <div class="legend-text">
                  <div class="legend-title-row">
                    <span class="name">Évaluations Validées</span>
                    <strong class="val">{{ averageScore() }}%</strong>
                  </div>
                  <span class="sub">{{ passedCount() }} quiz réussis avec brio</span>
                </div>
              </div>

              <div class="legend-row">
                <span class="bullet bullet-gold"></span>
                <div class="legend-text">
                  <div class="legend-title-row">
                    <span class="name">À Réviser</span>
                    <strong class="val">{{ 100 - averageScore() }}%</strong>
                  </div>
                  <span class="sub">{{ toReviewCount() }} notions recommandées</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 4. ACTIVE CLASSES (ÉPURÉ) -->
      <div class="section-container">
        <div class="section-head">
          <div>
            <h2 class="h2">Mes Classes & Formations</h2>
            <p class="body-small">Accédez directement à vos cours et aux ressources partagées.</p>
          </div>
          <a routerLink="/app/learner/classes" class="caption link-all">
            <span>Voir toutes mes classes</span>
            <app-icon name="arrow-right" [size]="13"></app-icon>
          </a>
        </div>

        <div class="classes-grid">
          @for (c of classes().slice(0, 3); track c.id) {
            <div class="class-card card card-interactive" [routerLink]="['/app/learner/classes']">
              <div class="card-top">
                <span class="level-pill">{{ c.level }}</span>
                <span class="code-txt">#{{ c.code }}</span>
              </div>
              <h3 class="class-title">{{ c.name }}</h3>
              <div class="class-footer">
                <span class="meta-item">
                  <app-icon name="user" [size]="12"></app-icon>
                  {{ c.creatorName || 'Professeur' }}
                </span>
                <span class="badge badge-navy">{{ c.assignedQuizIds.length }} quiz</span>
              </div>
            </div>
          }
        </div>
      </div>

      <!-- 5. BANDEAU CERTIFICATS ÉLÉGANT -->
      <div class="card cert-strip card-interactive" [routerLink]="['/app/learner/certificates']">
        <div class="cert-strip-left">
          <div class="cert-strip-icon">
            <app-icon name="award" [size]="20" color="var(--color-navy)"></app-icon>
          </div>
          <div>
            <h4 class="cert-strip-title">Mes Certificats et Attestations de Réussite</h4>
            <p class="cert-strip-sub">Vous avez débloqué {{ certificates().length }} certificat{{ certificates().length > 1 ? 's' : '' }} officiel{{ certificates().length > 1 ? 's' : '' }} avec signature d'authenticité.</p>
          </div>
        </div>
        <span class="btn btn-outline btn-sm">
          <span>Consulter mes certificats</span>
          <app-icon name="arrow-right" [size]="13"></app-icon>
        </span>
      </div>
    </div>
  `,
  styles: [`
    .learner-dashboard-page {
      display: flex;
      flex-direction: column;
      gap: 20px;
      width: 100%;
    }

    /* 1. HERO CARD */
    .hero-card {
      padding: 24px 28px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 20px;
      background: #FFFFFF;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-sm);

      .hero-main {
        flex: 1;
        min-width: 260px;

        .hero-tag-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }
      }

      .hero-stats {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;

        .stat-pill {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 16px;
          background: #FFFFFF;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-xs);
          transition: all 0.15s ease;

          &:hover {
            transform: translateY(-1px);
            border-color: #CBD5E1;
          }

          .stat-icon-wrap {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;

            &.zap { background: var(--color-primary-light); }
            &.flame { background: var(--color-orange-light); }
          }

          .stat-data {
            display: flex;
            flex-direction: column;
            .val { font-size: 16px; font-weight: 800; color: var(--color-navy); }
            .lbl { font-size: 10.5px; font-weight: 600; color: var(--color-text-secondary); text-transform: uppercase; }
          }
        }
      }
    }

    /* 2. JOIN LIVE ACTION STRIP */
    .join-action-strip {
      padding: 16px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 14px;
      background: linear-gradient(90deg, #FFFFFF 0%, #FFFDF5 100%);
      border: 1px solid #FDE68A;
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-sm);

      .join-info {
        display: flex;
        align-items: center;
        gap: 14px;

        .join-icon {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: var(--color-primary-light);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
      }

      .btn-join {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 8px 18px;
      }
    }

    /* 3. DEUX DIAGRAMMES TRÈS SIMPLES */
    .charts-simple-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 18px;
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
      min-height: 270px;
      transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);

      &:hover {
        border-color: #CBD5E1;
        box-shadow: var(--shadow-md);
      }

      .card-top-row {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 8px;

        .card-eyebrow {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.05em;
          color: var(--color-text-secondary);
          text-transform: uppercase;
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
          font-weight: 800;
          padding: 3px 8px;
          border-radius: var(--radius-full);
          white-space: nowrap;

          &.success {
            background: #DCFCE7;
            color: #166534;
          }
        }
      }

      .big-metric-wrap {
        display: flex;
        align-items: baseline;
        gap: 6px;
        margin-bottom: 14px;

        .big-metric-val {
          font-size: 22px;
          font-weight: 800;
          color: var(--color-navy);
        }

        .big-metric-unit {
          font-size: 12px;
          color: var(--color-text-secondary);
        }
      }
    }

    /* BAR CHART AREA */
    .chart-area-bars {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;

      .chart-bars-wrap {
        position: relative;
        height: 120px;
        width: 100%;

        .guidelines {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          pointer-events: none;

          .gl {
            border-top: 1px dashed #F1F5F9;
            width: 100%;
            span {
              font-size: 9px;
              font-weight: 600;
              color: #94A3B8;
              position: relative;
              top: -8px;
            }
          }
        }

        .bars-container {
          position: relative;
          z-index: 1;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          height: 100%;
          padding: 0 10px 0 32px;

          .bar-col {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 6px;
            flex: 1;
            height: 100%;
            justify-content: flex-end;

            .bar-track {
              width: 100%;
              max-width: 24px;
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
                transition: height 0.4s ease;
                position: relative;
                cursor: pointer;

                &:hover .bar-tooltip {
                  opacity: 1;
                  transform: translateX(-50%) translateY(-4px);
                }

                &.bar-fill-highlight {
                  background: var(--color-primary);
                }

                .bar-tooltip {
                  position: absolute;
                  bottom: 100%;
                  left: 50%;
                  transform: translateX(-50%) translateY(0);
                  background: var(--color-navy);
                  color: #FFFFFF;
                  font-size: 10px;
                  font-weight: 700;
                  padding: 2px 6px;
                  border-radius: 4px;
                  white-space: nowrap;
                  opacity: 0;
                  pointer-events: none;
                  transition: all 0.15s ease;
                  z-index: 10;
                }
              }
            }

            .bar-day {
              font-size: 10.5px;
              font-weight: 600;
              color: var(--color-text-secondary);

              &.peak-day {
                color: var(--color-navy);
                font-weight: 800;
              }
            }
          }
        }
      }
    }

    /* DONUT CHART AREA */
    .donut-chart-layout {
      display: flex;
      align-items: center;
      gap: 20px;
      flex: 1;

      .donut-wrapper {
        position: relative;
        width: 110px;
        height: 110px;
        flex-shrink: 0;

        .donut-svg {
          width: 100%;
          height: 100%;
          transform: rotate(0deg);

          .donut-segment {
            transition: stroke-dasharray 0.5s ease;
          }
        }

        .donut-center-info {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;

          .center-pct {
            font-size: 19px;
            font-weight: 900;
            color: var(--color-navy);
            line-height: 1;
          }

          .center-sub {
            font-size: 9.5px;
            font-weight: 700;
            color: var(--color-text-secondary);
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
        }
      }

      .donut-simple-legend {
        display: flex;
        flex-direction: column;
        gap: 12px;
        flex: 1;

        .legend-row {
          display: flex;
          align-items: flex-start;
          gap: 9px;

          .bullet {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            margin-top: 4px;
            flex-shrink: 0;

            &.bullet-navy { background: var(--color-navy); }
            &.bullet-gold { background: var(--color-primary); }
          }

          .legend-text {
            display: flex;
            flex-direction: column;
            gap: 1px;
            flex: 1;

            .legend-title-row {
              display: flex;
              justify-content: space-between;
              align-items: baseline;
              gap: 8px;

              .name {
                font-size: 12px;
                font-weight: 650;
                color: #334155;
              }

              .val {
                font-size: 13px;
                font-weight: 800;
                color: var(--color-navy);
              }
            }

            .sub {
              font-size: 11px;
              color: var(--color-text-secondary);
            }
          }
        }
      }
    }

    /* 4. SECTION CONTAINER & CLASSES */
    .section-container {
      display: flex;
      flex-direction: column;
      gap: 12px;

      .section-head {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        flex-wrap: wrap;
        gap: 10px;

        h2 { margin: 0; font-size: 17px; font-weight: 800; color: var(--color-navy); }

        .link-all {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          color: var(--color-navy);
          font-weight: 700;
          text-decoration: none;
          &:hover { text-decoration: underline; }
        }
      }

      .classes-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 14px;

        .class-card {
          padding: 18px 20px;
          background: #FFFFFF;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          display: flex;
          flex-direction: column;
          gap: 10px;
          box-shadow: var(--shadow-sm);
          transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);

          &:hover {
            transform: translateY(-2px);
            box-shadow: var(--shadow-md);
            border-color: #CBD5E1;
          }

          .card-top {
            display: flex;
            justify-content: space-between;
            align-items: center;

            .level-pill {
              font-size: 10.5px;
              font-weight: 700;
              background: var(--color-primary-light);
              color: var(--color-navy);
              padding: 2px 7px;
              border-radius: var(--radius-xs);
            }

            .code-txt {
              font-size: 11px;
              font-family: monospace;
              color: var(--color-text-secondary);
            }
          }

          .class-title {
            font-size: 14.5px;
            font-weight: 800;
            color: var(--color-navy);
            margin: 0;
          }

          .class-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 12px;
            color: var(--color-text-secondary);

            .meta-item { display: inline-flex; align-items: center; gap: 4px; }
          }
        }
      }
    }

    /* 5. BANDEAU CERTIFICATS */
    .cert-strip {
      padding: 16px 20px;
      background: #FFFFFF;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-sm);
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 14px;
      transition: all 0.18s ease;

      &:hover {
        border-color: #CBD5E1;
        box-shadow: var(--shadow-md);
        transform: translateY(-1px);
      }

      .cert-strip-left {
        display: flex;
        align-items: center;
        gap: 14px;

        .cert-strip-icon {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: var(--color-primary-light);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .cert-strip-title {
          font-size: 14px;
          font-weight: 800;
          color: var(--color-navy);
          margin: 0 0 2px 0;
        }

        .cert-strip-sub {
          font-size: 12px;
          color: var(--color-text-secondary);
          margin: 0;
        }
      }
    }

    @media (max-width: 900px) {
      .charts-simple-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 768px) {
      .classes-grid {
        grid-template-columns: 1fr;
      }
      .hero-card {
        flex-direction: column;
        align-items: flex-start;
        .hero-stats { width: 100%; justify-content: space-between; .stat-pill { flex: 1; } }
      }
      .join-action-strip {
        flex-direction: column;
        align-items: flex-start;
        .btn-join { width: 100%; justify-content: center; }
      }
      .cert-strip {
        flex-direction: column;
        align-items: flex-start;
        .btn { width: 100%; justify-content: center; }
      }
    }
  `]
})
export class LearnerDashboardComponent {
  public authService = inject(AuthService);
  public joinModalService = inject(JoinModalService);
  private partService = inject(ParticipationService);
  private classeService = inject(ClasseService);

  participations = this.partService.getParticipations();
  certificates = this.partService.getCertificates();
  classes = this.classeService.getClasses();

  averageScore(): number {
    const parts = this.participations();
    if (!parts.length) return 0;
    const sum = parts.reduce((acc, p) => acc + p.percentage, 0);
    return Math.round(sum / parts.length);
  }

  passedCount(): number {
    return this.participations().filter(p => p.percentage >= 75).length;
  }

  toReviewCount(): number {
    return this.participations().filter(p => p.percentage < 75).length;
  }

  weeklyXpTotal(): number {
    return this.authService.currentUser()?.xpPoints ?? 0;
  }
}
