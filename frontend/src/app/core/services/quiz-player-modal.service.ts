import { Injectable, signal } from '@angular/core';
import { Quiz } from '../models/quiz.model';

/** Session Live dans laquelle le quiz est joué : la progression du joueur y est transmise. */
export interface LivePlayContext {
  sessionId: string;
  playerId: string;
  timePerQuestionSeconds?: number;
}

export interface QuizGuestParticipant {
  nickname: string;
  email?: string;
  live?: LivePlayContext;
}

@Injectable({
  providedIn: 'root'
})
export class QuizPlayerModalService {
  private _activeQuiz = signal<Quiz | null>(null);
  public activeQuiz = this._activeQuiz.asReadonly();
  public guestParticipant = signal<QuizGuestParticipant | null>(null);

  open(quiz: Quiz, participant?: QuizGuestParticipant) {
    this.guestParticipant.set(participant || null);
    this._activeQuiz.set(quiz);
  }

  close() {
    this._activeQuiz.set(null);
    this.guestParticipant.set(null);
  }
}

