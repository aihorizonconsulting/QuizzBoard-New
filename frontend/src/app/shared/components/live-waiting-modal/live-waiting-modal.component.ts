import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LiveSyncService } from '../../../core/services/live-sync.service';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-live-waiting-modal',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    @if (liveSyncService.waitingParticipant(); as waiting) {
      <div class="waiting-backdrop animate-fade-in" role="dialog" aria-modal="true">
        @if (waiting.isCountdownActive) {
          <!-- SYNCHRONOUS COUNTDOWN OVERLAY -->
          <div class="countdown-container animate-scale-up">
            <div class="cd-badge">LANCEMENT SIMULTANÉ</div>
            <div class="cd-num">{{ waiting.countdownNumber || 3 }}</div>
            <h3 class="cd-title">Préparez-vous !</h3>
            <p class="cd-subtitle">Le quiz s'ouvre sur votre écran au top départ...</p>
          </div>
        } @else {
          <!-- WAITING ROOM CARD -->
          <div class="waiting-card animate-scale-up">
            <div class="card-header">
              <div class="live-pill">
                <span class="pulse-dot"></span>
                <span>SESSION EN DIRECT</span>
              </div>
              <button type="button" class="btn-close" (click)="leave()" title="Quitter la salle d'attente">
                <app-icon name="x" [size]="16" color="#94A3B8"></app-icon>
              </button>
            </div>

            <div class="card-body">
              <div class="radar-container">
                <div class="radar-circle circle-1"></div>
                <div class="radar-circle circle-2"></div>
                <div class="radar-circle circle-3"></div>
                <div class="radar-icon">
                  <app-icon name="zap" [size]="32" color="#6366F1"></app-icon>
                </div>
              </div>

              <h2 class="quiz-headline">{{ waiting.quiz.title }}</h2>
              <div class="pin-tag">
                <span>CODE PIN :</span>
                <strong>{{ waiting.pin }}</strong>
              </div>

              <div class="player-badge">
                <div class="avatar-circle">
                  {{ waiting.player.nickname.charAt(0).toUpperCase() }}
                </div>
                <div class="player-meta">
                  <span class="p-name">{{ waiting.player.nickname }}</span>
                  @if (waiting.player.email) {
                    <span class="p-email">{{ waiting.player.email }}</span>
                  }
                </div>
                <span class="ready-tag">Connecté</span>
              </div>

              <div class="status-box">
                <div class="status-spinner"></div>
                <div class="status-texts">
                  <strong>En attente du lancement par l'enseignant...</strong>
                  <p>Dès que le créateur lance la partie, le compte à rebours 3-2-1 démarrera et le quiz s'ouvrira automatiquement et simultanément pour vous !</p>
                </div>
              </div>

              <div class="email-notice">
                <app-icon name="mail" [size]="14" color="#10B981"></app-icon>
                <span>À la fin de la partie, vous recevrez automatiquement un email avec votre score et votre rang !</span>
              </div>
            </div>

            <div class="card-footer">
              <button type="button" class="btn btn-outline-cancel" (click)="leave()">
                Quitter la session
              </button>
            </div>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    .waiting-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(15, 23, 42, 0.88);
      backdrop-filter: blur(10px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1050;
      padding: 20px;
    }

    /* Countdown Stage */
    .countdown-container {
      text-align: center;
      color: #FFFFFF;

      .cd-badge {
        display: inline-block;
        padding: 6px 16px;
        border-radius: 999px;
        background: rgba(99, 102, 241, 0.25);
        border: 1px solid rgba(129, 140, 248, 0.5);
        color: #A5B4FC;
        font-size: 13px;
        font-weight: 800;
        letter-spacing: 0.08em;
        margin-bottom: 16px;
      }

      .cd-num {
        font-size: 110px;
        font-weight: 900;
        line-height: 1;
        color: #F8FAFC;
        text-shadow: 0 0 40px rgba(99, 102, 241, 0.6);
        animation: pulseScale 1s infinite alternate ease-in-out;
        margin-bottom: 12px;
      }

      .cd-title {
        font-size: 26px;
        font-weight: 800;
        margin: 0 0 6px 0;
      }

      .cd-subtitle {
        color: #94A3B8;
        font-size: 15px;
        margin: 0;
      }
    }

    @keyframes pulseScale {
      0% { transform: scale(0.92); }
      100% { transform: scale(1.08); }
    }

    /* Waiting Card */
    .waiting-card {
      width: 100%;
      max-width: 480px;
      background: #0F172A;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 20px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      overflow: hidden;
      color: #F8FAFC;
    }

    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 18px 24px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);

      .live-pill {
        display: flex;
        align-items: center;
        gap: 8px;
        background: rgba(239, 68, 68, 0.15);
        border: 1px solid rgba(239, 68, 68, 0.3);
        color: #FCA5A5;
        padding: 4px 12px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.04em;

        .pulse-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #EF4444;
          box-shadow: 0 0 8px #EF4444;
          animation: dotBlink 1.4s infinite;
        }
      }

      .btn-close {
        background: transparent;
        border: none;
        cursor: pointer;
        padding: 6px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s;

        &:hover {
          background: rgba(255, 255, 255, 0.08);
        }
      }
    }

    @keyframes dotBlink {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.85); }
    }

    .card-body {
      padding: 28px 24px;
      text-align: center;

      .radar-container {
        position: relative;
        width: 100px;
        height: 100px;
        margin: 0 auto 20px auto;
        display: flex;
        align-items: center;
        justify-content: center;

        .radar-circle {
          position: absolute;
          border-radius: 50%;
          border: 2px solid rgba(99, 102, 241, 0.4);
          animation: radarWave 2.5s infinite linear;
        }

        .circle-1 { width: 45px; height: 45px; animation-delay: 0s; }
        .circle-2 { width: 75px; height: 75px; animation-delay: 0.8s; }
        .circle-3 { width: 105px; height: 105px; animation-delay: 1.6s; }

        .radar-icon {
          position: relative;
          z-index: 2;
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: rgba(99, 102, 241, 0.18);
          border: 1.5px solid rgba(129, 140, 248, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
        }
      }

      @keyframes radarWave {
        0% { transform: scale(0.6); opacity: 0.8; }
        100% { transform: scale(1.4); opacity: 0; }
      }

      .quiz-headline {
        font-size: 20px;
        font-weight: 800;
        margin: 0 0 10px 0;
        color: #FFFFFF;
        line-height: 1.3;
      }

      .pin-tag {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.12);
        padding: 6px 14px;
        border-radius: 8px;
        font-size: 13px;
        color: #94A3B8;
        margin-bottom: 22px;

        strong {
          color: #FBBF24;
          letter-spacing: 0.1em;
          font-size: 15px;
        }
      }

      .player-badge {
        display: flex;
        align-items: center;
        gap: 12px;
        background: rgba(30, 41, 59, 0.7);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        padding: 10px 14px;
        text-align: left;
        margin-bottom: 20px;

        .avatar-circle {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, #6366F1, #8B5CF6);
          color: #FFFFFF;
          font-weight: 800;
          font-size: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .player-meta {
          flex: 1;
          min-width: 0;

          .p-name {
            display: block;
            font-weight: 700;
            font-size: 14px;
            color: #F8FAFC;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .p-email {
            display: block;
            font-size: 12px;
            color: #94A3B8;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
        }

        .ready-tag {
          padding: 3px 8px;
          border-radius: 6px;
          background: rgba(16, 185, 129, 0.2);
          color: #34D399;
          font-size: 11px;
          font-weight: 700;
        }
      }

      .status-box {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        background: rgba(99, 102, 241, 0.08);
        border: 1px solid rgba(99, 102, 241, 0.25);
        border-radius: 12px;
        padding: 14px;
        text-align: left;
        margin-bottom: 16px;

        .status-spinner {
          width: 18px;
          height: 18px;
          border: 2.5px solid rgba(129, 140, 248, 0.3);
          border-top-color: #818CF8;
          border-radius: 50%;
          animation: spin 1s infinite linear;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .status-texts {
          strong {
            display: block;
            font-size: 13px;
            color: #A5B4FC;
            margin-bottom: 4px;
          }
          p {
            margin: 0;
            font-size: 12px;
            color: #CBD5E1;
            line-height: 1.4;
          }
        }
      }

      @keyframes spin {
        to { transform: rotate(360deg); }
      }

      .email-notice {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        font-size: 12px;
        color: #6EE7B7;
        background: rgba(16, 185, 129, 0.1);
        padding: 8px 12px;
        border-radius: 8px;
      }
    }

    .card-footer {
      padding: 14px 24px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      justify-content: flex-end;

      .btn-outline-cancel {
        background: transparent;
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: #94A3B8;
        padding: 8px 16px;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;

        &:hover {
          border-color: #EF4444;
          color: #EF4444;
          background: rgba(239, 68, 68, 0.08);
        }
      }
    }

    .animate-fade-in {
      animation: fadeIn 0.25s ease-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .animate-scale-up {
      animation: scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes scaleUp {
      from { transform: scale(0.92); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
  `]
})
export class LiveWaitingModalComponent {
  public liveSyncService = inject(LiveSyncService);

  leave(): void {
    this.liveSyncService.leaveWaitingRoom();
  }
}
