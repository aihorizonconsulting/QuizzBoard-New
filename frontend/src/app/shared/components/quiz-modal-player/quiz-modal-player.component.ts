import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, OnChanges, SimpleChanges, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Quiz, Question, Choice } from '../../../core/models/quiz.model';
import { ParticipantAnswer } from '../../../core/models/participation.model';
import { AuthService } from '../../../core/services/auth.service';
import { ParticipationService } from '../../../core/services/participation.service';
import { QuizPlayerModalService } from '../../../core/services/quiz-player-modal.service';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-quiz-modal-player',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, IconComponent],
  template: `
    <div class="modal-backdrop" (click)="close()">
      <div class="hero-preview-frame card animate-pop-in" (click)="$event.stopPropagation()">
        <!-- TOP BROWSER / STATUS BAR -->
        <div class="frame-browser-bar">
          <div class="browser-dots">
            <span class="dot red" (click)="close()" title="Fermer"></span>
            <span class="dot yellow"></span>
            <span class="dot green"></span>
          </div>

          <div class="browser-address">
            <app-icon name="lock" [size]="12" color="var(--color-navy)"></app-icon>
            <span>quizzboard.com/play/{{ quiz.shareCode }}</span>
          </div>

          <button class="close-modal-btn" (click)="close()" title="Fermer">
            ✕
          </button>
        </div>

        <!-- MAIN CONTENT AREA -->
        <div class="frame-content">
          @if (!isFinished) {
            <div class="preview-arena">
              <!-- ARENA HEADER -->
              <div class="arena-header">
                <span class="arena-tag">QUESTION {{ currentQuestionIndex + 1 }} / {{ totalQuestions }}</span>
                
                <div class="arena-timer" [class.warning]="timeLeft <= 5">
                  <app-icon name="clock" [size]="14" [color]="timeLeft <= 5 ? 'var(--color-danger)' : 'var(--color-orange)'"></app-icon>
                  <span>{{ timeLeft }}s</span>
                </div>
              </div>

              <!-- PROGRESS BAR -->
              <div class="mini-progress-bar">
                <div class="mini-progress-fill" [style.width]="((currentQuestionIndex + 1) / totalQuestions) * 100 + '%'"></div>
              </div>

              <!-- REALTIME QUESTION TIMER COUNTDOWN BAR -->
              <div class="question-timer-track" title="Chrono de réflexion par question">
                <div 
                  class="question-timer-bar" 
                  [style.width]="timerPercentage + '%'" 
                  [class.urgent]="timeLeft <= 5">
                </div>
              </div>

              <!-- QUESTION TITLE -->
              <h3 class="arena-question">
                {{ currentQuestion.text }}
              </h3>

              <!-- CHOICES LIST -->
              <div class="arena-options-grid">
                @for (choice of currentQuestion.choices; track choice.id; let idx = $index) {
                  <button 
                    type="button"
                    class="preview-option"
                    [class.opt-selected]="selectedChoiceId === choice.id && !hasAnswered"
                    [class.opt-correct]="hasAnswered && choice.isCorrect"
                    [class.opt-wrong]="hasAnswered && selectedChoiceId === choice.id && !choice.isCorrect"
                    [disabled]="hasAnswered"
                    (click)="handleChoiceSelect(choice)">
                    
                    <div class="opt-left">
                      <span class="opt-num">{{ idx + 1 }}</span>
                      <span class="opt-text">{{ choice.text }}</span>
                    </div>

                    @if (hasAnswered && choice.isCorrect) {
                      <app-icon name="check-circle" [size]="18" color="var(--color-success)"></app-icon>
                    }
                    @if (hasAnswered && selectedChoiceId === choice.id && !choice.isCorrect) {
                      <app-icon name="x-circle" [size]="18" color="var(--color-danger)"></app-icon>
                    }
                  </button>
                }
              </div>

              <!-- AUTO-PROGRESSION FEEDBACK -->
              @if (hasAnswered) {
                <div class="auto-next-indicator animate-fade-in" [class.timeout-style]="timeLeft === 0 && !selectedChoiceId">
                  <div class="ani-text">
                    <app-icon [name]="isCurrentCorrect ? 'check' : 'x-circle'" [size]="15" [color]="isCurrentCorrect ? 'var(--color-success)' : 'var(--color-danger)'"></app-icon>
                    <span style="font-weight: 700;">
                      {{ selectedChoiceId ? (isCurrentCorrect ? '+100 XP ! Bonne réponse 🎯' : 'Réponse incorrecte ❌') : 'Temps de réflexion écoulé ! ⏱️' }}
                    </span>
                  </div>
                  <span class="next-countdown">Redirection automatique vers la question suivante en 1.5s...</span>
                </div>
              }
            </div>
          } @else {
            <!-- FINISHED RESULTS SCREEN -->
            <div class="results-arena animate-fade-in">
              <div class="trophy-wrap">
                <app-icon name="award" [size]="48" color="var(--color-navy)"></app-icon>
              </div>

              <h2 class="h1" style="color: var(--color-navy); margin-bottom: 6px;">Quiz Terminé !</h2>
              <p class="body-small" style="margin-bottom: 8px;">Voici votre score pour : <strong>{{ quiz.title }}</strong></p>

              @if (className) {
                <div class="class-context-tag" style="display: inline-flex; align-items: center; gap: 6px; background: #EEF2FF; border: 1px solid #C7D2FE; color: #3730A3; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 999px; margin-bottom: 14px;">
                  <span>📚 Évaluation au sein de la classe : <strong>{{ className }}</strong></span>
                </div>
              }

              <div class="score-display-pill">
                <span class="score-pct">{{ scorePercentage }}%</span>
                <span class="score-pts">{{ totalScore }} / {{ maxTotalScore }} points</span>
              </div>

              <!-- EMAIL SCORE & RANK RECAP -->
              <div class="email-score-card animate-fade-in">
                @if (emailSentSuccess) {
                  <div class="email-status-badge success">
                    <app-icon name="check-circle" [size]="15" color="#16A34A"></app-icon>
                    <span>Votre rapport complet avec score et rang {{ className ? 'au sein de la classe ' + className : 'au classement général' }} a été envoyé à <strong>{{ manualResultEmail || 'votre adresse email' }}</strong> ! 🎯</span>
                  </div>
                } @else {
                  <div class="email-send-form">
                    <input 
                      type="email" 
                      [(ngModel)]="manualResultEmail" 
                      [placeholder]="className ? 'Votre email pour recevoir vos résultats & rang de classe...' : 'Votre email pour recevoir vos résultats & rang...'" 
                      class="email-inline-input">
                    <button type="button" class="btn btn-sm btn-primary" (click)="sendReportToEmail()" [disabled]="!manualResultEmail.trim()">
                      <app-icon name="mail" [size]="13" color="var(--color-navy)"></app-icon>
                      <span>M'envoyer</span>
                    </button>
                  </div>
                }
              </div>

              <!-- REWARD PROMPT FOR GUESTS -->
              @if (!authService.isAuthenticated()) {
                <div class="guest-signup-box">
                  <strong>🎉 Enregistrez vos {{ earnedXp }} XP !</strong>
                  <p class="caption" style="margin: 4px 0 12px 0;">Créez un compte gratuit pour conserver vos résultats et obtenir vos certificats.</p>
                  <a routerLink="/inscription" (click)="close()" class="btn btn-primary btn-sm">
                    <app-icon name="sparkles" [size]="14" color="var(--color-navy)"></app-icon>
                    <span>Créer mon Compte Gratuit</span>
                  </a>
                </div>
              }

              <div class="results-btn-row">
                <button class="btn btn-outline" (click)="restartQuiz()">
                  <app-icon name="play" [size]="14"></app-icon>
                  <span>Rejouer le Quiz</span>
                </button>
                <button class="btn btn-primary" (click)="close()">
                  <span>Terminer</span>
                </button>
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      background: rgba(3, 36, 71, 0.8) !important;
      backdrop-filter: blur(6px) !important;
      -webkit-backdrop-filter: blur(6px) !important;
      z-index: 999999 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      padding: 20px !important;
      margin: 0 !important;
    }

    .hero-preview-frame {
      width: 100%;
      max-width: 680px;
      padding: 0;
      border-radius: var(--radius-lg);
      overflow: hidden;
      border: 1.5px solid var(--color-border);
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.35);
      background: #FFFFFF;
      text-align: left;

      .frame-browser-bar {
        background: #F1F5F9;
        padding: 12px 18px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: 1px solid var(--color-border);

        .browser-dots {
          display: flex;
          gap: 6px;
          .dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            &.red { background: #EF4444; cursor: pointer; }
            &.yellow { background: #F59E0B; }
            &.green { background: #10B981; }
          }
        }

        .browser-address {
          display: flex;
          align-items: center;
          gap: 6px;
          background: #FFFFFF;
          border: 1px solid var(--color-border);
          padding: 4px 14px;
          border-radius: var(--radius-full);
          font-size: 11px;
          font-weight: 600;
          color: var(--color-navy);
        }

        .close-modal-btn {
          background: none;
          border: none;
          font-size: 16px;
          cursor: pointer;
          color: var(--color-text-secondary);
          font-weight: 800;
          padding: 2px 6px;

          &:hover { color: var(--color-danger); }
        }
      }

      .frame-content {
        padding: 24px;
        background: var(--color-background);

        .preview-arena {
          background: #FFFFFF;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: 24px;

          .arena-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;

            .arena-tag {
              font-size: 11px;
              font-weight: 800;
              color: var(--color-navy);
              background: var(--color-navy-light);
              padding: 4px 10px;
              border-radius: var(--radius-full);
              letter-spacing: 0.04em;
            }

            .arena-timer {
              display: flex;
              align-items: center;
              gap: 4px;
              font-size: 13px;
              font-weight: 800;
              color: var(--color-orange);

              &.warning {
                color: var(--color-danger);
                animation: pulseGlow 1s infinite;
              }
            }
          }

          .mini-progress-bar {
            height: 4px;
            background: var(--color-border);
            border-radius: var(--radius-full);
            margin-bottom: 8px;
            overflow: hidden;

            .mini-progress-fill {
              height: 100%;
              background: var(--color-primary);
              transition: width 0.3s ease;
            }
          }

          .question-timer-track {
            width: 100%;
            height: 5px;
            background: #E2E8F0;
            border-radius: var(--radius-full);
            margin-bottom: 20px;
            overflow: hidden;

            .question-timer-bar {
              height: 100%;
              background: #0284C7;
              border-radius: var(--radius-full);
              transition: width 0.95s linear, background-color 0.3s ease;

              &.urgent {
                background: #DC2626;
                animation: pulseGlow 0.8s infinite alternate;
              }
            }
          }

          .arena-question {
            font-size: 17px;
            font-weight: 800;
            color: var(--color-navy);
            line-height: 24px;
            margin-bottom: 20px;
          }

          .arena-options-grid {
            display: flex;
            flex-direction: column;
            gap: 10px;

            .preview-option {
              display: flex;
              align-items: center;
              justify-content: space-between;
              width: 100%;
              padding: 12px 16px;
              border: 1.5px solid var(--color-border);
              border-radius: var(--radius-md);
              background: #FFFFFF;
              font-size: 13px;
              font-weight: 600;
              color: var(--color-text-primary);
              cursor: pointer;
              transition: all 0.15s ease;
              text-align: left;

              .opt-left {
                display: flex;
                align-items: center;
                gap: 12px;
                flex: 1;

                .opt-num {
                  width: 24px;
                  height: 24px;
                  border-radius: var(--radius-sm);
                  background: var(--color-background);
                  color: var(--color-navy);
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-weight: 800;
                  font-size: 11px;
                  flex-shrink: 0;
                }

                .opt-text {
                  flex: 1;
                }
              }

              &:hover:not(:disabled) {
                border-color: var(--color-navy);
                background: var(--color-background);
              }

              &.opt-correct {
                border-color: var(--color-success) !important;
                background: var(--color-success-light) !important;
                color: var(--color-success) !important;
                font-weight: 700;
              }

              &.opt-wrong {
                border-color: var(--color-danger) !important;
                background: #FEE2E2 !important;
                color: var(--color-danger) !important;
                font-weight: 700;
              }
            }
          }

          .auto-next-indicator {
            margin-top: 16px;
            padding: 10px 14px;
            background: var(--color-background);
            border-radius: var(--radius-md);
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 12px;

            .ani-text {
              display: flex;
              align-items: center;
              gap: 6px;
              font-weight: 700;
            }

            .next-countdown {
              color: var(--color-text-secondary);
              font-style: italic;
            }
          }
        }
      }
    }

    /* RESULTS SCREEN */
    .results-arena {
      background: #FFFFFF;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: 32px 24px;
      text-align: center;

      .trophy-wrap {
        width: 72px;
        height: 72px;
        border-radius: 50%;
        background: var(--color-primary-light);
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 16px auto;
      }

      .score-display-pill {
        display: inline-flex;
        flex-direction: column;
        align-items: center;
        background: var(--color-navy-light);
        padding: 12px 24px;
        border-radius: var(--radius-md);
        margin: 16px 0;

        .score-pct {
          font-size: 32px;
          font-weight: 900;
          color: var(--color-navy);
          line-height: 1;
        }

        .score-pts {
          font-size: 12px;
          font-weight: 700;
          color: var(--color-text-secondary);
          margin-top: 4px;
        }
      }

      .guest-signup-box {
        background: var(--color-primary-light);
        border: 1.5px solid var(--color-primary);
        border-radius: var(--radius-md);
        padding: 14px;
        margin: 12px 0 20px 0;
        font-size: 13px;
        color: var(--color-navy);
      }

      .email-score-card {
        margin: 14px 0 18px 0;
        padding: 12px 16px;
        background: #F8FAFC;
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);

        .email-status-badge {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          color: #16A34A;
          font-size: 13px;
          font-weight: 700;
        }

        .email-send-form {
          display: flex;
          gap: 8px;

          .email-inline-input {
            flex: 1;
            padding: 8px 12px;
            border-radius: var(--radius-sm);
            border: 1px solid var(--color-border);
            font-size: 13px;
            outline: none;
            &:focus {
              border-color: var(--color-primary);
            }
          }
        }
      }

      .results-btn-row {
        display: flex;
        justify-content: center;
        gap: 12px;
      }
    }

    @keyframes popIn {
      from { opacity: 0; transform: scale(0.95) translateY(10px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }

    .animate-pop-in {
      animation: popIn 0.2s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }
  `]
})
export class QuizModalPlayerComponent implements OnInit, OnDestroy, OnChanges {
  @Input({ required: true }) quiz!: Quiz;
  @Input() classId?: string;
  @Input() className?: string;
  @Output() closed = new EventEmitter<void>();

  public authService = inject(AuthService);
  private partService = inject(ParticipationService);
  public playerModalService = inject(QuizPlayerModalService);
  private cdr = inject(ChangeDetectorRef);

  currentQuestionIndex = 0;
  selectedChoiceId: string | null = null;
  hasAnswered = false;
  isCurrentCorrect = false;
  isFinished = false;

  totalScore = 0;
  maxTotalScore = 0;
  scorePercentage = 0;
  earnedXp = 0;

  manualResultEmail = '';
  emailSentSuccess = false;

  timeLeft = 20;
  private timerInterval: any = null;
  private autoNextTimeout: any = null;
  private questionStartTime = Date.now();
  recordedAnswers: ParticipantAnswer[] = [];

  get totalQuestions(): number {
    return this.quiz?.questions?.length || 5;
  }

  get questionTimeLimit(): number {
    return this.currentQuestion.timeLimitSeconds || 20;
  }

  get timerPercentage(): number {
    const max = this.questionTimeLimit;
    if (max <= 0) return 0;
    return Math.max(0, Math.min(100, Math.round((this.timeLeft / max) * 100)));
  }

  get currentQuestion(): Question {
    return this.quiz?.questions?.[this.currentQuestionIndex] || {
      id: 'q-default',
      text: 'Question par défaut',
      type: 'SINGLE_CHOICE',
      choices: [],
      points: 100,
      timeLimitSeconds: 20,
      order: 1
    };
  }

  ngOnInit() {
    this.startQuestionTimer();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['quiz'] && !changes['quiz'].isFirstChange()) {
      this.restartQuiz();
    }
  }

  ngOnDestroy() {
    this.clearAllTimers();
  }

  close() {
    this.clearAllTimers();
    this.closed.emit();
  }

  sendReportToEmail() {
    if (!this.manualResultEmail.trim() || !this.manualResultEmail.includes('@')) return;
    const user = this.authService.currentUser();
    const guest = this.playerModalService.guestParticipant();
    const participantName = user ? `${user.prenom} ${user.nom}` : (guest?.nickname || 'Participant Invité');

    this.partService.saveParticipation({
      quizId: this.quiz.id,
      quizTitle: this.quiz.title,
      classId: this.classId,
      className: this.className,
      participantName,
      participantEmail: this.manualResultEmail.trim(),
      score: this.totalScore,
      maxScore: this.maxTotalScore,
      percentage: this.scorePercentage,
      timeTotalSeconds: 60,
      status: 'COMPLETED',
      answers: this.recordedAnswers
    });
    this.emailSentSuccess = true;
    this.cdr.markForCheck();
  }

  startQuestionTimer() {
    this.clearAllTimers();
    this.questionStartTime = Date.now();
    this.timeLeft = this.questionTimeLimit;
    this.hasAnswered = false;
    this.selectedChoiceId = null;
    this.isCurrentCorrect = false;
    this.cdr.markForCheck();

    this.timerInterval = setInterval(() => {
      if (!this.hasAnswered) {
        if (this.timeLeft > 1) {
          this.timeLeft--;
          this.cdr.markForCheck();
        } else if (this.timeLeft === 1) {
          this.timeLeft = 0;
          this.cdr.markForCheck();
          this.handleTimeOut();
        }
      }
    }, 1000);
  }

  clearAllTimers() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    if (this.autoNextTimeout) {
      clearTimeout(this.autoNextTimeout);
      this.autoNextTimeout = null;
    }
  }

  handleChoiceSelect(choice: Choice) {
    if (this.hasAnswered) return;
    this.hasAnswered = true;
    this.selectedChoiceId = choice.id;
    this.isCurrentCorrect = choice.isCorrect;
    this.clearAllTimers();

    const timeSpent = Math.max(1, Math.round((Date.now() - this.questionStartTime) / 1000));
    const points = this.isCurrentCorrect ? (this.currentQuestion.points || 100) : 0;
    this.totalScore += points;

    this.recordedAnswers.push({
      questionId: this.currentQuestion.id,
      selectedChoiceIds: [choice.id],
      isCorrect: this.isCurrentCorrect,
      timeSpentSeconds: timeSpent,
      pointsEarned: points
    });

    this.cdr.markForCheck();

    // REDIRECTION AUTOMATIQUE VERS LA QUESTION SUIVANTE APRÈS 1.5 SECONDES SANS INTERVENTION
    this.autoNextTimeout = setTimeout(() => {
      this.nextQuestion();
      this.cdr.markForCheck();
    }, 1500);
  }

  handleTimeOut() {
    if (this.hasAnswered) return;
    this.hasAnswered = true;
    this.isCurrentCorrect = false;
    this.selectedChoiceId = null;
    this.clearAllTimers();

    const timeSpent = this.questionTimeLimit;
    this.recordedAnswers.push({
      questionId: this.currentQuestion.id,
      selectedChoiceIds: [],
      isCorrect: false,
      timeSpentSeconds: timeSpent,
      pointsEarned: 0
    });

    this.cdr.markForCheck();

    // REDIRECTION AUTOMATIQUE APRÈS TIMEOUT EN 1.5S SANS INTERVENTION
    this.autoNextTimeout = setTimeout(() => {
      this.nextQuestion();
      this.cdr.markForCheck();
    }, 1500);
  }

  nextQuestion() {
    this.clearAllTimers();
    if (this.currentQuestionIndex + 1 < this.totalQuestions) {
      this.currentQuestionIndex++;
      this.startQuestionTimer();
    } else {
      this.finishQuiz();
    }
    this.cdr.markForCheck();
  }

  finishQuiz() {
    this.isFinished = true;
    this.clearAllTimers();
    this.maxTotalScore = this.totalQuestions * 100;
    this.scorePercentage = Math.round((this.totalScore / this.maxTotalScore) * 100);
    this.earnedXp = this.totalScore + 50;

    const totalTimeSpent = this.recordedAnswers.reduce((acc, a) => acc + a.timeSpentSeconds, 0);
    const user = this.authService.currentUser();
    const guest = this.playerModalService.guestParticipant();
    const participantName = user ? `${user.prenom} ${user.nom}` : (guest?.nickname || 'Participant Invité');
    const participantEmail = user?.email || guest?.email || undefined;
    if (participantEmail) {
      this.emailSentSuccess = true;
      this.manualResultEmail = participantEmail;
    }

    this.partService.saveParticipation({
      quizId: this.quiz.id,
      quizTitle: this.quiz.title,
      classId: this.classId,
      className: this.className,
      participantName,
      participantEmail,
      score: this.totalScore,
      maxScore: this.maxTotalScore,
      percentage: this.scorePercentage,
      timeTotalSeconds: totalTimeSpent || 60,
      status: 'COMPLETED',
      answers: this.recordedAnswers
    });
    this.cdr.markForCheck();
  }

  restartQuiz() {
    this.currentQuestionIndex = 0;
    this.totalScore = 0;
    this.recordedAnswers = [];
    this.isFinished = false;
    this.emailSentSuccess = false;
    this.startQuestionTimer();
    this.cdr.markForCheck();
  }
}
