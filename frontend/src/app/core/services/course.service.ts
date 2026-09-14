import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Course, CourseChapter, CourseAiGenerationOptions } from '../models/course.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CourseService {
  private http = inject(HttpClient);
  private coursesState = signal<Course[]>([]);
  isLoading = signal<boolean>(true);

  constructor() {
    this.loadCourses();
  }

  loadCourses(): void {
    this.isLoading.set(true);
    this.http.get<Course[]>(`${environment.apiUrl}/courses`).subscribe({
      next: (data) => {
        this.isLoading.set(false);
        this.coursesState.set(data || []);
      },
      error: () => {
        this.isLoading.set(false);
        this.coursesState.set([]);
      }
    });
  }

  getCourses() {
    return this.coursesState.asReadonly();
  }

  getCourseById(id: string): Course | undefined {
    return this.coursesState().find(c => c.id === id);
  }

  createCourse(course: Omit<Course, 'id' | 'createdAt'>): Course {
    const tempId = 'crs-' + Date.now();
    const newCourse: Course = {
      ...course,
      id: tempId,
      createdAt: new Date().toISOString().split('T')[0]
    };
    this.coursesState.update(list => [newCourse, ...list]);

    this.http.post<Course>(`${environment.apiUrl}/courses`, newCourse).subscribe({
      next: (saved) => {
        if (saved && saved.id) {
          this.coursesState.update(list => list.map(c => c.id === tempId ? saved : c));
        }
      },
      error: () => {}
    });

    return newCourse;
  }

  updateCourse(id: string, updates: Partial<Course>): void {
    this.coursesState.update(list =>
      list.map(c => c.id === id ? { ...c, ...updates } : c)
    );

    const updated = this.coursesState().find(c => c.id === id);
    if (updated) {
      this.http.put<Course>(`${environment.apiUrl}/courses/${id}`, updated).subscribe();
    }
  }

  deleteCourse(id: string): void {
    this.coursesState.update(list => list.filter(c => c.id !== id));
    this.http.delete(`${environment.apiUrl}/courses/${id}`).subscribe();
  }

  assignCourseToClass(courseId: string, classId: string, className: string): void {
    this.coursesState.update(list =>
      list.map(c => {
        if (c.id === courseId) {
          const currentIds = c.assignedClassIds || [];
          const currentNames = c.assignedClassNames || [];
          if (!currentIds.includes(classId)) {
            return {
              ...c,
              assignedClassIds: [...currentIds, classId],
              assignedClassNames: [...currentNames, className]
            };
          }
        }
        return c;
      })
    );

    const updated = this.coursesState().find(c => c.id === courseId);
    if (updated) {
      this.http.put<Course>(`${environment.apiUrl}/courses/${courseId}`, updated).subscribe({ error: () => {} });
    }
  }

  unassignCourseFromClass(courseId: string, classId: string): void {
    this.coursesState.update(list =>
      list.map(c => {
        if (c.id === courseId) {
          const idx = (c.assignedClassIds || []).indexOf(classId);
          if (idx !== -1) {
            const nextIds = [...c.assignedClassIds];
            const nextNames = [...c.assignedClassNames];
            nextIds.splice(idx, 1);
            nextNames.splice(idx, 1);
            return {
              ...c,
              assignedClassIds: nextIds,
              assignedClassNames: nextNames
            };
          }
        }
        return c;
      })
    );

    const updated = this.coursesState().find(c => c.id === courseId);
    if (updated) {
      this.http.put<Course>(`${environment.apiUrl}/courses/${courseId}`, updated).subscribe({ error: () => {} });
    }
  }

  // AI Course Generator Engine
  generateCourseWithAi(opts: CourseAiGenerationOptions): Promise<Course> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const chaptersCount = opts.chaptersCount || 3;
        const chapters: CourseChapter[] = [];

        for (let i = 1; i <= chaptersCount; i++) {
          chapters.push({
            id: `gen-ch-${Date.now()}-${i}`,
            order: i,
            title: `Chapitre ${i} : Fondements et Cas Pratiques sur ${opts.topic} (Partie ${i})`,
            summary: `Notions clés, méthodologie et pièges fréquents à éviter dans le module ${i}.`,
            content: `### Vue d'ensemble du Chapitre ${i}
Dans cette section consacrée à **${opts.topic}**, nous explorons les piliers essentiels nécessaires pour maîtriser le sujet.

#### Concepts Clés :
1. **Principe directeur** : Comprendre comment appliquer ${opts.topic} dans des contextes réels.
2. **Mécanismes fondamentaux** : Règles d'architecture, normes et bonnes pratiques professionnelles.
3. **Cas d'usage pratique** : Mise en situation concrète avec résolution pas à pas.

#### Synthèse pédagogique :
- Retenez que la régularité et la rigueur dans l'application de ces concepts garantissent une assimilation durable.`,
            estimatedMinutes: 40 + i * 5,
            hasQuiz: opts.withChapterQuizzes,
            quizTitle: opts.withChapterQuizzes ? `Quiz Chapitre ${i} : Évaluation ${opts.topic}` : undefined,
            quizQuestionsCount: opts.withChapterQuizzes ? 4 : undefined
          });
        }

        const newCourse: Course = {
          id: 'crs-ai-' + Date.now(),
          title: `Cours Magistral : ${opts.topic}`,
          description: `Support de cours complet généré par QuizzMind AI, structuré en ${chaptersCount} chapitres progressifs.`,
          category: opts.category || 'Informatique & Sciences',
          level: opts.level || 'INTERMEDIATE',
          coverImage: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80',
          creatorId: 'u-1',
          creatorName: 'Professeur',
          createdAt: new Date().toISOString().split('T')[0],
          estimatedHours: Math.round(chaptersCount * 1.5),
          status: 'PUBLISHED',
          assignedClassIds: opts.targetClassId ? [opts.targetClassId] : [],
          assignedClassNames: opts.targetClassName ? [opts.targetClassName] : [],
          hasChapterQuizzes: opts.withChapterQuizzes,
          hasFinalQuiz: opts.withFinalQuiz,
          finalQuizTitle: opts.withFinalQuiz ? `Examen Final de Validation : ${opts.topic}` : undefined,
          finalQuizQuestionsCount: opts.withFinalQuiz ? 10 : undefined,
          hasCertificate: opts.hasCertificate !== false,
          certificateTemplateType: opts.certificateTemplateType || 'DEFAULT',
          certificateCustomTemplateUrl: opts.certificateCustomTemplateUrl,
          certificateMinimumScore: opts.certificateMinimumScore || 80,
          chapters
        };

        this.coursesState.update(list => [newCourse, ...list]);
        resolve(newCourse);
      }, 1200);
    });
  }
}
