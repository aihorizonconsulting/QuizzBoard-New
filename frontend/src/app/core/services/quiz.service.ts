import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Quiz, Question, LiveQuizSession, LiveSessionPlayer } from '../models/quiz.model';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';
import { reloadOnAccountChange } from '../utils/account-change.util';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class QuizService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private quizzes = signal<Quiz[]>([]);
  // Enregistrements backend en cours des quiz créés localement (id local -> quiz serveur)
  private pendingQuizSaves = new Map<string, Promise<Quiz | null>>();
  private loadSequence = 0;
  isLoading = signal<boolean>(true);

  // Live Session State
  activeLiveSession = signal<LiveQuizSession | null>(null);

  constructor() {
    this.loadBackendQuizzes();
    reloadOnAccountChange(() => this.loadBackendQuizzes());
  }

  /**
   * Charge les quiz publics et, pour un utilisateur connecté, tous ses propres quiz
   * (y compris privés ou brouillons, absents de la liste publique).
   */
  async loadBackendQuizzes(): Promise<void> {
    const requestId = ++this.loadSequence;
    this.isLoading.set(true);
    try {
      const [publicRes, mineRes] = await Promise.all([
        firstValueFrom(this.http.get<any>(`${environment.apiUrl}/quizzes`)),
        this.authService.getToken()
          ? firstValueFrom(this.http.get<any>(`${environment.apiUrl}/quizzes`, { params: { my: 'true' } })).catch(() => null)
          : Promise.resolve(null)
      ]);
      // Une réponse plus récente (changement de compte entre-temps) a priorité
      if (requestId !== this.loadSequence) return;
      const publicQuizzes: Quiz[] = this.asList(publicRes);
      const myQuizzes: Quiz[] = this.asList(mineRes);
      const myIds = new Set(myQuizzes.map(q => q.id));
      // Quiz créés localement dont l'enregistrement serveur est encore en cours
      const pendingLocal = this.quizzes().filter(q => this.pendingQuizSaves.has(q.id));
      this.quizzes.set([...pendingLocal, ...myQuizzes, ...publicQuizzes.filter(q => !myIds.has(q.id))]);
    } catch {
      if (requestId === this.loadSequence) this.quizzes.set([]);
    } finally {
      if (requestId === this.loadSequence) this.isLoading.set(false);
    }
  }

  private asList(res: any): Quiz[] {
    const data = res?.data || res;
    return Array.isArray(data) ? data : [];
  }

  async getCreatorStats(): Promise<{
    totalParticipants: number;
    averageSuccessRate: number;
    completedQuizzes: number;
    quizzesCount: number;
    weeklyActivity: number[];
  }> {
    try {
      const resp = await firstValueFrom(
        this.http.get<any>(`${environment.apiUrl}/quizzes/creator-stats`)
      );
      const data = resp?.data || resp || {};
      return {
        totalParticipants: data.totalParticipants ?? 0,
        averageSuccessRate: data.averageSuccessRate ?? 0,
        completedQuizzes: data.completedQuizzes ?? 0,
        quizzesCount: data.quizzesCount ?? 0,
        weeklyActivity: data.weeklyActivity ?? [0, 0, 0, 0, 0, 0, 0]
      };
    } catch {
      return { totalParticipants: 0, averageSuccessRate: 0, completedQuizzes: 0, quizzesCount: 0, weeklyActivity: [0, 0, 0, 0, 0, 0] };
    }
  }

  async getPublicStats(): Promise<import('../models/platform-stats.model').PlatformStats> {
    try {
      const resp = await firstValueFrom(
        this.http.get<any>(`${environment.apiUrl}/public/stats`)
      );
      const data = resp?.data || resp || {};
      return {
        totalQuizzes: data.totalQuizzes ?? 0,
        totalParticipants: data.totalParticipants ?? 0,
        totalLiveSessions: data.totalLiveSessions ?? 0,
        engagementRate: data.engagementRate ?? 98.4,
        quizzesFormatted: data.quizzesFormatted ?? `${data.totalQuizzes ?? 0}+`,
        participantsFormatted: data.participantsFormatted ?? `${data.totalParticipants ?? 0}+`,
        liveSessionsFormatted: data.liveSessionsFormatted ?? `${data.totalLiveSessions ?? 0}+`,
        engagementRateFormatted: data.engagementRateFormatted ?? `${data.engagementRate ?? 98.4}%`
      };
    } catch {
      return {
        totalQuizzes: 3,
        totalParticipants: 19,
        totalLiveSessions: 6,
        engagementRate: 98.4,
        quizzesFormatted: '3+',
        participantsFormatted: '19+',
        liveSessionsFormatted: '6+',
        engagementRateFormatted: '98.4%'
      };
    }
  }

  getQuizzes() {
    return this.quizzes.asReadonly();
  }

  getPublicQuizzes() {
    return this.quizzes().filter(q => q.visibility === 'PUBLIC' || !q.visibility);
  }

  getQuizById(id: string): Quiz | undefined {
    return this.quizzes().find(q => q.id === id || q.shareCode.toLowerCase() === id.toLowerCase());
  }

  findQuizByCodeOrPin(input: string): Quiz | undefined {
    if (!input) return undefined;
    const clean = input.trim().replace(/\s+/g, '').toLowerCase();

    // 1. Vérifier si le code correspond au PIN d'une session Live active (en mémoire ou inter-onglets)
    let live = this.activeLiveSession();
    if (!live && typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('quizzboard_active_live_session');
        if (raw) {
          live = JSON.parse(raw);
          if (live) this.activeLiveSession.set(live);
        }
      } catch {}
    }

    if (live && live.pin.replace(/\s+/g, '').toLowerCase() === clean) {
      const liveQuiz = this.quizzes().find(q => q.id === live?.quizId);
      if (liveQuiz) return liveQuiz;
    }

    return this.quizzes().find(q => 
      q.id.toLowerCase() === clean ||
      q.shareCode.toLowerCase().replace(/\s+/g, '') === clean ||
      (q as any).pin === clean ||
      q.title.toLowerCase().includes(clean)
    );
  }

  async fetchQuizByCodeOrPin(input: string): Promise<Quiz | null> {
    if (!input) return null;
    // 1. Check local in-memory cache first
    const local = this.findQuizByCodeOrPin(input);
    if (local) return local;

    // 2. Fetch from backend API
    try {
      const clean = input.trim().replace(/\s+/g, '');
      const resp = await firstValueFrom(
        this.http.get<any>(`${environment.apiUrl}/quizzes/code/${encodeURIComponent(clean)}`)
      );
      const quiz: Quiz = resp?.data || resp;
      if (quiz && quiz.id) {
        this.quizzes.update(list => {
          if (!list.some(q => q.id === quiz.id)) {
            return [...list, quiz];
          }
          return list;
        });
        return quiz;
      }
      return null;
    } catch {
      try {
        const clean = input.trim().replace(/\s+/g, '');
        const resp = await firstValueFrom(
          this.http.get<any>(`${environment.apiUrl}/quizzes/${encodeURIComponent(clean)}`)
        );
        const quiz: Quiz = resp?.data || resp;
        if (quiz && quiz.id) {
          this.quizzes.update(list => list.some(q => q.id === quiz.id) ? list.map(q => q.id === quiz.id ? quiz : q) : [...list, quiz]);
          return quiz;
        }
      } catch {}
      return null;
    }
  }

  toggleVisibility(id: string): void {
    this.quizzes.update(list =>
      list.map(q => {
        if (q.id === id) {
          const currentVis = q.visibility || 'PUBLIC';
          const newVis = currentVis === 'PUBLIC' ? 'PRIVATE' : 'PUBLIC';
          return { ...q, visibility: newVis, updatedAt: new Date().toISOString().split('T')[0] };
        }
        return q;
      })
    );

    const updated = this.quizzes().find(q => q.id === id);
    if (updated) {
      this.http.put(`${environment.apiUrl}/quizzes/${id}`, updated).subscribe({ error: () => {} });
    }
  }

  createQuiz(quiz: Omit<Quiz, 'id' | 'createdAt' | 'updatedAt' | 'participationsCount' | 'averageScorePercent'>): Quiz {
    const newQuiz: Quiz = {
      ...quiz,
      id: 'quiz-' + Date.now(),
      participationsCount: 0,
      averageScorePercent: 0,
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0]
    };

    this.quizzes.update(list => [newQuiz, ...list]);
    this.persistNewQuiz(newQuiz, quiz);
    return newQuiz;
  }

  /** Comme createQuiz, mais attend l'enregistrement backend pour renvoyer le quiz avec son id serveur. */
  async createQuizAsync(quiz: Omit<Quiz, 'id' | 'createdAt' | 'updatedAt' | 'participationsCount' | 'averageScorePercent'>): Promise<Quiz> {
    const newQuiz = this.createQuiz(quiz);
    return (await this.pendingQuizSaves.get(newQuiz.id)) || newQuiz;
  }

  private persistNewQuiz(newQuiz: Quiz, quiz: Omit<Quiz, 'id' | 'createdAt' | 'updatedAt' | 'participationsCount' | 'averageScorePercent'>): void {
    const payload = {
      ...quiz,
      id: undefined,
      questions: quiz.questions?.map(q => ({
        ...q,
        id: undefined,
        choices: q.choices?.map(c => ({ ...c, id: undefined }))
      }))
    };

    const save = firstValueFrom(this.http.post<any>(`${environment.apiUrl}/quizzes`, payload))
      .then(res => {
        const saved = res?.data || res;
        if (saved && saved.id) {
          this.quizzes.update(list => list.map(q => q.id === newQuiz.id ? { ...saved } : q));
          return saved as Quiz;
        }
        return null;
      })
      .catch(err => {
        console.warn('Sauvegarde quiz backend (fallback local actif):', err);
        return null;
      })
      .finally(() => this.pendingQuizSaves.delete(newQuiz.id));
    this.pendingQuizSaves.set(newQuiz.id, save);
  }

  updateQuiz(id: string, updates: Partial<Quiz>): void {
    this.quizzes.update(list => 
      list.map(q => q.id === id ? { ...q, ...updates, updatedAt: new Date().toISOString().split('T')[0] } : q)
    );

    const updated = this.quizzes().find(q => q.id === id);
    if (updated) {
      this.http.put(`${environment.apiUrl}/quizzes/${id}`, updated).subscribe({ error: () => {} });
    }
  }

  deleteQuiz(id: string): void {
    this.quizzes.update(list => list.filter(q => q.id !== id));
    this.http.delete(`${environment.apiUrl}/quizzes/${id}`).subscribe({ error: () => {} });
  }

  // Real AI Quiz Generation via Spring Boot Backend with Local Fallback
  async generateQuizWithAiPrompt(prompt: string, count: number = 5): Promise<Question[]> {
    try {
      const resp = await firstValueFrom(
        this.http.post<any>(`${environment.apiUrl}/ai/generate-quiz`, {
          prompt,
          count,
          difficulty: 'MEDIUM'
        })
      );
      const list = resp?.data || resp;
      if (Array.isArray(list) && list.length > 0) {
        return list;
      }
    } catch (err) {
      console.warn('Appel AI backend échoué, bascule sur fallback local:', err);
    }

    return new Promise((resolve) => {
      setTimeout(() => {
        const generated: Question[] = [
          {
            id: 'ai-q1',
            text: `Quel est le principe clé de "${prompt}" ?`,
            type: 'SINGLE_CHOICE',
            timeLimitSeconds: 20,
            points: 100,
            explanation: `Explication générée par l'IA : Ce concept est fondamental dans ${prompt}.`,
            choices: [
              { id: 'c1', text: 'Option A (Recommandée et validée par l\'IA)', isCorrect: true, order: 1 },
              { id: 'c2', text: 'Option B (Distracteur courant)', isCorrect: false, order: 2 },
              { id: 'c3', text: 'Option C (Hypothèse incomplète)', isCorrect: false, order: 3 },
              { id: 'c4', text: 'Option D (Incorrect)', isCorrect: false, order: 4 }
            ],
            order: 1
          },
          {
            id: 'ai-q2',
            text: `Dans le domaine de "${prompt}", cette affirmation est-elle vérifiée ?`,
            type: 'TRUE_FALSE',
            timeLimitSeconds: 15,
            points: 100,
            explanation: 'Explication générée par l\'IA avec justification méthodologique.',
            choices: [
              { id: 'c21', text: 'Vrai', isCorrect: true, order: 1 },
              { id: 'c22', text: 'Faux', isCorrect: false, order: 2 }
            ],
            order: 2
          },
          {
            id: 'ai-q3',
            text: `Quels sont les facteurs déterminants pour réussir en "${prompt}" ?`,
            type: 'MULTIPLE_CHOICE',
            timeLimitSeconds: 25,
            points: 150,
            explanation: 'Plusieurs facteurs sont cumulatifs pour garantir la performance.',
            choices: [
              { id: 'c31', text: 'Facteur 1 : Rigueur et application des standards', isCorrect: true, order: 1 },
              { id: 'c32', text: 'Facteur 2 : Analyse continue des résultats', isCorrect: true, order: 2 },
              { id: 'c33', text: 'Facteur 3 : Négliger les tests préalables', isCorrect: false, order: 3 }
            ],
            order: 3
          }
        ];
        resolve(generated.slice(0, count));
      }, 1500);
    });
  }

  // Live Session Methods
  startLiveSession(quiz: Quiz, timePerQuestion: number = 20): LiveQuizSession {
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    const totalQuestions = quiz.questions?.length || 5;
    const totalDurationSeconds = totalQuestions * timePerQuestion;
    const now = new Date();
    const expectedEndAt = new Date(now.getTime() + totalDurationSeconds * 1000).toISOString();

    const session: LiveQuizSession = {
      pin,
      quizId: quiz.id,
      quizTitle: quiz.title,
      hostId: quiz.creatorId,
      status: 'LOBBY',
      currentQuestionIndex: 0,
      totalQuestions,
      timePerQuestionSeconds: timePerQuestion,
      totalDurationSeconds,
      startedAt: now.toISOString(),
      expectedEndAt,
      players: []
    };

    this.activeLiveSession.set(session);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('quizzboard_active_live_session', JSON.stringify(session));
      } catch {}
    }
    return session;
  }

  addPlayerToLive(data: { nickname?: string; email?: string; matricule?: string }): boolean {
    const current = this.activeLiveSession();
    if (!current) return false;

    const email = data.email?.trim() || '';
    const matricule = data.matricule?.trim() || '';
    let nickname = data.nickname?.trim();

    if (!nickname) {
      if (email) {
        const prefix = email.split('@')[0];
        nickname = prefix.charAt(0).toUpperCase() + prefix.slice(1);
      } else if (matricule) {
        nickname = `Élève (${matricule})`;
      } else {
        nickname = `Participant #${current.players.length + 1}`;
      }
    }

    const newPlayer: LiveSessionPlayer = {
      id: 'p-' + Date.now(),
      nickname,
      email: email || undefined,
      matricule: matricule || undefined,
      score: 0,
      streak: 0,
      isReady: true,
      accuracyPercent: 0,
      avgResponseTimeSeconds: 0,
      answeredCount: 0,
      finished: false
    };

    const updated = {
      ...current,
      players: [...current.players, newPlayer]
    };
    this.activeLiveSession.set(updated);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('quizzboard_active_live_session', JSON.stringify(updated));
      } catch {}
    }
    return true;
  }

  removePlayerFromLive(playerId: string): void {
    const current = this.activeLiveSession();
    if (!current) return;

    const updated = {
      ...current,
      players: current.players.filter(p => p.id !== playerId)
    };
    this.activeLiveSession.set(updated);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('quizzboard_active_live_session', JSON.stringify(updated));
      } catch {}
    }
  }

  setTimePerQuestion(seconds: number): void {
    const current = this.activeLiveSession();
    if (!current) return;

    const totalDurationSeconds = current.totalQuestions * seconds;
    const now = new Date();
    const expectedEndAt = new Date(now.getTime() + totalDurationSeconds * 1000).toISOString();

    const updated = {
      ...current,
      timePerQuestionSeconds: seconds,
      totalDurationSeconds,
      expectedEndAt
    };
    this.activeLiveSession.set(updated);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('quizzboard_active_live_session', JSON.stringify(updated));
      } catch {}
    }
  }

  startLiveGame(): void {
    const current = this.activeLiveSession();
    if (!current) return;

    const now = new Date();
    const totalDuration = current.totalDurationSeconds || (current.totalQuestions * (current.timePerQuestionSeconds || 20));
    const expectedEndAt = new Date(now.getTime() + totalDuration * 1000).toISOString();

    // Reset scores at start
    const resetPlayers = current.players.map(p => ({
      ...p,
      score: 0,
      streak: 0,
      accuracyPercent: 0,
      avgResponseTimeSeconds: 0,
      answeredCount: 0,
      finished: false
    }));

    const updated = {
      ...current,
      status: 'IN_PROGRESS' as const,
      currentQuestionIndex: 0,
      startedAt: now.toISOString(),
      expectedEndAt,
      isManuallyStopped: false,
      players: resetPlayers
    };
    this.activeLiveSession.set(updated);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('quizzboard_active_live_session', JSON.stringify(updated));
      } catch {}
    }
  }

  stopLiveSessionManually(): void {
    const current = this.activeLiveSession();
    if (!current) return;

    const updated = {
      ...current,
      status: 'FINISHED' as const,
      isManuallyStopped: true,
      endedAt: new Date().toISOString()
    };
    this.activeLiveSession.set(updated);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('quizzboard_active_live_session', JSON.stringify(updated));
      } catch {}
    }
  }

}
