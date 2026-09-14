export type CourseLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EASY' | 'MEDIUM' | 'HARD';

export interface CourseChapter {
  id: string;
  order: number;
  title: string;
  summary: string;
  content: string; // Structured theory, key points, practical examples
  estimatedMinutes: number;
  hasQuiz: boolean;
  quizTitle?: string;
  quizQuestionsCount?: number;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  level: CourseLevel;
  coverImage: string;
  creatorId: string;
  creatorName: string;
  createdAt: string;
  estimatedHours: number;
  status: 'DRAFT' | 'PUBLISHED';
  
  // Classes assignment
  assignedClassIds: string[];
  assignedClassNames: string[];

  // Quizzes configuration
  hasChapterQuizzes: boolean;
  hasFinalQuiz: boolean;
  finalQuizTitle?: string;
  finalQuizQuestionsCount?: number;

  // Certificate configuration
  hasCertificate: boolean; // Délivrance de certificat de réussite (Oui / Non)
  certificateTemplateType?: 'DEFAULT' | 'CUSTOM'; // Modèle officiel par défaut ou modèle personnalisé uploadé
  certificateCustomTemplateUrl?: string; // URL ou data URL de l'image de modèle personnalisé
  certificateMinimumScore?: number; // Score minimum requis (ex: 80%)

  // Chapters
  chapters: CourseChapter[];
}

export interface CourseAiGenerationOptions {
  topic: string;
  chaptersCount: number;
  withChapterQuizzes: boolean;
  withFinalQuiz: boolean;
  level: CourseLevel;
  category?: string;
  targetClassId?: string;
  targetClassName?: string;
  hasCertificate?: boolean;
  certificateTemplateType?: 'DEFAULT' | 'CUSTOM';
  certificateCustomTemplateUrl?: string;
  certificateMinimumScore?: number;
}
