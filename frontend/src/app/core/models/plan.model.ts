export interface PlanFeature {
  text: string;
  included: boolean;
  highlight?: boolean;
}

export interface SubscriptionPlan {
  id: 'FREE' | 'STARTER' | 'LEARNER_PLUS';
  name: string;
  badge?: string;
  priceFcfa: number;
  priceUsd: number;
  period: 'Mois' | 'Année';
  description: string;
  maxActiveQuizzes: number;
  maxParticipantsPerLive: number;
  maxCommunities: number;
  aiGenerationsPerMonth: number;
  features: PlanFeature[];
  isPopular?: boolean;
}

export interface Invoice {
  id: string;
  date: string;
  planName: string;
  amountFcfa: number;
  amountUsd: number;
  paymentMethod: 'WAVE' | 'ORANGE_MONEY' | 'STRIPE' | 'PAYDUNYA';
  status: 'PAID' | 'PENDING' | 'FAILED';
  receiptUrl?: string;
}
