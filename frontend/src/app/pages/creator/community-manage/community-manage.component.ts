import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommunityService } from '../../../core/services/community.service';
import { AuthService } from '../../../core/services/auth.service';
import { QuizService } from '../../../core/services/quiz.service';
import { Community, ForumTopic, ResourceFile, Meeting } from '../../../core/models/community.model';
import { Quiz } from '../../../core/models/quiz.model';
import { extractFieldErrors, getGeneralErrorMessage } from '../../../core/utils/form-error.util';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { QuizModalPlayerComponent } from '../../../shared/components/quiz-modal-player/quiz-modal-player.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-community-manage',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, QuizModalPlayerComponent, PaginationComponent],
  template: `
    <div class="community-page">
      <!-- =========================================================================
           VIEW 1: DIRECTORY OF COMMUNITIES (CLEAN & AIRY)
           ========================================================================= -->
      @if (!selectedCommunity) {
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
                    <img [src]="comm.coverImage" class="comm-thumb" alt="Cover">

                    <div class="comm-info">
                      <div class="tags-row">
                        <span class="category-pill">{{ comm.category || 'Général' }}</span>
                        <span class="vis-badge" [class.is-priv]="comm.isPrivate">
                          <span class="status-dot"></span>
                          {{ comm.isPrivate ? 'Privée' : 'Publique' }}
                        </span>
                        <span class="code-txt">#{{ comm.accessCode }}</span>
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
                    <span class="creator-label">Par {{ comm.creatorName }}</span>
                    <button class="btn btn-primary btn-sm btn-enter" (click)="openCommunity(comm)">
                      <span>Entrer</span>
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
                  <img [src]="comm.coverImage" class="row-thumb" alt="Cover">

                  <div class="row-main-info">
                    <div class="row-top-tags">
                      <span class="category-pill">{{ comm.category || 'Général' }}</span>
                      <span class="vis-badge" [class.is-priv]="comm.isPrivate">
                        <span class="status-dot"></span>
                        {{ comm.isPrivate ? 'Privée' : 'Publique' }}
                      </span>
                      <span class="code-txt">#{{ comm.accessCode }}</span>
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
                    <button class="btn btn-primary btn-sm btn-enter" (click)="openCommunity(comm)">
                      <span>Entrer</span>
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

      <!-- =========================================================================
           VIEW 2: DEDICATED COMMUNITY HUB (FOCUS VIEW)
           ========================================================================= -->
      @if (selectedCommunity; as comm) {
        <div class="community-hub-view animate-fade-in">
          <!-- Back navigation bar -->
          <div class="hub-top-nav">
            <button class="btn btn-outline btn-sm" (click)="selectedCommunity = null">
              <app-icon name="arrow-left" [size]="14"></app-icon>
              <span>← Toutes les Communautés</span>
            </button>
            <div class="hub-code-chip" (click)="copyCode(comm.accessCode)">
              <app-icon [name]="isCodeCopied ? 'check' : 'copy'" [size]="13"></app-icon>
              <span>Code : <strong>{{ comm.accessCode }}</strong> ({{ isCodeCopied ? 'Copié !' : 'Copier' }})</span>
            </div>
          </div>

          <!-- COMMUNITY HERO HEADER -->
          <div class="comm-hero card" [style.backgroundImage]="'linear-gradient(rgba(3, 36, 71, 0.75), rgba(3, 36, 71, 0.92)), url(' + comm.coverImage + ')'">
            <div class="hero-content">
              <div class="hero-top">
                <span class="badge badge-primary">CODE : {{ comm.accessCode }}</span>
                <span class="badge badge-navy" style="background: rgba(255,255,255,0.2); color: #FFFFFF;">
                  <app-icon [name]="comm.isPrivate ? 'lock' : 'globe'" [size]="12" color="#FFFFFF"></app-icon>
                  <span>{{ comm.isPrivate ? 'Privée' : 'Publique' }}</span>
                </span>
                @if (comm.category) {
                  <span class="badge badge-orange" style="color: #FFFFFF; background: var(--color-orange);">{{ comm.category }}</span>
                }
              </div>

              <h1 class="display-title" style="color: #FFFFFF; margin: 12px 0 6px 0;">{{ comm.name }}</h1>
              <p class="body-text" style="color: #CBD5E1; max-width: 750px;">{{ comm.description }}</p>

              <div class="hero-metrics">
                <span>
                  <app-icon name="users" [size]="14" color="#CBD5E1"></app-icon>
                  {{ comm.membersCount }} Membres
                </span>
                <span>
                  <app-icon name="file-text" [size]="14" color="#CBD5E1"></app-icon>
                  {{ comm.quizzesCount }} Quiz actifs
                </span>
                <span>
                  <app-icon name="message-square" [size]="14" color="#CBD5E1"></app-icon>
                  {{ comm.topicsCount }} Sujets
                </span>
                <span>
                  <app-icon name="download" [size]="14" color="#CBD5E1"></app-icon>
                  {{ comm.resourcesCount }} Documents
                </span>
              </div>
            </div>
          </div>

          <!-- NAVIGATION TABS -->
          <div class="hub-tabs">
            <button 
              type="button" 
              class="tab-btn" 
              [class.active]="activeTab === 'FORUM'"
              (click)="activeTab = 'FORUM'">
              <app-icon name="message-square" [size]="16"></app-icon>
              <span>Forum & Débats ({{ comm.topics?.length || 0 }})</span>
            </button>
            <button 
              type="button" 
              class="tab-btn" 
              [class.active]="activeTab === 'QUIZZES'"
              (click)="activeTab = 'QUIZZES'">
              <app-icon name="play" [size]="16"></app-icon>
              <span>Quiz Partagés ({{ getCommunityQuizzes(comm).length }})</span>
            </button>
            <button 
              type="button" 
              class="tab-btn" 
              [class.active]="activeTab === 'RESOURCES'"
              (click)="activeTab = 'RESOURCES'">
              <app-icon name="download" [size]="16"></app-icon>
              <span>Documents ({{ comm.resources?.length || 0 }})</span>
            </button>
            <button 
              type="button" 
              class="tab-btn" 
              [class.active]="activeTab === 'MEMBERS'"
              (click)="activeTab = 'MEMBERS'">
              <app-icon name="users" [size]="16"></app-icon>
              <span>Membres & Visio ({{ comm.members?.length || 0 }})</span>
            </button>
          </div>

          <!-- TAB 1: FORUM & TOPICS -->
          @if (activeTab === 'FORUM') {
            <div class="tab-content animate-fade-in">
              <div class="section-actions">
                <h3 class="h2">Discussions & Entraide</h3>
                <button class="btn btn-primary btn-sm" (click)="showNewTopicModal = true">
                  <app-icon name="plus" [size]="14" color="var(--color-navy)"></app-icon>
                  <span>Nouveau Sujet</span>
                </button>
              </div>

              <div class="topics-list">
                @if (!comm.topics || comm.topics.length === 0) {
                  <div class="empty-state-box">
                    <app-icon name="message-square" [size]="28" color="var(--color-navy)"></app-icon>
                    <h3 class="empty-title">Aucune discussion lancée</h3>
                    <p class="empty-desc">Soyez le premier à poser une question ou lancer un sujet d'échange pédagogique !</p>
                    <button class="btn btn-primary btn-sm" (click)="showNewTopicModal = true">Lancer un Sujet</button>
                  </div>
                } @else {
                  @for (topic of comm.topics; track topic.id) {
                    <div class="topic-item card">
                      <div class="topic-header">
                        <div class="topic-avatar-icon">
                          <app-icon name="user" [size]="18" color="var(--color-navy)"></app-icon>
                        </div>
                        <div class="topic-meta">
                          <strong class="author-name">{{ topic.authorName }}</strong>
                          <span class="topic-date">{{ topic.createdAt | date:'short' }}</span>
                        </div>
                        @if (topic.isPinned) {
                          <span class="badge badge-primary">
                            <app-icon name="award" [size]="12" color="var(--color-navy)"></app-icon>
                            <span>Épinglé</span>
                          </span>
                        }
                      </div>

                      <h4 class="topic-title">{{ topic.title }}</h4>
                      <p class="topic-body">{{ topic.content }}</p>

                      <!-- Comments Section -->
                      <div class="comments-section">
                        <div class="comments-count">
                          <app-icon name="message-square" [size]="14" color="var(--color-navy)"></app-icon>
                          <span>{{ topic.comments.length }} Réponses</span>
                        </div>

                        <div class="comments-list">
                          @for (comment of topic.comments; track comment.id) {
                            <div class="comment-bubble">
                              <div class="comment-avatar-icon">
                                <app-icon name="user" [size]="13" color="var(--color-navy)"></app-icon>
                              </div>
                              <div class="comment-content">
                                <div class="comment-author-row">
                                  <strong>{{ comment.authorName }}</strong>
                                  <span class="comment-time">{{ comment.createdAt | date:'shortTime' }}</span>
                                </div>
                                <p class="comment-text">{{ comment.content }}</p>
                              </div>
                            </div>
                          }
                        </div>

                        <!-- Add Comment Input -->
                        <div class="comment-input-row">
                          <input 
                            type="text" 
                            [(ngModel)]="newCommentTexts[topic.id]" 
                            placeholder="Écrivez une réponse..." 
                            class="input-field comment-input"
                            (keyup.enter)="submitComment(comm.id, topic.id)">
                          <button class="btn btn-secondary btn-sm" (click)="submitComment(comm.id, topic.id)">
                            Répondre
                          </button>
                        </div>
                      </div>
                    </div>
                  }
                }
              </div>
            </div>
          }

          <!-- TAB 2: SHARED QUIZZES -->
          @if (activeTab === 'QUIZZES') {
            <div class="tab-content animate-fade-in">
              <div class="section-actions">
                <h3 class="h2">Quiz Partagés dans cette Communauté</h3>
              </div>

              <div class="quizzes-grid">
                @for (quiz of getCommunityQuizzes(comm); track quiz.id) {
                  <div class="quiz-compact-card card card-interactive">
                    <div class="card-main-row">
                      <img [src]="quiz.coverImage" class="quiz-thumb" alt="Quiz cover">
                      <div class="quiz-info">
                        <div class="tags-row">
                          <span class="category-pill">{{ quiz.category }}</span>
                        </div>

                        <h3 class="quiz-title" [title]="quiz.title">{{ quiz.title }}</h3>

                        <div class="quiz-metrics">
                          <span><strong>{{ quiz.questionsCount }}</strong> Qs</span>
                          <span>•</span>
                          <span><strong>{{ quiz.participationsCount }}</strong> joués</span>
                        </div>
                      </div>
                    </div>

                    <div class="card-action-bar">
                      <button class="btn btn-primary btn-sm btn-full" (click)="activeTestQuiz = quiz">
                        <app-icon name="play" [size]="13" color="var(--color-navy)"></app-icon>
                        <span>Jouer / Tester ce Quiz</span>
                      </button>
                    </div>
                  </div>
                }
              </div>
            </div>
          }

          <!-- TAB 3: RESOURCES & DOCUMENTS -->
          @if (activeTab === 'RESOURCES') {
            <div class="tab-content animate-fade-in">
              <div class="section-actions">
                <h3 class="h2">Supports Pédagogiques & Fichiers</h3>
              </div>

              <div class="resources-grid">
                @if (!comm.resources || comm.resources.length === 0) {
                  <div class="empty-state-box">
                    <app-icon name="download" [size]="28" color="var(--color-navy)"></app-icon>
                    <h3 class="empty-title">Aucun document partagé</h3>
                    <p class="empty-desc">Les cours, PDF et fiches de révision partagés apparaîtront ici.</p>
                  </div>
                } @else {
                  @for (res of comm.resources; track res.id) {
                    <div class="resource-card card">
                      <div class="file-icon-box">
                        <app-icon name="file-text" [size]="24" color="var(--color-navy)"></app-icon>
                      </div>
                      <div class="file-info">
                        <h4 class="file-title">{{ res.title }}</h4>
                        <div class="file-meta">
                          <span>{{ res.fileSize }} • Ajouté par <strong>{{ res.uploadedByName }}</strong></span>
                        </div>
                      </div>
                      <button class="btn btn-outline btn-sm" (click)="downloadSimulated(res.title)">
                        <app-icon name="download" [size]="14"></app-icon>
                        <span>Télécharger</span>
                      </button>
                    </div>
                  }
                }
              </div>
            </div>
          }

          <!-- TAB 4: MEMBERS & MEETINGS -->
          @if (activeTab === 'MEMBERS') {
            <div class="tab-content animate-fade-in">
              <!-- MEETINGS SECTION -->
              @if (comm.meetings && comm.meetings.length > 0) {
                <div style="margin-bottom: 32px;">
                  <h3 class="h2" style="margin-bottom: 16px;">Sessions Visio Planifiées</h3>
                  <div class="meetings-list">
                    @for (meet of comm.meetings; track meet.id) {
                      <div class="meeting-card card">
                        <div class="meet-badge">
                          <app-icon name="video" [size]="14" color="var(--color-orange)"></app-icon>
                          <span>{{ meet.platform }}</span>
                        </div>
                        <h4 class="meet-title">{{ meet.title }}</h4>
                        <p class="body-small">{{ meet.description }}</p>
                        <div class="meet-timing">
                          <span><app-icon name="calendar" [size]="12"></app-icon> {{ meet.scheduledAt | date:'medium' }}</span>
                          <span><app-icon name="clock" [size]="12"></app-icon> Durée : {{ meet.durationMinutes }} min</span>
                        </div>
                        <a [href]="meet.meetingUrl" target="_blank" class="btn btn-primary btn-sm">
                          <app-icon name="video" [size]="14" color="var(--color-navy)"></app-icon>
                          <span>Rejoindre la Réunion</span>
                        </a>
                      </div>
                    }
                  </div>
                </div>
              }

              <!-- MEMBERS ROSTER -->
              <h3 class="h2" style="margin-bottom: 16px;">Membres de la Communauté ({{ comm.members?.length || 0 }})</h3>
              <div class="members-table card">
                <table>
                  <thead>
                    <tr>
                      <th>Membre</th>
                      <th>Rôle</th>
                      <th>Quiz Réussis</th>
                      <th>Total XP</th>
                      <th>Rejoint le</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (member of comm.members; track member.userId) {
                      <tr>
                        <td style="display: flex; align-items: center; gap: 10px;">
                          <div class="member-avatar-icon" style="width: 32px; height: 32px; min-width: 32px; border-radius: 50%; background: #EEF2F6; display: flex; align-items: center; justify-content: center; border: 1px solid var(--color-border); flex-shrink: 0;">
                            <app-icon name="user" [size]="15" color="var(--color-navy)"></app-icon>
                          </div>
                          <div>
                            <strong>{{ member.name }}</strong>
                            <div class="body-small">{{ member.email }}</div>
                          </div>
                        </td>
                        <td>
                          <span class="badge" [ngClass]="member.role === 'CREATOR' ? 'badge-primary' : 'badge-navy'">
                            {{ member.role }}
                          </span>
                        </td>
                        <td><strong>{{ member.quizzesCompleted }}</strong> quiz</td>
                        <td>
                          <strong style="color: var(--color-orange);">
                            <app-icon name="zap" [size]="13" color="var(--color-orange)"></app-icon>
                            {{ member.totalXp }} XP
                          </strong>
                        </td>
                        <td class="body-small">{{ member.joinedAt }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          }
        </div>
      }

      <!-- POPUP MODAL: QUIZ MODAL PLAYER -->
      @if (activeTestQuiz) {
        <app-quiz-modal-player [quiz]="activeTestQuiz" (closed)="activeTestQuiz = null"></app-quiz-modal-player>
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

      <!-- POPUP MODAL: CREATE NEW TOPIC -->
      @if (showNewTopicModal) {
        <div class="modal-backdrop animate-fade-in" (click)="showNewTopicModal = false">
          <div class="modal-card card" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3 class="h2">Lancer un Nouveau Sujet</h3>
              <button class="close-btn" (click)="showNewTopicModal = false">✕</button>
            </div>

            <form (ngSubmit)="submitNewTopic()" class="modal-form">
              @if (topicGeneralError) {
                <div class="auth-error-banner animate-shake" style="margin-bottom: 14px;">
                  <app-icon name="alert" [size]="16" color="#FFFFFF"></app-icon>
                  <span>{{ topicGeneralError }}</span>
                </div>
              }

              <div class="form-group">
                <label class="form-label">Titre du Sujet *</label>
                <input 
                  type="text" 
                  [(ngModel)]="newTopicTitle" 
                  name="newTopicTitle" 
                  required 
                  placeholder="Ex: Question sur l'exercice 3, Ressources complémentaires..." 
                  class="input-field"
                  [class.input-error]="topicFieldErrors['title']"
                  (input)="clearTopicFieldError('title')">
                @if (topicFieldErrors['title']) {
                  <span class="field-error-msg">
                    <app-icon name="alert" [size]="13" color="var(--color-danger)"></app-icon>
                    <span>{{ topicFieldErrors['title'] }}</span>
                  </span>
                }
              </div>

              <div class="form-group">
                <label class="form-label">Message / Contenu *</label>
                <textarea 
                  [(ngModel)]="newTopicContent" 
                  name="newTopicContent" 
                  rows="4" 
                  placeholder="Expliquez votre question ou détaillez le sujet de discussion..." 
                  class="input-field"
                  [class.input-error]="topicFieldErrors['content']"
                  (input)="clearTopicFieldError('content')"></textarea>
                @if (topicFieldErrors['content']) {
                  <span class="field-error-msg">
                    <app-icon name="alert" [size]="13" color="var(--color-danger)"></app-icon>
                    <span>{{ topicFieldErrors['content'] }}</span>
                  </span>
                }
              </div>

              <div class="modal-actions-footer">
                <button type="button" class="btn btn-outline" (click)="showNewTopicModal = false">Annuler</button>
                <button type="submit" class="btn btn-primary">
                  <app-icon name="message-square" [size]="15" color="var(--color-navy)"></app-icon>
                  <span>Publier le Sujet</span>
                </button>
              </div>
            </form>
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

    /* COMMUNITY HUB FOCUS VIEW */
    .hub-top-nav {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 18px;
      flex-wrap: wrap;
      gap: 12px;

      .hub-code-chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: #FFFFFF;
        border: 1px solid var(--color-border);
        padding: 5px 12px;
        border-radius: var(--radius-full);
        font-size: 12px;
        cursor: pointer;
        color: var(--color-navy);
        transition: background 0.15s ease;

        &:hover { background: var(--color-navy-light); }
      }
    }

    .comm-hero {
      background-size: cover;
      background-position: center;
      padding: 28px 24px;
      margin-bottom: 20px;
      border: none;

      .hero-top {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }

      .hero-metrics {
        display: flex;
        gap: 20px;
        margin-top: 16px;
        flex-wrap: wrap;

        span {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 600;
          color: #E2E8F0;
        }
      }
    }

    .hub-tabs {
      display: flex;
      gap: 8px;
      border-bottom: 2px solid var(--color-border);
      margin-bottom: 20px;
      overflow-x: auto;

      .tab-btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 10px 16px;
        background: transparent;
        border: none;
        border-bottom: 2px solid transparent;
        margin-bottom: -2px;
        font-size: 13px;
        font-weight: 700;
        color: var(--color-text-secondary);
        cursor: pointer;
        transition: all 0.15s ease;
        white-space: nowrap;

        &:hover { color: var(--color-navy); }
        &.active {
          color: var(--color-navy);
          border-bottom-color: var(--color-navy);
        }
      }
    }

    /* TOPICS & FORUM */
    .section-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .topics-list {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .topic-item {
      padding: 20px;

      .topic-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 10px;

        .topic-avatar-icon {
          width: 40px;
          height: 40px;
          min-width: 40px;
          min-height: 40px;
          border-radius: 50%;
          background: var(--color-primary-light);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid var(--color-primary);
        }

        .topic-meta {
          flex: 1;
          display: flex;
          flex-direction: column;
          .author-name { font-size: 14px; color: var(--color-navy); }
          .topic-date { font-size: 11px; color: var(--color-text-secondary); }
        }
      }

      .topic-title { font-size: 15px; font-weight: 800; color: var(--color-navy); margin-bottom: 4px; }
      .topic-body { font-size: 13px; color: var(--color-text-primary); line-height: 20px; margin-bottom: 14px; }

      .comments-section {
        background: var(--color-background);
        border-radius: var(--radius-md);
        padding: 14px;

        .comments-count {
          font-size: 12px;
          font-weight: 700;
          color: var(--color-navy);
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 10px;
        }

        .comments-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 12px;
        }

        .comment-bubble {
          display: flex;
          gap: 10px;
          background: #FFFFFF;
          padding: 8px 12px;
          border-radius: var(--radius-md);
          border: 1px solid var(--color-border);

          .comment-avatar-icon {
            width: 28px;
            height: 28px;
            min-width: 28px;
            min-height: 28px;
            border-radius: 50%;
            background: var(--color-background);
            border: 1px solid var(--color-border);
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .comment-content {
            flex: 1;
            .comment-author-row {
              display: flex;
              justify-content: space-between;
              font-size: 11px;
              margin-bottom: 2px;
              .comment-time { color: var(--color-text-secondary); font-size: 10px; }
            }
            .comment-text { font-size: 12px; color: var(--color-text-primary); line-height: 16px; margin: 0; }
          }
        }

        .comment-input-row {
          display: flex;
          gap: 8px;
          .comment-input { flex: 1; height: 38px; font-size: 13px; }
        }
      }
    }

    /* COMMUNITY SHARED QUIZZES GRID (ULTRA COMPACT) */
    .quizzes-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 14px;
    }

    .quiz-compact-card {
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      border-radius: var(--radius-md);
      transition: transform 0.15s ease, box-shadow 0.15s ease;

      &:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-sm);
      }

      .card-main-row {
        display: flex;
        gap: 12px;
        align-items: flex-start;

        .quiz-thumb {
          width: 52px;
          height: 52px;
          min-width: 52px;
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
            gap: 6px;
            margin-bottom: 3px;

            .category-pill {
              font-size: 10px;
              font-weight: 700;
              color: var(--color-navy);
              background: var(--color-navy-light);
              padding: 2px 6px;
              border-radius: var(--radius-xs);
            }
          }

          .quiz-title {
            font-size: 14px;
            font-weight: 800;
            color: var(--color-navy);
            margin: 0 0 3px 0;
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
          }
        }
      }

      .card-action-bar {
        padding-top: 8px;
        border-top: 1px solid var(--color-border);
        margin-top: auto;

        .btn-full {
          width: 100%;
          font-size: 11px;
          font-weight: 800;
          height: 28px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
        }
      }
    }

    /* RESOURCES */
    .resources-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 14px;

      .resource-card {
        padding: 14px 18px;
        display: flex;
        align-items: center;
        gap: 12px;

        .file-icon-box {
          width: 40px;
          height: 40px;
          border-radius: var(--radius-md);
          background: var(--color-navy-light);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .file-info {
          flex: 1;
          .file-title { font-size: 13px; font-weight: 700; color: var(--color-navy); margin-bottom: 2px; }
          .file-meta { font-size: 11px; color: var(--color-text-secondary); }
        }
      }
    }

    /* MEETINGS */
    .meetings-list {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 14px;

      .meeting-card {
        padding: 18px;
        .meet-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 800;
          color: var(--color-orange);
          margin-bottom: 6px;
        }
        .meet-title { font-size: 15px; font-weight: 800; color: var(--color-navy); margin-bottom: 4px; }
        .meet-timing {
          font-size: 12px;
          color: var(--color-text-secondary);
          margin: 10px 0;
          display: flex;
          flex-direction: column;
          gap: 3px;
          span { display: inline-flex; align-items: center; gap: 6px; }
        }
      }
    }

    /* MEMBERS TABLE */
    .members-table {
      padding: 0;
      overflow-x: auto;
      table { width: 100%; border-collapse: collapse; }
      th { background: var(--color-navy); color: #FFFFFF; padding: 10px 16px; font-size: 12px; text-align: left; }
      td { padding: 10px 16px; border-bottom: 1px solid var(--color-border); font-size: 13px; }

      .table-avatar {
        width: 34px !important;
        height: 34px !important;
        min-width: 34px !important;
        min-height: 34px !important;
        border-radius: 50% !important;
        object-fit: cover !important;
      }
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
  private quizService = inject(QuizService);
  public authService = inject(AuthService);

  communities = this.commService.getCommunities();
  selectedCommunity: Community | null = null;
  activeTab: 'FORUM' | 'QUIZZES' | 'RESOURCES' | 'MEMBERS' = 'FORUM';
  activeTestQuiz: Quiz | null = null;

  searchQuery = '';
  filterType: 'ALL' | 'PUBLIC' | 'PRIVATE' = 'ALL';
  viewMode: 'grid' | 'list' = 'grid';

  currentPage = 1;
  pageSize = 6; // 2 rows of 3 items per page

  // Modals
  showCreateModal = false;
  showJoinModal = false;
  showNewTopicModal = false;
  isCodeCopied = false;

  // New community form
  newCommName = '';
  newCommDesc = '';
  newCommCategory = 'Tech & Informatique';
  newCommIsPrivate = false;

  // Join form
  joinCodeInput = '';
  joinError = '';

  newCommentTexts: { [topicId: string]: string } = {};

  filteredCommunities(): Community[] {
    return this.communities().filter(c => {
      const matchSearch = !this.searchQuery ||
        c.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        c.description.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        c.accessCode.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        (c.category && c.category.toLowerCase().includes(this.searchQuery.toLowerCase()));
      
      const matchType = this.filterType === 'ALL' ||
        (this.filterType === 'PUBLIC' && !c.isPrivate) ||
        (this.filterType === 'PRIVATE' && c.isPrivate);

      return matchSearch && matchType;
    });
  }

  paginatedCommunities(): Community[] {
    const list = this.filteredCommunities();
    const start = (this.currentPage - 1) * this.pageSize;
    return list.slice(start, start + this.pageSize);
  }

  openCommunity(comm: Community) {
    this.selectedCommunity = comm;
    this.activeTab = 'FORUM';
  }

  getCommunityQuizzes(comm: Community): Quiz[] {
    const allQuizzes = this.quizService.getQuizzes()();
    if (comm.sharedQuizIds && comm.sharedQuizIds.length > 0) {
      return allQuizzes.filter(q => comm.sharedQuizIds?.includes(q.id));
    }
    return allQuizzes.slice(0, 2);
  }

  copyCode(code: string) {
    navigator.clipboard.writeText(code);
    this.isCodeCopied = true;
    setTimeout(() => this.isCodeCopied = false, 2000);
  }

  // Form field errors
  fieldErrors: Record<string, string> = {};
  joinFieldErrors: Record<string, string> = {};
  generalError = '';

  newTopicTitle = '';
  newTopicContent = '';
  topicFieldErrors: Record<string, string> = {};
  topicGeneralError = '';

  clearTopicFieldError(field: string): void {
    if (this.topicFieldErrors[field]) {
      const updated = { ...this.topicFieldErrors };
      delete updated[field];
      this.topicFieldErrors = updated;
    }
  }

  submitNewTopic(): void {
    this.topicFieldErrors = {};
    this.topicGeneralError = '';

    if (!this.newTopicTitle.trim()) {
      this.topicFieldErrors['title'] = 'Le titre du sujet est obligatoire.';
    }
    if (!this.newTopicContent.trim()) {
      this.topicFieldErrors['content'] = 'Le contenu ou la description du sujet est obligatoire.';
    }

    if (Object.keys(this.topicFieldErrors).length > 0) {
      return;
    }

    if (!this.selectedCommunity) return;

    const user = this.authService.currentUser();
    const createdTopic = this.commService.addTopic(this.selectedCommunity.id, {
      title: this.newTopicTitle.trim(),
      content: this.newTopicContent.trim(),
      authorName: user ? `${user.prenom} ${user.nom}` : 'Formateur',
      authorId: user?.id || 'u1',
      authorAvatar: user?.avatarUrl
    });

    if (this.selectedCommunity.topics) {
      this.selectedCommunity.topics = [createdTopic, ...this.selectedCommunity.topics];
      this.selectedCommunity.topicsCount = (this.selectedCommunity.topicsCount || 0) + 1;
    }

    this.newTopicTitle = '';
    this.newTopicContent = '';
    this.showNewTopicModal = false;
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

    const user = this.authService.currentUser();
    this.commService.createCommunityApi({
      name: this.newCommName.trim(),
      description: this.newCommDesc.trim(),
      category: this.newCommCategory,
      isPrivate: this.newCommIsPrivate,
      creatorId: user?.id || 'u1',
      creatorName: `${user?.prenom} ${user?.nom}`
    }).subscribe({
      next: (newComm) => {
        this.showCreateModal = false;
        this.newCommName = '';
        this.newCommDesc = '';
        this.fieldErrors = {};
        this.selectedCommunity = newComm;
      },
      error: (err) => {
        this.fieldErrors = extractFieldErrors(err);
        this.generalError = getGeneralErrorMessage(err, 'Impossible de créer la communauté.');
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
        this.selectedCommunity = found;
        this.showJoinModal = false;
        this.joinCodeInput = '';
        this.joinFieldErrors = {};
      },
      error: (err) => {
        this.joinFieldErrors = extractFieldErrors(err);
        if (this.joinFieldErrors['accessCode']) {
          this.joinError = this.joinFieldErrors['accessCode'];
        } else {
          this.joinError = getGeneralErrorMessage(err, 'Code d\'accès introuvable. Vérifiez l\'orthographe.');
        }
      }
    });
  }

  submitComment(communityId: string, topicId: string) {
    const text = this.newCommentTexts[topicId];
    if (text && text.trim()) {
      const user = this.authService.currentUser();
      this.commService.addComment(communityId, topicId, {
        content: text.trim(),
        authorName: `${user?.prenom} ${user?.nom}`,
        authorId: user?.id || 'u1',
        authorAvatar: user?.avatarUrl
      });
      this.newCommentTexts[topicId] = '';
    }
  }

  downloadSimulated(title: string) {
    alert(`Téléchargement de "${title}" démarré !`);
  }
}
