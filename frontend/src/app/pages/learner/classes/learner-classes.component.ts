import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ClasseService } from '../../../core/services/classe.service';
import { QuizService } from '../../../core/services/quiz.service';
import { CourseService } from '../../../core/services/course.service';
import { AuthService } from '../../../core/services/auth.service';
import { Classe } from '../../../core/models/classe.model';
import { Quiz } from '../../../core/models/quiz.model';
import { Course } from '../../../core/models/course.model';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { QuizModalPlayerComponent } from '../../../shared/components/quiz-modal-player/quiz-modal-player.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-learner-classes',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, IconComponent, QuizModalPlayerComponent, PaginationComponent],
  template: `
    <div class="learner-classes-page">
      <!-- =========================================================================
           VUE 1 : ANNUAIRE DES CLASSES DE L'APPRENANT
           ========================================================================= -->
      @if (!selectedClass) {
        <div class="page-header">
          <div>
            <h1 class="h1">Mes Classes & Formations</h1>
            <p class="body-small">Retrouvez vos cohortes, consultez les cours, chapitres et passez les évaluations assignées.</p>
          </div>

          <button class="btn btn-primary btn-sm" (click)="openJoinModal()">
            <app-icon name="plus" [size]="14" color="var(--color-navy)"></app-icon>
            <span>Rejoindre une Classe</span>
          </button>
        </div>

        <!-- UNIFIED COMPACT TOOLBAR -->
        <div class="filter-toolbar card">
          <div class="search-box">
            <app-icon name="search" [size]="16" color="var(--color-text-secondary)"></app-icon>
            <input 
              type="text" 
              [(ngModel)]="searchQuery" 
              (ngModelChange)="currentPage = 1"
              placeholder="Rechercher une classe, un code ou une matière..." 
              class="search-input">
            @if (searchQuery) {
              <button class="clear-btn" (click)="searchQuery = ''; currentPage = 1">✕</button>
            }
          </div>

          <div class="filter-pills">
            <button 
              type="button" 
              class="pill-btn" 
              [class.active]="filterLevel === 'ALL'" 
              (click)="filterLevel = 'ALL'; currentPage = 1">
              Toutes ({{ enrolledClasses().length }})
            </button>
            <button 
              type="button" 
              class="pill-btn" 
              [class.active]="filterLevel === 'LICENCE'" 
              (click)="filterLevel = 'LICENCE'; currentPage = 1">
              Licence
            </button>
            <button 
              type="button" 
              class="pill-btn" 
              [class.active]="filterLevel === 'MASTER'" 
              (click)="filterLevel = 'MASTER'; currentPage = 1">
              Master
            </button>
          </div>

          <div class="view-toggle-group">
            <button 
              type="button" 
              class="toggle-btn" 
              [class.active]="viewMode === 'grid'" 
              (click)="viewMode = 'grid'" 
              title="Grille">
              <app-icon name="grid" [size]="15"></app-icon>
            </button>
            <button 
              type="button" 
              class="toggle-btn" 
              [class.active]="viewMode === 'list'" 
              (click)="viewMode = 'list'" 
              title="Liste">
              <app-icon name="list" [size]="15"></app-icon>
            </button>
          </div>
        </div>

        @if (filteredClasses().length === 0) {
          <div class="empty-state-box card">
            <div class="empty-icon-wrap">
              <app-icon name="school" [size]="28" color="var(--color-navy)"></app-icon>
            </div>
            <h3 class="empty-title">Aucune classe pour le moment</h3>
            <p class="empty-desc">
              Rejoignez votre première classe à l'aide du code d'invitation communiqué par votre professeur.
            </p>
            <button class="btn btn-primary btn-sm" (click)="openJoinModal()">
              <app-icon name="plus" [size]="14" color="var(--color-navy)"></app-icon>
              <span>Entrer un Code Classe</span>
            </button>
          </div>
        } @else {
          <!-- GRID VIEW -->
          @if (viewMode === 'grid') {
            <div class="classes-grid">
              @for (c of paginatedClasses(); track c.id) {
                <div class="class-card card card-interactive" (click)="openClass(c)">
                  <div class="card-main-row">
                    <div class="class-icon-thumb">
                      <app-icon name="school" [size]="20" color="var(--color-navy)"></app-icon>
                    </div>

                    <div class="class-info">
                      <div class="tags-row">
                        <span class="level-pill">{{ c.level }}</span>
                        @if (c.promotionLabel) {
                          <span class="promo-tag">{{ c.promotionLabel }}</span>
                        }
                        <span class="code-txt">#{{ c.code }}</span>
                      </div>

                      <h3 class="class-title">{{ c.name }}</h3>

                      <div class="class-meta-row">
                        <span class="teacher-lbl">
                          <app-icon name="user" [size]="12"></app-icon>
                          {{ c.creatorName || 'Professeur' }}
                        </span>
                        <span>•</span>
                        <span><strong>{{ c.assignedQuizIds.length }}</strong> quiz</span>
                      </div>
                    </div>
                  </div>

                  <div class="card-action-bar">
                    <button class="btn btn-primary btn-sm btn-full" (click)="openClass(c); $event.stopPropagation()">
                      <span>Accéder aux Ressources</span>
                      <app-icon name="arrow-right" [size]="13" color="var(--color-navy)"></app-icon>
                    </button>
                  </div>
                </div>
              }
            </div>
          } @else {
            <!-- LIST VIEW -->
            <div class="classes-list">
              @for (c of paginatedClasses(); track c.id) {
                <div class="class-row card card-interactive" (click)="openClass(c)">
                  <div class="row-icon">
                    <app-icon name="school" [size]="18" color="var(--color-navy)"></app-icon>
                  </div>

                  <div class="row-main-info">
                    <div class="row-top-tags">
                      <span class="level-pill">{{ c.level }}</span>
                      @if (c.promotionLabel) {
                        <span class="promo-tag">{{ c.promotionLabel }}</span>
                      }
                      <span class="code-txt">#{{ c.code }}</span>
                    </div>
                    <h3 class="row-title">{{ c.name }}</h3>
                    <span class="body-small text-muted">{{ c.creatorName || 'Professeur' }}</span>
                  </div>

                  <div class="row-stats">
                    <div class="stat-item">
                      <span class="stat-num">{{ c.assignedQuizIds.length }}</span>
                      <span class="stat-label">Quiz</span>
                    </div>
                  </div>

                  <div class="row-actions" (click)="$event.stopPropagation()">
                    <button class="btn btn-primary btn-sm" (click)="openClass(c)">
                      <span>Accéder</span>
                      <app-icon name="arrow-right" [size]="13" color="var(--color-navy)"></app-icon>
                    </button>
                  </div>
                </div>
              }
            </div>
          }

          <!-- SHARED PAGINATION COMPONENT -->
          <app-pagination 
            [currentPage]="currentPage" 
            [pageSize]="pageSize" 
            [totalItems]="filteredClasses().length" 
            (pageChange)="currentPage = $event">
          </app-pagination>
        }
      }

      <!-- =========================================================================
           VUE 2 : ESPACE DÉTAILLÉ DE LA CLASSE & RESSOURCES
           ========================================================================= -->
      @if (selectedClass) {
        <div class="class-detail-view animate-fade-in">
          <!-- Back Header -->
          <div class="detail-header-row">
            <button class="btn btn-outline btn-sm btn-back" (click)="selectedClass = null">
              <app-icon name="arrow-right" [size]="13" style="transform: rotate(180deg);"></app-icon>
              <span>Retour à mes classes</span>
            </button>
          </div>

          <!-- Class Banner Card -->
          <div class="class-hero-card card">
            <div class="hero-left">
              <div class="hero-tags">
                <span class="level-pill">{{ selectedClass.level }}</span>
                @if (selectedClass.promotionLabel) {
                  <span class="promo-tag">{{ selectedClass.promotionLabel }}</span>
                }
                <span class="code-txt">Code : {{ selectedClass.code }}</span>
              </div>

              <h1 class="h1" style="margin: 8px 0 4px 0;">{{ selectedClass.name }}</h1>
              <p class="body-small" style="margin: 0;">
                Enseignant référent : <strong>{{ selectedClass.creatorName || 'Professeur' }}</strong>
                @if (selectedClass.description) {
                  • {{ selectedClass.description }}
                }
              </p>
            </div>

            <div class="hero-stats">
              <div class="hero-stat-box">
                <span class="stat-val">{{ getAssignedCourses().length }}</span>
                <span class="stat-lbl">Cours & Leçons</span>
              </div>
              <div class="hero-stat-box">
                <span class="stat-val">{{ getAssignedQuizzes().length }}</span>
                <span class="stat-lbl">Quiz Assignés</span>
              </div>
              <div class="hero-stat-box">
                <span class="stat-val">{{ selectedClass.students.length }}</span>
                <span class="stat-lbl">Camarades</span>
              </div>
            </div>
          </div>

          <!-- TABS BAR -->
          <div class="class-tabs-bar">
            <button 
              type="button" 
              class="tab-btn" 
              [class.active]="activeTab === 'COURSES'"
              (click)="activeTab = 'COURSES'">
              <app-icon name="book-open" [size]="15"></app-icon>
              <span>Cours & Parcours ({{ getAssignedCourses().length }})</span>
            </button>

            <button 
              type="button" 
              class="tab-btn" 
              [class.active]="activeTab === 'QUIZZES'"
              (click)="activeTab = 'QUIZZES'">
              <app-icon name="help-circle" [size]="15"></app-icon>
              <span>Quiz & Évaluations ({{ getAssignedQuizzes().length }})</span>
            </button>

            <button 
              type="button" 
              class="tab-btn" 
              [class.active]="activeTab === 'PEOPLE'"
              (click)="activeTab = 'PEOPLE'">
              <app-icon name="users" [size]="15"></app-icon>
              <span>Membres & Promotion ({{ selectedClass.students.length }})</span>
            </button>
          </div>

          <!-- TAB CONTENT 1: ASSIGNED COURSES -->
          @if (activeTab === 'COURSES') {
            @if (getAssignedCourses().length === 0) {
              <div class="empty-tab-box card">
                <app-icon name="book-open" [size]="28" color="var(--color-text-secondary)"></app-icon>
                <h4 class="h3">Aucun cours assigné</h4>
                <p class="body-small">Votre professeur n'a pas encore assigné de cours à cette classe.</p>
              </div>
            } @else {
              <div class="courses-grid">
                @for (crs of getAssignedCourses(); track crs.id) {
                  <div class="course-card card card-interactive" [routerLink]="['/app/courses', crs.id]">
                    <div class="course-cover" [style.backgroundImage]="'url(' + crs.coverImage + ')'">
                      <span class="category-chip">{{ crs.category }}</span>
                      <span class="level-chip">{{ levelLabel(crs.level) }}</span>
                    </div>

                    <div class="course-body">
                      <h3 class="course-title">{{ crs.title }}</h3>
                      <p class="course-desc">{{ crs.description }}</p>

                      <div class="course-meta">
                        <span>
                          <app-icon name="book-open" [size]="13"></app-icon>
                          {{ crs.chapters.length }} chapitres
                        </span>
                        <span>•</span>
                        <span>
                          <app-icon name="clock" [size]="13"></app-icon>
                          ~{{ crs.estimatedHours }}h
                        </span>
                      </div>

                      <div class="progress-section">
                        <div class="progress-labels">
                          <span>Progression</span>
                          <strong>0%</strong>
                        </div>
                        <div class="progress-bar-thin">
                          <div class="bar-fill" style="width: 0%;"></div>
                        </div>
                      </div>

                      <div class="course-action">
                        <a [routerLink]="['/app/courses', crs.id]" class="btn btn-primary btn-sm btn-full" (click)="$event.stopPropagation()">
                          <app-icon name="play" [size]="13" color="var(--color-navy)"></app-icon>
                          <span>Suivre le Cours</span>
                        </a>
                      </div>
                    </div>
                  </div>
                }
              </div>
            }
          }

          <!-- TAB CONTENT 2: ASSIGNED QUIZZES -->
          @if (activeTab === 'QUIZZES') {
            @if (getAssignedQuizzes().length === 0) {
              <div class="empty-tab-box card">
                <app-icon name="help-circle" [size]="28" color="var(--color-text-secondary)"></app-icon>
                <h4 class="h3">Aucune évaluation assignée</h4>
                <p class="body-small">Tous les quiz de cette classe sont à jour.</p>
              </div>
            } @else {
              <div class="quizzes-grid">
                @for (q of getAssignedQuizzes(); track q.id) {
                  <div class="quiz-card card card-interactive" (click)="activeTestQuiz = q">
                    <div class="quiz-cover" [style.backgroundImage]="'url(' + q.coverImage + ')'">
                      <span class="category-chip">{{ q.category }}</span>
                      <span class="difficulty-chip">
                        {{ q.difficulty === 'EASY' ? 'Débutant' : (q.difficulty === 'HARD' ? 'Avancé' : 'Intermédiaire') }}
                      </span>
                    </div>

                    <div class="quiz-body">
                      <h3 class="quiz-title">{{ q.title }}</h3>
                      <p class="quiz-desc">{{ q.description }}</p>

                      <div class="quiz-meta-row">
                        <span><strong>{{ q.questionsCount }}</strong> questions</span>
                        <span>•</span>
                        <span>Moyenne: <strong>{{ q.averageScorePercent }}%</strong></span>
                      </div>

                      <div class="quiz-action-row">
                        <button class="btn btn-primary btn-sm btn-full" (click)="activeTestQuiz = q; $event.stopPropagation()">
                          <app-icon name="play" [size]="13" color="var(--color-navy)"></app-icon>
                          <span>Passer le Quiz</span>
                        </button>
                      </div>
                    </div>
                  </div>
                }
              </div>
            }
          }

          <!-- TAB CONTENT 3: MEMBERS -->
          @if (activeTab === 'PEOPLE') {
            <div class="members-layout">
              <!-- Enseignant Card -->
              <div class="card teacher-card">
                <div class="teacher-icon">
                  <app-icon name="award" [size]="24" color="var(--color-navy)"></app-icon>
                </div>
                <div class="teacher-info">
                  <span class="badge badge-primary">Professeur Référent</span>
                  <h3 class="h3" style="margin: 4px 0 2px 0;">{{ selectedClass.creatorName || 'Professeur Principal' }}</h3>
                  <span class="body-small text-muted">Créateur et coordinateur de la classe</span>
                </div>
              </div>

              <!-- Students List Card -->
              <div class="card students-card">
                <div class="students-head">
                  <h3 class="h3" style="font-size: 15px; margin: 0;">Camarades de Promotion ({{ selectedClass.students.length }})</h3>
                </div>

                <div class="students-list">
                  @for (s of selectedClass.students; track s.id) {
                    <div class="student-item">
                      <div class="student-avatar">
                        {{ s.prenom.charAt(0) }}{{ s.nom.charAt(0) }}
                      </div>
                      <div class="student-info">
                        <strong>{{ s.prenom }} {{ s.nom }}</strong>
                        <span class="body-small text-muted">{{ s.email }}</span>
                      </div>
                      <div class="student-score">
                        <span class="badge badge-navy">{{ s.quizzesCompletedCount }} quiz passés</span>
                      </div>
                    </div>
                  }
                  @if (selectedClass.students.length === 0) {
                    <div class="empty-sub">Aucun autre étudiant dans cette classe.</div>
                  }
                </div>
              </div>
            </div>
          }
        </div>
      }
    </div>

    <!-- =========================================================================
         MODAL REJOINDRE UNE CLASSE (FULLSCREEN VIEWPORT BACKDROP)
         ========================================================================= -->
    @if (showJoinModal) {
      <div class="modal-backdrop" (click)="showJoinModal = false">
        <div class="modal-card card" (click)="$event.stopPropagation()">
          <div class="modal-head">
            <div class="head-title">
              <app-icon name="school" [size]="18" color="var(--color-navy)"></app-icon>
              <h3 class="h3" style="margin: 0;">Rejoindre une Classe</h3>
            </div>
            <button class="btn-close" (click)="showJoinModal = false">✕</button>
          </div>

          <form (ngSubmit)="submitJoinClass()" class="join-form">
            <p class="body-small">
              Entrez le code d'accès de classe fourni par votre formateur (ex: <code>L3-INFO-2026</code> ou <code>CL-4821</code>).
            </p>

            <div class="form-group">
              <label>Code de la Classe *</label>
              <input 
                type="text" 
                [(ngModel)]="joinCode" 
                name="joinCode" 
                placeholder="ex: L3-INFO-2026" 
                class="input-field code-input" 
                [class.input-error]="joinError"
                (input)="joinError = ''"
                required>
              @if (joinError) {
                <span class="field-error-msg">
                  <app-icon name="alert" [size]="13" color="var(--color-danger)"></app-icon>
                  <span>{{ joinError }}</span>
                </span>
              }
            </div>

            <div class="modal-foot">
              <button type="button" class="btn btn-outline btn-sm" (click)="showJoinModal = false">Annuler</button>
              <button type="submit" class="btn btn-primary btn-sm">
                Rejoindre la Classe
              </button>
            </div>
          </form>
        </div>
      </div>
    }

    <!-- MODAL TEST QUIZ PLAYER -->
    @if (activeTestQuiz) {
      <app-quiz-modal-player 
        [quiz]="activeTestQuiz" 
        (closed)="activeTestQuiz = null">
      </app-quiz-modal-player>
    }
  `,
  styles: [`
    .learner-classes-page {
      display: flex;
      flex-direction: column;
      gap: 20px;
      width: 100%;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
    }

    /* UNIFIED COMPACT TOOLBAR */
    .filter-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      padding: 10px 16px;
      flex-wrap: wrap;
      background: #FFFFFF;

      .search-box {
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 1;
        min-width: 220px;
        height: 36px;
        background: var(--color-background);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm);
        padding: 0 12px;

        .search-input {
          flex: 1;
          border: none;
          background: transparent;
          outline: none;
          font-size: 13px;
          color: var(--color-text-primary);
          width: 100%;
        }

        .clear-btn {
          border: none;
          background: transparent;
          cursor: pointer;
          color: var(--color-text-secondary);
          font-size: 12px;
        }
      }

      .filter-pills {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;

        .pill-btn {
          background: #FFFFFF;
          border: 1px solid var(--color-border);
          padding: 5px 14px;
          border-radius: var(--radius-full);
          font-size: 12px;
          font-weight: 600;
          color: var(--color-text-secondary);
          cursor: pointer;
          transition: all 0.15s ease;

          &:hover { background: var(--color-background); }
          &.active {
            background: var(--color-navy);
            color: #FFFFFF;
            border-color: var(--color-navy);
          }
        }
      }

      .view-toggle-group {
        display: flex;
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm);
        overflow: hidden;
        background: #FFFFFF;

        .toggle-btn {
          border: none;
          background: transparent;
          padding: 6px 10px;
          cursor: pointer;
          color: var(--color-text-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;

          &:hover { background: var(--color-background); }
          &.active {
            background: var(--color-navy);
            color: #FFFFFF;
            ::ng-deep svg { stroke: #FFFFFF !important; }
          }
        }
      }
    }

    /* CLASSES GRID & CARDS */
    .classes-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 16px;
    }

    .class-card {
      padding: 18px 20px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 16px;
      background: #FFFFFF;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-sm);
      transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);

      &:hover {
        border-color: #CBD5E1;
        box-shadow: var(--shadow-md);
        transform: translateY(-2px);
      }

      .card-main-row {
        display: flex;
        gap: 14px;

        .class-icon-thumb {
          width: 44px;
          height: 44px;
          border-radius: var(--radius-md);
          background: var(--color-navy-light);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .class-info {
          display: flex;
          flex-direction: column;
          gap: 6px;
          flex: 1;

          .tags-row {
            display: flex;
            align-items: center;
            gap: 6px;
            flex-wrap: wrap;

            .level-pill {
              font-size: 10.5px;
              font-weight: 700;
              background: var(--color-primary-light);
              color: var(--color-navy);
              padding: 2px 7px;
              border-radius: var(--radius-xs);
            }

            .promo-tag {
              font-size: 10px;
              font-weight: 700;
              background: #F1F5F9;
              color: var(--color-text-secondary);
              padding: 2px 6px;
              border-radius: var(--radius-xs);
            }

            .code-txt {
              font-size: 11px;
              color: var(--color-text-secondary);
              font-family: monospace;
            }
          }

          .class-title {
            font-size: 14.5px;
            font-weight: 800;
            color: var(--color-navy);
            margin: 0;
            line-height: 1.3;
          }

          .class-meta-row {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 12px;
            color: var(--color-text-secondary);

            .teacher-lbl {
              display: inline-flex;
              align-items: center;
              gap: 4px;
              color: var(--color-navy);
              font-weight: 600;
            }
          }
        }
      }

      .card-action-bar {
        .btn-full { width: 100%; justify-content: center; gap: 6px; }
      }
    }

    /* LIST VIEW */
    .classes-list {
      display: flex;
      flex-direction: column;
      gap: 10px;

      .class-row {
        padding: 14px 18px;
        display: flex;
        align-items: center;
        gap: 16px;
        background: #FFFFFF;

        .row-icon {
          width: 36px;
          height: 36px;
          border-radius: var(--radius-sm);
          background: var(--color-navy-light);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .row-main-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;

          .row-top-tags {
            display: flex;
            align-items: center;
            gap: 6px;

            .level-pill {
              font-size: 10px;
              font-weight: 700;
              background: var(--color-primary-light);
              color: var(--color-navy);
              padding: 1px 6px;
              border-radius: var(--radius-xs);
            }

            .promo-tag {
              font-size: 10px;
              background: #F1F5F9;
              color: var(--color-text-secondary);
              padding: 1px 6px;
              border-radius: var(--radius-xs);
            }

            .code-txt {
              font-size: 11px;
              color: var(--color-text-secondary);
              font-family: monospace;
            }
          }

          .row-title {
            font-size: 14px;
            font-weight: 800;
            color: var(--color-navy);
            margin: 0;
          }
        }

        .row-stats {
          display: flex;
          align-items: center;
          gap: 16px;

          .stat-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            .stat-num { font-size: 15px; font-weight: 800; color: var(--color-navy); }
            .stat-label { font-size: 10.5px; color: var(--color-text-secondary); }
          }
        }

        .row-actions {
          display: flex;
          align-items: center;
        }
      }
    }

    /* EMPTY STATE */
    .empty-state-box {
      padding: 50px 20px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      background: #FFFFFF;

      .empty-icon-wrap {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: var(--color-navy-light);
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 16px;
      }

      .empty-title { font-size: 17px; font-weight: 800; color: var(--color-navy); margin: 0 0 6px 0; }
      .empty-desc { font-size: 13px; color: var(--color-text-secondary); max-width: 440px; margin: 0 0 20px 0; }
    }

    /* DETAIL VIEW */
    .class-detail-view {
      display: flex;
      flex-direction: column;
      gap: 18px;

      .detail-header-row {
        display: flex;
        align-items: center;
      }

      .class-hero-card {
        padding: 24px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 20px;
        background: #FFFFFF;

        .hero-left {
          flex: 1;
          min-width: 260px;

          .hero-tags {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;

            .level-pill {
              font-size: 11px;
              font-weight: 700;
              background: var(--color-primary-light);
              color: var(--color-navy);
              padding: 3px 8px;
              border-radius: var(--radius-xs);
            }

            .promo-tag {
              font-size: 11px;
              font-weight: 700;
              background: #F1F5F9;
              color: var(--color-text-secondary);
              padding: 3px 8px;
              border-radius: var(--radius-xs);
            }

            .code-txt {
              font-size: 12px;
              color: var(--color-navy);
              font-weight: 700;
              font-family: monospace;
            }
          }
        }

        .hero-stats {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;

          .hero-stat-box {
            padding: 12px 18px;
            background: var(--color-background);
            border: 1px solid var(--color-border);
            border-radius: var(--radius-md);
            display: flex;
            flex-direction: column;
            align-items: center;
            min-width: 90px;

            .stat-val { font-size: 20px; font-weight: 800; color: var(--color-navy); }
            .stat-lbl { font-size: 11px; font-weight: 600; color: var(--color-text-secondary); }
          }
        }
      }

      .class-tabs-bar {
        display: flex;
        gap: 8px;
        border-bottom: 1px solid var(--color-border);
        padding-bottom: 8px;
        flex-wrap: wrap;

        .tab-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: var(--radius-md);
          border: none;
          background: transparent;
          font-size: 13.5px;
          font-weight: 700;
          color: var(--color-text-secondary);
          cursor: pointer;
          transition: all 0.15s ease;

          &:hover {
            background: var(--color-background);
            color: var(--color-navy);
          }

          &.active {
            background: var(--color-navy);
            color: #FFFFFF;
            ::ng-deep svg { stroke: #FFFFFF !important; }
          }
        }
      }
    }

    /* COURSES GRID */
    .courses-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 16px;

      .course-card {
        padding: 0;
        overflow: hidden;
        background: #FFFFFF;
        display: flex;
        flex-direction: column;

        .course-cover {
          height: 120px;
          background-size: cover;
          background-position: center;
          position: relative;
          padding: 10px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;

          .category-chip {
            font-size: 10.5px;
            font-weight: 700;
            background: rgba(3, 36, 71, 0.85);
            color: #FFFFFF;
            padding: 2px 7px;
            border-radius: var(--radius-xs);
          }

          .level-chip {
            font-size: 10.5px;
            font-weight: 700;
            background: rgba(255, 196, 0, 0.9);
            color: var(--color-navy);
            padding: 2px 7px;
            border-radius: var(--radius-xs);
          }
        }

        .course-body {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          flex: 1;

          .course-title {
            font-size: 14.5px;
            font-weight: 800;
            color: var(--color-navy);
            margin: 0;
            line-height: 1.3;
          }

          .course-desc {
            font-size: 12.5px;
            color: var(--color-text-secondary);
            margin: 0;
            line-height: 1.4;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }

          .course-meta {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 11.5px;
            color: var(--color-text-secondary);

            span { display: inline-flex; align-items: center; gap: 4px; }
          }

          .progress-section {
            display: flex;
            flex-direction: column;
            gap: 4px;
            margin-top: 4px;

            .progress-labels {
              display: flex;
              justify-content: space-between;
              font-size: 11px;
              color: var(--color-text-secondary);
              strong { color: var(--color-navy); }
            }

            .progress-bar-thin {
              width: 100%;
              height: 4px;
              background: #F1F5F9;
              border-radius: var(--radius-full);
              overflow: hidden;

              .bar-fill { height: 100%; background: var(--color-navy); }
            }
          }

          .course-action {
            margin-top: auto;
            .btn-full { width: 100%; justify-content: center; gap: 6px; }
          }
        }
      }
    }

    /* QUIZZES GRID */
    .quizzes-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 16px;

      .quiz-card {
        padding: 0;
        overflow: hidden;
        background: #FFFFFF;
        display: flex;
        flex-direction: column;

        .quiz-cover {
          height: 120px;
          background-size: cover;
          background-position: center;
          position: relative;
          padding: 10px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;

          .category-chip {
            font-size: 10.5px;
            font-weight: 700;
            background: rgba(3, 36, 71, 0.85);
            color: #FFFFFF;
            padding: 2px 7px;
            border-radius: var(--radius-xs);
          }

          .duration-chip {
            font-size: 10.5px;
            font-weight: 700;
            background: rgba(0, 0, 0, 0.65);
            color: #FFFFFF;
            padding: 2px 7px;
            border-radius: var(--radius-xs);
            display: inline-flex;
            align-items: center;
            gap: 4px;
          }
        }

        .quiz-body {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          flex: 1;

          .quiz-title {
            font-size: 14.5px;
            font-weight: 800;
            color: var(--color-navy);
            margin: 0;
            line-height: 1.3;
          }

          .quiz-desc {
            font-size: 12.5px;
            color: var(--color-text-secondary);
            margin: 0;
            line-height: 1.4;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }

          .quiz-meta-row {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 12px;
            color: var(--color-text-secondary);
          }

          .quiz-action-row {
            margin-top: auto;
            .btn-full { width: 100%; justify-content: center; gap: 6px; }
          }
        }
      }
    }

    /* MEMBERS LAYOUT */
    .members-layout {
      display: flex;
      flex-direction: column;
      gap: 16px;

      .teacher-card {
        padding: 16px 20px;
        display: flex;
        align-items: center;
        gap: 16px;
        background: #FFFFFF;

        .teacher-icon {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: var(--color-primary-light);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .teacher-info {
          display: flex;
          flex-direction: column;
        }
      }

      .students-card {
        padding: 0;
        background: #FFFFFF;
        overflow: hidden;

        .students-head {
          padding: 14px 20px;
          border-bottom: 1px solid var(--color-border);
          background: #F8FAFC;
        }

        .students-list {
          display: flex;
          flex-direction: column;

          .student-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 20px;
            border-bottom: 1px solid var(--color-border);
            gap: 12px;

            &:last-child { border-bottom: none; }

            .student-avatar {
              width: 34px;
              height: 34px;
              border-radius: 50%;
              background: var(--color-navy);
              color: #FFFFFF;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 12px;
              font-weight: 800;
            }

            .student-info {
              flex: 1;
              display: flex;
              flex-direction: column;
              gap: 2px;
              font-size: 13px;
              color: var(--color-navy);
            }
          }

          .empty-sub {
            padding: 20px;
            text-align: center;
            font-size: 13px;
            color: var(--color-text-secondary);
          }
        }
      }
    }

    .empty-tab-box {
      padding: 40px 20px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      background: #FFFFFF;
      h4 { margin: 10px 0 0 0; color: var(--color-navy); }
    }

    /* MODAL */
    .modal-backdrop {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      background: rgba(3, 36, 71, 0.65) !important;
      backdrop-filter: blur(6px) !important;
      -webkit-backdrop-filter: blur(6px) !important;
      z-index: 999999 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      padding: 16px !important;
      margin: 0 !important;
    }

    .modal-card {
      width: 100%;
      max-width: 440px;
      background: #FFFFFF;
      overflow: hidden;

      .modal-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        border-bottom: 1px solid var(--color-border);

        .head-title {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--color-navy);
        }

        .btn-close {
          background: transparent;
          border: none;
          cursor: pointer;
          font-size: 14px;
          color: var(--color-text-secondary);
        }
      }

      .join-form {
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 14px;

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
          label { font-size: 12px; font-weight: 700; color: var(--color-navy); }
          .code-input {
            text-transform: uppercase;
            font-size: 15px;
            font-weight: 800;
            letter-spacing: 0.05em;
          }
        }

        .error-box {
          padding: 8px 12px;
          background: #FEE2E2;
          border: 1px solid #FCA5A5;
          border-radius: var(--radius-xs);
          color: #B91C1C;
          font-size: 12px;
          font-weight: 600;
        }

        .modal-foot {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 10px;
        }
      }
    }

    /* RESPONSIVE MOBILE TWEAKS */
    @media (max-width: 768px) {
      .classes-grid, .courses-grid, .quizzes-grid {
        grid-template-columns: 1fr;
      }
      .class-hero-card {
        flex-direction: column;
        align-items: flex-start;
        .hero-stats {
          width: 100%;
          justify-content: space-between;
          .hero-stat-box { flex: 1; padding: 8px; }
        }
      }
      .class-tabs-bar {
        overflow-x: auto;
        flex-wrap: nowrap;
        .tab-btn { white-space: nowrap; }
      }
    }
  `]
})
export class LearnerClassesComponent {
  private classeService = inject(ClasseService);
  private quizService = inject(QuizService);
  private courseService = inject(CourseService);
  public authService = inject(AuthService);

  allClasses = this.classeService.getClasses();
  allQuizzes = this.quizService.getQuizzes();
  allCourses = this.courseService.getCourses();

  searchQuery = '';
  filterLevel: 'ALL' | 'LICENCE' | 'MASTER' = 'ALL';
  viewMode: 'grid' | 'list' = 'grid';

  currentPage = 1;
  pageSize = 8;

  selectedClass: Classe | null = null;
  activeTab: 'COURSES' | 'QUIZZES' | 'PEOPLE' = 'COURSES';
  activeTestQuiz: Quiz | null = null;

  showJoinModal = false;
  joinCode = '';
  joinError = '';

  enrolledClasses(): Classe[] {
    // For demo / learner experience: returns the classes the learner belongs to
    // or all available demo classes for the user's institution
    return this.allClasses();
  }

  filteredClasses(): Classe[] {
    return this.enrolledClasses().filter(c => {
      const matchSearch = !this.searchQuery ||
        c.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        c.code.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        c.level.toLowerCase().includes(this.searchQuery.toLowerCase());

      const matchLevel = this.filterLevel === 'ALL' ||
        (this.filterLevel === 'LICENCE' && c.level.toLowerCase().includes('licence')) ||
        (this.filterLevel === 'MASTER' && c.level.toLowerCase().includes('master'));

      return matchSearch && matchLevel;
    });
  }

  paginatedClasses(): Classe[] {
    const list = this.filteredClasses();
    const start = (this.currentPage - 1) * this.pageSize;
    return list.slice(start, start + this.pageSize);
  }

  openClass(c: Classe) {
    this.selectedClass = c;
    this.activeTab = 'COURSES';
  }

  getAssignedQuizzes(): Quiz[] {
    if (!this.selectedClass) return [];
    return this.allQuizzes().filter(q => this.selectedClass?.assignedQuizIds.includes(q.id));
  }

  getAssignedCourses(): Course[] {
    if (!this.selectedClass) return [];
    return this.allCourses().filter(crs => (crs.assignedClassIds || []).includes(this.selectedClass!.id));
  }

  openJoinModal() {
    this.joinCode = '';
    this.joinError = '';
    this.showJoinModal = true;
  }

  submitJoinClass() {
    this.joinError = '';
    const code = this.joinCode.trim().toUpperCase();
    if (!code) {
      this.joinError = 'Le code de la classe est obligatoire.';
      return;
    }

    const found = this.allClasses().find(c => c.code.toUpperCase() === code);
    if (!found) {
      this.joinError = 'Code de classe introuvable. Veuillez vérifier le code communiqué par votre enseignant.';
      return;
    }

    const currentStudent = this.authService.currentUser();
    this.classeService.addStudentToClass(found.id, {
      prenom: currentStudent?.prenom || 'Étudiant',
      nom: currentStudent?.nom || '',
      email: currentStudent?.email || 'etudiant@univ.edu',
      matricule: 'ETU-' + Math.floor(1000 + Math.random() * 9000)
    });

    this.showJoinModal = false;
    this.selectedClass = this.classeService.getClassById(found.id) || found;
  }

  levelLabel(level: string): string {
    switch (level) {
      case 'BEGINNER': return 'Débutant';
      case 'INTERMEDIATE': return 'Intermédiaire';
      case 'ADVANCED': return 'Avancé';
      default: return 'Intermédiaire';
    }
  }
}
