import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { QuizService } from '../../../core/services/quiz.service';
import { AuthService } from '../../../core/services/auth.service';
import { Quiz } from '../../../core/models/quiz.model';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { QuizModalPlayerComponent } from '../../../shared/components/quiz-modal-player/quiz-modal-player.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-explore',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, IconComponent, QuizModalPlayerComponent, PaginationComponent],
  template: `
    <div class="explore-page">
      <!-- HERO HEADER -->
      <section class="explore-hero">
        <div class="hero-container">
          <div class="badge badge-primary" style="align-self: center;">
            <app-icon name="sparkles" [size]="14" color="var(--color-navy)"></app-icon>
            <span>ACCÈS LIBRE & GRATUIT</span>
          </div>

          <h1 class="explore-title">
            Découvrez nos Quiz Publics & <br>
            <span class="highlight">Testez vos connaissances en direct.</span>
          </h1>

          <p class="explore-subtitle">
            Aucun compte requis. Choisissez un quiz parmi nos thématiques et jouez immédiatement en mode solo ou arène.
          </p>

          <!-- UNIFIED COMPACT SEARCH & CATEGORY BAR -->
          <div class="filter-toolbar card animate-fade-in">
            <div class="search-box">
              <app-icon name="search" [size]="16" color="var(--color-text-secondary)"></app-icon>
              <input 
                type="text" 
                [(ngModel)]="searchQuery" 
                placeholder="Rechercher : JavaScript, IA, Marketing, Python..." 
                class="search-input"
                (ngModelChange)="currentPage = 1">
              @if (searchQuery) {
                <button class="clear-btn" (click)="searchQuery = ''; currentPage = 1">✕</button>
              }
            </div>

            <div class="filter-pills">
              <button 
                type="button" 
                class="pill-btn" 
                [class.active]="selectedCategory === 'ALL'"
                (click)="selectedCategory = 'ALL'; currentPage = 1">
                Tous les Quiz
              </button>
              <button 
                type="button" 
                class="pill-btn" 
                [class.active]="selectedCategory === 'Développement Web'"
                (click)="selectedCategory = 'Développement Web'; currentPage = 1">
                Web
              </button>
              <button 
                type="button" 
                class="pill-btn" 
                [class.active]="selectedCategory === 'Intelligence Artificielle'"
                (click)="selectedCategory = 'Intelligence Artificielle'; currentPage = 1">
                IA & Data
              </button>
              <button 
                type="button" 
                class="pill-btn" 
                [class.active]="selectedCategory === 'Business & Marketing'"
                (click)="selectedCategory = 'Business & Marketing'; currentPage = 1">
                Business
              </button>
            </div>

            <!-- View Mode Toggle -->
            <div class="view-toggle-group">
              <button 
                type="button" 
                class="toggle-btn" 
                [class.active]="viewMode === 'grid'" 
                (click)="viewMode = 'grid'" 
                title="Grille (4 par ligne)">
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
        </div>
      </section>

      <!-- PUBLIC QUIZZES CONTAINER -->
      <section class="explore-grid-section">
        <div class="grid-container">
          <div class="results-header">
            <h2 class="h2">Quiz Disponibles ({{ filteredQuizzes().length }})</h2>
            <span class="caption">Jouez gratuitement sans inscription préalable</span>
          </div>

          @if (isLoading) {
            <div class="quizzes-grid animate-fade-in">
              <div class="skeleton-card" *ngFor="let i of [1, 2, 3, 4]">
                <div class="skeleton skeleton-cover" style="height: 48px;"></div>
                <div class="skeleton skeleton-text title"></div>
                <div class="skeleton skeleton-text desc"></div>
              </div>
            </div>
          } @else {
            @if (filteredQuizzes().length === 0) {
              <div class="empty-state-box animate-fade-in">
                <div class="empty-icon-wrap">
                  <app-icon name="search" [size]="28" color="var(--color-navy)"></app-icon>
                </div>
                <h3 class="empty-title">Aucun quiz public trouvé</h3>
                <p class="empty-desc">
                  Aucun quiz ne correspond aux critères <strong>"{{ searchQuery }}"</strong> dans la catégorie <strong>{{ selectedCategory }}</strong>.
                </p>
                <button class="btn btn-outline btn-sm" (click)="searchQuery = ''; selectedCategory = 'ALL'; currentPage = 1">
                  Réinitialiser les filtres
                </button>
              </div>
            } @else {
              <!-- 1. GRID MODE (4 ITEMS PER ROW ON DESKTOP) -->
              @if (viewMode === 'grid') {
                <div class="quizzes-grid animate-fade-in">
                  @for (quiz of paginatedQuizzes(); track quiz.id) {
                    <div class="quiz-compact-card card card-interactive">
                      <div class="card-main-row">
                        <img [src]="quiz.coverImage" class="quiz-thumb" alt="Quiz cover">
                        <div class="quiz-info">
                          <div class="tags-row">
                            <span class="category-pill">{{ quiz.category }}</span>
                            <span class="free-pill">Gratuit</span>
                          </div>

                          <h3 class="quiz-title" [title]="quiz.title">{{ quiz.title }}</h3>

                          <div class="author-and-metrics">
                            <span class="author-name">Par {{ quiz.creatorName }}</span>
                            <span>•</span>
                            <span><strong>{{ quiz.questionsCount }}</strong> Qs</span>
                          </div>
                        </div>
                      </div>

                      <div class="card-action-bar">
                        <button class="btn btn-primary btn-sm btn-full" (click)="activePlayQuiz = quiz">
                          <app-icon name="play" [size]="13" color="var(--color-navy)"></app-icon>
                          <span>Jouer Gratuitement</span>
                        </button>
                      </div>
                    </div>
                  }
                </div>
              }

              <!-- 2. LIST MODE (HORIZONTAL ROWS) -->
              @if (viewMode === 'list') {
                <div class="quizzes-list-rows animate-fade-in">
                  @for (quiz of paginatedQuizzes(); track quiz.id) {
                    <div class="quiz-list-row card card-interactive">
                      <img [src]="quiz.coverImage" class="row-thumb" alt="Cover">

                      <div class="row-main-info">
                        <div class="row-top-tags">
                          <span class="category-pill">{{ quiz.category }}</span>
                          <span class="free-pill">Gratuit</span>
                        </div>
                        <h3 class="row-title">{{ quiz.title }}</h3>
                      </div>

                      <div class="row-stats">
                        <div class="stat-item">
                          <span class="stat-num">{{ quiz.creatorName }}</span>
                          <span class="stat-label">Auteur</span>
                        </div>
                        <div class="stat-item">
                          <span class="stat-num">{{ quiz.questionsCount }}</span>
                          <span class="stat-label">Questions</span>
                        </div>
                        <div class="stat-item hide-on-mobile">
                          <span class="stat-num">{{ quiz.difficulty }}</span>
                          <span class="stat-label">Niveau</span>
                        </div>
                      </div>

                      <div class="row-actions">
                        <button class="btn btn-primary btn-sm btn-play" (click)="activePlayQuiz = quiz">
                          <app-icon name="play" [size]="13" color="var(--color-navy)"></app-icon>
                          <span>Jouer</span>
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
                [totalItems]="filteredQuizzes().length" 
                (pageChange)="currentPage = $event">
              </app-pagination>
            }
          }
        </div>
      </section>

      <!-- CTA BANNER FOR PROFS & TRAINERS (ONLY FOR VISITORS) -->
      @if (!authService.currentUser()) {
        <section class="explore-cta-section">
          <div class="cta-banner card card-highlight">
            <div class="cta-left">
              <h2 class="display-title" style="margin-bottom: 6px; font-size: 20px;">Vous êtes Enseignant ou Formateur ?</h2>
              <p class="body-medium" style="color: var(--color-text-secondary); max-width: 580px; font-size: 13px;">
                Générez vos quiz en 10 secondes grâce à l'IA, organisez vos classes, animez des sessions Live interactives et suivez les notes de vos étudiants.
              </p>
            </div>
            <div class="cta-right">
              <a routerLink="/login" class="btn btn-primary btn-sm">
                <app-icon name="sparkles" [size]="15" color="var(--color-navy)"></app-icon>
                <span>Créer mon compte Formateur</span>
              </a>
            </div>
          </div>
        </section>
      }
    </div>

    <!-- QUIZ MODAL PLAYER (FULLSCREEN VIEWPORT BACKDROP) -->
    @if (activePlayQuiz) {
      <app-quiz-modal-player [quiz]="activePlayQuiz" (closed)="activePlayQuiz = null"></app-quiz-modal-player>
    }
  `,
  styles: [`
    .explore-page {
      display: flex;
      flex-direction: column;
      gap: 32px;
      padding-bottom: 40px;
    }

    .explore-hero {
      padding: 30px 16px 10px;
      text-align: center;
      background: linear-gradient(180deg, rgba(240, 244, 248, 0.6) 0%, transparent 100%);

      .hero-container {
        max-width: 900px;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
      }

      .explore-title {
        font-size: 28px;
        font-weight: 800;
        color: var(--color-navy);
        line-height: 1.25;

        .highlight {
          color: var(--color-orange);
        }
      }

      .explore-subtitle {
        font-size: 13px;
        color: var(--color-text-secondary);
        max-width: 560px;
        margin: 0 auto 10px;
        line-height: 18px;
      }
    }

    /* UNIFIED COMPACT TOOLBAR */
    .filter-toolbar {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 8px 14px;
      flex-wrap: wrap;

      .search-box {
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 1;
        min-width: 220px;
        height: 34px;
        background: var(--color-background);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm);
        padding: 0 10px;

        .search-input {
          flex: 1;
          border: none;
          background: transparent;
          font-size: 13px;
          color: var(--color-text-primary);
          outline: none;
        }

        .clear-btn {
          border: none;
          background: transparent;
          cursor: pointer;
          color: var(--color-text-secondary);
        }
      }

      .filter-pills {
        display: flex;
        gap: 6px;

        .pill-btn {
          padding: 4px 12px;
          border-radius: var(--radius-full);
          border: 1px solid var(--color-border);
          background: #FFFFFF;
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

        .toggle-btn {
          border: none;
          background: #FFFFFF;
          padding: 5px 9px;
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
          }
        }
      }
    }

    .explore-grid-section {
      .grid-container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 0 16px;
      }

      .results-header {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        margin-bottom: 14px;
        flex-wrap: wrap;
        gap: 8px;

        .h2 { font-size: 18px; margin: 0; }
        .caption { font-size: 12px; color: var(--color-text-secondary); }
      }
    }

    /* 4 CARDS PER ROW GRID (DESKTOP) */
    .quizzes-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
    }

    @media (max-width: 1200px) {
      .quizzes-grid { grid-template-columns: repeat(3, 1fr); }
    }
    @media (max-width: 900px) {
      .quizzes-grid { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 600px) {
      .quizzes-grid { grid-template-columns: 1fr; }
    }

    .quiz-compact-card {
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      border-radius: var(--radius-md);
      transition: transform 0.15s ease, box-shadow 0.15s ease;

      &:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-sm);
      }

      .card-main-row {
        display: flex;
        gap: 10px;
        align-items: flex-start;

        .quiz-thumb {
          width: 48px;
          height: 48px;
          min-width: 48px;
          border-radius: var(--radius-sm);
          object-fit: cover;
          border: 1px solid var(--color-border);
        }

        .quiz-info {
          flex: 1;
          min-width: 0;

          .tags-row {
            display: flex;
            align-items: center;
            gap: 4px;
            margin-bottom: 2px;

            .category-pill {
              font-size: 9px;
              font-weight: 700;
              color: var(--color-navy);
              background: var(--color-navy-light);
              padding: 1px 5px;
              border-radius: var(--radius-xs);
            }

            .free-pill {
              font-size: 9px;
              font-weight: 800;
              color: var(--color-navy);
              background: var(--color-primary-light);
              padding: 1px 5px;
              border-radius: var(--radius-xs);
            }
          }

          .quiz-title {
            font-size: 13px;
            font-weight: 800;
            color: var(--color-navy);
            margin: 0 0 2px 0;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .author-and-metrics {
            font-size: 10.5px;
            color: var(--color-text-secondary);
            display: flex;
            align-items: center;
            gap: 4px;

            strong { color: var(--color-navy); }
          }
        }
      }

      .card-action-bar {
        padding-top: 6px;
        border-top: 1px solid var(--color-border);
        margin-top: auto;

        .btn-full {
          width: 100%;
          font-size: 11px;
          font-weight: 800;
          height: 26px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
        }
      }
    }

    /* LIST MODE (ROWS) */
    .quizzes-list-rows {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .quiz-list-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 14px;
      gap: 14px;
      border-radius: var(--radius-md);

      .row-thumb {
        width: 38px;
        height: 38px;
        border-radius: var(--radius-xs);
        object-fit: cover;
      }

      .row-main-info {
        flex: 1;
        min-width: 0;

        .row-top-tags {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 2px;

          .category-pill {
            font-size: 9px;
            font-weight: 700;
            color: var(--color-navy);
            background: var(--color-navy-light);
            padding: 1px 5px;
            border-radius: var(--radius-xs);
          }

          .free-pill {
            font-size: 9px;
            font-weight: 800;
            color: var(--color-navy);
            background: var(--color-primary-light);
            padding: 1px 5px;
            border-radius: var(--radius-xs);
          }
        }

        .row-title {
          font-size: 13px;
          font-weight: 800;
          color: var(--color-navy);
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      }

      .row-stats {
        display: flex;
        gap: 16px;

        .stat-item {
          display: flex;
          flex-direction: column;
          align-items: center;

          .stat-num { font-size: 12px; font-weight: 800; color: var(--color-navy); }
          .stat-label { font-size: 9px; color: var(--color-text-secondary); }
        }
      }

      .row-actions {
        display: flex;
        align-items: center;
        gap: 5px;

        .btn-play {
          font-size: 11px;
          font-weight: 800;
          height: 26px;
          padding: 0 10px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
      }
    }

    .explore-cta-section {
      max-width: 1200px;
      margin: 20px auto 0;
      padding: 0 16px;

      .cta-banner {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px 24px;
        background: #FFFCF2;
        border: 1px solid var(--color-border);
        flex-wrap: wrap;
        gap: 16px;
      }
    }
  `]
})
export class ExploreComponent {
  private quizService = inject(QuizService);
  public authService = inject(AuthService);

  quizzes = this.quizService.getQuizzes();
  searchQuery = '';
  selectedCategory = 'ALL';
  viewMode: 'grid' | 'list' = 'grid';

  currentPage = 1;
  pageSize = 8;

  isLoading = false;
  activePlayQuiz: Quiz | null = null;

  filteredQuizzes(): Quiz[] {
    return this.quizzes().filter(q => {
      const matchPublic = q.visibility === 'PUBLIC';
      const matchSearch = !this.searchQuery ||
        q.title.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        q.description.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        q.category.toLowerCase().includes(this.searchQuery.toLowerCase());
      const matchCategory = this.selectedCategory === 'ALL' || q.category === this.selectedCategory;
      return matchPublic && matchSearch && matchCategory;
    });
  }

  paginatedQuizzes(): Quiz[] {
    const list = this.filteredQuizzes();
    const start = (this.currentPage - 1) * this.pageSize;
    return list.slice(start, start + this.pageSize);
  }
}
