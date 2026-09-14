import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CourseService } from '../../../core/services/course.service';
import { ClasseService } from '../../../core/services/classe.service';
import { Course, CourseChapter, CourseLevel } from '../../../core/models/course.model';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { PromotionService } from '../../../core/services/promotion.service';
import { FileUploadService } from '../../../core/services/file-upload.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-course-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, IconComponent, PaginationComponent],
  templateUrl: './course-list.component.html',
  styleUrl: './course-list.component.scss'
})
export class CourseListComponent {
  private courseService = inject(CourseService);
  private classeService = inject(ClasseService);
  public confirmService = inject(ConfirmDialogService);
  public promotionService = inject(PromotionService);
  private fileUploadService = inject(FileUploadService);
  private authService = inject(AuthService);

  courses = this.courseService.getCourses();
  availableClasses = this.classeService.getClasses();

  searchQuery = '';
  selectedLevel: 'ALL' | 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' = 'ALL';
  filterCertifiedOnly = false;
  viewMode: 'grid' | 'list' = 'grid';
  isFilterLoading = false;

  // Manual Course Modal State
  showManualCourseModal = false;
  isSavingManualCourse = false;
  isUploadingCourseCover = false;
  uploadCourseCoverError = '';
  manualCourseTitle = '';
  manualCourseDesc = '';
  manualCourseCategory = 'Développement Web';
  manualCourseLevel: CourseLevel = 'INTERMEDIATE';
  manualCourseCoverImage = '';
  manualCourseEstimatedHours = 4;
  manualCourseHasCertificate = true;
  manualCourseCertMinScore = 80;
  manualCourseChapters: { title: string; summary: string; content: string; estimatedMinutes: number }[] = [];
  activeChapterIndex = 0;
  manualFieldErrors: Record<string, string> = {};
  get isLoading(): boolean {
    return this.courseService.isLoading() || this.isFilterLoading;
  }

  currentPage = 1;
  pageSize = 6;

  modalCourse: Course | null = null;

  filteredCourses(): Course[] {
    let list = this.courses();

    if (this.selectedLevel !== 'ALL') {
      list = list.filter(c => c.level === this.selectedLevel);
    }

    if (this.filterCertifiedOnly) {
      list = list.filter(c => c.hasCertificate);
    }

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(c =>
        c.title.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q)
      );
    }

    return list;
  }

  paginatedCourses(): Course[] {
    const list = this.filteredCourses();
    const startIndex = (this.currentPage - 1) * this.pageSize;
    return list.slice(startIndex, startIndex + this.pageSize);
  }

  onFilterChange() {
    this.currentPage = 1;
    this.isFilterLoading = true;
    setTimeout(() => {
      this.isFilterLoading = false;
    }, 200);
  }

  levelLabel(level: string): string {
    switch (level) {
      case 'BEGINNER': return 'Débutant';
      case 'INTERMEDIATE': return 'Intermédiaire';
      case 'ADVANCED': return 'Avancé';
      default: return 'Intermédiaire';
    }
  }

  async deleteCourse(id: string) {
    const ok = await this.confirmService.confirm({
      title: 'Supprimer le cours',
      message: 'Voulez-vous vraiment supprimer définitivement ce cours ?',
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      variant: 'danger',
      icon: 'trash'
    });
    if (!ok) return;
    this.courseService.deleteCourse(id);
  }

  openAssignModal(course: Course) {
    this.modalCourse = course;
  }

  closeAssignModal() {
    this.modalCourse = null;
  }

  isClassAssigned(classId: string): boolean {
    if (!this.modalCourse) return false;
    return (this.modalCourse.assignedClassIds || []).includes(classId);
  }

  toggleAssignClass(classId: string, className: string, event: Event) {
    if (!this.modalCourse) return;
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      this.courseService.assignCourseToClass(this.modalCourse.id, classId, className);
    } else {
      this.courseService.unassignCourseFromClass(this.modalCourse.id, classId);
    }
    // Update local modal ref
    this.modalCourse = this.courseService.getCourseById(this.modalCourse.id) || null;
  }

  // ==========================================
  // CRÉATION MANUELLE DE COURS & CLOUDINARY
  // ==========================================
  openManualCourseModal() {
    this.manualCourseTitle = '';
    this.manualCourseDesc = '';
    this.manualCourseCategory = 'Développement Web';
    this.manualCourseLevel = 'INTERMEDIATE';
    this.manualCourseEstimatedHours = 4;
    this.manualCourseHasCertificate = true;
    this.manualCourseCertMinScore = 80;
    this.uploadCourseCoverError = '';
    this.manualFieldErrors = {};
    this.manualCourseChapters = [
      {
        title: 'Introduction et Notions Fondamentales',
        summary: 'Présentation générale des concepts clés et des prérequis essentiels.',
        content: '1. Présentation générale et contexte\n2. Notions clés indispensables\n3. Cas pratiques et mise en application',
        estimatedMinutes: 30
      }
    ];
    this.activeChapterIndex = 0;
    this.manualCourseCoverImage = this.suggestCourseCover('Développement Web', 'Développement Web');
    this.showManualCourseModal = true;
  }

  closeManualCourseModal() {
    this.showManualCourseModal = false;
  }

  clearManualFieldError(field: string): void {
    if (this.manualFieldErrors[field]) {
      const updated = { ...this.manualFieldErrors };
      delete updated[field];
      this.manualFieldErrors = updated;
    }
  }

  suggestCourseCover(topic: string, category: string): string {
    const query = ((topic || '') + ' ' + (category || '')).toLowerCase();
    if (query.includes('docker') || query.includes('kubernetes') || query.includes('devops') || query.includes('cloud') || query.includes('linux')) {
      return 'https://images.unsplash.com/photo-1607799279861-4dd421887fb3?auto=format&fit=crop&w=1200&q=80';
    } else if (query.includes('ia') || query.includes('ai') || query.includes('intelligence') || query.includes('machine learning') || query.includes('deep learning')) {
      return 'https://images.unsplash.com/photo-1677442136019-21780efad99a?auto=format&fit=crop&w=1200&q=80';
    } else if (query.includes('python') || query.includes('data') || query.includes('sql') || query.includes('database')) {
      return 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80';
    } else if (query.includes('web') || query.includes('javascript') || query.includes('react') || query.includes('angular') || query.includes('frontend')) {
      return 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80';
    } else if (query.includes('securite') || query.includes('cyber') || query.includes('security') || query.includes('reseau')) {
      return 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80';
    } else if (query.includes('business') || query.includes('management') || query.includes('finance') || query.includes('marketing') || query.includes('agile')) {
      return 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80';
    } else if (query.includes('design') || query.includes('ui') || query.includes('ux') || query.includes('figma')) {
      return 'https://images.unsplash.com/photo-1581291518655-9523c932edcf?auto=format&fit=crop&w=1200&q=80';
    } else {
      return 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80';
    }
  }

  applyAiThematicCourseCover() {
    this.manualCourseCoverImage = this.suggestCourseCover(this.manualCourseTitle || this.manualCourseCategory, this.manualCourseCategory);
  }

  async onCourseCoverSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.isUploadingCourseCover = true;
      this.uploadCourseCoverError = '';
      try {
        const url = await this.fileUploadService.uploadFileAndGetUrl(file, 'courses');
        if (url) {
          this.manualCourseCoverImage = url;
        }
      } catch {
        this.uploadCourseCoverError = 'Erreur lors du téléversement sur Cloudinary. Veuillez réessayer.';
      } finally {
        this.isUploadingCourseCover = false;
      }
    }
  }

  removeCourseCover() {
    this.manualCourseCoverImage = '';
    this.uploadCourseCoverError = '';
  }

  addManualChapter() {
    const nextOrder = this.manualCourseChapters.length + 1;
    this.manualCourseChapters.push({
      title: `Chapitre ${nextOrder} : Titre du chapitre`,
      summary: 'Objectifs et points abordés dans ce chapitre.',
      content: 'Contenu détaillé du chapitre...',
      estimatedMinutes: 30
    });
    this.activeChapterIndex = this.manualCourseChapters.length - 1;
  }

  removeManualChapter(index: number) {
    if (this.manualCourseChapters.length <= 1) return;
    this.manualCourseChapters.splice(index, 1);
    this.activeChapterIndex = Math.max(0, this.activeChapterIndex - 1);
  }

  saveManualCourse() {
    this.manualFieldErrors = {};
    if (!this.manualCourseTitle.trim()) {
      this.manualFieldErrors['title'] = 'Le titre du cours est obligatoire.';
    }
    if (!this.manualCourseDesc.trim()) {
      this.manualFieldErrors['desc'] = 'La description du syllabus est obligatoire.';
    }
    if (this.manualCourseChapters.length === 0) {
      this.manualFieldErrors['chapters'] = 'Veuillez renseigner au moins un chapitre.';
    }

    if (Object.keys(this.manualFieldErrors).length > 0) {
      return;
    }

    const currentUser = this.authService.currentUser();
    const creatorId = currentUser?.id || currentUser?.email || 'formateur';
    const creatorName = currentUser ? `${currentUser.prenom} ${currentUser.nom}`.trim() : 'Formateur QuizzBoard';

    const finalCover = this.manualCourseCoverImage || this.suggestCourseCover(this.manualCourseTitle, this.manualCourseCategory);

    const formattedChapters: CourseChapter[] = this.manualCourseChapters.map((ch, idx) => ({
      id: `ch-${Date.now()}-${idx + 1}`,
      order: idx + 1,
      title: ch.title.trim() || `Chapitre ${idx + 1}`,
      summary: ch.summary.trim() || 'Points clés du chapitre',
      content: ch.content.trim() || 'Contenu théorique et exercices pratiques.',
      estimatedMinutes: ch.estimatedMinutes || 30,
      hasQuiz: true,
      quizTitle: `Quiz de validation - ${ch.title}`,
      quizQuestionsCount: 5
    }));

    this.isSavingManualCourse = true;
    try {
      this.courseService.createCourse({
        title: this.manualCourseTitle.trim(),
        description: this.manualCourseDesc.trim(),
        category: this.manualCourseCategory,
        level: this.manualCourseLevel,
        coverImage: finalCover,
        creatorId: creatorId,
        creatorName: creatorName,
        estimatedHours: this.manualCourseEstimatedHours || 4,
        status: 'PUBLISHED',
        assignedClassIds: [],
        assignedClassNames: [],
        hasChapterQuizzes: true,
        hasFinalQuiz: true,
        finalQuizTitle: `Examen Final Certifiant - ${this.manualCourseTitle}`,
        finalQuizQuestionsCount: 15,
        hasCertificate: this.manualCourseHasCertificate,
        certificateTemplateType: 'DEFAULT',
        certificateMinimumScore: this.manualCourseCertMinScore || 80,
        chapters: formattedChapters
      });

      this.closeManualCourseModal();
    } finally {
      this.isSavingManualCourse = false;
    }
  }
}
