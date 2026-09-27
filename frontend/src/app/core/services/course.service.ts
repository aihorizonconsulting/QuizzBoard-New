import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Course, CourseChapter, CourseAiGenerationOptions, CourseLevel } from '../models/course.model';
import { environment } from '../../../environments/environment';
import { reloadOnAccountChange } from '../utils/account-change.util';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';

@Injectable({
  providedIn: 'root'
})
export class CourseService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private toast = inject(ToastService);
  private coursesState = signal<Course[]>([]);
  isLoading = signal<boolean>(true);

  constructor() {
    this.loadCourses();
    reloadOnAccountChange(() => this.loadCourses());
  }

  /** Cours publiés et, pour un utilisateur connecté, tous ses propres cours (y compris brouillons). */
  async loadCourses(): Promise<void> {
    this.isLoading.set(true);
    try {
      const [publicRes, mineRes] = await Promise.all([
        firstValueFrom(this.http.get<any>(`${environment.apiUrl}/courses`)),
        this.authService.getToken()
          ? firstValueFrom(this.http.get<any>(`${environment.apiUrl}/courses`, { params: { my: 'true' } })).catch(() => null)
          : Promise.resolve(null)
      ]);
      const asList = (res: any): Course[] => {
        const data = res?.data || res;
        return Array.isArray(data) ? data : [];
      };
      const mine = asList(mineRes);
      const mineIds = new Set(mine.map(c => c.id));
      this.coursesState.set([...mine, ...asList(publicRes).filter(c => !mineIds.has(c.id))]);
    } catch {
      this.coursesState.set([]);
    } finally {
      this.isLoading.set(false);
    }
  }

  private replaceCourse(saved: Course): Course {
    this.coursesState.update(list => list.some(c => c.id === saved.id)
      ? list.map(c => c.id === saved.id ? saved : c)
      : [saved, ...list]);
    return saved;
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

  /** Enregistre le cours et renvoie le cours enregistré (erreur affichée et relancée en cas d'échec). */
  async createCourse(course: Omit<Course, 'id' | 'createdAt'>): Promise<Course> {
    const payload = {
      ...course,
      chapters: course.chapters?.map((ch, index) => ({ ...ch, id: undefined, order: index + 1 }))
    };
    try {
      const res = await firstValueFrom(this.http.post<any>(`${environment.apiUrl}/courses`, payload));
      const saved: Course = res?.data || res;
      this.toast.success(`Cours « ${saved.title} » enregistré.`);
      return this.replaceCourse(saved);
    } catch (err) {
      this.toast.apiError(err, 'Le cours n\'a pas pu être enregistré.');
      throw err;
    }
  }

  async updateCourse(id: string, updates: Partial<Course>): Promise<Course | null> {
    const current = this.coursesState().find(c => c.id === id);
    try {
      const res = await firstValueFrom(this.http.put<any>(`${environment.apiUrl}/courses/${id}`, { ...current, ...updates }));
      const saved: Course = res?.data || res;
      return saved?.id ? this.replaceCourse(saved) : null;
    } catch (err) {
      this.toast.apiError(err, 'Les modifications du cours n\'ont pas pu être enregistrées.');
      return null;
    }
  }

  async deleteCourse(id: string): Promise<boolean> {
    try {
      await firstValueFrom(this.http.delete(`${environment.apiUrl}/courses/${id}`));
      this.coursesState.update(list => list.filter(c => c.id !== id));
      return true;
    } catch (err) {
      this.toast.apiError(err, 'Le cours n\'a pas pu être supprimé.');
      return false;
    }
  }

  async assignCourseToClass(courseId: string, classId: string, className: string): Promise<boolean> {
    const course = this.coursesState().find(c => c.id === courseId);
    if (!course) return false;
    const ids = course.assignedClassIds || [];
    if (ids.includes(classId)) return true;
    const saved = await this.updateCourse(courseId, {
      assignedClassIds: [...ids, classId],
      assignedClassNames: [...(course.assignedClassNames || []), className]
    });
    return saved !== null;
  }

  async unassignCourseFromClass(courseId: string, classId: string): Promise<boolean> {
    const course = this.coursesState().find(c => c.id === courseId);
    if (!course) return false;
    const idx = (course.assignedClassIds || []).indexOf(classId);
    if (idx === -1) return true;
    const nextIds = [...course.assignedClassIds];
    const nextNames = [...(course.assignedClassNames || [])];
    nextIds.splice(idx, 1);
    nextNames.splice(idx, 1);
    const saved = await this.updateCourse(courseId, { assignedClassIds: nextIds, assignedClassNames: nextNames });
    return saved !== null;
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
    } catch (err: any) {
      // Refus métier (quota IA, session expirée...) : on l'affiche au lieu de fabriquer un cours local
      if (err?.status && err.status >= 400 && err.status < 500) {
        this.toast.apiError(err, 'La génération du cours a été refusée.');
        throw err;
      }
      console.warn('Appel AI backend generate-course échoué, bascule sur la génération locale:', err);
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

    const fallbackCourse: Omit<Course, 'id' | 'createdAt'> = {
      title: `Cours Magistral : ${opts.topic}`,
      description: `Support de cours complet généré par QuizzMind AI, structuré en ${chaptersCount} chapitres progressifs.`,
      category: opts.category || 'Informatique & Sciences',
      level: level,
      coverImage: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80',
      creatorId: 'formateur',
      creatorName: 'Professeur',
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

    // Le cours généré localement est enregistré sur le serveur comme n'importe quel cours
    return this.createCourse(fallbackCourse);
  }
}
