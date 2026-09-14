export interface Student {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  matricule?: string;
  avatarUrl?: string;
  joinedAt: string;
  averageScorePercent: number;
  quizzesCompletedCount: number;
  coursesProgressPercent?: number; // e.g. 75%
  coursesCompletedCount?: number;  // e.g. 2
  status: 'ACTIVE' | 'PENDING';
}

export interface Classe {
  id: string;
  name: string;
  code: string;
  level: string; // ex: 'Licence 3', 'Master 2', 'Bac+2', 'Formation Continue'
  description: string;
  creatorId: string;
  creatorName: string;
  studentsCount: number;
  students: Student[];
  assignedQuizIds: string[];
  assignedCourseIds?: string[];
  promotionId?: string;
  promotionLabel?: string;
  color: string; // Hex or theme color for badge/avatar
  coverImage?: string;
  createdAt: string;
}
