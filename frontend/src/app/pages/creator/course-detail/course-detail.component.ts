import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CourseService } from '../../../core/services/course.service';
import { ClasseService } from '../../../core/services/classe.service';
import { QuizService } from '../../../core/services/quiz.service';
import { LiveSessionService } from '../../../core/services/live-session.service';
import { Course, CourseChapter, CourseLevel } from '../../../core/models/course.model';
import { IconComponent } from '../../../shared/components/icon/icon.component';

export interface CourseQuizItem {
  id: string;
  title: string;
  type: 'CHAPTER' | 'FINAL';
  chapterOrder?: number;
  chapterTitle?: string;
  questionsCount: number;
  difficulty: string;
  sampleQuestions: { q: string; a: string }[];
}

@Component({
  selector: 'app-course-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, IconComponent],
  templateUrl: './course-detail.component.html',
  styleUrl: './course-detail.component.scss'
})
export class CourseDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private courseService = inject(CourseService);
  private classeService = inject(ClasseService);
  private quizService = inject(QuizService);
  private liveService = inject(LiveSessionService);

  course = signal<Course | null>(null);
  selectedChapterIndex = 0; // 0..N, or -1 for final quiz
  isSidebarCollapsed = false;
  viewMode: 'READ' | 'QUIZZES' = 'READ';

  // Modals
  showAssignModal = false;
  showEditCourseModal = false;
  showDeleteCourseModal = false;
  showChapterModal = false;
  editingChapterIndex: number | null = null; // null = adding new
  previewQuizModal: CourseQuizItem | null = null;

  // Edit Course Form
  editTitle = '';
  editDescription = '';
  editCategory = '';
  editLevel: CourseLevel = 'INTERMEDIATE';
  editEstimatedHours = 5;
  editHasCertificate = false;
  editCertificateTemplateType: 'DEFAULT' | 'CUSTOM' = 'DEFAULT';
  editCertificateCustomTemplateUrl = '';
  editCertificateMinScore = 80;
  editUploadedCertFileName = '';
  showCertPreviewModal = false;

  // Chapter Form
  chapterTitle = '';
  chapterSummary = '';
  chapterContent = '';
  chapterEstimatedMinutes = 30;
  chapterHasQuiz = true;
  chapterQuizTitle = '';
  chapterQuizCount = 5;

  availableClasses = this.classeService.getClasses();

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      const found = this.courseService.getCourseById(id);
      if (found) {
        this.course.set(found);
      } else {
        this.courseService.fetchCourseById(id).then(c => {
          if (c) this.course.set(c);
        });
      }
    }
  }

  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  // --- COURSE MANAGEMENT (EDIT & DELETE) ---
  openEditCourseModal(): void {
    const c = this.course();
    if (!c) return;
    this.editTitle = c.title;
    this.editDescription = c.description;
    this.editCategory = c.category;
    this.editLevel = c.level;
    this.editEstimatedHours = c.estimatedHours;
    this.editHasCertificate = c.hasCertificate ?? false;
    this.editCertificateTemplateType = c.certificateTemplateType ?? 'DEFAULT';
    this.editCertificateCustomTemplateUrl = c.certificateCustomTemplateUrl || '';
    this.editCertificateMinScore = c.certificateMinimumScore || 80;
    this.editUploadedCertFileName = c.certificateCustomTemplateUrl ? 'Modele_Certificat_Actuel.png' : '';
    this.showEditCourseModal = true;
  }

  onEditCertificateFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.editUploadedCertFileName = file.name;
      const reader = new FileReader();
      reader.onload = (e) => {
        this.editCertificateCustomTemplateUrl = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  removeEditCustomCertificateTemplate(): void {
    this.editCertificateCustomTemplateUrl = '';
    this.editUploadedCertFileName = '';
    this.editCertificateTemplateType = 'DEFAULT';
  }

  saveCourseChanges(): void {
    const c = this.course();
    if (!c) return;
    this.courseService.updateCourse(c.id, {
      title: this.editTitle.trim(),
      description: this.editDescription.trim(),
      category: this.editCategory.trim(),
      level: this.editLevel,
      estimatedHours: this.editEstimatedHours,
      hasCertificate: this.editHasCertificate,
      certificateTemplateType: this.editCertificateTemplateType,
      certificateCustomTemplateUrl: this.editCertificateCustomTemplateUrl || undefined,
      certificateMinimumScore: this.editCertificateMinScore
    });
    this.course.set(this.courseService.getCourseById(c.id) || null);
    this.showEditCourseModal = false;
  }

  openDeleteCourseModal(): void {
    this.showDeleteCourseModal = true;
  }

  confirmDeleteCourse(): void {
    const c = this.course();
    if (!c) return;
    this.courseService.deleteCourse(c.id);
    this.showDeleteCourseModal = false;
    this.router.navigate(['/app/courses']);
  }

  // --- CHAPTER MANAGEMENT (ADD, EDIT, DELETE) ---
  openAddChapterModal(): void {
    const c = this.course();
    const nextOrder = (c?.chapters.length || 0) + 1;
    this.editingChapterIndex = null;
    this.chapterTitle = `Chapitre ${nextOrder} : Nouveau module`;
    this.chapterSummary = 'Résumé des objectifs et notions clés de ce module.';
    this.chapterContent = `### 1. Introduction au Chapitre ${nextOrder}\nDéveloppez ici le contenu théorique de votre cours avec des exemples clairs.\n\n### 2. Mise en Pratique\n- Point important 1\n- Point important 2`;
    this.chapterEstimatedMinutes = 35;
    this.chapterHasQuiz = true;
    this.chapterQuizTitle = `Quiz du Chapitre ${nextOrder}`;
    this.chapterQuizCount = 5;
    this.showChapterModal = true;
  }

  openEditChapterModal(index: number): void {
    const c = this.course();
    if (!c || !c.chapters[index]) return;
    const ch = c.chapters[index];
    this.editingChapterIndex = index;
    this.chapterTitle = ch.title;
    this.chapterSummary = ch.summary;
    this.chapterContent = ch.content;
    this.chapterEstimatedMinutes = ch.estimatedMinutes;
    this.chapterHasQuiz = ch.hasQuiz;
    this.chapterQuizTitle = ch.quizTitle || `Quiz du Chapitre ${ch.order}`;
    this.chapterQuizCount = ch.quizQuestionsCount || 5;
    this.showChapterModal = true;
  }

  saveChapter(): void {
    const c = this.course();
    if (!c) return;

    const updatedChapters = [...c.chapters];

    if (this.editingChapterIndex !== null) {
      // Update existing
      const existing = updatedChapters[this.editingChapterIndex];
      updatedChapters[this.editingChapterIndex] = {
        ...existing,
        title: this.chapterTitle.trim(),
        summary: this.chapterSummary.trim(),
        content: this.chapterContent.trim(),
        estimatedMinutes: this.chapterEstimatedMinutes,
        hasQuiz: this.chapterHasQuiz,
        quizTitle: this.chapterHasQuiz ? this.chapterQuizTitle.trim() : undefined,
        quizQuestionsCount: this.chapterHasQuiz ? this.chapterQuizCount : undefined
      };
    } else {
      // Add new
      const newCh: CourseChapter = {
        id: 'ch-' + Date.now(),
        order: updatedChapters.length + 1,
        title: this.chapterTitle.trim(),
        summary: this.chapterSummary.trim(),
        content: this.chapterContent.trim(),
        estimatedMinutes: this.chapterEstimatedMinutes,
        hasQuiz: this.chapterHasQuiz,
        quizTitle: this.chapterHasQuiz ? this.chapterQuizTitle.trim() : undefined,
        quizQuestionsCount: this.chapterHasQuiz ? this.chapterQuizCount : undefined
      };
      updatedChapters.push(newCh);
      this.selectedChapterIndex = updatedChapters.length - 1;
    }

    this.courseService.updateCourse(c.id, {
      chapters: updatedChapters,
      hasChapterQuizzes: updatedChapters.some(ch => ch.hasQuiz)
    });
    this.course.set(this.courseService.getCourseById(c.id) || null);
    this.showChapterModal = false;
  }

  deleteChapter(index: number): void {
    const c = this.course();
    if (!c || c.chapters.length <= 1) return;
    if (!confirm(`Confirmer la suppression du chapitre "${c.chapters[index].title}" ?`)) return;

    const updatedChapters = c.chapters
      .filter((_, idx) => idx !== index)
      .map((ch, idx) => ({ ...ch, order: idx + 1 }));

    this.courseService.updateCourse(c.id, {
      chapters: updatedChapters
    });
    this.course.set(this.courseService.getCourseById(c.id) || null);
    if (this.selectedChapterIndex >= updatedChapters.length) {
      this.selectedChapterIndex = updatedChapters.length - 1;
    }
  }

  // --- QUIZZES LIST & PREVIEW ---
  getAllQuizzes(): CourseQuizItem[] {
    const c = this.course();
    if (!c) return [];
    const list: CourseQuizItem[] = [];

    c.chapters.forEach(ch => {
      if (ch.hasQuiz) {
        list.push({
          id: `quiz-ch-${ch.id}`,
          title: ch.quizTitle || `Quiz ${ch.title}`,
          type: 'CHAPTER',
          chapterOrder: ch.order,
          chapterTitle: ch.title,
          questionsCount: ch.quizQuestionsCount || 5,
          difficulty: c.level,
          sampleQuestions: [
            {
              q: `Question 1 sur ${ch.title} : Quelle est la règle principale abordée dans ce chapitre ?`,
              a: 'Réponse A : La validation des contraintes et l\'isolation des dépendances.'
            },
            {
              q: `Question 2 : Quel piège d\'implémentation doit-on éviter absolument ?`,
              a: 'Réponse B : Ignorer la persistance et la gestion d\'erreurs.'
            }
          ]
        });
      }
    });

    if (c.hasFinalQuiz) {
      list.push({
        id: `quiz-final-${c.id}`,
        title: c.finalQuizTitle || `Examen Final de Validation : ${c.title}`,
        type: 'FINAL',
        questionsCount: c.finalQuizQuestionsCount || 10,
        difficulty: c.level,
        sampleQuestions: [
          {
            q: `Examen Final Q1 : Synthétisez l'ensemble des concepts architecturaux du cours "${c.title}".`,
            a: 'Validation globale des compétences et patterns abordés.'
          },
          {
            q: `Examen Final Q2 : Dans un cas réel en production, quelle décision technique s'impose ?`,
            a: 'Déploiement résilient avec monitoring continu.'
          }
        ]
      });
    }

    return list;
  }

  launchQuizItemLive(item: CourseQuizItem): void {
    const c = this.course();
    if (!c) return;

    if (item.type === 'FINAL') {
      this.launchFinalQuizLive(c);
    } else if (item.chapterOrder) {
      const ch = c.chapters.find(x => x.order === item.chapterOrder);
      if (ch) {
        this.launchChapterQuizLive(ch);
      }
    }
  }

  // --- CLASSES ASSIGNMENT ---
  isClassAssigned(c: Course, classId: string): boolean {
    return (c.assignedClassIds || []).includes(classId);
  }

  toggleAssignClass(c: Course, classId: string, className: string, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      this.courseService.assignCourseToClass(c.id, classId, className);
    } else {
      this.courseService.unassignCourseFromClass(c.id, classId);
    }
    this.course.set(this.courseService.getCourseById(c.id) || null);
  }

  formatContent(raw: string): string {
    if (!raw) return '';

    let formatted = raw;

    // Code blocks ```...```
    formatted = formatted.replace(/```([a-zA-Z]*)\n([\s\S]*?)```/gm, (match, lang, code) => {
      const language = lang ? lang.toUpperCase() : 'CODE';
      return `
        <div class="code-terminal-block">
          <div class="terminal-header">
            <div class="terminal-dots">
              <span class="dot dot-red"></span>
              <span class="dot dot-yellow"></span>
              <span class="dot dot-green"></span>
            </div>
            <span class="terminal-lang">${language}</span>
          </div>
          <pre><code>${this.escapeHtml(code.trim())}</code></pre>
        </div>
      `;
    });

    // Markdown headers
    formatted = formatted
      .replace(/^### (.*$)/gim, '<h3 class="doc-h3">$1</h3>')
      .replace(/^#### (.*$)/gim, '<h4 class="doc-h4">$1</h4>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      .replace(/`([^`]+)`/gim, '<code class="inline-code">$1</code>')
      .replace(/\n\n/gim, '<p></p>')
      .replace(/\n- (.*$)/gim, '<li class="doc-li">$1</li>');

    return formatted;
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private toQuizDifficulty(level?: string): 'EASY' | 'MEDIUM' | 'HARD' {
    if (level === 'BEGINNER' || level === 'EASY') return 'EASY';
    if (level === 'ADVANCED' || level === 'HARD') return 'HARD';
    return 'MEDIUM';
  }

  async launchChapterQuizLive(ch: CourseChapter) {
    const c = this.course();
    const createdQuiz = await this.quizService.createQuizAsync({
      title: ch.quizTitle || `Quiz ${ch.title}`,
      description: `Quiz de validation intermédiaire du ${ch.title}`,
      category: c?.category || 'Général',
      difficulty: this.toQuizDifficulty(c?.level),
      status: 'PUBLISHED',
      creatorId: 'u-1',
      creatorName: 'Professeur',
      shareCode: 'CHQ-' + Math.floor(1000 + Math.random() * 9000),
      questionsCount: ch.quizQuestionsCount || 5,
      coverImage: c?.coverImage || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80',
      questions: []
    });

    const sessionId = await this.liveService.launchLiveSession(createdQuiz);
    this.router.navigate(['/app/live/host', sessionId]);
  }

  async launchFinalQuizLive(c: Course) {
    const createdQuiz = await this.quizService.createQuizAsync({
      title: c.finalQuizTitle || `Examen Final : ${c.title}`,
      description: `Examen final de validation des compétences pour le cours "${c.title}"`,
      category: c.category,
      difficulty: this.toQuizDifficulty(c.level),
      status: 'PUBLISHED',
      creatorId: 'u-1',
      creatorName: 'Professeur',
      shareCode: 'EXAM-' + Math.floor(1000 + Math.random() * 9000),
      questionsCount: c.finalQuizQuestionsCount || 10,
      coverImage: c.coverImage,
      questions: []
    });

    const sessionId = await this.liveService.launchLiveSession(createdQuiz);
    this.router.navigate(['/app/live/host', sessionId]);
  }
}
