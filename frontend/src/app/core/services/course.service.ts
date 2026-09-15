import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Course, CourseChapter, CourseAiGenerationOptions, CourseLevel } from '../models/course.model';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';

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
    this.http.get<any>(`${environment.apiUrl}/courses`).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        const data = res?.data || res;
        this.coursesState.set(Array.isArray(data) ? data : []);
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

  async fetchCourseById(id: string): Promise<Course | undefined> {
    const cached = this.getCourseById(id);
    if (cached) return cached;
    try {
      const res = await firstValueFrom(this.http.get<any>(`${environment.apiUrl}/courses/${id}`));
      const course = res?.data || res;
      if (course && course.id) {
        this.coursesState.update(list => {
          const exists = list.some(c => c.id === course.id);
          return exists ? list.map(c => c.id === course.id ? course : c) : [course, ...list];
        });
        return course;
      }
    } catch {
      return undefined;
    }
    return undefined;
  }

  createCourse(course: Omit<Course, 'id' | 'createdAt'>): Course {
    const tempId = 'crs-' + Date.now();
    const newCourse: Course = {
      ...course,
      id: tempId,
      createdAt: new Date().toISOString().split('T')[0]
    };
    this.coursesState.update(list => [newCourse, ...list]);

    const payload = {
      ...course,
      id: undefined,
      chapters: course.chapters?.map(ch => ({
        ...ch,
        id: undefined
      }))
    };

    this.http.post<any>(`${environment.apiUrl}/courses`, payload).subscribe({
      next: (res) => {
        const saved = res?.data || res;
        if (saved && saved.id) {
          this.coursesState.update(list => list.map(c => c.id === tempId ? saved : c));
        }
      },
      error: (err) => console.warn('Sauvegarde cours backend (fallback local actif):', err)
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

  // AI Course Generator Engine - Calls real backend /ai/generate-course with local fallback
  async generateCourseWithAi(opts: CourseAiGenerationOptions): Promise<Course> {
    let level: CourseLevel = 'INTERMEDIATE';
    if (opts.level === 'EASY' || opts.level === 'BEGINNER') level = 'BEGINNER';
    else if (opts.level === 'HARD' || opts.level === 'ADVANCED') level = 'ADVANCED';
    else level = 'INTERMEDIATE';

    const payload = {
      topic: opts.topic,
      chaptersCount: opts.chaptersCount || 3,
      withChapterQuizzes: opts.withChapterQuizzes !== false,
      withFinalQuiz: opts.withFinalQuiz !== false,
      level: level,
      category: opts.category || 'Informatique & Sciences',
      targetClassId: opts.targetClassId || undefined,
      targetClassName: opts.targetClassName || undefined,
      hasCertificate: opts.hasCertificate !== false,
      certificateMinimumScore: opts.certificateMinimumScore || 80
    };

    try {
      const res = await firstValueFrom(
        this.http.post<any>(`${environment.apiUrl}/ai/generate-course`, payload)
      );
      const course = res?.data || res;
      if (course && course.id) {
        this.coursesState.update(list => [course, ...list.filter(c => c.id !== course.id)]);
        return course;
      }
    } catch (err) {
      console.warn('Appel AI backend generate-course échoué, bascule sur fallback local:', err);
    }

    // Zero-Crash Local Pedagogical Generation if backend unreachable
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

    const fallbackCourse: Course = {
      id: 'crs-ai-' + Date.now(),
      title: `Cours Magistral : ${opts.topic}`,
      description: `Support de cours complet généré par QuizzMind AI, structuré en ${chaptersCount} chapitres progressifs.`,
      category: opts.category || 'Informatique & Sciences',
      level: level,
      coverImage: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80',
      creatorId: 'formateur',
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

    this.coursesState.update(list => [fallbackCourse, ...list]);
    return fallbackCourse;
  }
}
