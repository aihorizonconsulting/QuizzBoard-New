import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { QuizService } from '../../../core/services/quiz.service';
import { LiveSessionService } from '../../../core/services/live-session.service';
import { LiveQuizSession, LiveSessionPlayer } from '../../../core/models/quiz.model';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { LiveSyncService } from '../../../core/services/live-sync.service';

@Component({
  selector: 'app-live-host',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, IconComponent],
  template: `
    <div class="live-host-screen animate-fade-in">
      @if (session(); as live) {
        <!-- TOP BAR: STATUS & CONTROLS -->
        <header class="live-top-bar">
          <div class="live-info">
            <span class="live-dot-pulse" [class.pulse-active]="live.status === 'IN_PROGRESS'"></span>
            <div class="info-titles">
              <span class="status-tag">
                @if (live.status === 'LOBBY') {
                  SALLE D'ATTENTE INTERACTIVE
                } @else if (live.status === 'IN_PROGRESS') {
                  SESSION EN COURS • ÉVALUATION SYNCHRONE
                } @else {
                  SESSION TERMINÉE • PODIUM & RÉSULTATS
                }
              </span>
              <strong class="quiz-title">{{ live.quizTitle }}</strong>
            </div>
          </div>

          <div class="live-top-actions">
            <span class="pin-badge">PIN : {{ live.pin }}</span>

            <!-- Emergency Stop Button for Host during live -->
            @if (live.status === 'IN_PROGRESS') {
              <button class="btn btn-danger btn-sm stop-btn" (click)="stopLiveImmediately()" title="Interrompre et afficher immédiatement le classement final">
                <app-icon name="x-circle" [size]="15" color="#FFFFFF"></app-icon>
                <span>Arrêter le Live</span>
              </button>
            }

            <button class="btn btn-outline btn-sm exit-btn" (click)="exitLive()">
              <app-icon name="log-out" [size]="14"></app-icon>
              <span>Quitter</span>
            </button>
          </div>
        </header>

        <!-- STAGE 1: LOBBY -->
        @if (live.status === 'LOBBY') {
          <!-- Fullscreen Countdown Overlay if Launching -->
          @if (isStartingCountdown) {
            <div class="countdown-modal-overlay">
              <div class="countdown-card animate-scale-up">
                <div class="cd-badge">LANCEMENT SIMULTANÉ</div>
                <div class="cd-number">{{ countdownNumber }}</div>
                <div class="cd-text">Préparez-vous ! Le quiz démarre pour tous les participants...</div>
              </div>
            </div>
          }

          <div class="stage-lobby">
            <!-- HERO PIN & CONNECTION INSTRUCTIONS -->
            <div class="lobby-card card card-navy">
              <div class="pin-instruction">
                <span>Les apprenants rejoignent sur leur téléphone ou ordinateur :</span>
                <span class="url-highlight">quizzboard.com (Bouton « Rejoindre avec un PIN »)</span>
              </div>
              <div class="giant-pin-display">
                {{ live.pin }}
              </div>
              <p class="body-lead" style="color: #CBD5E1; margin: 0;">
                Les participants entrent ce code PIN pour rejoindre instantanément votre salon.
              </p>
            </div>

            <!-- LIVE TIMING & DURATION CARD -->
            <div class="card timing-card">
              <div class="timing-header">
                <div class="time-stat">
                  <span class="t-lbl">QUESTIONS DU QUIZ</span>
                  <strong class="t-val">{{ live.totalQuestions }} questions</strong>
                </div>

                <div class="time-stat">
                  <span class="t-lbl">TEMPS ALLOUÉ PAR QUESTION</span>
                  <div class="time-select-wrap">
                    <select [ngModel]="live.timePerQuestionSeconds || 20" (ngModelChange)="onTimePerQuestionChange($event)" class="time-select">
                      <option [value]="15">15 secondes / question</option>
                      <option [value]="20">20 secondes / question</option>
                      <option [value]="30">30 secondes / question</option>
                      <option [value]="45">45 secondes / question</option>
                      <option [value]="60">60 secondes / question</option>
                    </select>
                  </div>
                </div>

                <div class="time-stat">
                  <span class="t-lbl">DURÉE TOTALE DU LIVE</span>
                  <strong class="t-val highlight-gold">{{ formatDuration(live.totalDurationSeconds) }}</strong>
                  <span class="t-sub">(Somme du temps de chaque question)</span>
                </div>

                <div class="time-stat">
                  <span class="t-lbl">HEURE DE FIN ESTIMÉE</span>
                  <strong class="t-val">{{ getEstimatedEndTime() }}</strong>
                  <span class="t-sub">(Calculée dès le lancement)</span>
                </div>
              </div>
            </div>

            <!-- ENROLL BY EMAIL OR MATRICULE SECTION -->
            <div class="card add-students-card">
              <div class="card-section-title">
                <app-icon name="users" [size]="18" color="var(--color-navy)"></app-icon>
                <h3 class="h3" style="margin: 0;">Inscrire / Ajouter des Apprenants au Live</h3>
              </div>
              <p class="body-small" style="margin-top: 4px; color: var(--color-text-secondary);">
                En plus du code PIN, vous pouvez ajouter directement des élèves par leur <strong>adresse email</strong> ou leur <strong>matricule étudiant</strong>. Ils rejoindront la liste en temps réel.
              </p>

              <form (ngSubmit)="addStudentSubmit()" class="student-add-form">
                <div class="input-with-btn">
                  <input 
                    type="text" 
                    [(ngModel)]="studentInput" 
                    name="studentInput"
                    placeholder="Saisissez l'email (ex: fatou.sow@univ.sn) ou le matricule (ex: ETU-2026-4819)..."
                    class="input-field-student"
                    [class.input-error]="studentError"
                    (input)="studentError = ''">
                  <button type="submit" class="btn btn-primary" [disabled]="!studentInput.trim()">
                    <app-icon name="plus" [size]="16" color="var(--color-navy)"></app-icon>
                    <span>Ajouter au Live</span>
                  </button>
                </div>
                @if (studentError) {
                  <span class="field-error-msg" style="margin-top: 6px;">
                    <app-icon name="alert" [size]="13" color="var(--color-danger)"></app-icon>
                    <span>{{ studentError }}</span>
                  </span>
                }
              </form>

              <!-- Quick suggestion chips -->
              <div class="quick-chips-row">
                <span class="chips-hint">Suggestions rapides (1 clic) :</span>
                <button type="button" class="quick-chip" (click)="addQuickStudent('fatou.sow@etudiant.univ.sn', 'Fatou Sow', 'ETU-2026-012')">
                  + Fatou Sow (ETU-012)
                </button>
                <button type="button" class="quick-chip" (click)="addQuickStudent('amadou.k@etudiant.univ.sn', 'Amadou Kane', 'ETU-2026-088')">
                  + Amadou Kane (ETU-088)
                </button>
                <button type="button" class="quick-chip" (click)="addQuickStudent('mariama.ba@etudiant.sn', 'Mariama Bâ', 'ETU-2026-045')">
                  + Mariama Bâ (ETU-045)
                </button>
                <button type="button" class="quick-chip" (click)="addQuickStudent('paul.k@polytechnique.ci', 'Paul Koffi', 'ETU-2026-104')">
                  + Paul Koffi (ETU-104)
                </button>
              </div>
            </div>

            <!-- CONNECTED PLAYERS LIST & LAUNCH BUTTON -->
            <div class="players-zone card">
              <div class="players-header">
                <div>
                  <h3 class="h3" style="display: flex; align-items: center; gap: 8px; margin: 0;">
                    <app-icon name="users" [size]="20" color="var(--color-navy)"></app-icon>
                    <span>Apprenants Inscrits & Prêts ({{ live.players.length }})</span>
                  </h3>
                  <span class="body-small text-muted">Le quiz démarrera simultanément pour tous les participants listés.</span>
                </div>

                <button class="btn btn-primary btn-lg launch-live-btn" [disabled]="live.players.length === 0" (click)="triggerSimultaneousStart()">
                  <app-icon name="play" [size]="20" color="var(--color-navy)"></app-icon>
                  <span>Lancer la Session Live (Simultané)</span>
                </button>
              </div>

              <div class="players-grid">
                @for (player of live.players; track player.id) {
                  <div class="player-chip">
                    <div class="chip-avatar">
                      {{ player.nickname.charAt(0).toUpperCase() }}
                    </div>
                    <div class="chip-info">
                      <span class="player-name">{{ player.nickname }}</span>
                      <div class="player-identifiers">
                        @if (player.matricule) {
                          <span class="matricule-tag">{{ player.matricule }}</span>
                        }
                        @if (player.email) {
                          <span class="email-tag">{{ player.email }}</span>
                        }
                      </div>
                    </div>
                    <span class="ready-badge">
                      <app-icon name="check" [size]="12" color="#16A34A"></app-icon>
                      Prêt
                    </span>
                    <button type="button" class="remove-player-btn" (click)="removeStudent(player.id)" title="Retirer ce participant">✕</button>
                  </div>
                }
              </div>
            </div>
          </div>
        }

        <!-- STAGE 2: PARTIE EN COURS — SUIVI RÉEL DES RÉPONSES DES APPRENANTS -->
        @if (live.status === 'IN_PROGRESS') {
          <div class="stage-question">
            <!-- PROGRESSION GLOBALE & TEMPS ÉCOULÉ -->
            <div class="question-progress-bar">
              <div class="q-indicator">
                <span class="q-step">Partie en cours • {{ live.totalQuestions }} questions</span>
                <span class="q-live-hint">Chaque apprenant répond à son rythme ({{ live.timePerQuestionSeconds || 20 }}s max par question)</span>
              </div>

              <div class="q-timer-badge">
                <app-icon name="clock" [size]="18" color="var(--color-navy)"></app-icon>
                <div class="timer-digits">
                  <span class="timer-sec">{{ formatElapsed(live.elapsedSeconds) }}</span>
                  <span class="timer-lbl">écoulées</span>
                </div>
              </div>

              <div class="question-nav-actions">
                <button class="btn btn-primary btn-sm" (click)="finishLive()">
                  <app-icon name="trophy" [size]="16" color="var(--color-navy)"></app-icon>
                  <span>Terminer et afficher le podium</span>
                </button>
              </div>
            </div>

            <!-- SUIVI DES RÉPONSES -->
            <div class="question-main-card card">
              <div class="question-badge-topic">ÉVALUATION EN DIRECT • SUIVI DES RÉPONSES</div>
              <h2 class="display-title question-headline">{{ live.quizTitle }}</h2>

              <div class="answer-counter-bar">
                <div class="counter-badge">
                  <app-icon name="check-circle" [size]="16" color="var(--color-success)"></app-icon>
                  <span>{{ finishedCount(live) }} / {{ live.players.length }} apprenants ont terminé • {{ totalAnswers(live) }} réponses enregistrées</span>
                </div>
                <div class="answers-track">
                  <div class="answers-fill" [style.width]="answersProgressPercent(live) + '%'"></div>
                </div>
              </div>
              @if (finishedCount(live) === live.players.length && live.players.length > 0) {
                <p class="all-finished-hint">Tous les apprenants ont terminé : vous pouvez afficher le podium.</p>
              }
            </div>

            <!-- CLASSEMENT EN DIRECT (SCORES RÉELS) -->
            <div class="live-leaderboard-preview card">
              <div class="lead-head">
                <h4 class="h3" style="display: flex; align-items: center; gap: 8px; margin: 0;">
                  <app-icon name="trophy" [size]="18" color="var(--color-navy)"></app-icon>
                  <span>Classement en Direct</span>
                </h4>
                <span class="body-small text-muted">Mis à jour à chaque réponse des apprenants</span>
              </div>

              <div class="rank-list">
                @for (p of live.players; track p.id; let rank = $index) {
                  <div class="rank-row">
                    <span class="rank-pos">#{{ rank + 1 }}</span>
                    <div class="rank-user">
                      <strong class="rank-name">{{ p.nickname }}</strong>
                      @if (p.matricule) {
                        <span class="rank-matricule">{{ p.matricule }}</span>
                      }
                    </div>
                    <span class="rank-progress" [class.is-done]="p.finished">
                      {{ p.finished ? 'Terminé' : (p.answeredCount || 0) + ' / ' + live.totalQuestions }}
                    </span>
                    <span class="rank-streak">
                      <app-icon name="flame" [size]="14" color="var(--color-orange)"></app-icon>
                      {{ p.streak }} en série
                    </span>
                    <span class="rank-pts">{{ p.score }} pts</span>
                  </div>
                }
              </div>
            </div>
          </div>
        }

        <!-- STAGE 3: FINISHED, PODIUM & COMPLETE PLAYERS RANKING -->
        @if (live.status === 'FINISHED') {
          <div class="stage-podium-full">
            <!-- Alert if manually stopped by professor -->
            @if (live.isManuallyStopped) {
              <div class="manual-stop-banner card">
                <app-icon name="x-circle" [size]="20" color="#B45309"></app-icon>
                <div class="stop-text">
                  <strong>Session arrêtée par l'enseignant</strong>
                  <span>Le live a été clôturé manuellement. Le classement tient compte des réponses enregistrées jusqu'à l'arrêt ; seuls les apprenants ayant terminé le quiz reçoivent leur résultat par email.</span>
                </div>
              </div>
            }

            <!-- 1. PODIUM CAROUSEL CARD -->
            <div class="stage-podium card card-navy">
              <div class="podium-header">
                <div class="trophy-wrap">
                  <app-icon name="trophy" [size]="48" color="var(--color-primary)"></app-icon>
                </div>
                <h1 class="display-title" style="color: #FFFFFF; margin-top: 14px;">LE PODIUM DU LIVE</h1>
                <p class="body-lead" style="color: #CBD5E1; margin: 4px 0 0 0;">
                  @if (rankedPlayers(live).length > 0) {
                    Félicitations aux vainqueurs et à l'ensemble des {{ rankedPlayers(live).length }} participants classés !
                  } @else {
                    Aucun apprenant n'a répondu pendant ce live.
                  }
                </p>
              </div>

              @if (rankedPlayers(live); as ranked) {
                <div class="podium-stage">
                  <!-- 2nd Place (Silver) -->
                  @if (ranked.length > 1) {
                    <div class="podium-column silver-col">
                      <div class="podium-player">
                        <div class="medal-icon silver-medal">2</div>
                        <strong class="name">{{ ranked[1].nickname }}</strong>
                        @if (ranked[1].matricule) {
                          <span class="podium-mat">{{ ranked[1].matricule }}</span>
                        }
                        <span class="pts">{{ ranked[1].score }} pts</span>
                        <span class="acc">{{ ranked[1].accuracyPercent ?? 0 }}% réussite</span>
                      </div>
                      <div class="podium-block step-2">ARGENT</div>
                    </div>
                  }

                  <!-- 1st Place (Gold) -->
                  @if (ranked.length > 0) {
                    <div class="podium-column gold-col">
                      <div class="podium-player">
                        <div class="crown-badge">👑</div>
                        <div class="medal-icon gold-medal">1</div>
                        <strong class="name">{{ ranked[0].nickname }}</strong>
                        @if (ranked[0].matricule) {
                          <span class="podium-mat">{{ ranked[0].matricule }}</span>
                        }
                        <span class="pts">{{ ranked[0].score }} pts</span>
                        <span class="acc">{{ ranked[0].accuracyPercent ?? 0 }}% réussite</span>
                      </div>
                      <div class="podium-block step-1">OR • CHAMPION</div>
                    </div>
                  }

                  <!-- 3rd Place (Bronze) -->
                  @if (ranked.length > 2) {
                    <div class="podium-column bronze-col">
                      <div class="podium-player">
                        <div class="medal-icon bronze-medal">3</div>
                        <strong class="name">{{ ranked[2].nickname }}</strong>
                        @if (ranked[2].matricule) {
                          <span class="podium-mat">{{ ranked[2].matricule }}</span>
                        }
                        <span class="pts">{{ ranked[2].score }} pts</span>
                        <span class="acc">{{ ranked[2].accuracyPercent ?? 0 }}% réussite</span>
                      </div>
                      <div class="podium-block step-3">BRONZE</div>
                    </div>
                  }
                </div>
              }
            </div>

            <!-- BANNER CONFIRMATION ENVOI EMAILS RANG ET SCORE -->
            <div class="email-report-alert card">
              <div class="alert-icon-wrap">
                <app-icon name="check-circle" [size]="22" color="#16A34A"></app-icon>
              </div>
              <div class="alert-texts">
                <strong>Résultats envoyés par email</strong>
                <span>Chaque participant reçoit par email son score, son pourcentage et son classement dès qu'il termine le quiz.</span>
              </div>
            </div>

            <!-- 2. FULL PLAYERS RANKING TABLE (CLASSEMENT DE TOUS LES JOUEURS) -->
            <div class="card full-ranking-card">
              <div class="ranking-header-bar">
                <div>
                  <h3 class="h3" style="margin: 0; color: var(--color-navy);">
                    Classement Complet de Tous les Participants ({{ live.players.length }})
                  </h3>
                  <p class="body-small text-muted" style="margin-top: 2px;">
                    Résultats individuels détaillés avec scores, précision pédagogique et matricules.
                  </p>
                </div>

                <div class="ranking-actions">
                  <button class="btn btn-outline btn-sm" (click)="exportResultsCsv(live)">
                    <app-icon name="download" [size]="14"></app-icon>
                    <span>Télécharger les Résultats (CSV)</span>
                  </button>
                  <button class="btn btn-primary btn-sm" (click)="exitLive()">
                    <span>Terminer la Session</span>
                  </button>
                </div>
              </div>

              <div class="table-wrapper">
                <table class="simple-table">
                  <thead>
                    <tr>
                      <th style="width: 70px;">RANG</th>
                      <th>APPRENANT</th>
                      <th>MATRICULE / EMAIL</th>
                      <th>SCORE TOTAL</th>
                      <th>RÉUSSITE</th>
                      <th>TEMPS MOYEN</th>
                      <th style="text-align: right;">STATUT</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (p of live.players; track p.id; let rank = $index) {
                      <tr [class.highlight-row]="hasPlayed(p) && rank < 3">
                        <td>
                          @if (hasPlayed(p)) {
                            <span class="rank-badge" [class.rank-gold]="rank === 0" [class.rank-silver]="rank === 1" [class.rank-bronze]="rank === 2">
                              #{{ rank + 1 }}
                            </span>
                          } @else {
                            <span class="rank-badge">—</span>
                          }
                        </td>
                        <td>
                          <div class="player-cell">
                            <span class="avatar-circle">{{ p.nickname.charAt(0).toUpperCase() }}</span>
                            <strong class="p-name">{{ p.nickname }}</strong>
                          </div>
                        </td>
                        <td>
                          <div class="ids-cell">
                            @if (p.matricule) {
                              <span class="id-badge matricule">{{ p.matricule }}</span>
                            }
                            @if (p.email) {
                              <span class="id-badge email">{{ p.email }}</span>
                            }
                            @if (!p.matricule && !p.email) {
                              <span class="text-muted">Participant libre</span>
                            }
                          </div>
                        </td>
                        <td>
                          <strong class="score-txt">{{ p.score }} pts</strong>
                        </td>
                        <td>
                          @if (hasPlayed(p)) {
                            <span class="badge" [ngClass]="(p.accuracyPercent ?? 0) >= 80 ? 'badge-success' : ((p.accuracyPercent ?? 0) >= 60 ? 'badge-primary' : 'badge-orange')">
                              {{ p.accuracyPercent ?? 0 }}%
                            </span>
                          } @else {
                            <span class="text-muted">—</span>
                          }
                        </td>
                        <td class="body-small text-muted">
                          @if (hasPlayed(p)) {
                            {{ p.avgResponseTimeSeconds ?? 0 }}s / question
                          } @else {
                            —
                          }
                        </td>
                        <td style="text-align: right;">
                          @if (!hasPlayed(p)) {
                            <span class="status-pill status-pending">N'a pas joué</span>
                          } @else if (rank === 0) {
                            <span class="status-pill status-champion">🥇 1er Prix</span>
                          } @else if (rank < 3) {
                            <span class="status-pill status-podium">🏅 Podium</span>
                          } @else if (!p.finished) {
                            <span class="status-pill status-pending">Non terminé ({{ p.answeredCount }} / {{ live.totalQuestions }})</span>
                          } @else if ((p.accuracyPercent ?? 0) >= 70) {
                            <span class="status-pill status-valid">✓ Validé</span>
                          } @else {
                            <span class="status-pill status-pending">À consolider</span>
                          }
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        }
      } @else {
        <div class="no-session card" style="text-align: center; padding: 60px;">
          <h2 class="h2">Aucune session en direct active</h2>
          <p class="body-small" style="margin: 12px 0 20px 0;">Sélectionnez un quiz pour lancer un salon multijoueur.</p>
          <a routerLink="/app/live" class="btn btn-primary">Aller aux Sessions Live</a>
        </div>
      }
    </div>
  `,
  styles: [`
    .live-host-screen {
      display: flex;
      flex-direction: column;
      gap: 20px;
      width: 100%;
    }

    /* TOP BAR */
    .live-top-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #FFFFFF;
      padding: 14px 22px;
      border-radius: var(--radius-md);
      border: 1px solid var(--color-border);
      flex-wrap: wrap;
      gap: 12px;

      .live-info {
        display: flex;
        align-items: center;
        gap: 12px;

        .live-dot-pulse {
          width: 12px;
          height: 12px;
          background: #94A3B8;
          border-radius: 50%;
          &.pulse-active {
            background: #16A34A;
            box-shadow: 0 0 0 4px rgba(22, 163, 74, 0.2);
            animation: pulse 1.6s infinite;
          }
        }

        .info-titles {
          display: flex;
          flex-direction: column;
          gap: 2px;

          .status-tag {
            font-size: 10px;
            font-weight: 800;
            color: var(--color-text-secondary);
            letter-spacing: 0.05em;
          }

          .quiz-title {
            font-size: 16px;
            font-weight: 800;
            color: var(--color-navy);
          }
        }
      }

      .live-top-actions {
        display: flex;
        align-items: center;
        gap: 12px;

        .pin-badge {
          font-size: 15px;
          font-weight: 900;
          background: var(--color-primary);
          color: var(--color-navy);
          padding: 6px 14px;
          border-radius: var(--radius-sm);
          letter-spacing: 0.05em;
        }

        .stop-btn {
          background: #DC2626;
          border-color: #DC2626;
          color: #FFFFFF;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-weight: 700;
          &:hover { background: #B91C1C; }
        }
      }
    }

    /* COUNTDOWN OVERLAY */
    .countdown-modal-overlay {
      position: fixed;
      inset: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(3, 36, 71, 0.85);
      backdrop-filter: blur(8px);
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;

      .countdown-card {
        background: #FFFFFF;
        padding: 48px;
        border-radius: var(--radius-xl);
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        box-shadow: var(--shadow-xl);

        .cd-badge {
          font-size: 12px;
          font-weight: 800;
          color: var(--color-navy);
          background: var(--color-primary-light);
          padding: 4px 12px;
          border-radius: var(--radius-full);
          letter-spacing: 0.05em;
        }

        .cd-number {
          font-size: 96px;
          font-weight: 900;
          color: var(--color-navy);
          line-height: 1;
        }

        .cd-text {
          font-size: 14px;
          color: var(--color-text-secondary);
          max-width: 320px;
        }
      }
    }

    /* STAGE LOBBY */
    .stage-lobby {
      display: flex;
      flex-direction: column;
      gap: 20px;

      .lobby-card {
        text-align: center;
        padding: 36px 24px;
        border-radius: var(--radius-lg);

        .pin-instruction {
          font-size: 15px;
          color: #94A3B8;
          margin-bottom: 6px;

          .url-highlight {
            color: var(--color-primary);
            font-weight: 800;
            margin-left: 6px;
          }
        }

        .giant-pin-display {
          font-size: 72px;
          font-weight: 900;
          color: var(--color-primary);
          letter-spacing: 0.12em;
          line-height: 1;
          margin: 12px 0;
          font-family: monospace;
        }
      }

      .timing-card {
        padding: 20px;

        .timing-header {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;

          .time-stat {
            display: flex;
            flex-direction: column;
            gap: 4px;

            .t-lbl {
              font-size: 10px;
              font-weight: 800;
              color: var(--color-text-secondary);
              text-transform: uppercase;
              letter-spacing: 0.04em;
            }

            .t-val {
              font-size: 17px;
              font-weight: 800;
              color: var(--color-navy);

              &.highlight-gold {
                color: #B45309;
              }
            }

            .t-sub {
              font-size: 11px;
              color: var(--color-text-secondary);
            }

            .time-select {
              padding: 6px 10px;
              font-size: 13px;
              font-weight: 700;
              border: 1px solid var(--color-border);
              border-radius: var(--radius-xs);
              background: #F8FAFC;
              color: var(--color-navy);
            }
          }
        }
      }

      .add-students-card {
        padding: 22px;

        .card-section-title {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .student-add-form {
          margin-top: 14px;

          .input-with-btn {
            display: flex;
            gap: 10px;

            .input-field-student {
              flex: 1;
              padding: 10px 14px;
              border: 1.5px solid var(--color-border);
              border-radius: var(--radius-sm);
              font-size: 14px;
              background: #F8FAFC;
              &:focus {
                outline: none;
                border-color: var(--color-navy);
                background: #FFFFFF;
              }
            }
          }
        }

        .quick-chips-row {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 12px;

          .chips-hint {
            font-size: 11px;
            font-weight: 700;
            color: var(--color-text-secondary);
          }

          .quick-chip {
            background: #F1F5F9;
            border: 1px solid var(--color-border);
            padding: 4px 10px;
            border-radius: var(--radius-full);
            font-size: 11.5px;
            font-weight: 600;
            color: var(--color-navy);
            cursor: pointer;
            transition: all 0.15s ease;
            &:hover {
              background: var(--color-primary-light);
              border-color: var(--color-primary);
            }
          }
        }
      }

      .players-zone {
        padding: 22px;

        .players-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 14px;
          margin-bottom: 18px;

          .launch-live-btn {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            font-weight: 800;
            padding: 10px 24px;
          }
        }

        .players-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 12px;

          .player-chip {
            display: flex;
            align-items: center;
            gap: 10px;
            background: #F8FAFC;
            border: 1px solid var(--color-border);
            padding: 10px 14px;
            border-radius: var(--radius-md);
            position: relative;

            .chip-avatar {
              width: 34px;
              height: 34px;
              border-radius: 50%;
              background: var(--color-navy);
              color: #FFFFFF;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: 800;
              font-size: 13px;
              flex-shrink: 0;
            }

            .chip-info {
              flex: 1;
              min-width: 0;
              display: flex;
              flex-direction: column;
              gap: 2px;

              .player-name {
                font-size: 13px;
                font-weight: 800;
                color: var(--color-navy);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
              }

              .player-identifiers {
                display: flex;
                gap: 6px;
                flex-wrap: wrap;

                .matricule-tag {
                  font-size: 10px;
                  font-weight: 700;
                  background: #E0E7FF;
                  color: #3730A3;
                  padding: 1px 6px;
                  border-radius: 4px;
                  font-family: monospace;
                }

                .email-tag {
                  font-size: 10px;
                  color: var(--color-text-secondary);
                  white-space: nowrap;
                  overflow: hidden;
                  text-overflow: ellipsis;
                  max-width: 140px;
                }
              }
            }

            .ready-badge {
              display: inline-flex;
              align-items: center;
              gap: 4px;
              font-size: 11px;
              font-weight: 700;
              color: #16A34A;
              background: #DCFCE7;
              padding: 2px 8px;
              border-radius: var(--radius-full);
            }

            .remove-player-btn {
              background: transparent;
              border: none;
              color: #94A3B8;
              font-size: 13px;
              cursor: pointer;
              padding: 4px;
              &:hover { color: #DC2626; }
            }
          }
        }
      }
    }

    /* STAGE QUESTION */
    .stage-question {
      display: flex;
      flex-direction: column;
      gap: 18px;

      .question-progress-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #FFFFFF;
        padding: 12px 20px;
        border-radius: var(--radius-md);
        border: 1px solid var(--color-border);
        flex-wrap: wrap;
        gap: 12px;

        .q-indicator {
          display: flex;
          flex-direction: column;

          .q-step {
            font-size: 16px;
            font-weight: 900;
            color: var(--color-navy);
          }
          .q-live-hint {
            font-size: 11px;
            color: #16A34A;
            font-weight: 600;
          }
        }

        .q-timer-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #F8FAFC;
          border: 1.5px solid var(--color-border);
          padding: 6px 16px;
          border-radius: var(--radius-full);

          .timer-digits {
            display: flex;
            align-items: baseline;
            gap: 4px;
            .timer-sec { font-size: 18px; font-weight: 900; color: var(--color-navy); }
            .timer-lbl { font-size: 10px; color: var(--color-text-secondary); font-weight: 600; }
          }

          &.timer-alert {
            background: #FEF2F2;
            border-color: #FECACA;
            .timer-digits .timer-sec { color: #DC2626; }
          }
        }
      }

      .question-main-card {
        padding: 36px 28px;

        .question-badge-topic {
          display: inline-block;
          font-size: 11px;
          font-weight: 800;
          color: var(--color-navy);
          background: var(--color-primary-light);
          padding: 3px 10px;
          border-radius: var(--radius-xs);
          margin-bottom: 12px;
        }

        .question-headline {
          font-size: 24px;
          font-weight: 800;
          color: var(--color-navy);
          text-align: center;
          margin-bottom: 24px;
        }

        .answer-counter-bar {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          margin-bottom: 28px;

          .counter-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            font-size: 13px;
            font-weight: 800;
            color: #16A34A;
            background: #DCFCE7;
            padding: 4px 14px;
            border-radius: var(--radius-full);
          }

          .answers-track {
            width: 100%;
            max-width: 400px;
            height: 6px;
            background: #F1F5F9;
            border-radius: var(--radius-full);
            overflow: hidden;

            .answers-fill {
              height: 100%;
              background: #16A34A;
              transition: width 0.3s ease;
            }
          }
        }

        .all-finished-hint {
          text-align: center;
          font-size: 13px;
          font-weight: 700;
          color: #16A34A;
          margin: -12px 0 0 0;
        }
      }

      .live-leaderboard-preview {
        padding: 20px;

        .lead-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 14px;
        }

        .rank-list {
          display: flex;
          flex-direction: column;
          gap: 8px;

          .rank-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 10px 14px;
            background: #F8FAFC;
            border-radius: var(--radius-sm);
            border: 1px solid var(--color-border);

            .rank-pos {
              font-size: 14px;
              font-weight: 800;
              color: var(--color-navy);
              width: 36px;
            }

            .rank-user {
              flex: 1;
              display: flex;
              align-items: baseline;
              gap: 8px;

              .rank-name { font-size: 13px; color: var(--color-navy); }
              .rank-matricule { font-size: 10px; color: var(--color-text-secondary); font-family: monospace; }
            }

            .rank-progress {
              font-size: 11px;
              font-weight: 700;
              color: var(--color-text-secondary);
              background: #F1F5F9;
              padding: 2px 10px;
              border-radius: var(--radius-full);
              margin-right: 16px;

              &.is-done { color: #16A34A; background: #DCFCE7; }
            }

            .rank-streak {
              display: inline-flex;
              align-items: center;
              gap: 4px;
              font-size: 12px;
              font-weight: 700;
              color: var(--color-orange);
              margin-right: 20px;
            }

            .rank-pts {
              font-size: 14px;
              font-weight: 800;
              color: var(--color-navy);
            }
          }
        }
      }
    }

    /* STAGE PODIUM FULL */
    .stage-podium-full {
      display: flex;
      flex-direction: column;
      gap: 24px;

      .manual-stop-banner {
        display: flex;
        align-items: center;
        gap: 14px;
        background: #FFFBEB;
        border: 1px solid #FDE68A;
        padding: 16px 20px;

        .stop-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
          font-size: 13px;
          color: #92400E;
        }
      }

      .stage-podium {
        text-align: center;
        padding: 48px 32px 32px 32px;
        border-radius: var(--radius-xl);

        .podium-header {
          margin-bottom: 32px;

          .trophy-wrap {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 72px;
            height: 72px;
            border-radius: 50%;
            background: rgba(255, 196, 0, 0.15);
          }
        }

        .podium-stage {
          display: flex;
          justify-content: center;
          align-items: flex-end;
          gap: 16px;
          max-width: 640px;
          margin: 0 auto;
          min-height: 240px;

          .podium-column {
            display: flex;
            flex-direction: column;
            align-items: center;
            flex: 1;

            .podium-player {
              margin-bottom: 12px;
              text-align: center;
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 3px;

              .crown-badge { font-size: 24px; margin-bottom: -4px; }
              .medal-icon {
                width: 32px;
                height: 32px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 900;
                font-size: 14px;

                &.gold-medal { background: #FFC400; color: #032447; }
                &.silver-medal { background: #94A3B8; color: #FFFFFF; }
                &.bronze-medal { background: #B45309; color: #FFFFFF; }
              }

              .name { color: #FFFFFF; font-size: 15px; font-weight: 800; }
              .podium-mat { font-size: 10px; color: #CBD5E1; font-family: monospace; }
              .pts { font-size: 14px; color: var(--color-primary); font-weight: 800; }
              .acc { font-size: 11px; color: #A7F3D0; }
            }

            .podium-block {
              width: 100%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 14px;
              font-weight: 900;
              letter-spacing: 0.05em;
              border-radius: var(--radius-md) var(--radius-md) 0 0;

              &.step-1 { height: 160px; background: var(--color-primary); color: var(--color-navy); }
              &.step-2 { height: 120px; background: #94A3B8; color: #FFFFFF; }
              &.step-3 { height: 85px; background: #B45309; color: #FFFFFF; }
            }
          }
        }
      }

      /* FULL RANKING TABLE */
      .full-ranking-card {
        padding: 24px;

        .ranking-header-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 14px;
          margin-bottom: 20px;

          .ranking-actions {
            display: flex;
            align-items: center;
            gap: 10px;
          }
        }

        .highlight-row {
          background: #FFFDF8;
        }

        .rank-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: var(--radius-xs);
          font-weight: 900;
          font-size: 12px;
          background: #F1F5F9;
          color: var(--color-navy);

          &.rank-gold { background: #FEF3C7; color: #92400E; }
          &.rank-silver { background: #F1F5F9; color: #475569; }
          &.rank-bronze { background: #FFEDD5; color: #9A3412; }
        }

        .player-cell {
          display: flex;
          align-items: center;
          gap: 10px;

          .avatar-circle {
            width: 30px;
            height: 30px;
            border-radius: 50%;
            background: var(--color-navy);
            color: #FFFFFF;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: 800;
          }

          .p-name {
            font-size: 13.5px;
            color: var(--color-navy);
          }
        }

        .ids-cell {
          display: flex;
          flex-direction: column;
          gap: 2px;

          .id-badge {
            font-size: 10.5px;
            &.matricule {
              font-family: monospace;
              font-weight: 700;
              color: #3730A3;
            }
            &.email {
              color: var(--color-text-secondary);
            }
          }
        }

        .score-txt {
          font-size: 14px;
          font-weight: 800;
          color: var(--color-navy);
        }

        .status-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          font-weight: 700;
          padding: 3px 10px;
          border-radius: var(--radius-full);

          &.status-champion { background: #FEF3C7; color: #92400E; }
          &.status-podium { background: #EFF6FF; color: #1E40AF; }
          &.status-valid { background: #DCFCE7; color: #16A34A; }
          &.status-pending { background: #FEF2F2; color: #DC2626; }
        }
      }
    }

    .email-report-alert {
      display: flex;
      align-items: center;
      gap: 16px;
      background: #F0FDF4;
      border: 1.5px solid #BBF7D0;
      border-radius: var(--radius-lg);
      padding: 16px 20px;
      margin-bottom: 24px;

      .alert-icon-wrap {
        flex-shrink: 0;
      }

      .alert-texts {
        flex: 1;
        strong {
          display: block;
          color: #166534;
          font-size: 14px;
          font-weight: 800;
          margin-bottom: 2px;
        }
        span {
          font-size: 13px;
          color: #15803D;
          line-height: 1.4;
        }
      }
    }

    @media (max-width: 768px) {
      .timing-card .timing-header {
        grid-template-columns: 1fr;
      }
      .stage-podium .podium-stage {
        flex-direction: column;
        align-items: center;
        .podium-column { width: 100%; }
      }
    }
  `]
})
export class LiveHostComponent implements OnInit, OnDestroy {
  private quizService = inject(QuizService);
  private liveService = inject(LiveSessionService);
  private liveSyncService = inject(LiveSyncService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  public confirmService = inject(ConfirmDialogService);
  private cdr = inject(ChangeDetectorRef);

  session = this.quizService.activeLiveSession;

  // Student Invitation Input
  studentInput = '';

  // Synchronous countdown before starting
  isStartingCountdown = false;
  countdownNumber = 3;
  private countdownTimer: any = null;

  private syncUnsubscribe: (() => void) | null = null;
  private backendSessionId: string | null = null;
  private livePollTimer: any = null;

  ngOnInit(): void {
    const sessionId = this.route.snapshot.paramMap.get('id');
    if (sessionId) {
      this.backendSessionId = sessionId;
      this.loadBackendSession(sessionId);

      const liveSessions = this.liveService.getLiveSessions()();
      const foundSession = liveSessions.find(s => s.id === sessionId);
      if (foundSession) {
        const foundQuiz = this.quizService.getQuizzes()().find(q => q.id === foundSession.quizId);
        if (foundQuiz) {
          this.quizService.startLiveSession(foundQuiz, foundSession.timePerQuestionSeconds || 20);
          const cur = this.session();
          if (cur) {
            this.quizService.activeLiveSession.set({
              ...cur,
              pin: foundSession.pinCode,
              quizTitle: foundSession.quizTitle
            });
          }
        }
      }
    }

    // Sans identifiant de session ni Live en cours, on renvoie vers la page de création de Live
    if (!sessionId && !this.session()) {
      this.router.navigate(['/app/live']);
      return;
    }

    // Sauvegarder la session dans le bus synchronisé
    const cur = this.session();
    if (cur) {
      this.liveSyncService.saveSessionState(cur);
      this.liveSyncService.broadcast({
        type: 'SESSION_STATE',
        pin: cur.pin,
        payload: { session: cur }
      });
    }

    // Écouter les arrivées de participants en direct (cross-tab / inter-fenêtres)
    this.syncUnsubscribe = this.liveSyncService.onMessage(msg => {
      const active = this.session();
      if (!active || msg.pin.replace(/\s+/g, '') !== active.pin.replace(/\s+/g, '')) return;

      if (msg.type === 'PLAYER_JOINED') {
        const newPlayer = msg.payload?.player;
        if (newPlayer) {
          const alreadyIn = active.players.some(p => p.id === newPlayer.id || (newPlayer.email && p.email === newPlayer.email));
          if (!alreadyIn) {
            this.quizService.addPlayerToLive(newPlayer);
            this.liveSyncService.saveSessionState(this.session());
          }
        }
      } else if (msg.type === 'PLAYER_LEFT') {
        const playerId = msg.payload?.playerId;
        if (playerId) {
          this.quizService.removePlayerFromLive(playerId);
          this.liveSyncService.saveSessionState(this.session());
        }
      }
    });
  }

  ngOnDestroy(): void {
    if (this.syncUnsubscribe) {
      this.syncUnsubscribe();
    }
    this.clearTimers();
    this.stopLivePolling();
  }

  private clearTimers(): void {
    if (this.countdownTimer) clearInterval(this.countdownTimer);
  }

  private stopLivePolling(): void {
    if (this.livePollTimer) clearInterval(this.livePollTimer);
    this.livePollTimer = null;
  }

  private async loadBackendSession(sessionId: string): Promise<void> {
    try {
      const backend = await this.liveService.getBackendLiveSession(sessionId);
      this.applyBackendSession(backend);
      this.startLivePolling(sessionId);
    } catch {
      // Fallback local conservé pour les anciennes sessions créées avant l'API Live.
    }
  }

  private startLivePolling(sessionId: string): void {
    this.stopLivePolling();
    this.livePollTimer = setInterval(async () => {
      try {
        const backend = await this.liveService.getBackendLiveSession(sessionId);
        this.applyBackendSession(backend);
        // Après la fin, on continue tant que des apprenants terminent encore leur quiz
        // (leurs réponses tardives mettent à jour le classement final).
        const stillPlaying = backend.players.some(p => p.answeredCount > 0 && !p.finished);
        if (backend.status === 'FINISHED' && !stillPlaying) {
          this.stopLivePolling();
        }
      } catch {}
    }, 2000);
  }

  private applyBackendSession(backend: ReturnType<LiveSessionService['toLiveQuizSession']> | any): void {
    const live = 'players' in backend && 'pin' in backend && !('manuallyStopped' in backend)
      ? backend
      : this.liveService.toLiveQuizSession(backend);
    this.quizService.activeLiveSession.set(live);
    this.liveSyncService.saveSessionState(live);
    this.cdr.markForCheck();
  }

  async onTimePerQuestionChange(seconds: number): Promise<void> {
    const value = Number(seconds);
    this.quizService.setTimePerQuestion(value);
    if (this.backendSessionId) {
      try {
        const backend = await this.liveService.updateBackendLiveSettings(this.backendSessionId, value);
        this.applyBackendSession(backend);
      } catch {}
    }
    this.liveSyncService.saveSessionState(this.session());
  }

  formatElapsed(seconds?: number): string {
    const total = Math.max(0, Math.floor(seconds || 0));
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  hasPlayed(p: LiveSessionPlayer): boolean {
    return (p.answeredCount || 0) > 0;
  }

  /** Joueurs classés : ceux qui ont répondu au moins une fois (déjà triés par le backend). */
  rankedPlayers(live: LiveQuizSession): LiveSessionPlayer[] {
    return live.players.filter(p => this.hasPlayed(p));
  }

  finishedCount(live: LiveQuizSession): number {
    return live.players.filter(p => p.finished).length;
  }

  totalAnswers(live: LiveQuizSession): number {
    return live.players.reduce((sum, p) => sum + (p.answeredCount || 0), 0);
  }

  answersProgressPercent(live: LiveQuizSession): number {
    const expected = live.players.length * live.totalQuestions;
    if (!expected) return 0;
    return Math.min(100, Math.round((this.totalAnswers(live) / expected) * 100));
  }

  formatDuration(seconds?: number): string {
    if (!seconds) return '0 min 00s';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins} min ${secs < 10 ? '0' : ''}${secs}s`;
  }

  getEstimatedEndTime(): string {
    const cur = this.session();
    if (!cur) return '--:--';
    const totalSecs = cur.totalDurationSeconds || (cur.totalQuestions * (cur.timePerQuestionSeconds || 20));
    const end = new Date(Date.now() + totalSecs * 1000);
    return end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  studentError = '';

  async addStudentSubmit(): Promise<void> {
    this.studentError = '';
    const val = this.studentInput.trim();
    if (!val) {
      this.studentError = 'Veuillez renseigner une adresse email ou un numéro matricule.';
      return;
    }
    if (!val.includes('@') && !val.toUpperCase().startsWith('ETU')) {
      this.studentError = 'Format non reconnu. Entrez un email (nom@domaine.com) ou un matricule (ETU-...)';
      return;
    }
    const player = val.includes('@') ? { email: val } : { matricule: val };
    await this.addPlayer(player);
    this.liveSyncService.saveSessionState(this.session());
    this.studentInput = '';
  }

  async addQuickStudent(email: string, nickname: string, matricule: string): Promise<void> {
    await this.addPlayer({ email, nickname, matricule });
    this.liveSyncService.saveSessionState(this.session());
  }

  private async addPlayer(player: { nickname?: string; email?: string; matricule?: string }): Promise<void> {
    if (this.backendSessionId) {
      try {
        const backend = await this.liveService.joinBackendLiveSession(this.backendSessionId, player);
        this.applyBackendSession(backend);
        return;
      } catch {}
    }
    this.quizService.addPlayerToLive(player);
  }

  removeStudent(playerId: string): void {
    this.quizService.removePlayerFromLive(playerId);
    this.liveSyncService.saveSessionState(this.session());
  }

  // Déclenchement du compte à rebours 3-2-1 synchronisé
  triggerSimultaneousStart(): void {
    const cur = this.session();
    if (!cur) return;

    this.isStartingCountdown = true;
    this.countdownNumber = 3;

    // Diffuser le décompte initial
    this.liveSyncService.broadcast({
      type: 'COUNTDOWN',
      pin: cur.pin,
      payload: { count: 3 }
    });

    this.countdownTimer = setInterval(() => {
      this.countdownNumber--;
      this.cdr.markForCheck();
      if (this.countdownNumber > 0) {
        this.liveSyncService.broadcast({
          type: 'COUNTDOWN',
          pin: cur.pin,
          payload: { count: this.countdownNumber }
        });
      } else {
        clearInterval(this.countdownTimer);
        this.isStartingCountdown = false;
        this.startSimultaneousGame();
      }
    }, 1000);
  }

  private async startSimultaneousGame(): Promise<void> {
    const cur = this.session();
    if (!cur) return;

    if (this.backendSessionId) {
      try {
        const backend = await this.liveService.startBackendLiveSession(this.backendSessionId);
        this.applyBackendSession(backend);
      } catch {
        this.quizService.startLiveGame();
      }
    } else {
      this.quizService.startLiveGame();
    }

    // DIFFUSION SIMULTANÉE : tous les apprenants ouvrent le pop-up de quiz instantanément
    const started = this.session() || cur;
    this.liveSyncService.broadcast({
      type: 'GAME_STARTED',
      pin: cur.pin,
      payload: { quizId: cur.quizId, timePerQuestionSeconds: started.timePerQuestionSeconds || 20 }
    });
    this.liveSyncService.saveSessionState(this.session());
    this.cdr.markForCheck();
  }

  // Fin normale du Live : fige le classement et envoie les résultats aux apprenants qui ont terminé
  async finishLive(): Promise<void> {
    const cur = this.session();
    if (!cur) return;

    const unfinished = cur.players.filter(p => !p.finished).length;
    if (unfinished > 0) {
      const ok = await this.confirmService.confirm({
        title: 'Terminer le Live',
        message: `${unfinished} apprenant(s) n'ont pas encore terminé. Le podium sera calculé avec les réponses déjà enregistrées ; ceux qui terminent ensuite recevront quand même leur résultat par email.`,
        confirmText: 'Afficher le podium',
        cancelText: 'Attendre encore',
        variant: 'primary',
        icon: 'trophy'
      });
      if (!ok) return;
    }

    if (this.backendSessionId) {
      try {
        const backend = await this.liveService.finishBackendLiveSession(this.backendSessionId);
        this.applyBackendSession(backend);
      } catch {
        this.quizService.stopLiveSessionManually();
      }
    } else {
      this.quizService.stopLiveSessionManually();
    }
    this.broadcastSessionEnded();
  }

  private broadcastSessionEnded(): void {
    this.clearTimers();
    const cur = this.session();
    if (cur) {
      this.liveSyncService.broadcast({
        type: 'SESSION_ENDED',
        pin: cur.pin,
        payload: { players: cur.players }
      });
    }
  }

  // Arrêt d'urgence de la session par l'enseignant
  async stopLiveImmediately(): Promise<void> {
    const ok = await this.confirmService.confirm({
      title: 'Arrêter la session Live',
      message: 'Êtes-vous sûr de vouloir arrêter le Live immédiatement ? Le classement final sera calculé avec les scores actuels.',
      confirmText: 'Arrêter le Live',
      cancelText: 'Continuer la session',
      variant: 'danger',
      icon: 'lock'
    });
    if (!ok) return;
    if (this.backendSessionId) {
      try {
        const backend = await this.liveService.stopBackendLiveSession(this.backendSessionId);
        this.applyBackendSession(backend);
      } catch {
        this.quizService.stopLiveSessionManually();
      }
    } else {
      this.quizService.stopLiveSessionManually();
    }
    this.broadcastSessionEnded();
  }

  // Les résultats par email sont envoyés par le backend : à la fin de la session (ou dès qu'un
  // apprenant termine après la clôture), chacun reçoit son score et son rang dans ce Live.

  exportResultsCsv(live: LiveQuizSession): void {
    const escape = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
    const header = ['Rang', 'Apprenant', 'Matricule', 'Email', 'Score', 'Réponses', 'Réussite (%)', 'Temps moyen (s)', 'Statut'];
    const rows = live.players.map((p, idx) => {
      const played = this.hasPlayed(p);
      const status = !played ? "N'a pas joué" : (p.finished ? 'Terminé' : 'Non terminé');
      return [
        played ? idx + 1 : '',
        p.nickname,
        p.matricule || '',
        p.email || '',
        p.score,
        `${p.answeredCount || 0} / ${live.totalQuestions}`,
        played ? (p.accuracyPercent ?? 0) : '',
        played ? (p.avgResponseTimeSeconds ?? 0) : '',
        status
      ].map(escape).join(',');
    });

    const csv = '﻿' + [header.map(escape).join(','), ...rows].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `resultats_live_${live.pin.replace(/\s+/g, '')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  exitLive(): void {
    this.clearTimers();
    this.stopLivePolling();
    if (this.syncUnsubscribe) {
      this.syncUnsubscribe();
    }
    this.liveSyncService.saveSessionState(null);
    this.quizService.activeLiveSession.set(null);
    this.router.navigate(['/app/live']);
  }
}
