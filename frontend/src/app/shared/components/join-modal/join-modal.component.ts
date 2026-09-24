import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { JoinModalService } from '../../../core/services/join-modal.service';
import { QuizPlayerModalService } from '../../../core/services/quiz-player-modal.service';
import { QuizService } from '../../../core/services/quiz.service';
import { AuthService } from '../../../core/services/auth.service';
import { LiveSyncService } from '../../../core/services/live-sync.service';
import { LiveSessionService } from '../../../core/services/live-session.service';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-join-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    @if (joinModalService.isOpen()) {
      <div class="modal-backdrop animate-fade-in" (click)="close()">
        <div class="join-modal-card card animate-scale-up" (click)="$event.stopPropagation()">
          <!-- Close button -->
          <button type="button" class="btn-close" (click)="close()" title="Fermer">
            <app-icon name="x" [size]="18" color="var(--color-text-secondary)"></app-icon>
          </button>

          <!-- Header -->
          <div class="modal-header">
            <div class="pin-icon-wrap">
              <app-icon name="play" [size]="24" color="var(--color-navy)"></app-icon>
            </div>
            <h2 class="modal-title">Rejoindre un Quiz Live</h2>
            <p class="modal-subtitle">Entrez le code PIN ou le code de partage communiqué par votre formateur.</p>
          </div>

          <!-- Form -->
          <form (ngSubmit)="handleJoin()" class="join-form">
            <div class="form-group">
              <label class="form-label">Code PIN ou Code de Partage *</label>
              <div class="input-icon-wrap">
                <app-icon name="zap" [size]="16" color="var(--color-navy)" class="field-icon"></app-icon>
                <input 
                  type="text" 
                  [(ngModel)]="code" 
                  name="code" 
                  placeholder="ex: 842 109 ou JS-2026-PRO" 
                  class="giant-pin-input" 
                  [class.input-error]="codeError"
                  (input)="clearCodeError()"
                  autofocus
                  required>
              </div>
              @if (codeError) {
                <span class="field-error-msg">
                  <app-icon name="alert" [size]="13" color="var(--color-danger)"></app-icon>
                  <span>{{ codeError }}</span>
                </span>
              }
            </div>

            <div class="form-group">
              <label class="form-label">Votre Prénom ou Pseudo *</label>
              <div class="input-icon-wrap">
                <app-icon name="user" [size]="16" color="var(--color-text-secondary)" class="field-icon"></app-icon>
                <input 
                  type="text" 
                  [(ngModel)]="nickname" 
                  name="nickname" 
                  placeholder="ex: Fatou Sow" 
                  class="input-field" 
                  [class.input-error]="nicknameError"
                  (input)="clearNicknameError()"
                  required>
              </div>
              @if (nicknameError) {
                <span class="field-error-msg">
                  <app-icon name="alert" [size]="13" color="var(--color-danger)"></app-icon>
                  <span>{{ nicknameError }}</span>
                </span>
              }
            </div>

            <div class="form-group">
              <label class="form-label">Votre Adresse Email <small style="color: var(--color-text-secondary); font-weight: normal;">(Pour recevoir votre score & rang)</small></label>
              <div class="input-icon-wrap">
                <app-icon name="mail" [size]="16" color="var(--color-text-secondary)" class="field-icon"></app-icon>
                <input 
                  type="email" 
                  [(ngModel)]="email" 
                  name="email" 
                  placeholder="ex: fatou.sow@etudiant.univ.sn" 
                  class="input-field">
              </div>
            </div>

            <button 
              type="submit" 
              class="btn btn-primary btn-full btn-lg" 
              [class.is-loading]="isJoining"
              [disabled]="isJoining">
              @if (isJoining) {
                <span class="btn-spinner"></span>
                <span>Connexion à l'arène...</span>
              } @else {
                <app-icon name="play" [size]="17" color="var(--color-navy)"></app-icon>
                <span>Démarrer la Partie</span>
              }
            </button>
          </form>

          <!-- Footer reassurance -->
          <div class="modal-foot">
            <app-icon name="shield" [size]="13" color="var(--color-text-secondary)"></app-icon>
            <span>100% Gratuit et sans inscription requise pour les participants.</span>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(3, 36, 71, 0.45);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }

    .join-modal-card {
      position: relative;
      width: 100%;
      max-width: 440px;
      padding: 32px 28px;
      background: #FFFFFF;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-xl);
      box-shadow: 0 16px 36px rgba(3, 36, 71, 0.16);
      text-align: center;
    }

    .btn-close {
      position: absolute;
      top: 16px;
      right: 16px;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: none;
      background: var(--color-background);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;

      &:hover {
        background: #E2E8F0;
        transform: rotate(90deg);
      }
    }

    .modal-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      margin-bottom: 22px;

      .pin-icon-wrap {
        width: 52px;
        height: 52px;
        border-radius: 50%;
        background: var(--color-primary-light);
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 6px;
        box-shadow: 0 4px 12px rgba(255, 196, 0, 0.25);
      }

      .modal-title {
        font-size: 20px;
        font-weight: 800;
        color: var(--color-navy);
        margin: 0;
      }

      .modal-subtitle {
        font-size: 12.5px;
        color: var(--color-text-secondary);
        margin: 0;
        line-height: 1.4;
      }
    }

    .join-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
      text-align: left;

      .form-group {
        display: flex;
        flex-direction: column;
        gap: 6px;

        .form-label {
          font-size: 12px;
          font-weight: 700;
          color: var(--color-navy);
        }

        .input-icon-wrap {
          position: relative;
          display: flex;
          align-items: center;

          .field-icon {
            position: absolute;
            left: 14px;
            pointer-events: none;
          }

          input {
            width: 100%;
            padding-left: 40px;
          }
        }
      }

      .giant-pin-input {
        height: 48px;
        font-size: 16px;
        font-weight: 800;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--color-navy);
        border: 1.5px solid var(--color-border);
        border-radius: var(--radius-sm);
        background: #F8FAFC;
        transition: all 0.2s ease;

        &:focus {
          background: #FFFFFF;
          border-color: var(--color-navy);
          outline: none;
          box-shadow: 0 0 0 3px rgba(3, 36, 71, 0.12);
        }
      }

      .btn-full {
        width: 100%;
        margin-top: 6px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      }
    }

    .modal-foot {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-top: 20px;
      padding-top: 14px;
      border-top: 1px solid var(--color-border);
      font-size: 11px;
      color: var(--color-text-secondary);
    }

    @media (max-width: 480px) {
      .join-modal-card {
        padding: 24px 18px;
        border-radius: var(--radius-lg);
      }
    }
  `]
})
export class JoinModalComponent {
  public joinModalService = inject(JoinModalService);
  private quizPlayerModalService = inject(QuizPlayerModalService);
  private quizService = inject(QuizService);
  private authService = inject(AuthService);
  private liveSyncService = inject(LiveSyncService);
  private liveSessionService = inject(LiveSessionService);

  code = '';
  nickname = this.getDefaultNickname();
  email = this.getDefaultEmail();
  isJoining = false;
  codeError = '';
  nicknameError = '';

  private getDefaultNickname(): string {
    const user = this.authService.currentUser();
    if (user && user.prenom) {
      return `${user.prenom} ${user.nom}`.trim();
    }
    return 'Fatou Sow';
  }

  private getDefaultEmail(): string {
    const user = this.authService.currentUser();
    return user?.email || '';
  }

  clearCodeError() {
    this.codeError = '';
  }

  clearNicknameError() {
    this.nicknameError = '';
  }

  close() {
    this.codeError = '';
    this.nicknameError = '';
    this.joinModalService.close();
  }

  async handleJoin() {
    this.codeError = '';
    this.nicknameError = '';

    if (!this.code.trim()) {
      this.codeError = 'Veuillez renseigner le code PIN ou code de partage.';
    }
    if (!this.nickname.trim()) {
      this.nicknameError = 'Veuillez renseigner votre nom ou pseudonyme.';
    }

    if (this.codeError || this.nicknameError) return;

    this.isJoining = true;
    try {
      const backendLive = await this.liveSessionService.findBackendLiveSessionByPin(this.code);
      if (backendLive) {
        const playerPayload = {
          nickname: this.nickname.trim(),
          email: this.email.trim() || undefined
        };
        const joinedLive = await this.liveSessionService.joinBackendLiveSession(backendLive.id, playerPayload);
        const live = this.liveSessionService.toLiveQuizSession(joinedLive);
        this.quizService.activeLiveSession.set(live);
        this.liveSyncService.saveSessionState(live);

        const targetQuiz = await this.quizService.fetchQuizByCodeOrPin(live.quizId);
        if (!targetQuiz) {
          this.codeError = 'Live trouvé, mais le quiz associé est introuvable.';
          return;
        }

        if (live.status === 'LOBBY') {
          this.liveSyncService.joinWaitingRoom(targetQuiz, live.pin, {
            id: joinedLive.players.find(p => p.email === playerPayload.email || p.nickname === playerPayload.nickname)?.id || 'p-' + Date.now(),
            nickname: playerPayload.nickname,
            email: playerPayload.email
          });
          this.close();
          return;
        }

        this.close();
        this.quizPlayerModalService.open(targetQuiz, playerPayload);
        return;
      }

      const targetQuiz = await this.quizService.fetchQuizByCodeOrPin(this.code);
      if (targetQuiz) {
        const cleanInput = this.code.trim().replace(/\s+/g, '').toLowerCase();
        let live = this.quizService.activeLiveSession() || this.liveSyncService.getSessionState();

        const playerPayload = {
          id: 'p-' + Date.now(),
          nickname: this.nickname.trim(),
          email: this.email.trim() || undefined
        };

        // Si le code correspond à une session Live active
        if (live && live.pin.replace(/\s+/g, '').toLowerCase() === cleanInput) {
          this.quizService.addPlayerToLive(playerPayload);

          if (live.status === 'LOBBY') {
            // L'apprenant est placé dans la salle d'attente synchronisée
            // Le quiz s'ouvrira simultanément dès que l'enseignant lance le live !
            this.liveSyncService.joinWaitingRoom(targetQuiz, live.pin, playerPayload);
            this.close();
            return;
          }
        }

        // Quiz individuel ou session Live déjà lancée : ouverture directe
        this.close();
        this.quizPlayerModalService.open(targetQuiz, {
          nickname: this.nickname.trim(),
          email: this.email.trim() || undefined
        });
      } else {
        this.codeError = 'Code PIN ou code de quiz invalide. Aucun quiz actif correspondant.';
      }
    } catch {
      this.codeError = 'Erreur lors de la recherche du quiz. Veuillez vérifier votre connexion.';
    } finally {
      this.isJoining = false;
    }
  }
}
