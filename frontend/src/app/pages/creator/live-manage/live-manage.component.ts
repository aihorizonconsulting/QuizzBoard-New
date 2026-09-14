import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LiveSessionService } from '../../../core/services/live-session.service';
import { QuizService } from '../../../core/services/quiz.service';
import { ClasseService } from '../../../core/services/classe.service';
import { PromotionService } from '../../../core/services/promotion.service';
import { LiveSessionRecord, LiveAudienceType } from '../../../core/models/live-session.model';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-live-manage',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, PaginationComponent],
  template: `
    <div class="live-page">
      <!-- HEADER -->
      <div class="page-header animate-fade-in">
        <div>
          <h1 class="h1">Sessions Multijoueur en Direct (Live)</h1>
          <p class="body-small">Lancez des arènes interactives où vos étudiants répondent simultanément depuis leur mobile.</p>
        </div>

        @if (promotionService.isGlobalReadOnly()) {
          <span class="locked-action-pill" title="Sessions Live désactivées (Promotion archivée)">
            <app-icon name="lock" [size]="14" color="#64748B"></app-icon>
            <span>Sessions Live (Désactivées)</span>
          </span>
        } @else {
          <button class="btn btn-primary btn-sm" (click)="openCreateModal()">
            <app-icon name="plus" [size]="15" color="var(--color-navy)"></app-icon>
            <span>Créer un Live</span>
          </button>
        }
      </div>

      <!-- UNIFIED COMPACT SEARCH & FILTER TOOLBAR -->
      <div class="filter-toolbar card animate-fade-in">
        <div class="search-box">
          <app-icon name="search" [size]="16" color="var(--color-text-secondary)"></app-icon>
          <input 
            type="text" 
            [(ngModel)]="searchQuery" 
            placeholder="Rechercher une session par quiz, PIN ou classe..." 
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
            [class.active]="filterStatus === 'ALL'" 
            (click)="filterStatus = 'ALL'; currentPage = 1">
            Toutes ({{ sessions().length }})
          </button>
          <button 
            type="button" 
            class="pill-btn" 
            [class.active]="filterStatus === 'WAITING'" 
            (click)="filterStatus = 'WAITING'; currentPage = 1">
            En Attente
          </button>
          <button 
            type="button" 
            class="pill-btn" 
            [class.active]="filterStatus === 'FINISHED'" 
            (click)="filterStatus = 'FINISHED'; currentPage = 1">
            Terminées
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

      <!-- SESSIONS CONTAINER -->
      @if (filteredSessions().length === 0) {
        <div class="empty-state-box animate-fade-in">
          <div class="empty-icon-wrap">
            <app-icon name="play" [size]="28" color="var(--color-navy)"></app-icon>
          </div>
          <h3 class="empty-title">Aucune session live trouvée</h3>
          <p class="empty-desc">
            Lancez votre première arène multijoueur pour faire participer vos élèves en direct sur leur smartphone avec un code PIN.
          </p>
          <button class="btn btn-primary btn-sm" (click)="openCreateModal()">
            <app-icon name="plus" [size]="15" color="var(--color-navy)"></app-icon>
            <span>Lancer une Session Live</span>
          </button>
        </div>
      } @else {
        <!-- 1. GRID MODE (4 ITEMS PER ROW ON DESKTOP) -->
        @if (viewMode === 'grid') {
          <div class="sessions-grid animate-fade-in">
            @for (sess of paginatedSessions(); track sess.id) {
              <div class="session-compact-card card card-interactive">
                <div class="card-main-row">
                  <div class="sess-icon-thumb">
                    <app-icon name="zap" [size]="20" color="var(--color-navy)"></app-icon>
                  </div>

                  <div class="sess-info">
                    <div class="tags-row">
                      <span class="pin-pill">PIN : {{ sess.pinCode }}</span>
                      <span class="status-pill" [class.is-finished]="sess.status === 'FINISHED'">
                        <span class="status-dot"></span>
                        {{ sess.status === 'FINISHED' ? 'Terminé' : 'En Attente' }}
                      </span>
                    </div>

                    <h3 class="sess-title" [title]="sess.quizTitle">{{ sess.quizTitle }}</h3>

                    <div class="sess-metrics">
                      <span>{{ sess.audienceType === 'PUBLIC' ? 'Public' : (sess.targetClassName || 'Classe') }}</span>
                      <span>•</span>
                      <span><strong>{{ sess.participantsCount }}</strong> joueurs</span>
                      @if (sess.winnerNickname) {
                        <span>•</span>
                        <span class="winner-txt">🏆 {{ sess.winnerNickname }}</span>
                      }
                    </div>
                  </div>
                </div>

                <div class="card-action-bar">
                  @if (!promotionService.isGlobalReadOnly()) {
                    <button class="btn btn-primary btn-sm btn-play" (click)="launchSession(sess)">
                      <app-icon name="play" [size]="13" color="var(--color-navy)"></app-icon>
                      <span>{{ sess.status === 'FINISHED' ? 'Relancer' : 'Lancer le Live' }}</span>
                    </button>
                  } @else {
                    <button class="btn btn-outline btn-sm btn-disabled" disabled title="Sessions Live désactivées (Promotion archivée)">
                      <app-icon name="lock" [size]="13" color="#64748B"></app-icon>
                      <span>Live désactivé</span>
                    </button>
                  }
                  <button class="btn btn-outline btn-sm btn-icon" (click)="copyPin(sess.pinCode)" title="Copier le code PIN">
                    <app-icon [name]="copiedPin === sess.pinCode ? 'check' : 'copy'" [size]="13"></app-icon>
                  </button>
                </div>
              </div>
            }
          </div>
        }

        <!-- 2. LIST MODE (HORIZONTAL ROWS) -->
        @if (viewMode === 'list') {
          <div class="sessions-list-rows animate-fade-in">
            @for (sess of paginatedSessions(); track sess.id) {
              <div class="session-list-row card card-interactive">
                <div class="row-icon-box">
                  <app-icon name="zap" [size]="18" color="var(--color-navy)"></app-icon>
                </div>

                <div class="row-main-info">
                  <div class="row-top-tags">
                    <span class="pin-pill">PIN : {{ sess.pinCode }}</span>
                    <span class="status-pill" [class.is-finished]="sess.status === 'FINISHED'">
                      <span class="status-dot"></span>
                      {{ sess.status === 'FINISHED' ? 'Terminé' : 'En Attente' }}
                    </span>
                  </div>
                  <h3 class="row-title">{{ sess.quizTitle }}</h3>
                </div>

                <div class="row-stats">
                  <div class="stat-item">
                    <span class="stat-num">{{ sess.audienceType === 'PUBLIC' ? 'Public' : (sess.targetClassName || 'Classe') }}</span>
                    <span class="stat-label">Audience</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-num">{{ sess.participantsCount }}</span>
                    <span class="stat-label">Joueurs</span>
                  </div>
                  @if (sess.winnerNickname) {
                    <div class="stat-item hide-on-mobile">
                      <span class="stat-num winner-txt">🏆 {{ sess.winnerNickname }}</span>
                      <span class="stat-label">Vainqueur</span>
                    </div>
                  }
                </div>

                <div class="row-actions">
                  @if (!promotionService.isGlobalReadOnly()) {
                    <button class="btn btn-primary btn-sm btn-play" (click)="launchSession(sess)">
                      <app-icon name="play" [size]="13" color="var(--color-navy)"></app-icon>
                      <span>{{ sess.status === 'FINISHED' ? 'Relancer' : 'Lancer' }}</span>
                    </button>
                  } @else {
                    <button class="btn btn-outline btn-sm btn-disabled" disabled title="Sessions Live désactivées (Promotion archivée)">
                      <app-icon name="lock" [size]="13" color="#64748B"></app-icon>
                      <span>Live désactivé</span>
                    </button>
                  }
                  <button class="btn btn-outline btn-sm btn-icon" (click)="copyPin(sess.pinCode)" title="Copier le code PIN">
                    <app-icon [name]="copiedPin === sess.pinCode ? 'check' : 'copy'" [size]="13"></app-icon>
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
          [totalItems]="filteredSessions().length" 
          (pageChange)="currentPage = $event">
        </app-pagination>
      }

      <!-- POPUP MODAL: CREATE LIVE SESSION -->
      @if (showCreateModal) {
        <div class="modal-backdrop" (click)="showCreateModal = false">
          <div class="modal-card card" (click)="$event.stopPropagation()">
            <div class="modal-head">
              <div>
                <div class="badge badge-primary" style="margin-bottom: 4px;">
                  <app-icon name="zap" [size]="13" color="var(--color-navy)"></app-icon>
                  <span>LANCEMENT DIRECT</span>
                </div>
                <h3 class="h2">Créer une Session Live</h3>
              </div>
              <button class="close-x" (click)="showCreateModal = false">✕</button>
            </div>

            <form (ngSubmit)="submitLaunchLive()" class="modal-form">
              <div class="form-group">
                <label>1. Choisir le Quiz à animer *</label>
                <select 
                  [(ngModel)]="selectedQuizId" 
                  name="selectedQuizId" 
                  class="select-field" 
                  [class.input-error]="fieldErrors['quiz']"
                  (change)="clearFieldError('quiz')"
                  required>
                  <option value="" disabled selected>-- Sélectionnez un Quiz --</option>
                  @for (q of quizzes(); track q.id) {
                    <option [value]="q.id">{{ q.title }} ({{ q.questionsCount }} questions)</option>
                  }
                </select>
                @if (fieldErrors['quiz']) {
                  <span class="field-error-msg">
                    <app-icon name="alert" [size]="13" color="var(--color-danger)"></app-icon>
                    <span>{{ fieldErrors['quiz'] }}</span>
                  </span>
                }
              </div>

              <div class="form-group">
                <label>2. Définir le type d'audience *</label>
                <div class="radio-pill-group">
                  <label class="radio-pill" [class.active]="audienceType === 'PUBLIC'">
                    <input type="radio" [(ngModel)]="audienceType" name="audType" value="PUBLIC">
                    <span>Public (Tout élève avec le code PIN)</span>
                  </label>
                  <label class="radio-pill" [class.active]="audienceType === 'CLASS'">
                    <input type="radio" [(ngModel)]="audienceType" name="audType" value="CLASS">
                    <span>Restreint à une Classe spécifique</span>
                  </label>
                </div>
              </div>

              @if (audienceType === 'CLASS') {
                <div class="form-group animate-fade-in">
                  <label>Sélectionner la classe ciblée *</label>
                  <select 
                    [(ngModel)]="selectedClassId" 
                    name="selectedClassId" 
                    class="select-field"
                    [class.input-error]="fieldErrors['classe']"
                    (change)="clearFieldError('classe')">
                    <option value="" disabled selected>-- Choisir la Classe --</option>
                    @for (c of classes(); track c.id) {
                      <option [value]="c.id">{{ c.name }} ({{ c.students.length }} élèves)</option>
                    }
                  </select>
                  @if (fieldErrors['classe']) {
                    <span class="field-error-msg">
                      <app-icon name="alert" [size]="13" color="var(--color-danger)"></app-icon>
                      <span>{{ fieldErrors['classe'] }}</span>
                    </span>
                  }
                </div>
              }

              <div class="form-group">
                <label>3. Temps par question & Durée calculée du Live</label>
                <div style="display: flex; align-items: center; gap: 12px; margin-top: 4px; flex-wrap: wrap;">
                  <select [(ngModel)]="createTimePerQuestion" name="createTimePerQuestion" class="select-field" style="width: 190px;">
                    <option [value]="15">15s / question</option>
                    <option [value]="20">20s / question</option>
                    <option [value]="30">30s / question</option>
                    <option [value]="45">45s / question</option>
                    <option [value]="60">60s / question</option>
                  </select>
                  <div style="font-size: 13px; color: var(--color-navy); font-weight: 800;">
                    Durée totale estimée : <span style="color: #B45309;">{{ getEstimatedDurationText() }}</span>
                  </div>
                </div>
                <span class="body-small text-muted" style="display: block; margin-top: 4px;">
                  La durée globale correspond à la somme du temps alloué à chaque question. Vous pouvez aussi arrêter le Live à tout moment.
                </span>
              </div>

              <div class="modal-btn-row">
                <button type="button" class="btn btn-outline" (click)="showCreateModal = false">
                  Annuler
                </button>
                <button type="submit" class="btn btn-primary btn-sm" [disabled]="!selectedQuizId">
                  <app-icon name="sparkles" [size]="15" color="var(--color-navy)"></app-icon>
                  <span>Démarrer le Live & Ouvrir l'Arène</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .live-page {
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

    /* UNIFIED COMPACT TOOLBAR */
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
    .sessions-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 16px;
      width: 100%;
      max-width: 100%;
      min-width: 0;
      box-sizing: border-box;
    }

    @media (max-width: 1250px) {
      .sessions-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    }
    @media (max-width: 950px) {
      .sessions-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    @media (max-width: 620px) {
      .sessions-grid { grid-template-columns: 1fr; }
    }

    .session-compact-card {
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      border-radius: var(--radius-md);
      min-width: 0;
      max-width: 100%;
      box-sizing: border-box;
      transition: transform 0.15s ease, box-shadow 0.15s ease;

      &:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-sm);
      }

      .card-main-row {
        display: flex;
        gap: 12px;
        align-items: flex-start;
        min-width: 0;
        width: 100%;

        .sess-icon-thumb {
          width: 50px;
          height: 50px;
          min-width: 50px;
          border-radius: var(--radius-sm);
          background: var(--color-navy-light);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--color-border);
          flex-shrink: 0;
        }

        .sess-info {
          flex: 1;
          min-width: 0;

          .tags-row {
            display: flex;
            align-items: center;
            gap: 6px;
            margin-bottom: 4px;

            .pin-pill {
              font-family: monospace;
              font-size: 10px;
              font-weight: 800;
              color: var(--color-navy);
              background: var(--color-primary-light);
              padding: 2px 6px;
              border-radius: var(--radius-xs);
              border: 1px solid rgba(3, 36, 71, 0.12);
            }

            .status-pill {
              font-size: 9.5px;
              font-weight: 800;
              color: var(--color-orange);
              display: inline-flex;
              align-items: center;
              gap: 3px;

              .status-dot {
                width: 5px;
                height: 5px;
                border-radius: 50%;
                background: var(--color-orange);
              }

              &.is-finished {
                color: #059669;
                .status-dot { background: #10B981; }
              }
            }
          }

          .sess-title {
            font-size: 14px;
            font-weight: 800;
            color: var(--color-navy);
            margin: 0 0 4px 0;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .sess-metrics {
            font-size: 11px;
            color: var(--color-text-secondary);
            display: flex;
            align-items: center;
            gap: 5px;

            strong { color: var(--color-navy); }
            .winner-txt { color: var(--color-orange); font-weight: 700; }
          }
        }
      }

      .card-action-bar {
        display: flex;
        align-items: center;
        gap: 6px;
        padding-top: 10px;
        border-top: 1px solid var(--color-border);
        margin-top: auto;

        .btn-play {
          flex: 1;
          font-size: 11px;
          font-weight: 800;
          height: 28px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
        }

        .btn-icon {
          width: 28px;
          height: 28px;
          padding: 0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-xs);
        }
      }
    }

    /* LIST MODE (ROWS) */
    .sessions-list-rows {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .session-list-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 14px;
      gap: 14px;
      border-radius: var(--radius-md);

      .row-icon-box {
        width: 38px;
        height: 38px;
        border-radius: var(--radius-xs);
        background: var(--color-navy-light);
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .row-main-info {
        flex: 1;
        min-width: 0;

        .row-top-tags {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 2px;

          .pin-pill {
            font-family: monospace;
            font-size: 9.5px;
            font-weight: 800;
            color: var(--color-navy);
            background: var(--color-primary-light);
            padding: 1px 5px;
            border-radius: var(--radius-xs);
          }

          .status-pill {
            font-size: 9px;
            font-weight: 800;
            color: var(--color-orange);
            display: inline-flex;
            align-items: center;
            gap: 3px;

            .status-dot {
              width: 4px;
              height: 4px;
              border-radius: 50%;
              background: var(--color-orange);
            }

            &.is-finished {
              color: #059669;
              .status-dot { background: #10B981; }
            }
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
          .winner-txt { color: var(--color-orange); }
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

    /* MODAL STYLES */
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
      z-index: 999999 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      padding: 20px !important;
      margin: 0 !important;
    }

    .modal-card {
      width: 100%;
      max-width: 520px;
      padding: 24px;
      background: #FFFFFF;

      .modal-head {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 16px;

        .close-x {
          background: none;
          border: none;
          font-size: 18px;
          cursor: pointer;
          color: var(--color-text-secondary);
        }
      }
    }

    .modal-form {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .radio-pill-group {
      display: flex;
      flex-direction: column;
      gap: 6px;

      .radio-pill {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm);
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        transition: all 0.15s ease;

        &:hover { background: var(--color-background); }
        &.active {
          border-color: var(--color-navy);
          background: var(--color-navy-light);
          font-weight: 700;
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

    .btn-disabled {
      opacity: 0.6;
      cursor: not-allowed !important;
      border-style: dashed;
      color: #64748B;
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }
  `]
})
export class LiveManageComponent {
  private liveService = inject(LiveSessionService);
  private quizService = inject(QuizService);
  private classService = inject(ClasseService);
  public promotionService = inject(PromotionService);
  private router = inject(Router);

  sessions = this.liveService.getLiveSessions();
  quizzes = this.quizService.getQuizzes();
  classes = this.classService.getClasses();

  searchQuery = '';
  filterStatus: 'ALL' | 'WAITING' | 'FINISHED' = 'ALL';
  viewMode: 'grid' | 'list' = 'grid';

  currentPage = 1;
  pageSize = 8;

  showCreateModal = false;
  selectedQuizId = '';
  audienceType: LiveAudienceType = 'PUBLIC';
  selectedClassId = '';
  createTimePerQuestion = 20;
  copiedPin: string | null = null;

  getEstimatedDurationText(): string {
    if (!this.selectedQuizId) return 'Sélectionnez un quiz d\'abord';
    const q = this.quizzes().find(item => item.id === this.selectedQuizId);
    const count = q?.questionsCount || 5;
    const totalSecs = count * this.createTimePerQuestion;
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins} min ${secs < 10 ? '0' : ''}${secs}s (${count} questions)`;
  }

  filteredSessions(): LiveSessionRecord[] {
    return this.sessions().filter(s => {
      const matchSearch = !this.searchQuery ||
        s.quizTitle.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        s.pinCode.includes(this.searchQuery) ||
        (s.targetClassName && s.targetClassName.toLowerCase().includes(this.searchQuery.toLowerCase()));
      
      const matchStatus = this.filterStatus === 'ALL' || s.status === this.filterStatus;

      return matchSearch && matchStatus;
    });
  }

  paginatedSessions(): LiveSessionRecord[] {
    const list = this.filteredSessions();
    const start = (this.currentPage - 1) * this.pageSize;
    return list.slice(start, start + this.pageSize);
  }

  fieldErrors: Record<string, string> = {};

  clearFieldError(field: string): void {
    if (this.fieldErrors[field]) {
      const updated = { ...this.fieldErrors };
      delete updated[field];
      this.fieldErrors = updated;
    }
  }

  openCreateModal() {
    this.fieldErrors = {};
    this.selectedQuizId = this.quizzes().length > 0 ? this.quizzes()[0].id : '';
    this.audienceType = 'PUBLIC';
    this.selectedClassId = this.classes().length > 0 ? this.classes()[0].id : '';
    this.createTimePerQuestion = 20;
    this.showCreateModal = true;
  }

  submitLaunchLive() {
    this.fieldErrors = {};
    if (!this.selectedQuizId) {
      this.fieldErrors['quiz'] = 'Veuillez sélectionner un quiz à animer.';
    }
    if (this.audienceType === 'CLASS' && !this.selectedClassId) {
      this.fieldErrors['classe'] = 'Veuillez choisir une classe cible.';
    }
    if (Object.keys(this.fieldErrors).length > 0) return;

    const quiz = this.quizzes().find(q => q.id === this.selectedQuizId);
    let targetClassName: string | undefined;
    if (this.audienceType === 'CLASS' && this.selectedClassId) {
      const found = this.classes().find(c => c.id === this.selectedClassId);
      targetClassName = found?.name;
    }

    const newSession = this.liveService.createLiveSession({
      quizId: this.selectedQuizId,
      quizTitle: quiz?.title || 'Quiz Live',
      quizQuestionsCount: quiz?.questionsCount || 5,
      hostId: 'u1',
      hostName: 'Professeur',
      audienceType: this.audienceType,
      targetClassId: this.selectedClassId || undefined,
      targetClassName,
      timePerQuestionSeconds: Number(this.createTimePerQuestion)
    });

    this.showCreateModal = false;
    this.router.navigate(['/app/live/host', newSession.id]);
  }

  launchSession(sess: LiveSessionRecord) {
    this.router.navigate(['/app/live/host', sess.id]);
  }

  copyPin(pin: string) {
    navigator.clipboard.writeText(pin);
    this.copiedPin = pin;
    setTimeout(() => this.copiedPin = null, 2000);
  }
}
