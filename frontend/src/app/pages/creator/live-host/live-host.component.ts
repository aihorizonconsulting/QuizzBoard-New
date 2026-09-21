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
import { ParticipationService } from '../../../core/services/participation.service';

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

        <!-- STAGE 2: QUESTION IN PROGRESS -->
        @if (live.status === 'IN_PROGRESS' || live.status === 'QUESTION_REVIEW') {
          <div class="stage-question">
            <!-- PROGRESS & TIMER BAR -->
            <div class="question-progress-bar">
              <div class="q-indicator">
                <span class="q-step">Question {{ live.currentQuestionIndex + 1 }} / {{ live.totalQuestions }}</span>
                <span class="q-live-hint">Tous les apprenants jouent en direct</span>
              </div>

              <!-- Question Countdown Timer -->
              <div class="q-timer-badge" [class.timer-alert]="questionSecondsRemaining <= 5">
                <app-icon name="clock" [size]="18" [color]="questionSecondsRemaining <= 5 ? '#DC2626' : 'var(--color-navy)'"></app-icon>
                <div class="timer-digits">
                  <span class="timer-sec">{{ questionSecondsRemaining }}s</span>
                  <span class="timer-lbl">restantes</span>
                </div>
              </div>

              <div class="question-nav-actions">
                <button class="btn btn-primary btn-sm" (click)="nextQuestion()">
                  @if (live.currentQuestionIndex + 1 === live.totalQuestions) {
                    <app-icon name="trophy" [size]="16" color="var(--color-navy)"></app-icon>
                    <span>Afficher le Podium Final</span>
                  } @else {
                    <span>Question Suivante</span>
                    <app-icon name="arrow-right" [size]="14" color="var(--color-navy)"></app-icon>
                  }
                </button>
              </div>
            </div>

            <!-- QUESTION CARD -->
            <div class="question-main-card card">
              <div class="question-badge-topic">ÉVALUATION EN DIRECT • CHRONO SYNCHRONE</div>
              <h2 class="display-title question-headline">
                {{ getCurrentQuestionText(live) }}
              </h2>

              <!-- Live Answer Counter & Response Progress -->
              <div class="answer-counter-bar">
                <div class="counter-badge">
                  <app-icon name="check-circle" [size]="16" color="var(--color-success)"></app-icon>
                  <span>{{ getSimulatedAnswersCount(live) }} / {{ live.players.length }} Réponses enregistrées</span>
                </div>
                <div class="answers-track">
                  <div class="answers-fill" [style.width]="(getSimulatedAnswersCount(live) / live.players.length) * 100 + '%'"></div>
                </div>
              </div>

              <!-- Question Options Preview -->
              <div class="live-options-preview">
                <div class="opt-card opt-a"><span class="opt-key">A</span> Option 1 : Découpage modulaire Clean Architecture</div>
                <div class="opt-card opt-b"><span class="opt-key">B</span> Option 2 : Monolithe sans séparation de couches</div>
                <div class="opt-card opt-c"><span class="opt-key">C</span> Option 3 : Microservices avec bus Kafka</div>
                <div class="opt-card opt-d"><span class="opt-key">D</span> Option 4 : Base de données NoSQL distribuée</div>
              </div>
            </div>

            <!-- Mini Live Leaderboard preview -->
            <div class="live-leaderboard-preview card">
              <div class="lead-head">
                <h4 class="h3" style="display: flex; align-items: center; gap: 8px; margin: 0;">
                  <app-icon name="trophy" [size]="18" color="var(--color-navy)"></app-icon>
                  <span>Classement en Direct (Top 5)</span>
                </h4>
                <span class="body-small text-muted">Mise à jour en temps réel à chaque réponse</span>
              </div>

              <div class="rank-list">
                @for (p of live.players.slice(0, 5); track p.id; let rank = $index) {
                  <div class="rank-row">
                    <span class="rank-pos">#{{ rank + 1 }}</span>
                    <div class="rank-user">
                      <strong class="rank-name">{{ p.nickname }}</strong>
                      @if (p.matricule) {
                        <span class="rank-matricule">{{ p.matricule }}</span>
                      }
                    </div>
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
                  <span>Le live a été clôturé manuellement à la question {{ live.currentQuestionIndex + 1 }} / {{ live.totalQuestions }}. Le classement final a été calculé sur l'ensemble des points validés.</span>
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
                  Félicitations aux vainqueurs et à l'ensemble des {{ live.players.length }} participants !
                </p>
              </div>

              <div class="podium-stage">
                <!-- 2nd Place (Silver) -->
                @if (live.players.length > 1) {
                  <div class="podium-column silver-col">
                    <div class="podium-player">
                      <div class="medal-icon silver-medal">2</div>
                      <strong class="name">{{ live.players[1].nickname }}</strong>
                      @if (live.players[1].matricule) {
                        <span class="podium-mat">{{ live.players[1].matricule }}</span>
                      }
                      <span class="pts">{{ live.players[1].score }} pts</span>
                      <span class="acc">{{ live.players[1].accuracyPercent || 80 }}% réussite</span>
                    </div>
                    <div class="podium-block step-2">ARGENT</div>
                  </div>
                }

                <!-- 1st Place (Gold) -->
                @if (live.players.length > 0) {
                  <div class="podium-column gold-col">
                    <div class="podium-player">
                      <div class="crown-badge">👑</div>
                      <div class="medal-icon gold-medal">1</div>
                      <strong class="name">{{ live.players[0].nickname }}</strong>
                      @if (live.players[0].matricule) {
                        <span class="podium-mat">{{ live.players[0].matricule }}</span>
                      }
                      <span class="pts">{{ live.players[0].score }} pts</span>
                      <span class="acc">{{ live.players[0].accuracyPercent || 100 }}% réussite</span>
                    </div>
                    <div class="podium-block step-1">OR • CHAMPION</div>
                  </div>
                }

                <!-- 3rd Place (Bronze) -->
                @if (live.players.length > 2) {
                  <div class="podium-column bronze-col">
                    <div class="podium-player">
                      <div class="medal-icon bronze-medal">3</div>
                      <strong class="name">{{ live.players[2].nickname }}</strong>
                      @if (live.players[2].matricule) {
                        <span class="podium-mat">{{ live.players[2].matricule }}</span>
                      }
                      <span class="pts">{{ live.players[2].score }} pts</span>
                      <span class="acc">{{ live.players[2].accuracyPercent || 70 }}% réussite</span>
                    </div>
                    <div class="podium-block step-3">BRONZE</div>
                  </div>
                }
              </div>
            </div>

            <!-- BANNER CONFIRMATION ENVOI EMAILS RANG ET SCORE -->
            <div class="email-report-alert card">
              <div class="alert-icon-wrap">
                <app-icon name="check-circle" [size]="22" color="#16A34A"></app-icon>
              </div>
              <div class="alert-texts">
                <strong>Rapports de score et rang expédiés par email !</strong>
                <span>Chaque participant connecté avec une adresse email a reçu son bilan officiel avec son score, son pourcentage et son classement (#Rang / {{ live.players.length }}).</span>
              </div>
              <button type="button" class="btn btn-outline btn-sm resend-btn" (click)="resendRankEmails(live)" [disabled]="isSendingEmails">
                <app-icon name="mail" [size]="14"></app-icon>
                <span>{{ isSendingEmails ? 'Envoi en cours...' : 'Renvoyer les emails' }}</span>
              </button>
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
                      <tr [class.highlight-row]="rank < 3">
                        <td>
                          <span class="rank-badge" [class.rank-gold]="rank === 0" [class.rank-silver]="rank === 1" [class.rank-bronze]="rank === 2">
                            #{{ rank + 1 }}
                          </span>
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
                          <span class="badge" [ngClass]="(p.accuracyPercent || 80) >= 80 ? 'badge-success' : ((p.accuracyPercent || 80) >= 60 ? 'badge-primary' : 'badge-orange')">
                            {{ p.accuracyPercent || 80 }}%
                          </span>
                        </td>
                        <td class="body-small text-muted">
                          {{ p.avgResponseTimeSeconds || 4.2 }}s / question
                        </td>
                        <td style="text-align: right;">
                          @if (rank === 0) {
                            <span class="status-pill status-champion">🥇 1er Prix</span>
                          } @else if (rank < 3) {
                            <span class="status-pill status-podium">🏅 Podium</span>
                          } @else if ((p.accuracyPercent || 80) >= 70) {
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

        .live-options-preview {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;

          .opt-card {
            padding: 14px 18px;
            border-radius: var(--radius-md);
            font-size: 14px;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 12px;

            .opt-key {
              width: 24px;
              height: 24px;
              border-radius: 4px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: 900;
              font-size: 12px;
              background: rgba(255, 255, 255, 0.4);
            }

            &.opt-a { background: #EEF2FF; color: #3730A3; border: 1px solid #C7D2FE; }
            &.opt-b { background: #ECFDF5; color: #065F46; border: 1px solid #A7F3D0; }
            &.opt-c { background: #FFFBEB; color: #92400E; border: 1px solid #FDE68A; }
            &.opt-d { background: #FFF1F2; color: #9F1239; border: 1px solid #FECDD3; }
          }
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

      .resend-btn {
        flex-shrink: 0;
        background: #FFFFFF;
        border-color: #86EFAC;
        color: #166534;
        font-weight: 700;

        &:hover:not(:disabled) {
          background: #DCFCE7;
        }
      }
    }

    @media (max-width: 768px) {
      .question-main-card .live-options-preview {
        grid-template-columns: 1fr;
      }
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
  private partService = inject(ParticipationService);
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

  // In-Game Question Timer
  questionSecondsRemaining = 20;
  private questionTimerInterval: any = null;

  // Email dispatch status
  isSendingEmails = false;
  emailsDispatched = false;
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

    if (!this.session()) {
      const list = this.quizService.getQuizzes()();
      if (list.length > 0) {
        this.quizService.startLiveSession(list[0], 20);
      }
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
  }

  private clearTimers(): void {
    if (this.countdownTimer) clearInterval(this.countdownTimer);
    if (this.questionTimerInterval) clearInterval(this.questionTimerInterval);
    if (this.livePollTimer) clearInterval(this.livePollTimer);
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
    if (this.livePollTimer) clearInterval(this.livePollTimer);
    this.livePollTimer = setInterval(async () => {
      try {
        const backend = await this.liveService.getBackendLiveSession(sessionId);
        this.applyBackendSession(backend);
        if (backend.status === 'FINISHED') {
          clearInterval(this.livePollTimer);
          this.livePollTimer = null;
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

  onTimePerQuestionChange(seconds: number): void {
    this.quizService.setTimePerQuestion(Number(seconds));
    this.liveSyncService.saveSessionState(this.session());
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
    this.liveSyncService.broadcast({
      type: 'GAME_STARTED',
      pin: cur.pin,
      payload: { quizId: cur.quizId }
    });
    this.liveSyncService.saveSessionState(this.session());

    this.startQuestionCountdown();
    this.cdr.markForCheck();
  }

  private startQuestionCountdown(): void {
    const cur = this.session();
    const duration = cur?.timePerQuestionSeconds || 20;
    this.questionSecondsRemaining = duration;
    this.cdr.markForCheck();

    if (this.questionTimerInterval) clearInterval(this.questionTimerInterval);

    this.questionTimerInterval = setInterval(() => {
      this.questionSecondsRemaining--;
      this.cdr.markForCheck();
      if (this.questionSecondsRemaining <= 0) {
        clearInterval(this.questionTimerInterval);
      }
    }, 1000);
  }

  async nextQuestion(): Promise<void> {
    if (this.backendSessionId) {
      try {
        const backend = await this.liveService.nextBackendLiveQuestion(this.backendSessionId);
        this.applyBackendSession(backend);
      } catch {
        this.quizService.nextLiveQuestion();
      }
    } else {
      this.quizService.nextLiveQuestion();
    }
    const cur = this.session();
    if (cur && cur.status === 'IN_PROGRESS') {
      this.startQuestionCountdown();
    } else if (cur && cur.status === 'FINISHED') {
      this.clearTimers();
      this.dispatchLiveEndResults(cur);
      this.liveSyncService.broadcast({
        type: 'SESSION_ENDED',
        pin: cur.pin,
        payload: { players: cur.players }
      });
    } else {
      this.clearTimers();
    }
  }

  // Arrêt d'urgence de la session par l'enseignant
  async stopLiveImmediately(): Promise<void> {
    const ok = await this.confirmService.confirm({
      title: 'Arrêter la session Live',
      message: 'Êtes-vous sûr de vouloir arrêter le Live immédiatement ? Le classement final sera calculé avec les scores actuels et les emails envoyés.',
      confirmText: 'Arrêter le Live',
      cancelText: 'Continuer la session',
      variant: 'danger',
      icon: 'lock'
    });
    if (!ok) return;
    this.clearTimers();
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
    const cur = this.session();
    if (cur) {
      this.dispatchLiveEndResults(cur);
      this.liveSyncService.broadcast({
        type: 'SESSION_ENDED',
        pin: cur.pin,
        payload: { players: cur.players }
      });
    }
  }

  /**
   * Envoi automatique par email des résultats détaillés avec score et rang (#Rang / Total)
   * à tous les participants ayant fourni une adresse email
   */
  dispatchLiveEndResults(live: LiveQuizSession): void {
    if (this.emailsDispatched) return;
    this.isSendingEmails = true;

    // Trier les apprenants par score décroissant pour obtenir leur rang précis
    const sorted = [...live.players].sort((a, b) => b.score - a.score);
    const maxScore = (live.totalQuestions || 5) * 100;

    sorted.forEach((p, idx) => {
      if (p.email && p.email.includes('@')) {
        const pct = p.accuracyPercent || Math.round((p.score / maxScore) * 100);
        this.partService.saveParticipation({
          quizId: live.quizId,
          quizTitle: live.quizTitle,
          participantName: p.nickname,
          participantEmail: p.email,
          score: p.score,
          maxScore,
          percentage: pct,
          timeTotalSeconds: Math.round((p.avgResponseTimeSeconds || 4) * (live.totalQuestions || 5)),
          status: 'COMPLETED',
          answers: []
        });
      }
    });

    this.emailsDispatched = true;
    setTimeout(() => {
      this.isSendingEmails = false;
    }, 600);
  }

  resendRankEmails(live: LiveQuizSession): void {
    this.emailsDispatched = false;
    this.dispatchLiveEndResults(live);
  }

  getCurrentQuestionText(s: LiveQuizSession): string {
    return `Question ${s.currentQuestionIndex + 1} : Quelle est la meilleure stratégie pour garantir la scalabilité et la modularité d'une plateforme SaaS ?`;
  }

  getSimulatedAnswersCount(live: LiveQuizSession): number {
    const elapsedRatio = Math.min(1, (live.timePerQuestionSeconds || 20 - this.questionSecondsRemaining) / (live.timePerQuestionSeconds || 20));
    return Math.min(live.players.length, Math.floor(live.players.length * elapsedRatio) + 1);
  }

  exportResultsCsv(live: LiveQuizSession): void {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Rang,Apprenant,Matricule,Email,Score,Pourcentage,TempsMoyen\n';

    live.players.forEach((p, idx) => {
      const line = `${idx + 1},"${p.nickname}","${p.matricule || ''}","${p.email || ''}",${p.score},${p.accuracyPercent || 80}%,${p.avgResponseTimeSeconds || 4.2}s`;
      csvContent += line + '\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `resultats_live_${live.pin.replace(/\s+/g, '')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  exitLive(): void {
    this.clearTimers();
    if (this.syncUnsubscribe) {
      this.syncUnsubscribe();
    }
    this.liveSyncService.saveSessionState(null);
    this.quizService.activeLiveSession.set(null);
    this.router.navigate(['/app/live']);
  }
}
