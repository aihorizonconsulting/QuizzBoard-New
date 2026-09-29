export interface AuditLog {
  id: string;
  timestamp: string;
  adminName: string;
  action: string;
  target: string;
  details?: string;
  ipAddress?: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
}

/** État réel d'un service vérifié par le serveur (base, Redis, emails, paiement, IA). */
export interface ServiceStatus {
  id: string;
  name: string;
  status: 'UP' | 'WARNING' | 'DOWN';
  detail: string;
  latencyMs?: number;
}

/** Indicateurs de supervision calculés par le serveur à partir de la base. */
export interface AdminDashboardStats {
  totalUsers: number;
  creatorsCount: number;
  learnersCount: number;
  adminsCount: number;
  paidCreatorsCount: number;
  paidLearnersCount: number;
  freeCreatorsCount: number;
  newUsersThisMonth: number;
  newUsersLastMonth: number;
  totalQuizzes: number;
  totalCourses: number;
  totalQuestions: number;
  totalParticipations: number;
  completedParticipations: number;
  completedParticipationsThisMonth: number;
  totalRevenueFcfa: number;
  paidTransactionsCount: number;
  revenueThisMonthFcfa: number;
  revenueLastMonthFcfa: number;
  monthlyRevenue: { month: string; amountFcfa: number; payments: number }[];
  revenueByMethod: { method: string; payments: number; amountFcfa: number }[];
  aiGenerationsThisMonth: number;
  activeLiveSessions: number;
  activeLivePlayers: number;
  liveSessionsThisMonth: number;
  services: ServiceStatus[];
  checkedAt: string;
}

export interface PlatformSettings {
  freeMaxQuizzes: number;
  freeMaxLiveParticipants: number;
  freeAiCreditsMonth: number;
  starterPriceFcfa: number;
  starterPriceUsd: number;
  isMaintenanceMode: boolean;
  maintenanceMessage: string;
  waveActive: boolean;
  omActive: boolean;
  stripeActive: boolean;
  allowPublicRegistrations: boolean;
  requireEmailVerification: boolean;
  certificateSignatoryName?: string;   // signataire affiché sur les certificats
  certificateSignatoryTitle?: string;
}

export interface TransactionRecord {
  id: string;
  date?: string;
  createdAt?: string;
  userName: string;
  userEmail: string;
  organization?: string;
  plan: 'STARTER';
  amountFcfa: number;
  amountUsd: number;
  paymentMethod: 'WAVE' | 'ORANGE_MONEY' | 'STRIPE' | 'PAYDUNYA';
  status: 'INITIATED' | 'PAID' | 'PENDING' | 'REFUNDED' | 'FAILED' | 'CANCELLED' | 'EXPIRED';
  reference: string;
}
