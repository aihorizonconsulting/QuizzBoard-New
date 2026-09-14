export type LiveAudienceType = 'PUBLIC' | 'CLASS' | 'SELECTED_STUDENTS';

export interface LiveSessionRecord {
  id: string;
  pinCode: string;
  quizId: string;
  quizTitle: string;
  quizQuestionsCount: number;
  hostId: string;
  hostName: string;
  audienceType: LiveAudienceType;
  targetClassId?: string;
  targetClassName?: string;
  targetStudentIds?: string[];
  invitedEmailsOrMatricules?: string[];
  status: 'SCHEDULED' | 'WAITING' | 'RUNNING' | 'FINISHED';
  participantsCount: number;
  averageScorePercent?: number;
  winnerNickname?: string;
  timePerQuestionSeconds: number;
  totalDurationSeconds?: number;
  expectedEndAt?: string;
  shuffleQuestions: boolean;
  showLeaderboardAfterEachQuestion: boolean;
  createdAt: string;
}
