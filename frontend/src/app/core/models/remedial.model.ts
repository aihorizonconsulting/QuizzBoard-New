import { Question } from './quiz.model';

export interface RemedialChapter {
  order: number;
  title: string;
  summary: string;
  content: string;
  estimatedMinutes: number;
}

export type RemedialStatus = 'PENDING' | 'GENERATING' | 'READY' | 'FAILED';

/** Parcours de perfectionnement préparé après un quiz réussi à moins de 70 %. */
export interface RemedialPack {
  id: string;
  quizId: string;
  quizTitle: string;
  scorePercent: number;
  missedCount: number;
  status: RemedialStatus;
  /** Sans abonnement Apprenant Plus : ni notions détaillées ni contenu. */
  locked: boolean;
  failureReason?: string | null;
  bestPracticeScore?: number | null;
  practiceAttempts: number;
  createdAt: string;
  updatedAt: string;
  readyAt?: string | null;
  missedNotions: string[];
  content?: { chapters: RemedialChapter[]; questions: Question[] } | null;
}
