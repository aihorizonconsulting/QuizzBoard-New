import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommunityService } from '../../../core/services/community.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { Community } from '../../../core/models/community.model';
import { extractFieldErrors, getGeneralErrorMessage } from '../../../core/utils/form-error.util';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { CommunityHubComponent } from '../../../shared/components/community-hub/community-hub.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-community-manage',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, CommunityHubComponent, PaginationComponent],
  template: `
    <div class="community-page">
      <!-- =========================================================================
           VIEW 1: DIRECTORY OF COMMUNITIES (CLEAN & AIRY)
           ========================================================================= -->
      @if (!selectedCommunityId) {
        <!-- CLEAN PAGE HEADER -->
        <div class="page-header animate-fade-in">
          <div class="header-titles">
            <h1 class="h1">Communautés Pédagogiques & Hubs</h1>
            <p class="body-small">Échangez avec d'autres formateurs, partagez vos quiz et collaborez avec vos étudiants.</p>
          </div>

          <div class="header-buttons">
            <button class="btn btn-outline btn-sm" (click)="showJoinModal = true">
              <app-icon name="lock" [size]="14"></app-icon>
              <span>Rejoindre</span>
            </button>
            <button class="btn btn-primary btn-sm" (click)="showCreateModal = true">
              <app-icon name="plus" [size]="15" color="var(--color-navy)"></app-icon>
              <span>Créer une Communauté</span>
            </button>
          </div>
        </div>

        <!-- UNIFIED COMPACT SEARCH & FILTER TOOLBAR -->
        <div class="filter-toolbar card animate-fade-in">
          <div class="search-box">
            <app-icon name="search" [size]="16" color="var(--color-text-secondary)"></app-icon>
            <input 
              type="text" 
              [(ngModel)]="searchQuery" 
              placeholder="Rechercher une communauté par nom, catégorie..."
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
              [class.active]="filterType === 'ALL'" 
              (click)="filterType = 'ALL'; currentPage = 1">
              Toutes ({{ communities().length }})
            </button>
            <button
              type="button"
              class="pill-btn"
              [class.active]="filterType === 'MINE'"
              (click)="filterType = 'MINE'; currentPage = 1">
              Mes communautés ({{ myCommunitiesCount() }})
            </button>
            <button 
              type="button" 
              class="pill-btn" 
              [class.active]="filterType === 'PUBLIC'" 
              (click)="filterType = 'PUBLIC'; currentPage = 1">
              Publiques
            </button>
            <button 
              type="button" 
              class="pill-btn" 
              [class.active]="filterType === 'PRIVATE'" 
              (click)="filterType = 'PRIVATE'; currentPage = 1">
              Privées
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

        <!-- COMMUNITIES CONTAINER -->
        @if (commService.isLoading()) {
          <div class="communities-grid animate-fade-in" style="margin-bottom: 24px;">
            @for (i of [1, 2, 3, 4]; track i) {
              <div class="comm-compact-card card" style="pointer-events: none; border-color: #E2E8F0;">
                <div class="card-main-row">
                  <div class="skeleton-shimmer" style="width: 52px; height: 52px; border-radius: 6px; flex-shrink: 0;"></div>
                  <div style="flex: 1; display: flex; flex-direction: column; gap: 6px;">
                    <div class="skeleton-shimmer" style="height: 14px; width: 65px; border-radius: 9999px;"></div>
                    <div class="skeleton-shimmer" style="height: 16px; width: 80%; border-radius: 4px;"></div>
                    <div class="skeleton-shimmer" style="height: 12px; width: 45%; border-radius: 4px;"></div>
                  </div>
                </div>
                <div class="card-action-bar" style="margin-top: 10px; padding-top: 8px; border-top: 1px dashed #F1F5F9;">
                  <div class="skeleton-shimmer" style="height: 12px; width: 75px; border-radius: 4px;"></div>
                  <div class="skeleton-shimmer" style="height: 24px; width: 55px; border-radius: 6px;"></div>
                </div>
              </div>
            }
          </div>
        } @else if (communities().length === 0) {
          <!-- INITIAL ZERO STATE WITH PRIMARY CTA -->
          <div class="empty-state-box animate-fade-in card" style="text-align: center; padding: 48px 24px; border: 2px dashed #CBD5E1; background: #FAFBFD;">
            <div class="empty-icon-wrap" style="width: 68px; height: 68px; margin: 0 auto 16px; border-radius: 50%; background: #EFF6FF; border: 1px solid #DBEAFE; display: flex; align-items: center; justify-content: center;">
              <app-icon name="users" [size]="32" color="var(--color-navy)"></app-icon>
            </div>
            <h3 style="font-size: 20px; font-weight: 800; color: var(--color-navy); margin-bottom: 8px;">Aucune communauté pour le moment</h3>
            <p style="color: var(--color-text-secondary); max-width: 480px; margin: 0 auto 24px; font-size: 14px; line-height: 1.6;">
              Fédérez vos apprenants et vos pairs au sein d'un hub d'échange interactif avec forums de discussion, ressources partagées et quiz collaboratifs.
            </p>
            <div style="display: flex; align-items: center; justify-content: center; gap: 12px;">
              <button class="btn btn-primary btn-lg" (click)="showCreateModal = true" style="display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 4px 14px rgba(255,107,0,0.25);">
                <app-icon name="plus" [size]="18" color="var(--color-navy)"></app-icon>
                <span>Créer une Communauté</span>
              </button>
            </div>
          </div>
        } @else if (filteredCommunities().length === 0) {
          <!-- FILTER ZERO STATE -->
          <div class="empty-state-box animate-fade-in card" style="text-align: center; padding: 40px 24px;">
            <div class="empty-icon-wrap" style="width: 56px; height: 56px; margin: 0 auto 14px; border-radius: 50%; background: #F1F5F9; display: flex; align-items: center; justify-content: center;">
              <app-icon name="search" [size]="28" color="var(--color-navy)"></app-icon>
            </div>
            <h3 class="empty-title">Aucune communauté trouvée</h3>
            <p class="empty-desc">
              Aucun résultat ne correspond à votre recherche <strong>"{{ searchQuery }}"</strong>.
            </p>
            <button class="btn btn-outline btn-sm" (click)="searchQuery = ''; filterType = 'ALL'; currentPage = 1">
              Réinitialiser les filtres
            </button>
          </div>
        } @else {
          <!-- 1. GRID MODE (4 ITEMS PER ROW ON DESKTOP) -->
          @if (viewMode === 'grid') {
            <div class="communities-grid animate-fade-in">
              @for (comm of paginatedCommunities(); track comm.id) {
                <div class="comm-compact-card card card-interactive" (click)="openCommunity(comm)">
                  <div class="card-main-row">
                    @if (comm.coverImage) {
                      <img [src]="comm.coverImage" class="comm-thumb" alt="Couverture">
                    } @else {
                      <div class="comm-thumb thumb-fallback">{{ comm.name.charAt(0) }}</div>
                    }

                    <div class="comm-info">
                      <div class="tags-row">
                        <span class="category-pill">{{ comm.category || 'Général' }}</span>
                        <span class="vis-badge" [class.is-priv]="comm.isPrivate">
                          <span class="status-dot"></span>
                          {{ comm.isPrivate ? 'Privée' : 'Publique' }}
                        </span>
                        @if (comm.myRole && comm.accessCode) { <span class="code-txt">#{{ comm.accessCode }}</span> }
                      </div>

                      <h3 class="comm-title" [title]="comm.name">{{ comm.name }}</h3>

                      <div class="comm-metrics">
                        <span><strong>{{ comm.membersCount }}</strong> membres</span>
                        <span>•</span>
                        <span><strong>{{ comm.quizzesCount }}</strong> quiz</span>
                        <span class="hide-on-mobile">•</span>
                        <span class="hide-on-mobile"><strong>{{ comm.topicsCount }}</strong> sujets</span>
                      </div>
                    </div>
                  </div>

                  <div class="card-action-bar">
                    <span class="creator-label">
                      @if (comm.myRole) { <strong class="role-chip">{{ roleLabel(comm.myRole) }}</strong> }
                      Par {{ comm.creatorName }}
                    </span>
                    <button class="btn btn-primary btn-sm btn-enter" (click)="$event.stopPropagation(); openCommunity(comm)">
                      <span>{{ comm.myRole ? 'Entrer' : 'Rejoindre' }}</span>
                      <app-icon name="arrow-right" [size]="12" color="var(--color-navy)"></app-icon>
                    </button>
                  </div>
                </div>
              }
            </div>
          }

          <!-- 2. LIST MODE (HORIZONTAL ROWS) -->
          @if (viewMode === 'list') {
            <div class="communities-list-rows animate-fade-in">
              @for (comm of paginatedCommunities(); track comm.id) {
                <div class="comm-list-row card card-interactive" (click)="openCommunity(comm)">
                  @if (comm.coverImage) {
                    <img [src]="comm.coverImage" class="row-thumb" alt="Couverture">
                  } @else {
                    <div class="row-thumb thumb-fallback">{{ comm.name.charAt(0) }}</div>
                  }

                  <div class="row-main-info">
                    <div class="row-top-tags">
                      <span class="category-pill">{{ comm.category || 'Général' }}</span>
                      <span class="vis-badge" [class.is-priv]="comm.isPrivate">
                        <span class="status-dot"></span>
                        {{ comm.isPrivate ? 'Privée' : 'Publique' }}
                      </span>
                      @if (comm.myRole && comm.accessCode) { <span class="code-txt">#{{ comm.accessCode }}</span> }
                    </div>
                    <h3 class="row-title">{{ comm.name }}</h3>
                  </div>

                  <div class="row-stats">
                    <div class="stat-item">
                      <span class="stat-num">{{ comm.membersCount }}</span>
                      <span class="stat-label">Membres</span>
                    </div>
                    <div class="stat-item">
                      <span class="stat-num">{{ comm.quizzesCount }}</span>
                      <span class="stat-label">Quiz</span>
                    </div>
                    <div class="stat-item hide-on-mobile">
                      <span class="stat-num">{{ comm.topicsCount }}</span>
                      <span class="stat-label">Sujets</span>
                    </div>
                  </div>

                  <div class="row-actions">
                    @if (comm.myRole) { <strong class="role-chip">{{ roleLabel(comm.myRole) }}</strong> }
                    <button class="btn btn-primary btn-sm btn-enter" (click)="$event.stopPropagation(); openCommunity(comm)">
                      <span>{{ comm.myRole ? 'Entrer' : 'Rejoindre' }}</span>
                      <app-icon name="arrow-right" [size]="12" color="var(--color-navy)"></app-icon>
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
            [totalItems]="filteredCommunities().length" 
            (pageChange)="currentPage = $event">
          </app-pagination>
        }
      }

      <!-- VUE 2 : ESPACE DE LA COMMUNAUTÉ (discussions, documents, réunions, quiz, membres, paramètres) -->
      @if (selectedCommunityId) {
        <app-community-hub
          [communityId]="selectedCommunityId"
          [initialTab]="initialTab"
          (back)="closeHub()"
          (left)="closeHub()">
        </app-community-hub>
      }

      <!-- POPUP MODAL: CREATE COMMUNITY (FULLSCREEN BACKDROP) -->
      @if (showCreateModal) {
        <div class="modal-backdrop animate-fade-in" (click)="showCreateModal = false">
          <div class="modal-card card" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3 class="h2">Créer une Nouvelle Communauté</h3>
              <button class="close-btn" (click)="showCreateModal = false">✕</button>
            </div>

            <form (ngSubmit)="createCommunitySubmit()" class="modal-form">
              @if (generalError) {
                <div class="auth-error-banner animate-shake" style="margin-bottom: 14px;">
                  <app-icon name="alert" [size]="16" color="#FFFFFF"></app-icon>
                  <span>{{ generalError }}</span>
                </div>
              }

              <div class="form-group">
                <label class="form-label">Nom de la Communauté *</label>
                <input 
                  type="text" 
                  [(ngModel)]="newCommName" 
                  name="commName" 
                  required 
                  placeholder="Ex: Club Data Science, Promo M2 Cybersécurité..." 
                  class="input-field"
                  [class.input-error]="fieldErrors['name']"
                  (input)="clearFieldError('name')">
                @if (fieldErrors['name']) {
                  <span class="field-error-msg">
                    <app-icon name="alert" [size]="13" color="var(--color-danger)"></app-icon>
                    <span>{{ fieldErrors['name'] }}</span>
                  </span>
                }
              </div>

              <div class="form-group">
                <label class="form-label">Description & Objectif *</label>
                <textarea 
                  [(ngModel)]="newCommDesc" 
                  name="commDesc" 
                  rows="3" 
                  placeholder="Décrivez les sujets abordés et les bénéfices pour les membres..." 
                  class="input-field"
                  [class.input-error]="fieldErrors['description']"
                  (input)="clearFieldError('description')"></textarea>
                @if (fieldErrors['description']) {
                  <span class="field-error-msg">
                    <app-icon name="alert" [size]="13" color="var(--color-danger)"></app-icon>
                    <span>{{ fieldErrors['description'] }}</span>
                  </span>
                }
              </div>

              <div class="grid-2">
                <div class="form-group">
                  <label class="form-label">Catégorie *</label>
                  <select 
                    [(ngModel)]="newCommCategory" 
                    name="commCat" 
                    class="select-field"
                    [class.input-error]="fieldErrors['category']"
                    (change)="clearFieldError('category')">
                    <option value="Tech & Informatique">Tech & Informatique</option>
                    <option value="Pédagogie & EdTech">Pédagogie & EdTech</option>
                    <option value="Data & IA">Data & IA</option>
                    <option value="Business & Marketing">Business & Marketing</option>
                    <option value="Santé & Sciences">Santé & Sciences</option>
                  </select>
                  @if (fieldErrors['category']) {
                    <span class="field-error-msg">
                      <app-icon name="alert" [size]="13" color="var(--color-danger)"></app-icon>
                      <span>{{ fieldErrors['category'] }}</span>
                    </span>
                  }
                </div>

                <div class="form-group">
                  <label class="form-label">Confidentialité *</label>
                  <select [(ngModel)]="newCommIsPrivate" name="commPriv" class="select-field">
                    <option [ngValue]="false">Publique (Accès Libre)</option>
                    <option [ngValue]="true">Privée (Sur Code d'accès)</option>
                  </select>
                </div>
              </div>

              <div class="modal-actions-footer">
                <button type="button" class="btn btn-outline" (click)="showCreateModal = false">Annuler</button>
                <button type="submit" class="btn btn-primary">
                  <app-icon name="sparkles" [size]="15" color="var(--color-navy)"></app-icon>
                  <span>Créer la Communauté</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- POPUP MODAL: JOIN WITH ACCESS CODE -->
      @if (showJoinModal) {
        <div class="modal-backdrop animate-fade-in" (click)="showJoinModal = false">
          <div class="modal-card card" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3 class="h2">Rejoindre une Communauté</h3>
              <button class="close-btn" (click)="showJoinModal = false">✕</button>
            </div>

            <div class="modal-form">
              <p class="body-small" style="margin-bottom: 16px;">
                Saisissez le code d'accès partagé par le formateur ou l'administrateur de la communauté.
              </p>

              <div class="form-group">
                <label class="form-label">Code d'accès (ex: GLIA-2026, DATA-AFRICA)</label>
                <input 
                  type="text" 
                  [(ngModel)]="joinCodeInput" 
                  placeholder="EX: GLIA-2026" 
                  class="input-field" 
                  [class.input-error]="joinFieldErrors['accessCode'] || joinError"
                  (input)="clearJoinFieldError('accessCode')"
                  style="text-transform: uppercase; font-weight: 800; letter-spacing: 2px;">
                @if (joinFieldErrors['accessCode']) {
                  <span class="field-error-msg">
                    <app-icon name="alert" [size]="13" color="var(--color-danger)"></app-icon>
                    <span>{{ joinFieldErrors['accessCode'] }}</span>
                  </span>
                } @else if (joinError) {
                  <span class="field-error-msg">
                    <app-icon name="alert" [size]="13" color="var(--color-danger)"></app-icon>
                    <span>{{ joinError }}</span>
                  </span>
                }
              </div>

              <div class="modal-actions-footer">
                <button type="button" class="btn btn-outline" (click)="showJoinModal = false">Annuler</button>
                <button type="button" class="btn btn-primary" (click)="joinCommunitySubmit()">
                  <span>Accéder au Hub</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      }

    </div>
  `,
  styles: [`
    .community-page {
      display: flex;
      flex-direction: column;
      gap: 20px;
      width: 100%;
      max-width: 100%;
      min-width: 0;
      overflow-x: hidden;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 14px;
      width: 100%;
      min-width: 0;

      .header-titles {
        flex: 1;
        min-width: 240px;
      }

      .header-buttons {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }
    }

    /* UNIFIED COMPACT TOOLBAR WITH NO OVERFLOW */
    .filter-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 8px 14px;
      margin-bottom: 4px;
      flex-wrap: wrap;
      width: 100%;
      max-width: 100%;
      min-width: 0;
      box-sizing: border-box;

      .search-box {
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 1;
        min-width: 200px;
        height: 36px;
        background: var(--color-background);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm);
        padding: 0 10px;

        .search-input {
          flex: 1;
          min-width: 0;
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
        flex-wrap: wrap;

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

    /* COMMUNITIES DIRECTORY GRID (3 ITEMS DESKTOP, NEVER OVERFLOWS) */
    .communities-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 16px;
      width: 100%;
      max-width: 100%;
      min-width: 0;
      box-sizing: border-box;
    }

    @media (max-width: 1150px) {
      .communities-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    @media (max-width: 680px) {
      .communities-grid { grid-template-columns: 1fr; }
    }

    .comm-compact-card {
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      border-radius: var(--radius-md);
      cursor: pointer;
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

        .comm-thumb {
          width: 50px;
          height: 50px;
          min-width: 50px;
          border-radius: var(--radius-sm);
          object-fit: cover;
          border: 1px solid var(--color-border);
          flex-shrink: 0;
        }

        .comm-info {
          flex: 1;
          min-width: 0;

          .tags-row {
            display: flex;
            align-items: center;
            gap: 4px;
            margin-bottom: 3px;
            flex-wrap: wrap;

            .category-pill {
              font-size: 9.5px;
              font-weight: 700;
              color: var(--color-navy);
              background: var(--color-navy-light);
              padding: 1px 5px;
              border-radius: var(--radius-xs);
            }

            .vis-badge {
              font-size: 9px;
              font-weight: 800;
              color: #059669;
              display: inline-flex;
              align-items: center;
              gap: 3px;

              .status-dot {
                width: 4px;
                height: 4px;
                border-radius: 50%;
                background: #10B981;
              }

              &.is-priv {
                color: var(--color-text-secondary);
                .status-dot { background: #94A3B8; }
              }
            }

            .code-txt {
              font-family: monospace;
              font-size: 9.5px;
              color: var(--color-text-secondary);
              margin-left: auto;
            }
          }

          .comm-title {
            font-size: 13.5px;
            font-weight: 800;
            color: var(--color-navy);
            margin: 0 0 3px 0;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            display: block;
          }

          .comm-metrics {
            font-size: 10.5px;
            color: var(--color-text-secondary);
            display: flex;
            align-items: center;
            gap: 4px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;

            strong { color: var(--color-navy); }
          }
        }
      }

      .card-action-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
        padding-top: 8px;
        border-top: 1px solid var(--color-border);
        margin-top: auto;
        min-width: 0;
        width: 100%;

        .creator-label {
          font-size: 10.5px;
          color: var(--color-text-secondary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          min-width: 0;
          flex: 1;
        }

        .btn-enter {
          font-size: 11px;
          font-weight: 800;
          height: 26px;
          padding: 0 9px;
          display: inline-flex;
          align-items: center;
          gap: 3px;
          flex-shrink: 0;
        }
      }
    }

    /* LIST MODE (ROWS) */
    .communities-list-rows {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .comm-list-row {
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

      .thumb-fallback {
        display: flex;
        align-items: center;
        justify-content: center;
        background: #EEF2FF;
        color: var(--color-navy);
        font-weight: 800;
        font-size: 18px;
        text-transform: uppercase;
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
            color: #059669;
            display: inline-flex;
            align-items: center;
            gap: 3px;

            .status-dot {
              width: 4px;
              height: 4px;
              border-radius: 50%;
              background: #10B981;
            }

            &.is-priv {
              color: var(--color-text-secondary);
              .status-dot { background: #94A3B8; }
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

        .btn-enter {
          font-size: 11px;
          font-weight: 800;
          height: 26px;
          padding: 0 8px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
      }
    }

    .role-chip {
      display: inline-block;
      margin-right: 6px;
      padding: 1px 8px;
      border-radius: 999px;
      background: #FFF7ED;
      color: #C2410C;
      font-size: 11px;
      font-weight: 800;
    }

    /* MODALS */
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 18px;
      .close-btn { background: none; border: none; font-size: 18px; cursor: pointer; }
    }

    .modal-form {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .modal-actions-footer {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 8px;
    }

    @media (max-width: 768px) {
      .page-header { flex-direction: column; align-items: flex-start; }
      .header-buttons { width: 100%; button { flex: 1; } }
      .comm-hero { padding: 20px 16px; }
      .communities-grid { grid-template-columns: 1fr; }
    }

    .skeleton-shimmer {
      background: linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%);
      background-size: 200% 100%;
      animation: shimmerEffect 1.5s infinite;
    }

    @keyframes shimmerEffect {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
  `]
})
export class CommunityManageComponent {
  public commService = inject(CommunityService);
  public authService = inject(AuthService);
  private toast = inject(ToastService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  communities = this.commService.getCommunities();
  /** Communauté ouverte (espace détaillé) ; null = annuaire. */
  selectedCommunityId: string | null = null;
  initialTab: string | null = null;

  searchQuery = '';
  filterType: 'ALL' | 'MINE' | 'PUBLIC' | 'PRIVATE' = 'ALL';
  viewMode: 'grid' | 'list' = 'grid';

  currentPage = 1;
  pageSize = 6; // 2 rows of 3 items per page

  // Modals
  showCreateModal = false;
  showJoinModal = false;

  // New community form
  newCommName = '';
  newCommDesc = '';
  newCommCategory = 'Tech & Informatique';
  newCommIsPrivate = false;

  // Join form
  joinCodeInput = '';
  joinError = '';

  // Form field errors
  fieldErrors: Record<string, string> = {};
  joinFieldErrors: Record<string, string> = {};
  generalError = '';

  constructor() {
    // Liens des notifications et emails : ?communaute=<id>&onglet=documents|reunions|quiz...
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe(params => {
      const id = params.get('communaute');
      if (id) {
        this.initialTab = params.get('onglet');
        this.selectedCommunityId = id;
        this.cdr.markForCheck();
      }
    });
  }

  myCommunitiesCount(): number {
    return this.communities().filter(c => !!c.myRole && c.myRole !== 'ADMIN').length;
  }

  filteredCommunities(): Community[] {
    // Mes communautés d'abord, puis les plus récentes (une nouvelle communauté apparaît en tête de liste)
    const q = this.searchQuery.trim().toLowerCase();
    const byRelevance = (a: Community, b: Community) =>
      Number(!!b.myRole) - Number(!!a.myRole) ||
      (b.createdAt || '').localeCompare(a.createdAt || '');
    return this.communities().filter(c => {
      const matchSearch = !q ||
        c.name.toLowerCase().includes(q) ||
        (c.description || '').toLowerCase().includes(q) ||
        (c.accessCode || '').toLowerCase().includes(q) ||
        (c.category || '').toLowerCase().includes(q);

      const matchType = this.filterType === 'ALL' ||
        (this.filterType === 'MINE' && !!c.myRole && c.myRole !== 'ADMIN') ||
        (this.filterType === 'PUBLIC' && !c.isPrivate) ||
        (this.filterType === 'PRIVATE' && c.isPrivate);

      return matchSearch && matchType;
    }).sort(byRelevance);
  }

  paginatedCommunities(): Community[] {
    const list = this.filteredCommunities();
    const start = (this.currentPage - 1) * this.pageSize;
    return list.slice(start, start + this.pageSize);
  }

  /** Membre : ouvre l'espace ; communauté publique dont on n'est pas membre : la rejoindre d'abord. */
  openCommunity(comm: Community) {
    if (comm.myRole) {
      this.initialTab = null;
      this.selectedCommunityId = comm.id;
      return;
    }
    if (!comm.accessCode) return;
    this.commService.joinCommunityApi(comm.accessCode).subscribe({
      next: (joined) => {
        this.toast.success(`Bienvenue dans « ${joined.name} » !`);
        this.initialTab = null;
        this.selectedCommunityId = joined.id;
        this.cdr.markForCheck();
      },
      error: (err) => this.toast.apiError(err, 'Impossible de rejoindre cette communauté pour le moment.')
    });
  }

  closeHub() {
    this.selectedCommunityId = null;
    this.initialTab = null;
    if (this.route.snapshot.queryParamMap.has('communaute')) {
      this.router.navigate([], { relativeTo: this.route, queryParams: {} });
    }
  }

  roleLabel(role: Community['myRole']): string {
    switch (role) {
      case 'CREATOR': return 'Créateur';
      case 'MODERATOR': return 'Modérateur';
      case 'STUDENT': return 'Membre';
      case 'ADMIN': return 'Admin';
      default: return '';
    }
  }

  clearFieldError(field: string): void {
    if (this.fieldErrors[field]) {
      const updated = { ...this.fieldErrors };
      delete updated[field];
      this.fieldErrors = updated;
    }
  }

  clearJoinFieldError(field: string): void {
    this.joinError = '';
    if (this.joinFieldErrors[field]) {
      const updated = { ...this.joinFieldErrors };
      delete updated[field];
      this.joinFieldErrors = updated;
    }
  }

  createCommunitySubmit() {
    this.fieldErrors = {};
    this.generalError = '';

    if (!this.newCommName.trim()) {
      this.fieldErrors['name'] = 'Le nom de la communauté est obligatoire.';
    }
    if (!this.newCommDesc.trim()) {
      this.fieldErrors['description'] = 'La description de la communauté est obligatoire.';
    }
    if (!this.newCommCategory) {
      this.fieldErrors['category'] = 'La catégorie de la communauté est obligatoire.';
    }

    if (Object.keys(this.fieldErrors).length > 0) {
      return;
    }

    this.commService.createCommunityApi({
      name: this.newCommName.trim(),
      description: this.newCommDesc.trim(),
      category: this.newCommCategory,
      isPrivate: this.newCommIsPrivate
    }).subscribe({
      next: (newComm) => {
        this.showCreateModal = false;
        this.newCommName = '';
        this.newCommDesc = '';
        this.fieldErrors = {};
        this.toast.success(`Communauté créée. Code d'accès à partager : ${newComm.accessCode}`);
        this.initialTab = null;
        this.selectedCommunityId = newComm.id;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.fieldErrors = extractFieldErrors(err);
        this.generalError = getGeneralErrorMessage(err, 'Impossible de créer la communauté.');
        this.cdr.markForCheck();
      }
    });
  }

  joinCommunitySubmit() {
    this.joinError = '';
    this.joinFieldErrors = {};

    const code = this.joinCodeInput.trim().toUpperCase();
    if (!code) {
      this.joinFieldErrors['accessCode'] = 'Le code d\'accès est obligatoire.';
      return;
    }

    this.commService.joinCommunityApi(code).subscribe({
      next: (found) => {
        this.showJoinModal = false;
        this.joinCodeInput = '';
        this.joinFieldErrors = {};
        this.initialTab = null;
        this.selectedCommunityId = found.id;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.joinFieldErrors = extractFieldErrors(err);
        if (this.joinFieldErrors['accessCode']) {
          this.joinError = this.joinFieldErrors['accessCode'];
        } else {
          this.joinError = getGeneralErrorMessage(err, 'Code d\'accès introuvable. Vérifiez l\'orthographe.');
        }
        this.cdr.markForCheck();
      }
    });
  }
}
