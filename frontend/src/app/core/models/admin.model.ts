export interface AuditLog {
  id: string;
  timestamp: string;
  adminName: string;
  action: string;
  target: string;
  ipAddress?: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
}

export interface SystemMetrics {
  totalUsers: number;
  creatorsCount: number;
  learnersCount: number;
  mrrFcfa: number;
  mrrUsd: number;
  totalQuizzes: number;
  totalCourses: number;
  totalQuestions?: number;
  aiCallsMonth: number;
  activeLiveArenas: number;
  connectedLiveStudents: number;
  databaseHealthPercent: number;
  geminiLatencyMs: number;
  groqLatencyMs: number;
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
