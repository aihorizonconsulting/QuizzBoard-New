export type UserRole = 'CREATOR' | 'LEARNER' | 'ADMIN';
export type SubscriptionTier = 'FREE' | 'STARTER';

export interface User {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  subscriptionTier: SubscriptionTier;
  organization?: string;
  xpPoints: number;
  level: number;
  streakDays: number;
  followersCount: number;
  followingCount: number;
  createdAt: string;
  status?: 'ACTIVE' | 'SUSPENDED';
  phoneNumber?: string;
}

export interface AuthSession {
  user: User;
  token: string;
}
