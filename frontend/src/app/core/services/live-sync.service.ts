import { Injectable, signal, inject } from '@angular/core';
import { Quiz, LiveQuizSession, LiveSessionPlayer } from '../models/quiz.model';
import { QuizPlayerModalService } from './quiz-player-modal.service';
import { LiveSessionService } from './live-session.service';

export interface WaitingParticipant {
  pin: string;
  quiz: Quiz;
  player: {
    id: string;
    nickname: string;
    email?: string;
    matricule?: string;
  };
  countdownNumber?: number;
  isCountdownActive?: boolean;
}

export interface LiveSyncMessage {
  type: 'SESSION_STATE' | 'PLAYER_JOINED' | 'PLAYER_LEFT' | 'COUNTDOWN' | 'GAME_STARTED' | 'GAME_STOPPED' | 'SESSION_ENDED';
  pin: string;
  payload?: any;
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class LiveSyncService {
  private quizPlayerModalService = inject(QuizPlayerModalService);
  private liveSessionService = inject(LiveSessionService);

  private channel: BroadcastChannel | null = null;
  private messageListeners: ((msg: LiveSyncMessage) => void)[] = [];
  private waitingPollTimer: any = null;

  // Waiting room state for participants waiting for the host to launch
  waitingParticipant = signal<WaitingParticipant | null>(null);

  constructor() {
    this.initBus();
  }

  private initBus(): void {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel('quizzboard_live_channel');
        this.channel.onmessage = (event: MessageEvent) => {
          this.handleIncomingMessage(event.data);
        };
      } catch (e) {
        console.warn('BroadcastChannel non disponible, fallback localStorage actif', e);
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event) => {
        if (event.key === 'quizzboard_live_bus_event' && event.newValue) {
          try {
            const data = JSON.parse(event.newValue);
            this.handleIncomingMessage(data);
          } catch {}
        }
      });
    }
  }

  /**
   * Broadcast a message across all open tabs/windows
   */
  broadcast(msg: Omit<LiveSyncMessage, 'timestamp'>): void {
    const fullMsg: LiveSyncMessage = {
      ...msg,
      timestamp: Date.now()
    };

    if (this.channel) {
      try {
        this.channel.postMessage(fullMsg);
      } catch {}
    }

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('quizzboard_live_bus_event', JSON.stringify(fullMsg));
      } catch {}
    }

    // Process locally for active components in the same tab
    this.dispatchToListeners(fullMsg);
  }

  /**
   * Subscribe to incoming messages
   */
  onMessage(listener: (msg: LiveSyncMessage) => void): () => void {
    this.messageListeners.push(listener);
    return () => {
      this.messageListeners = this.messageListeners.filter(l => l !== listener);
    };
  }

  private dispatchToListeners(msg: LiveSyncMessage): void {
    this.messageListeners.forEach(listener => {
      try {
        listener(msg);
      } catch (err) {
        console.error('Erreur dans un listener de liveSync:', err);
      }
    });
  }

  private handleIncomingMessage(msg: LiveSyncMessage): void {
    if (!msg || !msg.type || !msg.pin) return;

    this.dispatchToListeners(msg);

    // Handle Participant Waiting Room actions
    const currentWaiting = this.waitingParticipant();
    if (currentWaiting && currentWaiting.pin.replace(/\s+/g, '') === msg.pin.replace(/\s+/g, '')) {
      if (msg.type === 'COUNTDOWN') {
        this.waitingParticipant.update(w => w ? {
          ...w,
          isCountdownActive: true,
          countdownNumber: msg.payload?.count ?? 3
        } : null);
      } else if (msg.type === 'GAME_STARTED') {
        // SIMULTANEOUS GAME LAUNCH FOR WAITING PARTICIPANT
        const pInfo = currentWaiting.player;
        const qInfo = currentWaiting.quiz;
        // Close waiting room
        this.waitingParticipant.set(null);
        // Immediately pop up quiz player modal
        setTimeout(() => {
          this.quizPlayerModalService.open(qInfo, {
            nickname: pInfo.nickname,
            email: pInfo.email
          });
        }, 100);
      } else if (msg.type === 'SESSION_ENDED' || msg.type === 'GAME_STOPPED') {
        this.stopWaitingPoll();
        this.waitingParticipant.set(null);
      }
    }
  }

  /**
   * Join a waiting lobby for a live session in 'LOBBY' state
   */
  joinWaitingRoom(quiz: Quiz, pin: string, player: { id: string; nickname: string; email?: string; matricule?: string }): void {
    this.waitingParticipant.set({
      pin,
      quiz,
      player,
      isCountdownActive: false,
      countdownNumber: 3
    });

    // Notify host that player joined
    this.broadcast({
      type: 'PLAYER_JOINED',
      pin,
      payload: { player }
    });

    this.startWaitingPoll();
  }

  leaveWaitingRoom(): void {
    const current = this.waitingParticipant();
    if (current) {
      this.broadcast({
        type: 'PLAYER_LEFT',
        pin: current.pin,
        payload: { playerId: current.player.id }
      });
      this.stopWaitingPoll();
      this.waitingParticipant.set(null);
    }
  }

  private startWaitingPoll(): void {
    this.stopWaitingPoll();
    this.waitingPollTimer = setInterval(async () => {
      const currentWaiting = this.waitingParticipant();
      if (!currentWaiting) {
        this.stopWaitingPoll();
        return;
      }

      const backendLive = await this.liveSessionService.findBackendLiveSessionByPin(currentWaiting.pin);
      if (!backendLive) return;

      if (backendLive.status === 'IN_PROGRESS') {
        this.stopWaitingPoll();
        this.waitingParticipant.set(null);
        setTimeout(() => {
          this.quizPlayerModalService.open(currentWaiting.quiz, {
            nickname: currentWaiting.player.nickname,
            email: currentWaiting.player.email
          });
        }, 100);
      } else if (backendLive.status === 'FINISHED') {
        this.stopWaitingPoll();
        this.waitingParticipant.set(null);
      }
    }, 2000);
  }

  private stopWaitingPoll(): void {
    if (this.waitingPollTimer) {
      clearInterval(this.waitingPollTimer);
      this.waitingPollTimer = null;
    }
  }

  /**
   * Store active session state into localStorage for cross-tab discovery
   */
  saveSessionState(session: LiveQuizSession | null): void {
    if (typeof window === 'undefined') return;
    try {
      if (session) {
        localStorage.setItem('quizzboard_active_live_session', JSON.stringify(session));
      } else {
        localStorage.removeItem('quizzboard_active_live_session');
      }
    } catch {}
  }

  getSessionState(): LiveQuizSession | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem('quizzboard_active_live_session');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
}
