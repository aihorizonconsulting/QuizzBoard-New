import { Component, OnInit, inject, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { QuizService } from '../../../core/services/quiz.service';
import { CourseService } from '../../../core/services/course.service';
import { ClasseService } from '../../../core/services/classe.service';
import { AuthService } from '../../../core/services/auth.service';
import { FileUploadService } from '../../../core/services/file-upload.service';
import { Question, Choice } from '../../../core/models/quiz.model';
import { Course, CourseChapter } from '../../../core/models/course.model';
import { IconComponent } from '../../../shared/components/icon/icon.component';

export interface AttachedFile {
  name: string;
  size: string;
}

@Component({
  selector: 'app-quiz-create',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: './quiz-create.component.html',
  styleUrl: './quiz-create.component.scss'
})
export class QuizCreateComponent implements OnInit {
  private quizService = inject(QuizService);
  private courseService = inject(CourseService);
  private classeService = inject(ClasseService);
  public authService = inject(AuthService);
  private fileUploadService = inject(FileUploadService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('coverImageInput') coverImageInputRef!: ElementRef<HTMLInputElement>;

  // Studio Mode: Quiz or Full Structured Course
  studioMode: 'QUIZ' | 'COURSE' = 'QUIZ';
  creationMethod: 'AI' | 'MANUAL' = 'AI';
  editingQuizId: string | null = null;

  availableClasses = this.classeService.getClasses();

  promptText = '';
  attachedFile: AttachedFile | null = null;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' = 'MEDIUM';
  quizCategory = 'Cloud & DevOps';
  quizTitle = 'Évaluation Interactive';
  coverImageUrl = '';
  isUploadingImage = false;
  uploadImageError = '';

  // Quiz Options
  questionsCount = 5;
  timePerQuestion = 30;
  questions: Question[] = [];
  customExtraQuestionsCount = 2;

  // Course Options
  courseChaptersCount = 3;
  courseWithChapterQuizzes = true;
  courseWithFinalQuiz = true;
  selectedTargetClassId = '';
  selectedTargetClassName = '';
  generatedCourse: Course | null = null;
  activeCourseChapterTab = 0;

  // Course Certificate Options
  courseHasCertificate = true;
  courseCertificateTemplateType: 'DEFAULT' | 'CUSTOM' = 'DEFAULT';
  courseCertificateCustomTemplateUrl = '';
  courseCertificateMinScore = 80;
  showCertPreviewModal = false;
  uploadedCertificateFileName = '';

  // Thinking State
  isGenerating = false;
  thinkingProgress = 20;
  currentThinkingStep = 'Analyse du prompt...';
  openDropdown: 'count' | 'timer' | 'diff' | 'chapters' | 'class' | null = null;

  fieldErrors: Record<string, string> = {};

  clearFieldError(field: string): void {
    if (this.fieldErrors[field]) {
      const updated = { ...this.fieldErrors };
      delete updated[field];
      this.fieldErrors = updated;
    }
  }

  ngOnInit(): void {
    const mode = this.route.snapshot.queryParamMap.get('mode');
    if (mode === 'course' || mode === 'COURSES') {
      this.studioMode = 'COURSE';
    }

    const editId = this.route.snapshot.paramMap.get('id') || this.route.snapshot.queryParamMap.get('edit');
    if (editId) {
      const q = this.quizService.getQuizById(editId);
      if (q) {
        this.editingQuizId = q.id;
        this.quizTitle = q.title;
        this.quizCategory = q.category;
        this.difficulty = q.difficulty;
        this.coverImageUrl = q.coverImage || '';
        this.creationMethod = 'MANUAL';
        const qList = q.questions || [];
        this.questionsCount = qList.length || 5;
        this.timePerQuestion = qList[0]?.timeLimitSeconds || 30;
        this.questions = JSON.parse(JSON.stringify(qList));
        this.promptText = q.description || '';
      }
    }
  }

  setCreationMethod(method: 'AI' | 'MANUAL') {
    this.creationMethod = method;
    if (method === 'MANUAL') {
      if (this.questions.length === 0) {
        this.addQuestion();
      }
      if (!this.coverImageUrl) {
        this.coverImageUrl = this.suggestCoverImage(this.quizTitle, this.quizCategory);
      }
    }
  }

  async onCoverImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.isUploadingImage = true;
      this.uploadImageError = '';
      try {
        const url = await this.fileUploadService.uploadFileAndGetUrl(file, 'quizzes');
        if (url) {
          this.coverImageUrl = url;
        }
      } catch {
        this.uploadImageError = 'Erreur lors du téléversement vers Cloudinary. Veuillez réessayer.';
      } finally {
        this.isUploadingImage = false;
      }
    }
  }

  removeCoverImage() {
    this.coverImageUrl = '';
    this.uploadImageError = '';
    if (this.coverImageInputRef && this.coverImageInputRef.nativeElement) {
      this.coverImageInputRef.nativeElement.value = '';
    }
  }

  applyAiThematicImage() {
    this.coverImageUrl = this.suggestCoverImage(this.promptText || this.quizTitle, this.quizCategory);
  }

  suggestCoverImage(topic: string, category: string): string {
    const query = ((topic || '') + ' ' + (category || '')).toLowerCase();
    if (query.includes('docker') || query.includes('kubernetes') || query.includes('devops') || query.includes('cloud') || query.includes('linux')) {
      return 'https://images.unsplash.com/photo-1607799279861-4dd421887fb3?auto=format&fit=crop&w=1200&q=80';
    } else if (query.includes('ia') || query.includes('ai') || query.includes('intelligence') || query.includes('machine learning') || query.includes('deep learning')) {
      return 'https://images.unsplash.com/photo-1677442136019-21780efad99a?auto=format&fit=crop&w=1200&q=80';
    } else if (query.includes('python') || query.includes('data') || query.includes('sql') || query.includes('bdd') || query.includes('database')) {
      return 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80';
    } else if (query.includes('web') || query.includes('javascript') || query.includes('react') || query.includes('angular') || query.includes('frontend') || query.includes('html') || query.includes('css')) {
      return 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80';
    } else if (query.includes('securite') || query.includes('cyber') || query.includes('security') || query.includes('reseau')) {
      return 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80';
    } else if (query.includes('business') || query.includes('management') || query.includes('finance') || query.includes('marketing') || query.includes('projet')) {
      return 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80';
    } else if (query.includes('math') || query.includes('science') || query.includes('physique') || query.includes('chimie')) {
      return 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=1200&q=80';
    } else if (query.includes('sante') || query.includes('medecine') || query.includes('medical') || query.includes('biologie')) {
      return 'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?auto=format&fit=crop&w=1200&q=80';
    } else if (query.includes('droit') || query.includes('justice') || query.includes('juridique')) {
      return 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1200&q=80';
    } else if (query.includes('anglais') || query.includes('langue') || query.includes('francais') || query.includes('espagnol')) {
      return 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=1200&q=80';
    } else {
      return 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80';
    }
  }

  setStudioMode(mode: 'QUIZ' | 'COURSE') {
    this.studioMode = mode;
    this.resetAll();
  }

  toggleDropdown(name: 'count' | 'timer' | 'diff' | 'chapters' | 'class') {
    this.openDropdown = (this.openDropdown === name) ? null : name;
  }

  setCount(c: number) {
    this.questionsCount = Math.max(1, Math.min(100, c));
    this.openDropdown = null;
  }

  setChaptersCount(c: number) {
    this.courseChaptersCount = Math.max(1, Math.min(50, c));
    this.openDropdown = null;
  }

  setTime(t: number) {
    this.timePerQuestion = t;
    this.openDropdown = null;
  }

  setDifficulty(d: 'EASY' | 'MEDIUM' | 'HARD') {
    this.difficulty = d;
    this.openDropdown = null;
  }

  selectClass(classId: string, className: string) {
    this.selectedTargetClassId = classId;
    this.selectedTargetClassName = className;
    this.openDropdown = null;
  }

  clearClassSelection() {
    this.selectedTargetClassId = '';
    this.selectedTargetClassName = '';
    this.openDropdown = null;
  }

  difficultyLabel(d: string): string {
    switch (d) {
      case 'EASY': return 'Débutant';
      case 'MEDIUM': return 'Intermédiaire';
      case 'HARD': return 'Avancé';
      default: return 'Intermédiaire';
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      this.attachedFile = {
        name: file.name,
        size: `${sizeMb} Mo`
      };
      if (!this.promptText.trim()) {
        if (this.studioMode === 'QUIZ') {
          this.promptText = `Génère un quiz de ${this.questionsCount} questions calibré à partir du support joint "${file.name}".`;
        } else {
          this.promptText = `Conçois un cours complet structuré en ${this.courseChaptersCount} chapitres à partir du support joint "${file.name}".`;
        }
      }
    }
  }

  removeAttachedFile() {
    this.attachedFile = null;
    if (this.fileInputRef && this.fileInputRef.nativeElement) {
      this.fileInputRef.nativeElement.value = '';
    }
  }

  useSuggestion(prompt: string, category: string) {
    this.promptText = prompt;
    this.quizCategory = category;
    this.generate();
  }

  generate() {
    this.clearFieldError('prompt');
    if (!this.promptText.trim() && !this.attachedFile) {
      this.fieldErrors['prompt'] = 'Veuillez décrire le sujet souhaité ou joindre un fichier de cours avant de lancer la génération.';
      return;
    }

    this.isGenerating = true;
    this.thinkingProgress = 25;

    if (this.studioMode === 'COURSE') {
      this.currentThinkingStep = 'QuizzMind structure l\'architecture des chapitres...';

      setTimeout(() => {
        this.thinkingProgress = 60;
        this.currentThinkingStep = 'Rédaction des contenus théoriques, synthèses et notions clés...';
      }, 500);

      setTimeout(() => {
        this.thinkingProgress = 85;
        this.currentThinkingStep = 'Conception des quiz de chapitres et de l\'examen final...';
      }, 1000);

      const fullPrompt = this.attachedFile 
        ? `${this.promptText} (Support de cours: ${this.attachedFile.name})` 
        : this.promptText;

      setTimeout(async () => {
        try {
          const createdCourse = await this.courseService.generateCourseWithAi({
            topic: fullPrompt,
            chaptersCount: this.courseChaptersCount,
            withChapterQuizzes: this.courseWithChapterQuizzes,
            withFinalQuiz: this.courseWithFinalQuiz,
            level: this.difficulty,
            category: this.quizCategory,
            targetClassId: this.selectedTargetClassId || undefined,
            targetClassName: this.selectedTargetClassName || undefined,
            hasCertificate: this.courseHasCertificate,
            certificateTemplateType: this.courseCertificateTemplateType,
            certificateCustomTemplateUrl: this.courseCertificateCustomTemplateUrl || undefined,
            certificateMinimumScore: this.courseCertificateMinScore
          });
          if (createdCourse) {
            if (createdCourse.chapters) {
              createdCourse.chapters = createdCourse.chapters.map((ch, idx) => ({
                ...ch,
                id: ch.id || `gen-ch-${Date.now()}-${idx + 1}`,
                order: ch.order || (idx + 1)
              }));
            }
            this.generatedCourse = createdCourse;
            this.activeCourseChapterTab = 0;
            this.thinkingProgress = 100;
          }
        } catch (err) {
          console.error('Erreur génération cours IA:', err);
          this.fieldErrors['prompt'] = 'Une erreur est survenue lors de la génération du cours. Veuillez réessayer.';
        } finally {
          this.isGenerating = false;
          this.cdr.markForCheck();
        }
      }, 1500);

    } else {
      // QUIZ MODE
      this.currentThinkingStep = 'QuizzMind analyse vos objectifs pédagogiques...';

      setTimeout(() => {
        this.thinkingProgress = 60;
        this.currentThinkingStep = 'Formulation des questions pertinentes et des pièges éducatifs...';
      }, 500);

      setTimeout(() => {
        this.thinkingProgress = 85;
        this.currentThinkingStep = 'Calibrage des explications et du chronomètre...';
      }, 1000);

      const fullPrompt = this.attachedFile 
        ? `${this.promptText} (Support de cours: ${this.attachedFile.name})` 
        : this.promptText;

      setTimeout(async () => {
        try {
          const res = await this.quizService.generateQuizWithAiPrompt(fullPrompt, this.questionsCount);
          const rawQuestions = Array.isArray(res) ? res : [];
          this.questions = rawQuestions.map((q, idx) => {
            const qId = q.id || `ai-q-${Date.now()}-${idx + 1}`;
            const choices = (q.choices || []).map((c: any, cIdx: number) => ({
              ...c,
              id: c.id || `c-ai-${Date.now()}-${idx + 1}-${cIdx + 1}`,
              text: c.text || `Option ${cIdx + 1}`,
              isCorrect: c.isCorrect === true || c.correct === true,
              order: c.order || (cIdx + 1)
            }));
            if (choices.length > 0 && !choices.some(c => c.isCorrect)) {
              choices[0].isCorrect = true;
            }
            return {
              ...q,
              id: qId,
              text: q.text || `Question ${idx + 1}`,
              type: q.type || 'SINGLE_CHOICE',
              timeLimitSeconds: this.timePerQuestion || 20,
              points: 100,
              explanation: q.explanation || `Explication pédagogique pour la question ${idx + 1}.`,
              order: idx + 1,
              choices
            };
          });

          const words = this.promptText.split(' ').slice(0, 6).join(' ');
          this.quizTitle = `Quiz : ${words || 'Évaluation Interactive'}`;
          if (!this.coverImageUrl) {
            this.coverImageUrl = this.suggestCoverImage(fullPrompt, this.quizCategory);
          }

          this.thinkingProgress = 100;
        } catch (err) {
          console.error('Erreur génération quiz IA:', err);
          this.fieldErrors['prompt'] = 'Une erreur est survenue lors de la génération du quiz. Veuillez réessayer.';
        } finally {
          this.isGenerating = false;
          this.cdr.markForCheck();
        }
      }, 1400);
    }
  }


  addExtraQuestions(count: number = 1) {
    const qty = Math.max(1, count || 1);
    for (let i = 0; i < qty; i++) {
      const idx = this.questions.length + 1;
      const extraQ: Question = {
        id: 'ai-extra-' + Date.now() + '-' + i,
        text: `Question complémentaire ${idx} sur "${this.promptText.slice(0, 35)}..."`,
        type: 'SINGLE_CHOICE',
        timeLimitSeconds: this.timePerQuestion,
        points: 100,
        explanation: 'Explication pédagogique pour les apprenants.',
        choices: [
          { id: 'c1', text: 'Option A (Bonne réponse)', isCorrect: true, order: 1 },
          { id: 'c2', text: 'Option B', isCorrect: false, order: 2 },
          { id: 'c3', text: 'Option C', isCorrect: false, order: 3 },
          { id: 'c4', text: 'Option D', isCorrect: false, order: 4 }
        ],
        order: idx
      };
      this.questions.push(extraQ);
    }
  }

  addRefinement(action: string) {
    switch (action) {
      case 'add-questions':
        this.addExtraQuestions(this.customExtraQuestionsCount || 2);
        break;
      case 'harder':
        this.difficulty = 'HARD';
        this.questions.forEach(q => {
          q.points = 150;
          q.explanation = `[Niveau Avancé] ${q.explanation}`;
        });
        break;
      case 'timer-20':
        this.timePerQuestion = 20;
        this.questions.forEach(q => q.timeLimitSeconds = 20);
        break;
      case 'regenerate':
        this.generate();
        break;
    }
  }

  setCorrectChoice(q: Question, choiceIndex: number) {
    q.choices.forEach((c, idx) => {
      c.isCorrect = (idx === choiceIndex);
    });
  }

  removeQuestion(index: number) {
    this.questions.splice(index, 1);
  }

  addQuestion() {
    const newQ: Question = {
      id: 'custom-q-' + Date.now(),
      text: 'Nouvelle question rédigée...',
      type: 'SINGLE_CHOICE',
      timeLimitSeconds: this.timePerQuestion,
      points: 100,
      explanation: 'Explication pédagogique pour les apprenants...',
      choices: [
        { id: 'c1', text: 'Option A (Bonne réponse)', isCorrect: true, order: 1 },
        { id: 'c2', text: 'Option B', isCorrect: false, order: 2 },
        { id: 'c3', text: 'Option C', isCorrect: false, order: 3 },
        { id: 'c4', text: 'Option D', isCorrect: false, order: 4 }
      ],
      order: this.questions.length + 1
    };
    this.questions.push(newQ);
  }

  onCertificateFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.uploadedCertificateFileName = file.name;
      const reader = new FileReader();
      reader.onload = (e) => {
        this.courseCertificateCustomTemplateUrl = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  removeCustomCertificateTemplate(): void {
    this.courseCertificateCustomTemplateUrl = '';
    this.uploadedCertificateFileName = '';
    this.courseCertificateTemplateType = 'DEFAULT';
  }

  resetAll() {
    this.questions = [];
    this.generatedCourse = null;
    this.promptText = '';
    this.attachedFile = null;
    this.editingQuizId = null;
    this.coverImageUrl = '';
    this.courseHasCertificate = true;
    this.courseCertificateTemplateType = 'DEFAULT';
    this.courseCertificateCustomTemplateUrl = '';
    this.uploadedCertificateFileName = '';
    this.showCertPreviewModal = false;
  }

  saveQuiz() {
    this.clearFieldError('title');
    if (!this.quizTitle.trim()) {
      this.fieldErrors['title'] = 'Le titre du quiz est obligatoire pour enregistrer.';
      return;
    }

    if (this.questions.length === 0) {
      this.fieldErrors['title'] = 'Veuillez ajouter au moins une question à votre quiz.';
      return;
    }

    const finalCoverImage = this.coverImageUrl || this.suggestCoverImage(this.promptText || this.quizTitle, this.quizCategory);
    const currentUser = this.authService.currentUser();
    const creatorId = currentUser?.id || currentUser?.email || 'formateur';
    const creatorName = currentUser ? `${currentUser.prenom} ${currentUser.nom}`.trim() : 'Formateur QuizzBoard';

    if (this.editingQuizId) {
      this.quizService.updateQuiz(this.editingQuizId, {
        title: this.quizTitle,
        category: this.quizCategory,
        difficulty: this.difficulty,
        coverImage: finalCoverImage,
        questionsCount: this.questions.length,
        questions: this.questions
      });
      this.router.navigate(['/app/quizzes']);
      return;
    }

    this.quizService.createQuiz({
      title: this.quizTitle,
      description: this.promptText ? `Quiz créé sur le thème : "${this.promptText.slice(0, 80)}"` : `Évaluation interactive en ${this.quizCategory}`,
      category: this.quizCategory,
      difficulty: this.difficulty,
      status: 'PUBLISHED',
      creatorId: creatorId,
      creatorName: creatorName,
      shareCode: 'QM-' + Math.floor(1000 + Math.random() * 9000),
      questionsCount: this.questions.length,
      coverImage: finalCoverImage,
      questions: this.questions
    });

    this.router.navigate(['/app/quizzes']);
  }

  launchLiveNow() {
    const finalCoverImage = this.coverImageUrl || this.suggestCoverImage(this.promptText || this.quizTitle, this.quizCategory);
    const currentUser = this.authService.currentUser();
    const creatorId = currentUser?.id || currentUser?.email || 'formateur';
    const creatorName = currentUser ? `${currentUser.prenom} ${currentUser.nom}`.trim() : 'Formateur QuizzBoard';

    const created = this.quizService.createQuiz({
      title: this.quizTitle,
      description: `Session live animée avec QuizzMind`,
      category: this.quizCategory,
      difficulty: this.difficulty,
      status: 'PUBLISHED',
      creatorId: creatorId,
      creatorName: creatorName,
      shareCode: 'QM-' + Math.floor(1000 + Math.random() * 9000),
      questionsCount: this.questions.length,
      coverImage: finalCoverImage,
      questions: this.questions
    });

    this.quizService.startLiveSession(created);
    this.router.navigate(['/app/live/host']);
  }

  goToGeneratedCourse() {
    if (this.generatedCourse) {
      this.router.navigate(['/app/courses', this.generatedCourse.id]);
    } else {
      this.router.navigate(['/app/courses']);
    }
  }
}
