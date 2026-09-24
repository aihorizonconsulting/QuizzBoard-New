import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Classe, Student } from '../models/classe.model';
import { environment } from '../../../environments/environment';
import { reloadOnAccountChange } from '../utils/account-change.util';

@Injectable({
  providedIn: 'root'
})
export class ClasseService {
  private http = inject(HttpClient);
  private classesState = signal<Classe[]>([]);
  isLoading = signal<boolean>(true);

  constructor() {
    this.loadClasses();
    reloadOnAccountChange(() => this.loadClasses(), () => this.classesState.set([]));
  }

  loadClasses(): void {
    this.isLoading.set(true);
    this.http.get<Classe[]>(`${environment.apiUrl}/classes`).subscribe({
      next: (data) => {
        this.isLoading.set(false);
        this.classesState.set(data || []);
      },
      error: () => {
        this.isLoading.set(false);
        this.classesState.set([]);
      }
    });
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

  addClass(newClass: Omit<Classe, 'id' | 'studentsCount' | 'students' | 'assignedQuizIds' | 'createdAt'>): Classe {
    const tempId = 'classe-' + Date.now();
    const created: Classe = {
      ...newClass,
      id: tempId,
      studentsCount: 0,
      students: [],
      assignedQuizIds: [],
      createdAt: new Date().toISOString().split('T')[0]
    };
    this.classesState.update(list => [created, ...list]);

    this.http.post<Classe>(`${environment.apiUrl}/classes`, created).subscribe({
      next: (saved) => {
        if (saved && saved.id) {
          this.classesState.update(list => list.map(c => c.id === tempId ? saved : c));
        }
      },
      error: () => {}
    });

    return created;
  }

  addStudentToClass(classId: string, studentData: Omit<Student, 'id' | 'joinedAt' | 'averageScorePercent' | 'quizzesCompletedCount' | 'status'>): Student {
    const tempId = 'stud-' + Date.now();
    const student: Student = {
      ...studentData,
      id: tempId,
      joinedAt: new Date().toISOString().split('T')[0],
      averageScorePercent: 0,
      quizzesCompletedCount: 0,
      status: 'ACTIVE'
    };

    this.classesState.update(classes =>
      classes.map(c => {
        if (c.id === classId) {
          const updatedStudents = [student, ...c.students];
          return {
            ...c,
            students: updatedStudents,
            studentsCount: updatedStudents.length
          };
        }
        return c;
      })
    );

    this.http.post<Student>(`${environment.apiUrl}/classes/${classId}/students`, student).subscribe({
      next: (saved) => {
        if (saved && saved.id) {
          this.classesState.update(classes =>
            classes.map(c => {
              if (c.id === classId) {
                return {
                  ...c,
                  students: c.students.map(s => s.id === tempId ? saved : s)
                };
              }
              return c;
            })
          );
        }
      },
      error: () => {}
    });

    return student;
  }

  removeStudentFromClass(classId: string, studentId: string): void {
    this.classesState.update(classes =>
      classes.map(c => {
        if (c.id === classId) {
          const updatedStudents = c.students.filter(s => s.id !== studentId);
          return {
            ...c,
            students: updatedStudents,
            studentsCount: updatedStudents.length
          };
        }
        return c;
      })
    );

    this.http.delete(`${environment.apiUrl}/classes/${classId}/students/${studentId}`).subscribe({
      error: () => {}
    });
  }

  assignQuizToClass(classId: string, quizId: string): void {
    this.classesState.update(classes =>
      classes.map(c => {
        if (c.id === classId && !c.assignedQuizIds.includes(quizId)) {
          return {
            ...c,
            assignedQuizIds: [...c.assignedQuizIds, quizId]
          };
        }
        return c;
      })
    );

    const targetClass = this.classesState().find(c => c.id === classId);
    if (targetClass) {
      this.http.put(`${environment.apiUrl}/classes/${classId}`, targetClass).subscribe();
    }
  }

  unassignQuizFromClass(classId: string, quizId: string): void {
    this.classesState.update(classes =>
      classes.map(c => {
        if (c.id === classId) {
          return {
            ...c,
            assignedQuizIds: c.assignedQuizIds.filter(id => id !== quizId)
          };
        }
        return c;
      })
    );

    const targetClass = this.classesState().find(c => c.id === classId);
    if (targetClass) {
      this.http.put(`${environment.apiUrl}/classes/${classId}`, targetClass).subscribe();
    }
  }

  deleteClass(classId: string): void {
    this.classesState.update(classes => classes.filter(c => c.id !== classId));
    this.http.delete(`${environment.apiUrl}/classes/${classId}`).subscribe({
      error: () => {}
    });
  }
}
