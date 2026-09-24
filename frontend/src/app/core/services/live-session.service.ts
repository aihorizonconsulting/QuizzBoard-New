import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { LiveSessionRecord, LiveAudienceType } from '../models/live-session.model';
import { LiveQuizSession, Quiz } from '../models/quiz.model';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';

export interface BackendLivePlayer {
  id: string;
  nickname: string;
  email?: string;
  matricule?: string;
  score: number;
  streak: number;
  ready: boolean;
  accuracyPercent: number;
  avgResponseTimeSeconds: number;
  answeredCount: number;
  finished: boolean;
}

/** Progression réelle d'un joueur, envoyée après chaque réponse (instantané cumulatif). */
export interface LiveProgress {
  playerId: string;
  answeredCount: number;
  correctCount: number;
  score: number;
  maxScore: number;
  streak: number;
  totalTimeSeconds: number;
  finished: boolean;
}

export interface BackendLiveSession {
  id: string;
  pin: string;
  quizId: string;
  quizTitle: string;
  hostId: string;
  hostName: string;
  status: 'LOBBY' | 'IN_PROGRESS' | 'QUESTION_REVIEW' | 'LEADERBOARD' | 'FINISHED';
  currentQuestionIndex: number;
  totalQuestions: number;
  timePerQuestionSeconds: number;
  totalDurationSeconds: number;
  elapsedSeconds?: number;
  startedAt?: string;
  expectedEndAt?: string;
  endedAt?: string;
  manuallyStopped?: boolean;
  createdAt?: string;
  players: BackendLivePlayer[];
}

@Injectable({
  providedIn: 'root'
})
export class LiveSessionService {
  private http = inject(HttpClient);
  private liveSessionsState = signal<LiveSessionRecord[]>([]);

  getLiveSessions() {
    return this.liveSessionsState.asReadonly();
  }

  createLiveSession(data: {
    quizId: string;
    quizTitle: string;
    quizQuestionsCount: number;
    hostId: string;
    hostName: string;
    audienceType: LiveAudienceType;
    targetClassId?: string;
    targetClassName?: string;
    targetStudentIds?: string[];
    timePerQuestionSeconds?: number;
    shuffleQuestions?: boolean;
    showLeaderboardAfterEachQuestion?: boolean;
  }): LiveSessionRecord {
    // Generate a random 6-digit PIN like "592 108"
    const p1 = Math.floor(100 + Math.random() * 900);
    const p2 = Math.floor(100 + Math.random() * 900);
    const pinCode = `${p1} ${p2}`;

    const newSession: LiveSessionRecord = {
      id: 'live-' + Date.now(),
      pinCode,
      quizId: data.quizId,
      quizTitle: data.quizTitle,
      quizQuestionsCount: data.quizQuestionsCount,
      hostId: data.hostId,
      hostName: data.hostName,
      audienceType: data.audienceType,
      targetClassId: data.targetClassId,
      targetClassName: data.targetClassName,
      targetStudentIds: data.targetStudentIds || [],
      status: 'WAITING',
      participantsCount: 0,
      timePerQuestionSeconds: data.timePerQuestionSeconds || 20,
      shuffleQuestions: data.shuffleQuestions ?? false,
      showLeaderboardAfterEachQuestion: data.showLeaderboardAfterEachQuestion ?? true,
      createdAt: new Date().toISOString()
    };

    this.liveSessionsState.update(list => [newSession, ...list]);
    return newSession;
  }

  /**
   * Crée une session Live pour un quiz et renvoie son id (route /app/live/host/:id).
   * La session est créée côté backend pour obtenir un vrai PIN rejoignable ; repli local si l'API est indisponible.
   */
  async launchLiveSession(quiz: Quiz, options: {
    timePerQuestionSeconds?: number;
    audienceType?: LiveAudienceType;
    targetClassId?: string;
    targetClassName?: string;
  } = {}): Promise<string> {
    const totalQuestions = quiz.questionsCount || quiz.questions?.length || 5;
    const timePerQuestionSeconds = Number(options.timePerQuestionSeconds) || 20;
    try {
      const backend = await this.createBackendLiveSession({
        quizId: quiz.id,
        quizTitle: quiz.title || 'Quiz Live',
        totalQuestions,
        timePerQuestionSeconds
      });
      return backend.id;
    } catch {
      return this.createLiveSession({
        quizId: quiz.id,
        quizTitle: quiz.title || 'Quiz Live',
        quizQuestionsCount: totalQuestions,
        hostId: 'u1',
        hostName: 'Professeur',
        audienceType: options.audienceType || 'PUBLIC',
        targetClassId: options.targetClassId,
        targetClassName: options.targetClassName,
        timePerQuestionSeconds
      }).id;
    }
  }

  async createBackendLiveSession(data: {
    quizId: string;
    quizTitle: string;
    totalQuestions: number;
    timePerQuestionSeconds: number;
  }): Promise<BackendLiveSession> {
    const response = await firstValueFrom(
      this.http.post<any>(`${environment.apiUrl}/live-sessions`, data)
    );
    const session = this.unwrap(response);
    this.upsertRecord(session);
    return session;
  }

  async getBackendLiveSession(id: string): Promise<BackendLiveSession> {
    const response = await firstValueFrom(
      this.http.get<any>(`${environment.apiUrl}/live-sessions/${encodeURIComponent(id)}`)
    );
    const session = this.unwrap(response);
    this.upsertRecord(session);
    return session;
  }

  async findBackendLiveSessionByPin(pin: string): Promise<BackendLiveSession | null> {
    try {
      const cleanPin = pin.trim().replace(/\s+/g, '');
      const response = await firstValueFrom(
        this.http.get<any>(`${environment.apiUrl}/live-sessions/pin/${encodeURIComponent(cleanPin)}`)
      );
      const session = this.unwrap(response);
      this.upsertRecord(session);
      return session;
    } catch {
      return null;
    }
  }

  async joinBackendLiveSession(id: string, player: { nickname?: string; email?: string; matricule?: string }): Promise<BackendLiveSession> {
    const response = await firstValueFrom(
      this.http.post<any>(`${environment.apiUrl}/live-sessions/${encodeURIComponent(id)}/join`, player)
    );
    const session = this.unwrap(response);
    this.upsertRecord(session);
    return session;
  }

  async startBackendLiveSession(id: string): Promise<BackendLiveSession> {
    const response = await firstValueFrom(
      this.http.post<any>(`${environment.apiUrl}/live-sessions/${encodeURIComponent(id)}/start`, {})
    );
    return this.unwrapAndStore(response);
  }

  async updateBackendLiveSettings(id: string, timePerQuestionSeconds: number): Promise<BackendLiveSession> {
    const response = await firstValueFrom(
      this.http.put<any>(`${environment.apiUrl}/live-sessions/${encodeURIComponent(id)}/settings`, { timePerQuestionSeconds })
    );
    return this.unwrapAndStore(response);
  }

  async finishBackendLiveSession(id: string): Promise<BackendLiveSession> {
    const response = await firstValueFrom(
      this.http.post<any>(`${environment.apiUrl}/live-sessions/${encodeURIComponent(id)}/finish`, {})
    );
    return this.unwrapAndStore(response);
  }

  /** Envoi de la progression d'un joueur ; un échec ponctuel est rattrapé par l'envoi suivant. */
  async reportLiveProgress(id: string, progress: LiveProgress): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post<any>(`${environment.apiUrl}/live-sessions/${encodeURIComponent(id)}/progress`, progress)
      );
    } catch (err) {
      console.warn('Progression Live non transmise :', err);
    }
  }

  async stopBackendLiveSession(id: string): Promise<BackendLiveSession> {
    const response = await firstValueFrom(
      this.http.post<any>(`${environment.apiUrl}/live-sessions/${encodeURIComponent(id)}/stop`, {})
    );
    return this.unwrapAndStore(response);
  }

  toLiveQuizSession(session: BackendLiveSession): LiveQuizSession {
    return {
      pin: session.pin,
      quizId: session.quizId,
      quizTitle: session.quizTitle,
      hostId: session.hostId,
      status: session.status,
      currentQuestionIndex: session.currentQuestionIndex,
      totalQuestions: session.totalQuestions,
      timePerQuestionSeconds: session.timePerQuestionSeconds,
      totalDurationSeconds: session.totalDurationSeconds,
      elapsedSeconds: session.elapsedSeconds,
      startedAt: session.startedAt,
      expectedEndAt: session.expectedEndAt,
      endedAt: session.endedAt,
      isManuallyStopped: !!session.manuallyStopped,
      players: (session.players || []).map(p => ({
        id: p.id,
        nickname: p.nickname,
        email: p.email,
        matricule: p.matricule,
        score: p.score,
        streak: p.streak,
        isReady: p.ready,
        accuracyPercent: p.accuracyPercent,
        avgResponseTimeSeconds: p.avgResponseTimeSeconds,
        answeredCount: p.answeredCount,
        finished: p.finished
      }))
    };
  }

  deleteSession(sessionId: string): void {
    this.liveSessionsState.update(list => list.filter(s => s.id !== sessionId));
  }

  private unwrap(response: any): BackendLiveSession {
    return response?.data || response;
  }

  private unwrapAndStore(response: any): BackendLiveSession {
    const session = this.unwrap(response);
    this.upsertRecord(session);
    return session;
  }

  /** Recharge depuis l'API les sessions Live de l'animateur connecté (conservées en base). */
  async loadMyLiveSessions(): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.http.get<any>(`${environment.apiUrl}/live-sessions/mine`)
      );
      const list = response?.data || response;
      const records = (Array.isArray(list) ? list : []).map((s: BackendLiveSession) => this.toRecord(s));
      // La liste du serveur remplace l'ancienne (autre compte éventuel) ; seules les sessions
      // créées hors ligne en repli local ("live-<horodatage>") sont conservées
      this.liveSessionsState.update(current => [...records, ...current.filter(r => /^live-\d+$/.test(r.id))]);
    } catch (err) {
      console.warn('Chargement des sessions Live impossible :', err);
    }
  }

  private upsertRecord(session: BackendLiveSession): void {
    const record = this.toRecord(session);
    this.liveSessionsState.update(list => {
      const exists = list.some(s => s.id === record.id);
      return exists ? list.map(s => s.id === record.id ? { ...s, ...record } : s) : [record, ...list];
    });
  }

  private toRecord(session: BackendLiveSession): LiveSessionRecord {
    const ranked = (session.players || []).filter(p => (p.answeredCount || 0) > 0);
    const averageScorePercent = ranked.length
      ? Math.round(ranked.reduce((sum, p) => sum + (p.accuracyPercent || 0), 0) / ranked.length)
      : undefined;
    return {
      id: session.id,
      pinCode: session.pin,
      quizId: session.quizId,
      quizTitle: session.quizTitle,
      quizQuestionsCount: session.totalQuestions,
      hostId: session.hostId,
      hostName: session.hostName,
      audienceType: 'PUBLIC',
      status: session.status === 'FINISHED' ? 'FINISHED' : session.status === 'IN_PROGRESS' ? 'RUNNING' : 'WAITING',
      participantsCount: session.players?.length || 0,
      averageScorePercent,
      winnerNickname: ranked[0]?.nickname,
      timePerQuestionSeconds: session.timePerQuestionSeconds,
      totalDurationSeconds: session.totalDurationSeconds,
      expectedEndAt: session.expectedEndAt,
      shuffleQuestions: false,
      showLeaderboardAfterEachQuestion: true,
      createdAt: session.createdAt || session.startedAt || new Date().toISOString()
    };
  }
}
