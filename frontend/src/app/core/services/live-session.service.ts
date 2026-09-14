import { Injectable, signal } from '@angular/core';
import { LiveSessionRecord, LiveAudienceType } from '../models/live-session.model';

@Injectable({
  providedIn: 'root'
})
export class LiveSessionService {
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

  deleteSession(sessionId: string): void {
    this.liveSessionsState.update(list => list.filter(s => s.id !== sessionId));
  }
}
