import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CommunityService } from '../../../core/services/community.service';
import { AuthService } from '../../../core/services/auth.service';
import { Community, ForumTopic } from '../../../core/models/community.model';
import { extractFieldErrors, getGeneralErrorMessage } from '../../../core/utils/form-error.util';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-learner-communities',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, PaginationComponent],
  template: `
    <div class="learner-communities-page">
      <!-- =========================================================================
           VUE 1 : CATALOGUE DES COMMUNAUTÉS (AVEC ONGLET PUBLIC)
           ========================================================================= -->
      @if (!selectedCommunity) {
        <div class="page-header">
          <div>
            <h1 class="h1">Communautés & Hubs d'Échange</h1>
            <p class="body-small">Échangez avec vos pairs, participez aux discussions et accédez aux ressources partagées.</p>
          </div>

          <button class="btn btn-primary btn-sm" (click)="openCodeModal()">
            <app-icon name="plus" [size]="14" color="var(--color-navy)"></app-icon>
            <span>Rejoindre par Code</span>
          </button>
        </div>

        <!-- TABS BAR (MES COMMUNAUTÉS vs COMMUNAUTÉS PUBLIQUES) -->
        <div class="tabs-toolbar">
          <div class="main-tabs">
            <button 
              type="button" 
              class="tab-btn" 
              [class.active]="mainTab === 'MY_COMMUNITIES'"
              (click)="mainTab = 'MY_COMMUNITIES'; currentPage = 1">
              <app-icon name="users" [size]="15"></app-icon>
              <span>Mes Communautés ({{ myCommunities().length }})</span>
            </button>

            <button 
              type="button" 
              class="tab-btn" 
              [class.active]="mainTab === 'PUBLIC_COMMUNITIES'"
              (click)="mainTab = 'PUBLIC_COMMUNITIES'; currentPage = 1">
              <app-icon name="globe" [size]="15"></app-icon>
              <span>Communautés Publiques ({{ publicCommunities().length }})</span>
            </button>
          </div>
        </div>

        <!-- UNIFIED COMPACT TOOLBAR -->
        <div class="filter-toolbar card">
          <div class="search-box">
            <app-icon name="search" [size]="16" color="var(--color-text-secondary)"></app-icon>
            <input 
              type="text" 
              [(ngModel)]="searchQuery" 
              (ngModelChange)="currentPage = 1"
              placeholder="Rechercher une communauté, un sujet ou mot-clé..." 
              class="search-input">
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
              Toutes
            </button>
            @for (cat of categories(); track cat) {
              <button 
                type="button" 
                class="pill-btn" 
                [class.active]="selectedCategory === cat" 
                (click)="selectedCategory = cat; currentPage = 1">
                {{ cat }}
              </button>
            }
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

        <!-- COMMUNITIES LIST/GRID -->
        @if (displayedCommunities().length === 0) {
          <div class="empty-state-box card">
            <div class="empty-icon-wrap">
              <app-icon name="users" [size]="28" color="var(--color-navy)"></app-icon>
            </div>
            <h3 class="empty-title">
              @if (mainTab === 'MY_COMMUNITIES') {
                Vous n'avez pas encore rejoint de communauté
              } @else {
                Aucune communauté publique trouvée
              }
            </h3>
            <p class="empty-desc">
              @if (mainTab === 'MY_COMMUNITIES') {
                Explorez l'onglet des communautés publiques ou entrez un code d'accès privé pour rejoindre votre promotion.
              } @else {
                Modifiez votre recherche ou découvrez les autres catégories.
              }
            </p>
            @if (mainTab === 'MY_COMMUNITIES') {
              <button class="btn btn-primary btn-sm" (click)="mainTab = 'PUBLIC_COMMUNITIES'">
                <app-icon name="globe" [size]="14" color="var(--color-navy)"></app-icon>
                <span>Découvrir les Communautés Publiques</span>
              </button>
            }
          </div>
        } @else {
          <!-- GRID VIEW -->
          @if (viewMode === 'grid') {
            <div class="communities-grid">
              @for (comm of paginatedCommunities(); track comm.id) {
                <div class="comm-card card card-interactive" (click)="openCommunity(comm)">
                  <div class="comm-cover" [style.backgroundImage]="'url(' + comm.coverImage + ')'">
                    <span class="type-pill" [class.public]="!comm.isPrivate">
                      <app-icon [name]="comm.isPrivate ? 'lock' : 'globe'" [size]="11"></app-icon>
                      <span>{{ comm.isPrivate ? 'Privée' : 'Publique' }}</span>
                    </span>
                    <span class="code-pill">#{{ comm.accessCode }}</span>
                  </div>

                  <div class="comm-body">
                    <h3 class="comm-title">{{ comm.name }}</h3>
                    <p class="comm-desc">{{ comm.description }}</p>

                    <div class="comm-creator">
                      <app-icon name="user" [size]="12"></app-icon>
                      <span>Animé par <strong>{{ comm.creatorName }}</strong></span>
                    </div>

                    <div class="comm-stats-row">
                      <span>
                        <app-icon name="users" [size]="13"></app-icon>
                        <strong>{{ comm.membersCount }}</strong> membres
                      </span>
                      <span>•</span>
                      <span>
                        <app-icon name="message-square" [size]="13"></app-icon>
                        <strong>{{ comm.topicsCount }}</strong> sujets
                      </span>
                      <span>•</span>
                      <span>
                        <app-icon name="folder" [size]="13"></app-icon>
                        <strong>{{ comm.resourcesCount }}</strong> fichiers
                      </span>
                    </div>

                    <div class="comm-action-row" (click)="$event.stopPropagation()">
                      @if (isMember(comm)) {
                        <button class="btn btn-primary btn-sm btn-full" (click)="openCommunity(comm)">
                          <span>Accéder au Hub</span>
                          <app-icon name="arrow-right" [size]="13" color="var(--color-navy)"></app-icon>
                        </button>
                      } @else {
                        <button class="btn btn-primary btn-sm btn-full" (click)="joinCommunity(comm)">
                          <app-icon name="plus" [size]="13" color="var(--color-navy)"></app-icon>
                          <span>Rejoindre la Communauté</span>
                        </button>
                      }
                    </div>
                  </div>
                </div>
              }
            </div>
          } @else {
            <!-- LIST VIEW -->
            <div class="communities-list">
              @for (comm of paginatedCommunities(); track comm.id) {
                <div class="comm-row card card-interactive" (click)="openCommunity(comm)">
                  <div class="row-cover" [style.backgroundImage]="'url(' + comm.coverImage + ')'"></div>

                  <div class="row-info">
                    <div class="row-tags">
                      <span class="type-pill" [class.public]="!comm.isPrivate">
                        {{ comm.isPrivate ? 'Privée' : 'Publique' }}
                      </span>
                      <span class="code-txt">#{{ comm.accessCode }}</span>
                    </div>
                    <h3 class="row-title">{{ comm.name }}</h3>
                    <p class="row-desc">{{ comm.description }}</p>
                  </div>

                  <div class="row-stats">
                    <div class="stat-box">
                      <span class="val">{{ comm.membersCount }}</span>
                      <span class="lbl">Membres</span>
                    </div>
                    <div class="stat-box">
                      <span class="val">{{ comm.topicsCount }}</span>
                      <span class="lbl">Sujets</span>
                    </div>
                  </div>

                  <div class="row-action" (click)="$event.stopPropagation()">
                    @if (isMember(comm)) {
                      <button class="btn btn-primary btn-sm" (click)="openCommunity(comm)">
                        <span>Accéder</span>
                        <app-icon name="arrow-right" [size]="13" color="var(--color-navy)"></app-icon>
                      </button>
                    } @else {
                      <button class="btn btn-primary btn-sm" (click)="joinCommunity(comm)">
                        <span>Rejoindre</span>
                      </button>
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
            [totalItems]="displayedCommunities().length" 
            (pageChange)="currentPage = $event">
          </app-pagination>
        }
      }

      <!-- =========================================================================
           VUE 2 : ESPACE INTERACTION & FORUM DE LA COMMUNAUTÉ
           ========================================================================= -->
      @if (selectedCommunity) {
        <div class="community-hub-view animate-fade-in">
          <!-- Top Back button -->
          <div class="hub-top-bar">
            <button class="btn btn-outline btn-sm btn-back" (click)="selectedCommunity = null">
              <app-icon name="arrow-right" [size]="13" style="transform: rotate(180deg);"></app-icon>
              <span>Retour aux communautés</span>
            </button>
          </div>

          <!-- Hero Banner -->
          <div class="hub-hero card">
            <div class="hub-hero-left">
              <div class="tags-row">
                <span class="type-pill" [class.public]="!selectedCommunity.isPrivate">
                  {{ selectedCommunity.isPrivate ? 'Communauté Privée' : 'Communauté Ouverte' }}
                </span>
                <span class="code-badge">Code : {{ selectedCommunity.accessCode }}</span>
              </div>
              <h1 class="h1" style="margin: 8px 0 4px 0;">{{ selectedCommunity.name }}</h1>
              <p class="body-small" style="margin: 0;">{{ selectedCommunity.description }}</p>
            </div>

            <div class="hub-hero-stats">
              <div class="stat-pill">
                <app-icon name="users" [size]="14"></app-icon>
                <span><strong>{{ selectedCommunity.membersCount }}</strong> membres</span>
              </div>
              <div class="stat-pill">
                <app-icon name="message-square" [size]="14"></app-icon>
                <span><strong>{{ selectedCommunity.topicsCount }}</strong> discussions</span>
              </div>
              <div class="stat-pill">
                <app-icon name="folder" [size]="14"></app-icon>
                <span><strong>{{ selectedCommunity.resourcesCount }}</strong> fichiers</span>
              </div>
            </div>
          </div>

          <!-- Hub Sub-Tabs -->
          <div class="hub-tabs">
            <button 
              type="button" 
              class="tab-btn" 
              [class.active]="hubTab === 'DISCUSSIONS'"
              (click)="hubTab = 'DISCUSSIONS'">
              <app-icon name="message-square" [size]="15"></app-icon>
              <span>Discussions & Forum ({{ selectedCommunity.topics?.length || 0 }})</span>
            </button>

            <button 
              type="button" 
              class="tab-btn" 
              [class.active]="hubTab === 'RESOURCES'"
              (click)="hubTab = 'RESOURCES'">
              <app-icon name="folder" [size]="15"></app-icon>
              <span>Fichiers & Cours ({{ selectedCommunity.resources?.length || 0 }})</span>
            </button>

            <button 
              type="button" 
              class="tab-btn" 
              [class.active]="hubTab === 'MEMBERS'"
              (click)="hubTab = 'MEMBERS'">
              <app-icon name="users" [size]="15"></app-icon>
              <span>Membres ({{ selectedCommunity.members?.length || 0 }})</span>
            </button>
          </div>

          <!-- TAB 1: DISCUSSIONS & QUESTIONS -->
          @if (hubTab === 'DISCUSSIONS') {
            <div class="discussions-layout">
              <!-- New Question Card -->
              <div class="card new-topic-card">
                <div class="topic-head">
                  <app-icon name="help-circle" [size]="18" color="var(--color-navy)"></app-icon>
                  <h3 class="h3" style="margin: 0; font-size: 15px;">Poser une question à la communauté</h3>
                </div>
                <div class="topic-form">
                  <input 
                    type="text" 
                    [(ngModel)]="newTopicTitle" 
                    placeholder="Titre de votre question ou sujet de discussion..." 
                    class="input-field">
                  <textarea 
                    [(ngModel)]="newTopicContent" 
                    rows="2" 
                    placeholder="Détaillez votre question ou partagez une information..." 
                    class="input-field"></textarea>
                  <div class="form-action-row">
                    <button 
                      class="btn btn-primary btn-sm" 
                      [disabled]="!newTopicTitle.trim() || !newTopicContent.trim()" 
                      (click)="submitNewTopic()">
                      <span>Publier la Question</span>
                    </button>
                  </div>
                </div>
              </div>

              <!-- Topics List -->
              <div class="topics-list">
                @for (top of selectedCommunity.topics || []; track top.id) {
                  <div class="topic-card card">
                    <div class="topic-meta">
                      <div class="author-avatar">
                        {{ top.authorName.charAt(0) }}
                      </div>
                      <div class="author-info">
                        <strong>{{ top.authorName }}</strong>
                        <span class="body-small text-muted">{{ top.createdAt | date:'short' }}</span>
                      </div>
                      @if (top.isPinned) {
                        <span class="badge badge-primary">📌 Épinglé</span>
                      }
                    </div>

                    <h3 class="topic-title">{{ top.title }}</h3>
                    <p class="topic-body">{{ top.content }}</p>

                    <!-- Comments preview / Reply -->
                    @if (top.comments && top.comments.length > 0) {
                      <div class="comments-box">
                        <span class="comments-title">Réponses ({{ top.comments.length }}) :</span>
                        @for (com of top.comments; track com.id) {
                          <div class="comment-item">
                            <strong>{{ com.authorName }} :</strong>
                            <span>{{ com.content }}</span>
                          </div>
                        }
                      </div>
                    }

                    <!-- Add Comment input -->
                    <div class="reply-row">
                      <input 
                        type="text" 
                        [(ngModel)]="replyTexts[top.id]" 
                        placeholder="Écrire une réponse..." 
                        class="input-field reply-input"
                        (keyup.enter)="submitComment(top.id)">
                      <button 
                        class="btn btn-outline btn-sm" 
                        [disabled]="!replyTexts[top.id]?.trim()"
                        (click)="submitComment(top.id)">
                        Répondre
                      </button>
                    </div>
                  </div>
                }
              </div>
            </div>
          }

          <!-- TAB 2: RESOURCES -->
          @if (hubTab === 'RESOURCES') {
            <div class="resources-grid">
              @for (res of selectedCommunity.resources || []; track res.id) {
                <div class="card resource-card">
                  <div class="res-icon">
                    <app-icon name="file-text" [size]="24" color="var(--color-navy)"></app-icon>
                  </div>
                  <div class="res-info">
                    <h4 class="res-title">{{ res.title }}</h4>
                    <span class="body-small text-muted">{{ res.fileType }} • {{ res.fileSize }} • Partagé par {{ res.uploadedByName }}</span>
                  </div>
                  <button class="btn btn-outline btn-sm" (click)="downloadResource(res.title)">
                    <app-icon name="download" [size]="13"></app-icon>
                    <span>Télécharger</span>
                  </button>
                </div>
              }
              @if ((selectedCommunity.resources || []).length === 0) {
                <div class="card empty-tab-box">
                  <app-icon name="folder" [size]="28" color="var(--color-text-secondary)"></app-icon>
                  <p>Aucun fichier partagé dans cette communauté.</p>
                </div>
              }
            </div>
          }

          <!-- TAB 3: MEMBERS -->
          @if (hubTab === 'MEMBERS') {
            <div class="card members-card">
              <div class="members-head">
                <h3 class="h3" style="font-size: 15px; margin: 0;">Membres inscrits ({{ selectedCommunity.members?.length || 0 }})</h3>
              </div>
              <div class="members-list">
                @for (m of selectedCommunity.members || []; track m.userId) {
                  <div class="member-item">
                    <div class="member-avatar">
                      {{ m.name.charAt(0) }}
                    </div>
                    <div class="member-info">
                      <strong>{{ m.name }}</strong>
                      <span class="body-small text-muted">{{ m.email }}</span>
                    </div>
                    <span class="badge" [ngClass]="m.role === 'CREATOR' ? 'badge-primary' : 'badge-navy'">
                      {{ m.role === 'CREATOR' ? 'Animateur / Prof' : 'Apprenant' }}
                    </span>
                  </div>
                }
              </div>
            </div>
          }
        </div>
      }
    </div>

    <!-- MODAL REJOINDRE PAR CODE (FULLSCREEN VIEWPORT BACKDROP) -->
    @if (showCodeModal) {
      <div class="modal-backdrop" (click)="showCodeModal = false">
        <div class="modal-card card" (click)="$event.stopPropagation()">
          <div class="modal-head">
            <div class="head-title">
              <app-icon name="users" [size]="18" color="var(--color-navy)"></app-icon>
              <h3 class="h3" style="margin: 0;">Rejoindre une Communauté</h3>
            </div>
            <button class="btn-close" (click)="showCodeModal = false">✕</button>
          </div>

          <form (ngSubmit)="submitJoinByCode()" class="code-form">
            <p class="body-small">Entrez le code d'accès de la communauté (ex: <code>GLIA-2026</code> ou <code>GROWTH-CLUB</code>).</p>
            
            <div class="form-group">
              <label>Code d'accès *</label>
              <input 
                type="text" 
                [(ngModel)]="accessCodeInput" 
                name="accessCodeInput" 
                placeholder="ex: GLIA-2026" 
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
              <button type="button" class="btn btn-outline btn-sm" (click)="showCodeModal = false">Annuler</button>
              <button type="submit" class="btn btn-primary btn-sm">
                Rejoindre
              </button>
            </div>
          </form>
        </div>
      </div>
    }
  `,
  styles: [`
    .learner-communities-page {
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

    /* TABS TOOLBAR */
    .tabs-toolbar {
      display: flex;
      border-bottom: 1px solid var(--color-border);
      padding-bottom: 8px;

      .main-tabs {
        display: flex;
        gap: 8px;
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

    /* COMPACT TOOLBAR */
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

    /* COMMUNITIES GRID */
    .communities-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 16px;

      .comm-card {
        padding: 0;
        overflow: hidden;
        background: #FFFFFF;
        border: 1px solid var(--color-border);
        border-radius: var(--radius-lg);
        display: flex;
        flex-direction: column;
        box-shadow: var(--shadow-sm);
        transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);

        &:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
          border-color: #CBD5E1;
        }

        .comm-cover {
          height: 120px;
          background-size: cover;
          background-position: center;
          position: relative;
          padding: 10px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;

          .type-pill {
            font-size: 10.5px;
            font-weight: 700;
            background: rgba(3, 36, 71, 0.85);
            color: #FFFFFF;
            padding: 2px 7px;
            border-radius: var(--radius-xs);

            &.public {
              background: rgba(16, 185, 129, 0.9);
            }
          }

          .code-pill {
            font-size: 11px;
            font-weight: 700;
            background: rgba(0, 0, 0, 0.6);
            color: #FFFFFF;
            padding: 2px 6px;
            border-radius: var(--radius-xs);
            font-family: monospace;
          }
        }

        .comm-body {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          flex: 1;

          .comm-title {
            font-size: 14.5px;
            font-weight: 800;
            color: var(--color-navy);
            margin: 0;
            line-height: 1.3;
          }

          .comm-desc {
            font-size: 12px;
            color: var(--color-text-secondary);
            margin: 0;
            line-height: 1.4;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }

          .comm-creator {
            display: flex;
            align-items: center;
            gap: 5px;
            font-size: 11.5px;
            color: var(--color-text-secondary);
          }

          .comm-stats-row {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 11.5px;
            color: var(--color-text-secondary);
            flex-wrap: wrap;

            span { display: inline-flex; align-items: center; gap: 4px; }
          }

          .comm-action-row {
            margin-top: auto;
            .btn-full { width: 100%; justify-content: center; gap: 6px; }
          }
        }
      }
    }

    /* COMMUNITIES LIST */
    .communities-list {
      display: flex;
      flex-direction: column;
      gap: 10px;

      .comm-row {
        padding: 12px 18px;
        display: flex;
        align-items: center;
        gap: 16px;
        background: #FFFFFF;

        .row-cover {
          width: 60px;
          height: 60px;
          border-radius: var(--radius-sm);
          background-size: cover;
          background-position: center;
          flex-shrink: 0;
        }

        .row-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 3px;

          .row-tags {
            display: flex;
            align-items: center;
            gap: 6px;

            .type-pill {
              font-size: 10px;
              font-weight: 700;
              background: var(--color-navy-light);
              color: var(--color-navy);
              padding: 1px 6px;
              border-radius: var(--radius-xs);
              &.public { background: #DCFCE7; color: #166534; }
            }

            .code-txt { font-size: 11px; color: var(--color-text-secondary); font-family: monospace; }
          }

          .row-title { font-size: 14px; font-weight: 800; color: var(--color-navy); margin: 0; }
          .row-desc { font-size: 12px; color: var(--color-text-secondary); margin: 0; }
        }

        .row-stats {
          display: flex;
          align-items: center;
          gap: 14px;

          .stat-box {
            display: flex;
            flex-direction: column;
            align-items: center;
            .val { font-size: 14px; font-weight: 800; color: var(--color-navy); }
            .lbl { font-size: 10.5px; color: var(--color-text-secondary); }
          }
        }
      }
    }

    /* HUB DETAIL VIEW */
    .community-hub-view {
      display: flex;
      flex-direction: column;
      gap: 18px;

      .hub-hero {
        padding: 24px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 16px;
        background: #FFFFFF;

        .hub-hero-left {
          flex: 1;
          min-width: 260px;

          .tags-row {
            display: flex;
            align-items: center;
            gap: 8px;

            .type-pill {
              font-size: 11px;
              font-weight: 700;
              padding: 2px 8px;
              border-radius: var(--radius-xs);
              background: var(--color-navy-light);
              color: var(--color-navy);
              &.public { background: #DCFCE7; color: #166534; }
            }

            .code-badge { font-size: 11.5px; font-weight: 700; color: var(--color-navy); }
          }
        }

        .hub-hero-stats {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;

          .stat-pill {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 6px 12px;
            background: var(--color-background);
            border: 1px solid var(--color-border);
            border-radius: var(--radius-full);
            font-size: 12px;
            color: var(--color-navy);
          }
        }
      }

      .hub-tabs {
        display: flex;
        gap: 8px;
        border-bottom: 1px solid var(--color-border);
        padding-bottom: 8px;

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

          &:hover { background: var(--color-background); color: var(--color-navy); }
          &.active {
            background: var(--color-navy);
            color: #FFFFFF;
            ::ng-deep svg { stroke: #FFFFFF !important; }
          }
        }
      }
    }

    /* DISCUSSIONS */
    .discussions-layout {
      display: flex;
      flex-direction: column;
      gap: 16px;

      .new-topic-card {
        padding: 18px;
        background: #FFFFFF;
        display: flex;
        flex-direction: column;
        gap: 12px;

        .topic-head {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--color-navy);
        }

        .topic-form {
          display: flex;
          flex-direction: column;
          gap: 10px;

          .form-action-row {
            display: flex;
            justify-content: flex-end;
          }
        }
      }

      .topics-list {
        display: flex;
        flex-direction: column;
        gap: 12px;

        .topic-card {
          padding: 18px;
          background: #FFFFFF;
          display: flex;
          flex-direction: column;
          gap: 10px;

          .topic-meta {
            display: flex;
            align-items: center;
            gap: 10px;

            .author-avatar {
              width: 32px;
              height: 32px;
              border-radius: 50%;
              background: var(--color-navy);
              color: #FFFFFF;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 12px;
              font-weight: 800;
            }

            .author-info {
              display: flex;
              flex-direction: column;
              flex: 1;
              font-size: 12.5px;
            }
          }

          .topic-title {
            font-size: 15px;
            font-weight: 800;
            color: var(--color-navy);
            margin: 0;
          }

          .topic-body {
            font-size: 13px;
            color: var(--color-text-primary);
            line-height: 1.4;
            margin: 0;
          }

          .comments-box {
            padding: 12px;
            background: var(--color-background);
            border-radius: var(--radius-sm);
            display: flex;
            flex-direction: column;
            gap: 6px;
            font-size: 12px;

            .comments-title { font-weight: 700; color: var(--color-navy); }
            .comment-item { color: var(--color-text-primary); }
          }

          .reply-row {
            display: flex;
            gap: 8px;
            margin-top: 4px;

            .reply-input { flex: 1; height: 34px; font-size: 12.5px; }
          }
        }
      }
    }

    /* RESOURCES */
    .resources-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 14px;

      .resource-card {
        padding: 16px;
        display: flex;
        align-items: center;
        gap: 12px;
        background: #FFFFFF;

        .res-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
          .res-title { font-size: 13px; font-weight: 700; color: var(--color-navy); margin: 0; }
        }
      }
    }

    /* MEMBERS */
    .members-card {
      padding: 0;
      background: #FFFFFF;
      overflow: hidden;

      .members-head {
        padding: 14px 20px;
        border-bottom: 1px solid var(--color-border);
        background: #F8FAFC;
      }

      .members-list {
        display: flex;
        flex-direction: column;

        .member-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 20px;
          border-bottom: 1px solid var(--color-border);
          gap: 12px;

          &:last-child { border-bottom: none; }

          .member-avatar {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: var(--color-navy);
            color: #FFFFFF;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: 800;
          }

          .member-info {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 2px;
            font-size: 13px;
          }
        }
      }
    }

    /* EMPTY */
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
      max-width: 420px;
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

      .code-form {
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 14px;

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
          label { font-size: 12px; font-weight: 700; color: var(--color-navy); }
          .code-input { text-transform: uppercase; font-weight: 800; letter-spacing: 0.05em; }
        }

        .error-msg {
          padding: 8px 12px;
          background: #FEE2E2;
          border: 1px solid #FCA5A5;
          border-radius: var(--radius-xs);
          color: #B91C1C;
          font-size: 12px;
        }

        .modal-foot {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 8px;
        }
      }
    }

    @media (max-width: 768px) {
      .communities-grid, .resources-grid {
        grid-template-columns: 1fr;
      }
      .hub-hero {
        flex-direction: column;
        align-items: flex-start;
        .hub-hero-stats { width: 100%; justify-content: space-between; }
      }
      .hub-tabs, .tabs-toolbar .main-tabs {
        overflow-x: auto;
        flex-wrap: nowrap;
        .tab-btn { white-space: nowrap; }
      }
    }
  `]
})
export class LearnerCommunitiesComponent {
  private commService = inject(CommunityService);
  public authService = inject(AuthService);

  allCommunities = this.commService.getCommunities();

  mainTab: 'MY_COMMUNITIES' | 'PUBLIC_COMMUNITIES' = 'MY_COMMUNITIES';
  viewMode: 'grid' | 'list' = 'grid';
  searchQuery = '';
  selectedCategory = 'ALL';

  currentPage = 1;
  pageSize = 8;

  selectedCommunity: Community | null = null;
  hubTab: 'DISCUSSIONS' | 'RESOURCES' | 'MEMBERS' = 'DISCUSSIONS';

  newTopicTitle = '';
  newTopicContent = '';
  replyTexts: Record<string, string> = {};

  showCodeModal = false;
  accessCodeInput = '';
  joinError = '';

  categories(): string[] {
    const set = new Set<string>();
    for (const c of this.allCommunities()) {
      if (c.category) set.add(c.category);
    }
    return Array.from(set);
  }

  isMember(comm: Community): boolean {
    const currentUserId = this.authService.currentUser()?.id || 'user-learner-1';
    return (comm.members || []).some(m => m.userId === currentUserId) || comm.id === 'comm-info-2026';
  }

  myCommunities(): Community[] {
    return this.allCommunities().filter(c => this.isMember(c));
  }

  publicCommunities(): Community[] {
    return this.allCommunities().filter(c => !c.isPrivate);
  }

  displayedCommunities(): Community[] {
    const list = this.mainTab === 'MY_COMMUNITIES' ? this.myCommunities() : this.publicCommunities();

    return list.filter(c => {
      const matchSearch = !this.searchQuery ||
        c.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        c.description.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        c.accessCode.toLowerCase().includes(this.searchQuery.toLowerCase());

      const matchCategory = this.selectedCategory === 'ALL' || c.category === this.selectedCategory;

      return matchSearch && matchCategory;
    });
  }

  paginatedCommunities(): Community[] {
    const list = this.displayedCommunities();
    const start = (this.currentPage - 1) * this.pageSize;
    return list.slice(start, start + this.pageSize);
  }

  openCommunity(comm: Community) {
    this.selectedCommunity = comm;
    this.hubTab = 'DISCUSSIONS';
  }

  joinCommunity(comm: Community) {
    const user = this.authService.currentUser();
    this.commService.joinCommunity(comm.id, {
      userId: user?.id || 'user-learner-1',
      name: (user?.prenom || 'Étudiant') + ' ' + (user?.nom || ''),
      email: user?.email || 'etudiant@univ.edu',
      avatarUrl: user?.avatarUrl
    });
    this.openCommunity(this.commService.getCommunityById(comm.id) || comm);
  }

  submitNewTopic() {
    if (!this.selectedCommunity || !this.newTopicTitle.trim() || !this.newTopicContent.trim()) return;
    const user = this.authService.currentUser();

    this.commService.addTopic(this.selectedCommunity.id, {
      title: this.newTopicTitle.trim(),
      content: this.newTopicContent.trim(),
      authorId: user?.id || 'user-learner-1',
      authorName: (user?.prenom || 'Fatou') + ' ' + (user?.nom || 'Sow'),
      authorAvatar: user?.avatarUrl
    });

    this.newTopicTitle = '';
    this.newTopicContent = '';
    // Refresh local selected
    this.selectedCommunity = this.commService.getCommunityById(this.selectedCommunity.id) || this.selectedCommunity;
  }

  submitComment(topicId: string) {
    const text = (this.replyTexts[topicId] || '').trim();
    if (!text || !this.selectedCommunity) return;
    const user = this.authService.currentUser();

    this.commService.addComment(this.selectedCommunity.id, topicId, {
      content: text,
      authorId: user?.id || 'user-learner-1',
      authorName: (user?.prenom || 'Fatou') + ' ' + (user?.nom || 'Sow'),
      authorAvatar: user?.avatarUrl
    });

    this.replyTexts[topicId] = '';
    this.selectedCommunity = this.commService.getCommunityById(this.selectedCommunity.id) || this.selectedCommunity;
  }

  downloadResource(title: string) {
    alert(`Téléchargement de "${title}" en cours...`);
  }

  openCodeModal() {
    this.accessCodeInput = '';
    this.joinError = '';
    this.showCodeModal = true;
  }

  submitJoinByCode() {
    const code = this.accessCodeInput.trim().toUpperCase();
    if (!code) {
      this.joinError = 'Le code d\'accès est obligatoire.';
      return;
    }

    this.commService.joinCommunityApi(code).subscribe({
      next: (found) => {
        this.joinCommunity(found);
        this.showCodeModal = false;
        this.joinError = '';
      },
      error: (err) => {
        const fieldErrors = extractFieldErrors(err);
        this.joinError = fieldErrors['accessCode'] || getGeneralErrorMessage(err, 'Code de communauté introuvable. Veuillez vérifier le code d\'accès.');
      }
    });
  }
}
