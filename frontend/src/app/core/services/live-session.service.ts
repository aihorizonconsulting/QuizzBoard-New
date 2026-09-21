import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { LiveSessionRecord, LiveAudienceType } from '../models/live-session.model';
import { LiveQuizSession } from '../models/quiz.model';
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
  startedAt?: string;
  expectedEndAt?: string;
  endedAt?: string;
  manuallyStopped?: boolean;
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

  async nextBackendLiveQuestion(id: string): Promise<BackendLiveSession> {
    const response = await firstValueFrom(
      this.http.post<any>(`${environment.apiUrl}/live-sessions/${encodeURIComponent(id)}/next`, {})
    );
    return this.unwrapAndStore(response);
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
        avgResponseTimeSeconds: p.avgResponseTimeSeconds
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

  private upsertRecord(session: BackendLiveSession): void {
    const record: LiveSessionRecord = {
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
      winnerNickname: session.players?.[0]?.nickname,
      timePerQuestionSeconds: session.timePerQuestionSeconds,
      totalDurationSeconds: session.totalDurationSeconds,
      expectedEndAt: session.expectedEndAt,
      shuffleQuestions: false,
      showLeaderboardAfterEachQuestion: true,
      createdAt: session.startedAt || new Date().toISOString()
    };

    this.liveSessionsState.update(list => {
      const exists = list.some(s => s.id === record.id);
      return exists ? list.map(s => s.id === record.id ? { ...s, ...record } : s) : [record, ...list];
    });
  }
}
