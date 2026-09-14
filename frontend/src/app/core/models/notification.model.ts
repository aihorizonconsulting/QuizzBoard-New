export type NotificationType = 'LIVE' | 'QUIZ_RESULT' | 'COMMUNITY' | 'SYSTEM' | 'CERTIFICATE' | 'PAYMENT' | 'MODERATION';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timeAgo: string;
  isRead: boolean;
  actionLink?: string;
  metadata?: {
    quizId?: string;
    studentName?: string;
    scorePercent?: number;
    sessionId?: string;
    communityId?: string;
  };
  createdAt: string;
}
