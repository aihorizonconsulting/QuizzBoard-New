export interface ParticipantAnswer {
  questionId: string;
  selectedChoiceIds: string[];
  isCorrect: boolean;
  timeSpentSeconds: number;
  pointsEarned: number;
}

export interface Participation {
  id: string;
  quizId: string;
  quizTitle: string;
  userId?: string;
  participantName: string;
  participantEmail?: string;
  score: number;
  maxScore: number;
  percentage: number;
  timeTotalSeconds: number;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'ABANDONED';
  completedAt: string;
  certificateEligible: boolean;
  certificateId?: string;
  answers: ParticipantAnswer[];
}

export interface Certificate {
  id: string;
  participationId: string;
  quizTitle: string;
  recipientName: string;
  scorePercent: number;
  issuedAt: string;
  issuerName: string;
  verificationCode: string;
  status?: 'VALID' | 'REVOKED';
}

export interface LeaderboardEntry {
  rank: number;
  participantName: string;
  avatarUrl?: string;
  score: number;
  timeSeconds: number;
  isCurrentUser?: boolean;
}
