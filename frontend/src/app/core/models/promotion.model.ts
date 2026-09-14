export type PromotionStatus = 'UPCOMING' | 'IN_PROGRESS' | 'ARCHIVED';

export interface PromotionPermissions {
  canPrepare: boolean;     // Préparation des classes, apprenants et parcours (UPCOMING ou IN_PROGRESS)
  canMutate: boolean;      // Ajout, modification, suppression (interdit si ARCHIVED)
  canEvaluate: boolean;    // Évaluations, notes, présences (autorisé uniquement si IN_PROGRESS)
  canLaunchLive: boolean;  // Sessions live simultanées (autorisé uniquement si IN_PROGRESS)
  isReadOnly: boolean;     // Consultation historique en lecture seule (si ARCHIVED)
}

export interface Promotion {
  id: string;             // ex: 'promo-7'
  code: string;           // ex: 'P7'
  name: string;           // ex: 'Promotion 7'
  label: string;          // backward compat alias for name
  year: string;           // ex: '2025 - 2026'
  startYear?: number;     // 2025
  endYear?: number;       // 2026
  startDate: string;      // '2025-09-01'
  endDate: string;        // '2026-06-30'
  status: PromotionStatus;
  isActive: boolean;      // Exactly one promotion is active as the main working context
  isCurrent?: boolean;    // backward compat alias for isActive
  classesCount: number;
  classesList?: string[]; // e.g. ['L3 Génie Logiciel', 'M2 Data Science']
  studentsCount: number;
  quizzesCount: number;
  description?: string;
  createdAt: string;
}
