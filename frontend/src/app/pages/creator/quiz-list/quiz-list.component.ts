import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { QuizService } from '../../../core/services/quiz.service';
import { AuthService } from '../../../core/services/auth.service';
import { PromotionService } from '../../../core/services/promotion.service';
import { Quiz } from '../../../core/models/quiz.model';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { QuizModalPlayerComponent } from '../../../shared/components/quiz-modal-player/quiz-modal-player.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';

@Component({
  selector: 'app-quiz-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, IconComponent, QuizModalPlayerComponent, PaginationComponent],
  template: `
    <div class="quiz-list-page">
      <!-- HEADER -->
      <div class="page-header animate-fade-in">
        <div>
          <h1 class="h1">Gestion de mes Quiz</h1>
          <p class="body-small">Créez, partagez et lancez vos évaluations interactives.</p>
        </div>

        <div class="header-actions">
          @if (isReadOnly()) {
            <span class="locked-action-pill" title="La promotion sélectionnée est archivée. Création de quiz désactivée.">
              <app-icon name="lock" [size]="14" color="#64748B"></app-icon>
              <span>Création de Quiz (Verrouillée)</span>
            </span>
          } @else {
            <a routerLink="/app/quizzes/create" class="btn btn-primary btn-sm">
              <app-icon name="sparkles" [size]="15" color="var(--color-navy)"></app-icon>
              <span>Créer un Quiz avec l'IA</span>
            </a>
          }
        </div>
      </div>

      <!-- UNIFIED COMPACT SEARCH & FILTER TOOLBAR -->
      <div class="filter-toolbar card animate-fade-in">
        <div class="search-box">
          <app-icon name="search" [size]="16" color="var(--color-text-secondary)"></app-icon>
          <input 
            type="text" 
            [(ngModel)]="searchQuery" 
            placeholder="Rechercher un quiz par titre ou code..." 
            class="search-input"
            (ngModelChange)="currentPage = 1">
          @if (searchQuery) {
            <button class="clear-btn" (click)="searchQuery = ''; currentPage = 1">✕</button>
          }
        </div>

        <!-- LOCAL PROMOTION FILTER (DOES NOT MUTATE HEADER) -->
        <div class="promo-filter-box">
          <span class="filter-lbl">Promotion :</span>
          <select 
            [(ngModel)]="selectedPromotionFilter" 
            (ngModelChange)="onFilterChange()"
            class="promo-select"
            title="Filtrer par promotion sans modifier le contexte actif du Header">
            <option value="ACTIVE">✓ Promotion active ({{ promotionService.activePromotionLabel() }})</option>
            <option value="ALL">Toutes les promotions (Recherche globale)</option>
            @for (p of promotionService.promotions(); track p.id) {
              <option [value]="p.id">{{ p.name }}</option>
            }
          </select>
        </div>

        <!-- Filter pills -->
        <div class="filter-pills">
          <button 
            type="button" 
            class="pill-btn" 
            [class.active]="selectedVisFilter === 'ALL'" 
            (click)="selectedVisFilter = 'ALL'; currentPage = 1">
            Tous ({{ myQuizzes().length }})
          </button>
          <button 
            type="button" 
            class="pill-btn" 
            [class.active]="selectedVisFilter === 'PUBLIC'" 
            (click)="selectedVisFilter = 'PUBLIC'; currentPage = 1">
            Publics
          </button>
          <button 
            type="button" 
            class="pill-btn" 
            [class.active]="selectedVisFilter === 'PRIVATE'" 
            (click)="selectedVisFilter = 'PRIVATE'; currentPage = 1">
            Privés
          </button>
        </div>

        <!-- View Mode Toggle (Grid 4 items vs List) -->
        <div class="view-toggle-group">
          <button 
            type="button" 
            class="toggle-btn" 
            [class.active]="viewMode === 'grid'" 
            (click)="viewMode = 'grid'" 
            title="Affichage en Grille (4 par ligne)">
            <app-icon name="grid" [size]="15"></app-icon>
          </button>
          <button 
            type="button" 
            class="toggle-btn" 
            [class.active]="viewMode === 'list'" 
            (click)="viewMode = 'list'" 
            title="Affichage en Liste">
            <app-icon name="list" [size]="15"></app-icon>
          </button>
        </div>
      </div>

      <!-- SKELETON LOADERS (FUN & CLEAN) -->
      @if (isLoading) {
        <div class="quiz-grid animate-fade-in">
          @for (i of [1, 2, 3, 4, 5, 6, 7, 8]; track i) {
            <div class="skeleton-compact-card">
              <div class="sk-top">
                <div class="skeleton-fun" style="height: 16px; width: 65px; border-radius: 9999px;"></div>
                <div class="skeleton-fun" style="height: 13px; width: 45px;"></div>
              </div>
              <div style="display: flex; gap: 10px; align-items: center; margin: 4px 0;">
                <div class="skeleton-fun sk-thumb"></div>
                <div style="flex: 1; display: flex; flex-direction: column; gap: 6px;">
                  <div class="skeleton-fun" style="height: 15px; width: 85%;"></div>
                  <div class="skeleton-fun" style="height: 11px; width: 55%;"></div>
                </div>
              </div>
              <div class="sk-footer">
                <div class="skeleton-fun" style="height: 13px; width: 65px;"></div>
                <div class="skeleton-fun" style="height: 26px; width: 75px; border-radius: 6px;"></div>
              </div>
            </div>
          }
        </div>
      } @else {
        <!-- EMPTY STATE IF NO RESULTS -->
        @if (myQuizzes().length === 0) {
          <!-- INITIAL ZERO STATE WITH PRIMARY CTAS -->
          <div class="empty-state-box animate-fade-in card" style="text-align: center; padding: 48px 24px; border: 2px dashed #CBD5E1; background: #FAFBFD;">
            <div class="empty-icon-wrap" style="width: 68px; height: 68px; margin: 0 auto 16px; border-radius: 50%; background: #EFF6FF; border: 1px solid #DBEAFE; display: flex; align-items: center; justify-content: center;">
              <app-icon name="sparkles" [size]="32" color="var(--color-navy)"></app-icon>
            </div>
            <h3 style="font-size: 20px; font-weight: 800; color: var(--color-navy); margin-bottom: 8px;">Aucun quiz d'évaluation</h3>
            <p style="color: var(--color-text-secondary); max-width: 480px; margin: 0 auto 24px; font-size: 14px; line-height: 1.6;">
              Vous n'avez pas encore créé de quiz d'évaluation. Concevez vos questionnaires personnalisés ou laissez notre intelligence artificielle générer un quiz complet en quelques secondes.
            </p>
            <div style="display: flex; align-items: center; justify-content: center; gap: 12px; flex-wrap: wrap;">
              <a routerLink="/app/quizzes/create" class="btn btn-primary btn-lg" style="display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 4px 14px rgba(255,107,0,0.25);">
                <app-icon name="plus" [size]="18" color="var(--color-navy)"></app-icon>
                <span>Créer un Quiz</span>
              </a>
              <a routerLink="/app/quizzes/create" [queryParams]="{mode: 'ai'}" class="btn btn-outline btn-lg" style="display: inline-flex; align-items: center; gap: 8px;">
                <app-icon name="sparkles" [size]="18" color="var(--color-orange)"></app-icon>
                <span>Générer avec l'IA ✨</span>
              </a>
            </div>
          </div>
        } @else if (filteredQuizzes().length === 0) {
          <!-- FILTER ZERO STATE -->
          <div class="empty-state-box animate-fade-in card" style="text-align: center; padding: 40px 24px;">
            <div class="empty-icon-wrap" style="width: 56px; height: 56px; margin: 0 auto 14px; border-radius: 50%; background: #F1F5F9; display: flex; align-items: center; justify-content: center;">
              <app-icon name="search" [size]="28" color="var(--color-navy)"></app-icon>
            </div>
            <h3 class="empty-title">Aucun quiz trouvé</h3>
            <p class="empty-desc">
              Aucun résultat ne correspond à votre recherche <strong>"{{ searchQuery }}"</strong>.
            </p>
            <button class="btn btn-outline btn-sm" (click)="searchQuery = ''; selectedVisFilter = 'ALL'; currentPage = 1">
              Réinitialiser les filtres
            </button>
          </div>
        } @else {
          <!-- 1. GRID MODE (4 ITEMS PER ROW ON DESKTOP) -->
          @if (viewMode === 'grid') {
            <div class="quiz-grid animate-fade-in">
              @for (quiz of paginatedQuizzes(); track quiz.id) {
                <div class="quiz-compact-card card card-interactive">
                  <div class="card-main-row">
                    <img [src]="quiz.coverImage" class="quiz-thumb" alt="Quiz cover">
                    <div class="quiz-info">
                      <div class="tags-row">
                        <span class="category-pill">{{ quiz.category }}</span>
                        <span class="vis-badge" [class.is-pub]="quiz.visibility === 'PUBLIC'">
                          <span class="status-dot"></span>
                          {{ quiz.visibility === 'PUBLIC' ? 'Public' : 'Privé' }}
                        </span>
                        <span class="code-txt">#{{ quiz.shareCode }}</span>
                      </div>

                      <h3 class="quiz-title" [title]="quiz.title">{{ quiz.title }}</h3>

                      <div class="quiz-metrics">
                        <span><strong>{{ quiz.questionsCount }}</strong> Qs</span>
                        <span>•</span>
                        <span><strong>{{ quiz.participationsCount }}</strong> joués</span>
                        <span class="hide-on-mobile">•</span>
                        <span class="hide-on-mobile score-val"><strong>{{ quiz.averageScorePercent }}%</strong></span>
                      </div>
                    </div>
                  </div>

                  <div class="card-action-bar">
                    <button class="btn btn-primary btn-sm btn-play" (click)="activeTestQuiz = quiz" title="Tester le quiz">
                      <app-icon name="play" [size]="13" color="var(--color-navy)"></app-icon>
                      <span>Tester</span>
                    </button>

                    <div class="sub-actions">
                      <button class="btn btn-outline btn-sm btn-icon" (click)="openShareModal(quiz)" title="Partager">
                        <app-icon name="share" [size]="13"></app-icon>
                      </button>

                      @if (!isReadOnly()) {
                        <a [routerLink]="['/app/quizzes/edit', quiz.id]" class="btn btn-outline btn-sm btn-icon" title="Modifier le quiz">
                          <app-icon name="edit" [size]="13" color="var(--color-navy)"></app-icon>
                        </a>
                        <button class="btn btn-outline btn-sm btn-icon" (click)="toggleVisibility(quiz.id)" [title]="quiz.visibility === 'PRIVATE' ? 'Rendre Public' : 'Rendre Privé'">
                          <app-icon [name]="quiz.visibility === 'PRIVATE' ? 'lock' : 'globe'" [size]="13"></app-icon>
                        </button>
                        <button class="btn btn-outline btn-sm btn-icon btn-del" (click)="deleteQuiz(quiz.id)" title="Supprimer">
                          <app-icon name="trash" [size]="13" color="var(--color-danger)"></app-icon>
                        </button>
                      } @else {
                        <span class="locked-mini-chip" title="Quiz en consultation lecture seule (Promotion archivée)">
                          <app-icon name="lock" [size]="12" color="#64748B"></app-icon>
                        </span>
                      }
                    </div>
                  </div>
                </div>
              }
            </div>
          }

          <!-- 2. LIST MODE (HORIZONTAL ROWS) -->
          @if (viewMode === 'list') {
            <div class="quiz-list-rows animate-fade-in">
              @for (quiz of paginatedQuizzes(); track quiz.id) {
                <div class="quiz-list-row card card-interactive">
                  <img [src]="quiz.coverImage" class="row-thumb" alt="Cover">
                  
                  <div class="row-main-info">
                    <div class="row-top-tags">
                      <span class="category-pill">{{ quiz.category }}</span>
                      <span class="vis-badge" [class.is-pub]="quiz.visibility === 'PUBLIC'">
                        <span class="status-dot"></span>
                        {{ quiz.visibility === 'PUBLIC' ? 'Public' : 'Privé' }}
                      </span>
                      <span class="code-txt">#{{ quiz.shareCode }}</span>
                    </div>
                    <h3 class="row-title">{{ quiz.title }}</h3>
                  </div>

                  <div class="row-stats">
                    <div class="stat-item">
                      <span class="stat-num">{{ quiz.questionsCount }}</span>
                      <span class="stat-label">Questions</span>
                    </div>
                    <div class="stat-item">
                      <span class="stat-num">{{ quiz.participationsCount }}</span>
                      <span class="stat-label">Participants</span>
                    </div>
                    <div class="stat-item hide-on-mobile">
                      <span class="stat-num" style="color: var(--color-success);">{{ quiz.averageScorePercent }}%</span>
                      <span class="stat-label">Moyenne</span>
                    </div>
                  </div>

                  <div class="row-actions">
                    <button class="btn btn-primary btn-sm btn-play" (click)="activeTestQuiz = quiz" title="Tester le quiz">
                      <app-icon name="play" [size]="12" color="var(--color-navy)"></app-icon>
                      <span>Tester</span>
                    </button>

                    <button class="btn btn-outline btn-sm btn-icon" (click)="openShareModal(quiz)" title="Partager">
                      <app-icon name="share" [size]="13"></app-icon>
                    </button>

                    @if (!isReadOnly()) {
                      <a [routerLink]="['/app/quizzes/edit', quiz.id]" class="btn btn-outline btn-sm btn-icon" title="Modifier le quiz">
                        <app-icon name="edit" [size]="13" color="var(--color-navy)"></app-icon>
                      </a>
                      <button class="btn btn-outline btn-sm btn-icon" (click)="toggleVisibility(quiz.id)" [title]="quiz.visibility === 'PRIVATE' ? 'Rendre Public' : 'Rendre Privé'">
                        <app-icon [name]="quiz.visibility === 'PRIVATE' ? 'lock' : 'globe'" [size]="13"></app-icon>
                      </button>
                      <button class="btn btn-outline btn-sm btn-icon btn-del" (click)="deleteQuiz(quiz.id)" title="Supprimer">
                        <app-icon name="trash" [size]="13" color="var(--color-danger)"></app-icon>
                      </button>
                    } @else {
                      <span class="locked-mini-chip" title="Quiz en consultation lecture seule (Promotion archivée)">
                        <app-icon name="lock" [size]="12" color="#64748B"></app-icon>
                      </span>
                    }
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

      <!-- QUIZ MODAL PLAYER -->
      @if (activeTestQuiz) {
        <app-quiz-modal-player [quiz]="activeTestQuiz" (closed)="activeTestQuiz = null"></app-quiz-modal-player>
      }

      <!-- SHARE MODAL -->
      @if (sharedQuiz) {
        <div class="modal-backdrop" (click)="sharedQuiz = null">
          <div class="modal-card card" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3 class="h2">Partager ce Quiz</h3>
              <button class="close-btn" (click)="sharedQuiz = null">✕</button>
            </div>

            <div class="modal-body">
              <h4 class="h3" style="margin-bottom: 8px;">{{ sharedQuiz.title }}</h4>
              <p class="body-small">Transmettez ce lien ou ce code à vos élèves pour qu'ils participent instantanément sans mot de passe.</p>

              <div class="share-box">
                <label class="caption" style="font-weight: 700;">LIEN DIRECT DE PARTICIPATION :</label>
                <div class="copy-input-group">
                  <input type="text" [value]="getShareUrl(sharedQuiz)" readonly class="input-field">
                  <button class="btn btn-primary btn-sm" (click)="copyLink(getShareUrl(sharedQuiz))">
                    <app-icon [name]="isCopied ? 'check' : 'copy'" [size]="14"></app-icon>
                    <span>{{ isCopied ? 'Copié !' : 'Copier' }}</span>
                  </button>
                </div>
              </div>

              <div class="share-box" style="margin-top: 16px;">
                <label class="caption" style="font-weight: 700;">CODE DE PARTAGE COURT :</label>
                <div class="code-pill">{{ sharedQuiz.shareCode }}</div>
              </div>
            </div>

            <div class="modal-footer">
              <button class="btn btn-secondary" (click)="sharedQuiz = null">Fermer</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .quiz-list-page {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
    }

    /* UNIFIED COMPACT TOOLBAR (AIRY SPACING) */
    .filter-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      padding: 10px 16px;
      margin-bottom: 8px;
      flex-wrap: wrap;

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

      .promo-filter-box {
        display: flex;
        align-items: center;
        gap: 6px;
        background: var(--color-background);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm);
        padding: 0 10px;
        height: 36px;

        .filter-lbl {
          font-size: 11.5px;
          font-weight: 700;
          color: var(--color-navy);
          white-space: nowrap;
        }

        .promo-select {
          border: none;
          background: transparent;
          font-size: 12.5px;
          font-weight: 700;
          color: var(--color-navy);
          outline: none;
          cursor: pointer;
        }
      }

      .filter-pills {
        display: flex;
        gap: 6px;

        .pill-btn {
          padding: 5px 14px;
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
          }
        }
      }
    }

    /* 4 CARDS PER ROW GRID (DESKTOP, NEVER OVERFLOWS) */
    .quiz-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 16px;
      width: 100%;
      max-width: 100%;
      min-width: 0;
      box-sizing: border-box;
    }

    @media (max-width: 1250px) {
      .quiz-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    }
    @media (max-width: 950px) {
      .quiz-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    @media (max-width: 620px) {
      .quiz-grid { grid-template-columns: 1fr; }
    }

    /* COMPACT CARD */
    .quiz-compact-card {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      border-radius: var(--radius-lg);
      border: 1px solid var(--color-border);
      background: #FFFFFF;
      min-width: 0;
      max-width: 100%;
      box-sizing: border-box;
      box-shadow: var(--shadow-sm);
      transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);

      &:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-md);
        border-color: #CBD5E1;
      }

      .card-main-row {
        display: flex;
        gap: 12px;
        align-items: flex-start;
        min-width: 0;
        width: 100%;

        .quiz-thumb {
          width: 50px;
          height: 50px;
          min-width: 50px;
          border-radius: var(--radius-sm);
          object-fit: cover;
          border: 1px solid var(--color-border);
          flex-shrink: 0;
        }

        .quiz-info {
          flex: 1;
          min-width: 0;

          .tags-row {
            display: flex;
            align-items: center;
            gap: 6px;
            margin-bottom: 4px;
            flex-wrap: wrap;

            .category-pill {
              font-size: 10px;
              font-weight: 700;
              color: var(--color-navy);
              background: var(--color-navy-light);
              padding: 2px 6px;
              border-radius: var(--radius-xs);
            }

            .vis-badge {
              font-size: 9.5px;
              font-weight: 800;
              color: var(--color-text-secondary);
              display: inline-flex;
              align-items: center;
              gap: 3px;

              .status-dot {
                width: 5px;
                height: 5px;
                border-radius: 50%;
                background: #94A3B8;
              }

              &.is-pub {
                color: #059669;
                .status-dot { background: #10B981; }
              }
            }

            .code-txt {
              font-family: monospace;
              font-size: 10px;
              color: var(--color-text-secondary);
              margin-left: auto;
            }
          }

          .quiz-title {
            font-size: 14px;
            font-weight: 800;
            color: var(--color-navy);
            margin: 0 0 4px 0;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .quiz-metrics {
            font-size: 11px;
            color: var(--color-text-secondary);
            display: flex;
            align-items: center;
            gap: 5px;

            strong { color: var(--color-navy); }
            .score-val strong { color: var(--color-success); }
          }
        }
      }

      .card-action-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 6px;
        padding-top: 10px;
        border-top: 1px solid var(--color-border);
        margin-top: auto;

        .btn-play {
          flex: 1;
          font-size: 11px;
          font-weight: 800;
          padding: 0 8px;
          height: 28px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
        }

        .sub-actions {
          display: flex;
          gap: 4px;

          .btn-icon {
            width: 28px;
            height: 28px;
            padding: 0;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: var(--radius-xs);

            &.btn-del:hover {
              background: #FEE2E2;
              border-color: var(--color-danger);
            }
          }
        }
      }
    }

    /* LIST MODE (ROWS) */
    .quiz-list-rows {
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

          .vis-badge {
            font-size: 9px;
            font-weight: 800;
            color: var(--color-text-secondary);
            display: inline-flex;
            align-items: center;
            gap: 3px;

            .status-dot {
              width: 4px;
              height: 4px;
              border-radius: 50%;
              background: #94A3B8;
            }

            &.is-pub {
              color: #059669;
              .status-dot { background: #10B981; }
            }
          }

          .code-txt {
            font-family: monospace;
            font-size: 9px;
            color: var(--color-text-secondary);
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
          padding: 0 8px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .btn-icon {
          width: 26px;
          height: 26px;
          padding: 0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-xs);
        }
      }
    }

    .locked-action-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      background: #F1F5F9;
      border: 1px solid #CBD5E1;
      border-radius: var(--radius-sm);
      font-size: 12px;
      font-weight: 700;
      color: #475569;
      cursor: not-allowed;
    }

    .locked-mini-chip {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 26px;
      height: 26px;
      background: #F1F5F9;
      border-radius: var(--radius-xs);
      border: 1px solid #CBD5E1;
    }
  `]
})
export class QuizListComponent {
  private quizService = inject(QuizService);
  public authService = inject(AuthService);
  public promotionService = inject(PromotionService);
  public confirmService = inject(ConfirmDialogService);

  quizzes = this.quizService.getQuizzes();

  // Liste des quiz appartenant au formateur connecté
  myQuizzes = computed(() => {
    const user = this.authService.currentUser();
    const list = this.quizzes();
    if (!user) return list;
    return list.filter(q => 
      q.creatorId === user.id || 
      q.creatorId === user.email || 
      (q as any).creatorEmail === user.email
    );
  });

  searchQuery = '';
  selectedPromotionFilter = 'ACTIVE';
  selectedVisFilter: 'ALL' | 'PUBLIC' | 'PRIVATE' = 'ALL';
  viewMode: 'grid' | 'list' = 'grid';

  currentPage = 1;
  pageSize = 8; // 2 rows of 4 items

  isFilterLoading = false;
  get isLoading(): boolean {
    return this.quizService.isLoading() || this.isFilterLoading;
  }
  activeTestQuiz: Quiz | null = null;
  sharedQuiz: Quiz | null = null;
  isCopied = false;

  onFilterChange() {
    this.currentPage = 1;
    this.isFilterLoading = true;
    setTimeout(() => {
      this.isFilterLoading = false;
    }, 220);
  }

  isReadOnly(): boolean {
    if (this.promotionService.isGlobalReadOnly()) return true;
    if (this.selectedPromotionFilter === 'ACTIVE') {
      return this.promotionService.activePromotion()?.status === 'ARCHIVED';
    }
    if (this.selectedPromotionFilter !== 'ALL') {
      const p = this.promotionService.getPromotionById(this.selectedPromotionFilter);
      return p?.status === 'ARCHIVED';
    }
    return false;
  }

  filteredQuizzes(): Quiz[] {
    return this.myQuizzes().filter(q => {
      const matchSearch = !this.searchQuery ||
        q.title.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        q.shareCode.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        q.category.toLowerCase().includes(this.searchQuery.toLowerCase());
      
      const matchVis = this.selectedVisFilter === 'ALL' ||
        (this.selectedVisFilter === 'PUBLIC' && q.visibility === 'PUBLIC') ||
        (this.selectedVisFilter === 'PRIVATE' && q.visibility === 'PRIVATE');

      return matchSearch && matchVis;
    });
  }

  paginatedQuizzes(): Quiz[] {
    const list = this.filteredQuizzes();
    const start = (this.currentPage - 1) * this.pageSize;
    return list.slice(start, start + this.pageSize);
  }

  toggleVisibility(quizId: string) {
    this.quizService.toggleVisibility(quizId);
  }

  async deleteQuiz(quizId: string) {
    const ok = await this.confirmService.confirm({
      title: 'Supprimer le quiz',
      message: 'Voulez-vous vraiment supprimer définitivement ce quiz ?',
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      variant: 'danger',
      icon: 'trash'
    });
    if (!ok) return;
    this.quizService.deleteQuiz(quizId);
  }

  openShareModal(quiz: Quiz) {
    this.sharedQuiz = quiz;
    this.isCopied = false;
  }

  getShareUrl(quiz: Quiz): string {
    return `${window.location.origin}/quiz/play/${quiz.shareCode}`;
  }

  copyLink(url: string) {
    navigator.clipboard.writeText(url);
    this.isCopied = true;
    setTimeout(() => this.isCopied = false, 2000);
  }
}
