import { Injectable, signal } from '@angular/core';
import { Quiz } from '../models/quiz.model';

export interface QuizGuestParticipant {
  nickname: string;
  email?: string;
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

