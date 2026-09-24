export type QuestionType = 'MULTIPLE_CHOICE' | 'SINGLE_CHOICE' | 'TRUE_FALSE';
export type QuizStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface Choice {
  id: string;
  text: string;
  isCorrect: boolean;
  order: number;
}

export interface Question {
  id: string;
  text: string;
  type: QuestionType;
  timeLimitSeconds: number;
  points: number;
  explanation?: string;
  imageUrl?: string;
  choices: Choice[];
  order: number;
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  status: QuizStatus;
  creatorId: string;
  creatorName: string;
  creatorAvatar?: string;
  coverImage?: string;
  shareCode: string;
  questionsCount: number;
  participationsCount: number;
  averageScorePercent: number;
  communityId?: string;
  visibility?: 'PUBLIC' | 'PRIVATE';
  assignedClassIds?: string[];
  promotionId?: string;
  promotionLabel?: string;
  createdAt: string;
  updatedAt: string;
  questions?: Question[];
}

export interface LiveSessionPlayer {
  id: string;
  nickname: string;
  email?: string;
  matricule?: string;
  avatarUrl?: string;
  score: number;
  streak: number;
  isReady: boolean;
  accuracyPercent?: number;
  avgResponseTimeSeconds?: number;
  lastAnswerTime?: number;
  lastAnswerCorrect?: boolean;
  answeredCount?: number;
  finished?: boolean;
}

export interface LiveQuizSession {
  pin: string;
  quizId: string;
  quizTitle: string;
  hostId: string;
  status: 'LOBBY' | 'IN_PROGRESS' | 'QUESTION_REVIEW' | 'LEADERBOARD' | 'FINISHED';
  currentQuestionIndex: number;
  totalQuestions: number;
  timePerQuestionSeconds?: number;
  totalDurationSeconds?: number;
  elapsedSeconds?: number;
  startedAt?: string;
  expectedEndAt?: string;
  endedAt?: string;
  isManuallyStopped?: boolean;
  players: LiveSessionPlayer[];
}
