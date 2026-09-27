import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Classe, Student } from '../models/classe.model';
import { Quiz } from '../models/quiz.model';
import { environment } from '../../../environments/environment';
import { reloadOnAccountChange } from '../utils/account-change.util';
import { ToastService } from './toast.service';

/**
 * Classes du formateur connecté (ou classes où l'apprenant connecté est inscrit).
 * Chaque modification attend la réponse du serveur : aucune donnée n'est affichée comme
 * enregistrée tant qu'elle ne l'est pas, et les échecs sont signalés à l'utilisateur.
 */
@Injectable({
  providedIn: 'root'
})
export class ClasseService {
  private http = inject(HttpClient);
  private toast = inject(ToastService);
  private readonly baseUrl = `${environment.apiUrl}/classes`;
  private classesState = signal<Classe[]>([]);
  isLoading = signal<boolean>(true);

  constructor() {
    this.loadClasses();
    reloadOnAccountChange(() => this.loadClasses(), () => this.classesState.set([]));
  }

  async loadClasses(): Promise<void> {
    this.isLoading.set(true);
    try {
      const data = await firstValueFrom(this.http.get<Classe[]>(this.baseUrl));
      this.classesState.set((Array.isArray(data) ? data : []).map(c => this.normalize(c)));
    } catch {
      this.classesState.set([]);
    } finally {
      this.isLoading.set(false);
    }
  }

  private normalize(c: Classe): Classe {
    const students = c.students || [];
    return {
      ...c,
      students,
      studentsCount: c.studentsCount ?? students.length,
      assignedQuizIds: c.assignedQuizIds || [],
      assignedCourseIds: c.assignedCourseIds || [],
      level: c.level || '',
      description: c.description || ''
    };
  }

  private upsert(saved: Classe): Classe {
    const normalized = this.normalize(saved);
    this.classesState.update(list =>
      list.some(c => c.id === normalized.id)
        ? list.map(c => c.id === normalized.id ? normalized : c)
        : [normalized, ...list]
    );
    return normalized;
  }

  getClasses() {
    return this.classesState.asReadonly();
  }

  getClassesForPromotion(promotionId: string): Classe[] {
    if (!promotionId || promotionId === 'ALL') {
      return this.classesState();
    }
    return this.classesState().filter(c => c.promotionId === promotionId);
  }

  getClassById(id: string): Classe | undefined {
    return this.classesState().find(c => c.id === id);
  }

  /** Crée la classe et renvoie la classe enregistrée (erreur affichée et relancée en cas d'échec). */
  async addClass(newClass: Pick<Classe, 'name' | 'code' | 'level' | 'description' | 'color'> & { promotionId?: string }): Promise<Classe> {
    try {
      const saved = await firstValueFrom(this.http.post<Classe>(this.baseUrl, {
        name: newClass.name,
        code: newClass.code,
        level: newClass.level,
        description: newClass.description,
        color: newClass.color,
        promotionId: newClass.promotionId || null
      }));
      this.toast.success(`Classe « ${saved.name} » enregistrée.`);
      return this.upsert(saved);
    } catch (err) {
      this.toast.apiError(err, 'La classe n\'a pas pu être enregistrée.');
      throw err;
    }
  }

  async addStudentToClass(classId: string, studentData: Pick<Student, 'prenom' | 'nom' | 'email' | 'matricule'>): Promise<Student> {
    try {
      const saved = await firstValueFrom(this.http.post<Student>(`${this.baseUrl}/${classId}/students`, studentData));
      this.classesState.update(classes => classes.map(c => {
        if (c.id !== classId) return c;
        const students = [saved, ...c.students];
        return { ...c, students, studentsCount: students.length };
      }));
      this.toast.success(`${saved.prenom} ${saved.nom} a été ajouté(e) à la classe.`);
      return saved;
    } catch (err) {
      this.toast.apiError(err, 'L\'élève n\'a pas pu être ajouté à la classe.');
      throw err;
    }
  }

  async removeStudentFromClass(classId: string, studentId: string): Promise<boolean> {
    try {
      await firstValueFrom(this.http.delete(`${this.baseUrl}/${classId}/students/${studentId}`));
      this.classesState.update(classes => classes.map(c => {
        if (c.id !== classId) return c;
        const students = c.students.filter(s => s.id !== studentId);
        return { ...c, students, studentsCount: students.length };
      }));
      return true;
    } catch (err) {
      this.toast.apiError(err, 'L\'élève n\'a pas pu être retiré de la classe.');
      return false;
    }
  }

  async assignQuizToClass(classId: string, quizId: string): Promise<boolean> {
    try {
      const saved = await firstValueFrom(this.http.put<Classe>(`${this.baseUrl}/${classId}/quizzes/${quizId}`, {}));
      this.upsert(saved);
      this.toast.success('Quiz assigné à la classe.');
      return true;
    } catch (err) {
      this.toast.apiError(err, 'Le quiz n\'a pas pu être assigné à la classe.');
      return false;
    }
  }

  async unassignQuizFromClass(classId: string, quizId: string): Promise<boolean> {
    try {
      const saved = await firstValueFrom(this.http.delete<Classe>(`${this.baseUrl}/${classId}/quizzes/${quizId}`));
      this.upsert(saved);
      return true;
    } catch (err) {
      this.toast.apiError(err, 'Le quiz n\'a pas pu être retiré de la classe.');
      return false;
    }
  }

  async deleteClass(classId: string): Promise<boolean> {
    try {
      await firstValueFrom(this.http.delete(`${this.baseUrl}/${classId}`));
      this.classesState.update(classes => classes.filter(c => c.id !== classId));
      return true;
    } catch (err) {
      this.toast.apiError(err, 'La classe n\'a pas pu être supprimée.');
      return false;
    }
  }

  /** Inscription de l'utilisateur connecté (apprenant) dans la classe portant ce code. */
  async joinClassByCode(code: string): Promise<Classe> {
    const saved = await firstValueFrom(this.http.post<Classe>(`${this.baseUrl}/join`, { code }));
    return this.upsert(saved);
  }

  /** Quiz assignés à une classe, y compris privés (réservé au formateur et aux élèves inscrits). */
  async fetchClassQuizzes(classId: string): Promise<Quiz[]> {
    const data = await firstValueFrom(this.http.get<Quiz[]>(`${this.baseUrl}/${classId}/quizzes`));
    return Array.isArray(data) ? data : [];
  }
}
