import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ClasseService } from '../../../core/services/classe.service';
import { QuizService } from '../../../core/services/quiz.service';
import { CourseService } from '../../../core/services/course.service';
import { LiveSessionService } from '../../../core/services/live-session.service';
import { PromotionService } from '../../../core/services/promotion.service';
import { Promotion, PromotionPermissions } from '../../../core/models/promotion.model';
import { Classe, Student } from '../../../core/models/classe.model';
import { Quiz } from '../../../core/models/quiz.model';
import { Course } from '../../../core/models/course.model';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { QuizModalPlayerComponent } from '../../../shared/components/quiz-modal-player/quiz-modal-player.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { InvitationService } from '../../../core/services/invitation.service';

@Component({
  selector: 'app-class-manage',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, IconComponent, QuizModalPlayerComponent, PaginationComponent],
  template: `
    <div class="class-page">
      <!-- =========================================================================
           VIEW 1: DIRECTORY OF CLASSES (DEFAULT)
           ========================================================================= -->
      @if (!selectedClass) {
        <div class="page-header animate-fade-in">
          <div>
            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
              <h1 class="h1">Gestion de mes Classes</h1>
              <span class="badge badge-primary" style="display: inline-flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 800;">
                <app-icon name="school" [size]="13" color="var(--color-navy)"></app-icon>
                {{ promotionService.activePromotionLabel() }}
              </span>
            </div>
            <p class="body-small">Créez des cohortes d'étudiants, assignez des quiz ciblés et suivez l'avancement pédagogique par promotion.</p>
          </div>

          @if (currentPermissions().canMutate) {
            <button class="btn btn-primary btn-sm" (click)="openCreateModal()">
              <app-icon name="plus" [size]="15" color="var(--color-navy)"></app-icon>
              <span>Nouvelle Classe</span>
            </button>
          } @else {
            <button class="btn btn-outline btn-sm" disabled style="opacity: 0.6; cursor: not-allowed;" title="Création désactivée sur une promotion archivée">
              <app-icon name="lock" [size]="14" color="#64748B"></app-icon>
              <span style="color: #64748B;">Nouvelle Classe (Verrouillée)</span>
            </button>
          }
        </div>

        <!-- STATUS CONTEXT BANNER ACCORDING TO VIEWED PROMOTION -->
        @if (currentViewedPromotion()?.status === 'ARCHIVED') {
          <div class="status-context-banner banner-archived animate-fade-in">
            <app-icon name="lock" [size]="18" color="#475569"></app-icon>
            <div style="flex: 1;">
              <div class="banner-title">Promotion Archivée : {{ currentViewedPromotion()?.name }} ({{ currentViewedPromotion()?.year }}) — Consultation en lecture seule</div>
              <div class="banner-sub">Cette promotion est terminée et conservée pour l'historique. La création de classes, l'ajout d'élèves et les sessions live sont désactivés.</div>
            </div>
            <span class="banner-pill">
              <app-icon name="lock" [size]="12" color="#475569"></app-icon>
              <span>Lecture seule</span>
            </span>
          </div>
        } @else if (currentViewedPromotion()?.status === 'UPCOMING') {
          <div class="status-context-banner banner-upcoming animate-fade-in">
            <app-icon name="clock" [size]="18" color="#854D0E"></app-icon>
            <div style="flex: 1;">
              <div class="banner-title">Promotion À Venir : {{ currentViewedPromotion()?.name }} ({{ currentViewedPromotion()?.year }}) — Phase de préparation</div>
              <div class="banner-sub">Vous pouvez préparer vos classes et préinscrire les apprenants. Les évaluations et sessions Live débuteront dès le démarrage en cours.</div>
            </div>
            <span class="banner-pill">
              <app-icon name="clock" [size]="12" color="#854D0E"></app-icon>
              <span>En préparation</span>
            </span>
          </div>
        }

        <!-- UNIFIED COMPACT SEARCH & FILTER TOOLBAR -->
        <div class="filter-toolbar card animate-fade-in">
          <div class="search-box">
            <app-icon name="search" [size]="16" color="var(--color-text-secondary)"></app-icon>
            <input 
              type="text" 
              [(ngModel)]="searchQuery" 
              placeholder="Rechercher une classe ou un code..." 
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
              (ngModelChange)="currentPage = 1"
              class="promo-select"
              title="Filtrer les classes par promotion (ne modifie pas le contexte actif du Header)">
              <option value="ACTIVE">✓ Promotion active ({{ promotionService.activePromotionLabel() }})</option>
              <option value="ALL">Toutes les promotions (Recherche globale)</option>
              @for (p of promotionService.promotions(); track p.id) {
                <option [value]="p.id">{{ p.name }} ({{ getStatusLabel(p.status) }})</option>
              }
            </select>
          </div>

          <div class="filter-pills">
            <button 
              type="button" 
              class="pill-btn" 
              [class.active]="filterLevel === 'ALL'" 
              (click)="filterLevel = 'ALL'; currentPage = 1">
              Toutes ({{ classes().length }})
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

        <!-- SKELETON LOADERS (FUN & CLEAN) -->
        @if (isLoading) {
          <div class="classes-grid animate-fade-in">
            @for (i of [1, 2, 3, 4]; track i) {
              <div class="skeleton-compact-card">
                <div class="sk-top">
                  <div class="skeleton-fun" style="height: 16px; width: 65px; border-radius: 9999px;"></div>
                  <div class="skeleton-fun" style="height: 14px; width: 50px;"></div>
                </div>
                <div style="margin: 8px 0; display: flex; flex-direction: column; gap: 6px;">
                  <div class="skeleton-fun" style="height: 18px; width: 75%;"></div>
                  <div class="skeleton-fun" style="height: 12px; width: 45%;"></div>
                </div>
                <div class="sk-footer">
                  <div class="skeleton-fun" style="height: 14px; width: 70px;"></div>
                  <div class="skeleton-fun" style="height: 28px; width: 80px; border-radius: 6px;"></div>
                </div>
              </div>
            }
          </div>
        } @else if (filteredClasses().length === 0) {
          <div class="empty-state-box animate-fade-in">
            <div class="empty-icon-wrap">
              <app-icon name="school" [size]="28" color="var(--color-navy)"></app-icon>
            </div>
            <h3 class="empty-title">Aucune classe trouvée</h3>
            <p class="empty-desc">
              Organisez vos promotions et groupes d'étudiants pour suivre leurs performances et leur assigner des quiz spécifiques.
            </p>
            <button class="btn btn-primary btn-sm" (click)="openCreateModal()">
              <app-icon name="plus" [size]="15" color="var(--color-navy)"></app-icon>
              <span>Créer ma Première Classe</span>
            </button>
          </div>
        } @else {
          <!-- 1. GRID MODE (AIRY & MODERN) -->
          @if (viewMode === 'grid') {
            <div class="classes-grid animate-fade-in">
              @for (c of paginatedClasses(); track c.id) {
                <div class="class-card-premium card" (click)="openClass(c)">
                  <!-- Top Row: Icon + Level + Promotion Badge -->
                  <div class="card-head-row">
                    <div class="head-left-group">
                      <div class="class-badge-icon">
                        <app-icon name="school" [size]="17" color="var(--color-navy)"></app-icon>
                      </div>
                      <span class="level-pill-badge">{{ c.level }}</span>
                    </div>

                    @if (c.promotionLabel) {
                      <span class="promo-pill-tag" title="Promotion rattachée">
                        <span class="promo-dot"></span>
                        {{ c.promotionLabel }}
                      </span>
                    }
                  </div>

                  <!-- Middle: Title and Code -->
                  <div class="card-body-block">
                    <h3 class="class-title-text" [title]="c.name">{{ c.name }}</h3>
                    <div class="class-code-line">
                      <span class="code-label">Identifiant :</span>
                      <code class="code-val">#{{ c.code }}</code>
                    </div>
                  </div>

                  <!-- Stats Pills Row -->
                  <div class="card-stats-row">
                    <div class="stat-bubble">
                      <app-icon name="users" [size]="13" color="var(--color-navy)"></app-icon>
                      <span><strong>{{ c.students.length }}</strong> apprenant{{ c.students.length > 1 ? 's' : '' }}</span>
                    </div>
                    <div class="stat-bubble">
                      <app-icon name="file-text" [size]="13" color="var(--color-navy)"></app-icon>
                      <span><strong>{{ c.assignedQuizIds.length }}</strong> quiz</span>
                    </div>
                  </div>

                  <!-- Bottom Action Buttons -->
                  <div class="card-footer-btns" (click)="$event.stopPropagation()">
                    <button class="btn-manage" (click)="openClass(c)">
                      <span>Gérer la classe</span>
                    </button>
                    @if (getClassPermissions(c).canLaunchLive) {
                      <button class="btn-live-gold" (click)="launchLiveForClass(c)" title="Lancer une session en direct avec cette classe">
                        <app-icon name="play" [size]="13" color="var(--color-navy)"></app-icon>
                        <span>Live</span>
                      </button>
                    } @else {
                      <button class="btn-live-disabled" disabled [title]="getClassPermissions(c).isReadOnly ? 'Sessions Live désactivées (Promotion archivée)' : 'Sessions Live désactivées (Promotion en phase de préparation)'">
                        <app-icon name="lock" [size]="12" color="#94A3B8"></app-icon>
                        <span>Live</span>
                      </button>
                    }
                  </div>
                </div>
              }
            </div>
          }

          <!-- 2. LIST MODE (HORIZONTAL ROWS) -->
          @if (viewMode === 'list') {
            <div class="classes-list-rows animate-fade-in">
              @for (c of paginatedClasses(); track c.id) {
                <div class="class-list-row card card-interactive" (click)="openClass(c)">
                  <div class="row-icon-box">
                    <app-icon name="school" [size]="18" color="var(--color-navy)"></app-icon>
                  </div>

                  <div class="row-main-info">
                    <div class="row-top-tags">
                      <span class="level-pill">{{ c.level }}</span>
                      @if (c.promotionLabel) {
                        <span class="badge badge-navy" style="font-size: 10px; padding: 2px 7px;">{{ c.promotionLabel }}</span>
                      }
                      <span class="code-txt">Code : {{ c.code }}</span>
                    </div>
                    <h3 class="row-title">{{ c.name }}</h3>
                  </div>

                  <div class="row-stats">
                    <div class="stat-item">
                      <span class="stat-num">{{ c.students.length }}</span>
                      <span class="stat-label">Élèves</span>
                    </div>
                    <div class="stat-item">
                      <span class="stat-num">{{ c.assignedQuizIds.length }}</span>
                      <span class="stat-label">Quiz assignés</span>
                    </div>
                  </div>

                  <div class="row-actions" (click)="$event.stopPropagation()">
                    <button class="btn btn-outline btn-sm" (click)="openClass(c)">
                      <span>Gérer</span>
                    </button>
                    @if (getClassPermissions(c).canLaunchLive) {
                      <button class="btn btn-primary btn-sm btn-play" (click)="launchLiveForClass(c)">
                        <app-icon name="play" [size]="13" color="var(--color-navy)"></app-icon>
                        <span>Live</span>
                      </button>
                    } @else {
                      <button class="btn btn-outline btn-sm btn-play" disabled style="opacity: 0.5; cursor: not-allowed;" [title]="getClassPermissions(c).isReadOnly ? 'Sessions Live désactivées (Promotion archivée)' : 'Sessions Live désactivées (Promotion en phase de préparation)'">
                        <app-icon name="lock" [size]="12" color="#94A3B8"></app-icon>
                        <span>Live</span>
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
            [totalItems]="filteredClasses().length" 
            (pageChange)="currentPage = $event">
          </app-pagination>
        }
      }

      <!-- =========================================================================
           VIEW 2: SINGLE CLASS FOCUS VIEW
           ========================================================================= -->
      @if (selectedClass) {
        <div class="class-focus-view animate-fade-in">
          <!-- Back navigation & Title bar -->
          <div class="focus-top-bar">
            <button class="btn btn-outline btn-sm back-btn" (click)="selectedClass = null">
              <app-icon name="arrow-left" [size]="14"></app-icon>
              <span>Retour aux classes</span>
            </button>

            @if (getClassPermissions(selectedClass).canLaunchLive) {
              <button class="btn btn-primary btn-sm" (click)="launchLiveForClass(selectedClass)">
                <app-icon name="play" [size]="15" color="var(--color-navy)"></app-icon>
                <span>Lancer un Live pour cette classe</span>
              </button>
            } @else {
              <button class="btn btn-outline btn-sm" disabled style="opacity: 0.6; cursor: not-allowed;" [title]="getClassPermissions(selectedClass).isReadOnly ? 'Sessions Live désactivées : promotion archivée' : 'Sessions Live désactivées : la promotion est en phase de préparation'">
                <app-icon name="lock" [size]="14" color="#94A3B8"></app-icon>
                <span style="color: #94A3B8;">Live désactivé ({{ getClassPermissions(selectedClass).isReadOnly ? 'Archivée' : 'À venir' }})</span>
              </button>
            }
          </div>

          @if (getClassPermissions(selectedClass).isReadOnly) {
            <div class="status-context-banner banner-archived animate-fade-in" style="margin-top: 14px; margin-bottom: 0;">
              <app-icon name="lock" [size]="18" color="#475569"></app-icon>
              <div style="flex: 1;">
                <div class="banner-title">Classe en Lecture Seule (Promotion Archivée)</div>
                <div class="banner-sub">Cette classe est conservée pour l'historique pédagogique. L'ajout d'élèves, les assignations et les sessions live sont verrouillés.</div>
              </div>
              <span class="banner-pill">
                <app-icon name="lock" [size]="12" color="#475569"></app-icon>
                <span>Lecture seule</span>
              </span>
            </div>
          }

          <!-- CLASS HERO BANNER (COMMUNITY STYLE WITH BACKGROUND IMAGE) -->
          <div 
            class="class-hero-card card animate-fade-in" 
            [style.backgroundImage]="'linear-gradient(rgba(3, 36, 71, 0.80), rgba(3, 36, 71, 0.94)), url(' + (selectedClass.coverImage || 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80') + ')'">
            <div class="hero-content">
              <div class="hero-top">
                <span class="badge badge-primary">{{ selectedClass.level }}</span>
                <span class="badge-code">
                  <app-icon name="lock" [size]="12" color="#FFFFFF"></app-icon>
                  <span>Code : <strong>{{ selectedClass.code }}</strong></span>
                </span>
                <span class="badge" style="background: #10B981; color: #FFFFFF;">
                  Active ({{ selectedClass.students.length }} élèves)
                </span>
              </div>

              <h1 class="hero-title">{{ selectedClass.name }}</h1>
              <p class="hero-desc">{{ selectedClass.description }}</p>

              <div class="hero-metrics">
                <span>
                  <app-icon name="users" [size]="13" color="#CBD5E1"></app-icon>
                  {{ selectedClass.students.length }} Élèves inscrits
                </span>
                <span>
                  <app-icon name="book-open" [size]="13" color="#CBD5E1"></app-icon>
                  {{ getAssignedCourses().length }} Cours assignés
                </span>
                <span>
                  <app-icon name="help-circle" [size]="13" color="#CBD5E1"></app-icon>
                  {{ selectedClass.assignedQuizIds.length }} Quiz assignés
                </span>
                <span>
                  <app-icon name="calendar" [size]="13" color="#CBD5E1"></app-icon>
                  Créée le {{ selectedClass.createdAt }}
                </span>
              </div>
            </div>
          </div>

          <!-- SECTION 1: STUDENTS LIST -->
          <div class="section-card card">
            <div class="section-head">
              <div>
                <h3 class="h2" style="font-size: 16px;">Élèves Inscrits ({{ selectedClass.students.length }})</h3>
                <p class="body-small">Liste des apprenants membres de cette promotion.</p>
              </div>

              @if (getClassPermissions(selectedClass).canMutate) {
                <div style="display: flex; gap: 8px;">
                  <button class="btn btn-primary btn-sm" (click)="openInviteModal()">
                    <app-icon name="file-text" [size]="14" color="var(--color-navy)"></app-icon>
                    <span>Inviter par Email</span>
                  </button>
                  <button class="btn btn-secondary btn-sm" (click)="showAddStudentModal = true">
                    <app-icon name="plus" [size]="14" color="#FFFFFF"></app-icon>
                    <span>Ajouter manuellement</span>
                  </button>
                </div>
              }
            </div>

            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Élève</th>
                    <th>Email & Matricule</th>
                    <th>Progression Cours</th>
                    <th>Résultats Quiz</th>
                    <th>Statut</th>
                    <th style="text-align: right;">Action</th>
                  </tr>
                </thead>
                <tbody>
                  @for (st of selectedClass.students; track st.id) {
                    <tr>
                      <td>
                        <div class="student-cell">
                          <div class="student-avatar" [style.backgroundImage]="st.avatarUrl ? 'url(' + st.avatarUrl + ')' : 'none'">
                            @if (!st.avatarUrl) {
                              {{ st.prenom[0] }}{{ st.nom[0] }}
                            }
                          </div>
                          <div class="student-names">
                            <strong class="st-fullname">{{ st.prenom }} {{ st.nom }}</strong>
                            <span class="st-date">Inscrit le {{ st.joinedAt }}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div class="meta-cell">
                          <span class="st-email">{{ st.email }}</span>
                          <code class="st-mat">{{ st.matricule || 'N/A' }}</code>
                        </div>
                      </td>
                      <!-- PROGRESSION SUR LES COURS -->
                      <td>
                        <div class="progress-cell">
                          <div class="progress-meta">
                            <strong class="prog-pct">{{ st.coursesProgressPercent !== undefined ? st.coursesProgressPercent : 65 }}%</strong>
                            <span class="prog-sub">({{ st.coursesCompletedCount !== undefined ? st.coursesCompletedCount : 1 }} cours complété{{ (st.coursesCompletedCount || 1) > 1 ? 's' : '' }})</span>
                          </div>
                          <div class="progress-track">
                            <div class="progress-fill course-fill" [style.width.%]="st.coursesProgressPercent !== undefined ? st.coursesProgressPercent : 65"></div>
                          </div>
                        </div>
                      </td>
                      <!-- PROGRESSION ET SCORE AUX QUIZ -->
                      <td>
                        <div class="progress-cell">
                          <div class="progress-meta">
                            <strong class="score-pct">{{ st.averageScorePercent }}% moy.</strong>
                            <span class="prog-sub">({{ st.quizzesCompletedCount }} quiz joué{{ st.quizzesCompletedCount > 1 ? 's' : '' }})</span>
                          </div>
                          <div class="progress-track">
                            <div class="progress-fill quiz-fill" [style.width.%]="st.averageScorePercent"></div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span class="badge badge-success">Actif</span>
                      </td>
                      <td style="text-align: right;">
                        @if (getClassPermissions(selectedClass).canMutate) {
                          <button class="btn-icon-danger" (click)="removeStudent(st.id)" title="Retirer l'élève">
                            <app-icon name="trash" [size]="14" color="var(--color-danger)"></app-icon>
                          </button>
                        } @else {
                          <span class="text-muted" style="font-size: 11px;">—</span>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>

          <!-- SECTION 2: ASSIGNED QUIZZES -->
          <div class="section-card card">
            <div class="section-head">
              <div>
                <h3 class="h2" style="font-size: 16px;">Quiz Assignés à cette Classe ({{ selectedClass.assignedQuizIds.length }})</h3>
                <p class="body-small">Quiz mis à disposition des élèves de cette classe pour entraînement ou évaluation.</p>
              </div>

              @if (getClassPermissions(selectedClass).canMutate) {
                <button class="btn btn-primary btn-sm" (click)="showAssignQuizModal = true">
                  <app-icon name="plus" [size]="14" color="var(--color-navy)"></app-icon>
                  <span>Assigner un Quiz</span>
                </button>
              }
            </div>

            @if (getAssignedQuizzes().length === 0) {
              <div class="empty-assigned-box">
                <app-icon name="help-circle" [size]="24" color="var(--color-text-secondary)"></app-icon>
                <p>Aucun quiz n'est actuellement assigné à cette classe.</p>
                @if (getClassPermissions(selectedClass).canMutate) {
                  <button class="btn btn-outline btn-sm" (click)="showAssignQuizModal = true">
                    Choisir un quiz à assigner
                  </button>
                }
              </div>
            } @else {
              <div class="assigned-quizzes-grid">
                @for (q of getAssignedQuizzes(); track q.id) {
                  <div class="quiz-mini-card card">
                    <div class="mini-cover" [style.backgroundImage]="'url(' + q.coverImage + ')'">
                      <span class="category-chip">{{ q.category }}</span>
                    </div>
                    <div class="mini-body">
                      <h4 class="mini-title">{{ q.title }}</h4>
                      <span class="mini-meta">{{ q.questionsCount }} Qs • {{ q.participationsCount }} joués</span>
                    </div>
                    <div class="mini-actions">
                      <button class="btn btn-primary btn-sm btn-full" (click)="activeTestQuiz = q">
                        <app-icon name="play" [size]="13" color="var(--color-navy)"></app-icon>
                        <span>Tester</span>
                      </button>
                      @if (getClassPermissions(selectedClass).canMutate) {
                        <button class="btn btn-outline btn-sm btn-icon" (click)="unassignQuiz(q.id)" title="Désassigner" style="color: var(--color-danger);">
                          <app-icon name="trash" [size]="13" color="var(--color-danger)"></app-icon>
                        </button>
                      }
                    </div>
                  </div>
                }
              </div>
            }
          </div>

          <!-- SECTION 3: ASSIGNED COURSES (NEW) -->
          <div class="section-card card">
            <div class="section-head">
              <div>
                <h3 class="h2" style="font-size: 16px;">Cours Assignés à cette Classe ({{ getAssignedCourses().length }})</h3>
                <p class="body-small">Parcours d'apprentissage, leçons et chapitres accessibles aux élèves de cette classe.</p>
              </div>

              @if (getClassPermissions(selectedClass).canMutate) {
                <button class="btn btn-primary btn-sm" (click)="showAssignCourseModal = true">
                  <app-icon name="plus" [size]="14" color="var(--color-navy)"></app-icon>
                  <span>Assigner un Cours</span>
                </button>
              }
            </div>

            @if (getAssignedCourses().length === 0) {
              <div class="empty-assigned-box">
                <app-icon name="book-open" [size]="24" color="var(--color-text-secondary)"></app-icon>
                <p>Aucun cours n'est actuellement assigné à cette classe.</p>
                @if (getClassPermissions(selectedClass).canMutate) {
                  <button class="btn btn-outline btn-sm" (click)="showAssignCourseModal = true">
                    Choisir un cours à assigner
                  </button>
                }
              </div>
            } @else {
              <div class="assigned-courses-grid">
                @for (c of getAssignedCourses(); track c.id) {
                  <div class="course-mini-card card">
                    <div class="mini-cover" [style.backgroundImage]="'url(' + c.coverImage + ')'">
                      <div class="cover-overlay"></div>
                      <span class="category-chip">{{ c.category }}</span>
                      <span class="level-chip">{{ c.level }}</span>
                    </div>
                    <div class="mini-body">
                      <h4 class="mini-title">{{ c.title }}</h4>
                      <div class="mini-features">
                        <span class="feat-item">
                          <app-icon name="layers" [size]="12" color="var(--color-navy)"></app-icon>
                          <span>{{ c.chapters.length }} chapitres</span>
                        </span>
                        <span class="feat-item">
                          <app-icon name="zap" [size]="12" [color]="c.hasChapterQuizzes ? 'var(--color-navy)' : 'var(--color-text-secondary)'"></app-icon>
                          <span>Quiz / ch : {{ c.hasChapterQuizzes ? 'Oui' : 'Non' }}</span>
                        </span>
                        <span class="feat-item">
                          <app-icon name="trophy" [size]="12" [color]="c.hasFinalQuiz ? 'var(--color-navy)' : 'var(--color-text-secondary)'"></app-icon>
                          <span>Examen : {{ c.hasFinalQuiz ? 'Oui' : 'Non' }}</span>
                        </span>
                      </div>
                    </div>
                    <div class="mini-actions">
                      <a [routerLink]="['/app/courses', c.id]" class="btn btn-primary btn-sm btn-full">
                        <app-icon name="book-open" [size]="13" color="var(--color-navy)"></app-icon>
                        <span>Consulter</span>
                      </a>
                      @if (getClassPermissions(selectedClass).canMutate) {
                        <button class="btn btn-outline btn-sm btn-icon" (click)="unassignCourseFromClass(c.id)" title="Désassigner ce cours" style="color: var(--color-danger);">
                          <app-icon name="trash" [size]="13" color="var(--color-danger)"></app-icon>
                        </button>
                      }
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        </div>
      }

      <!-- QUIZ MODAL PLAYER -->
      @if (activeTestQuiz) {
        <app-quiz-modal-player [quiz]="activeTestQuiz" (closed)="activeTestQuiz = null"></app-quiz-modal-player>
      }

      <!-- MODAL CREATE CLASS -->
      @if (showCreateModal) {
        <div class="modal-backdrop" (click)="showCreateModal = false">
          <div class="modal-card card" (click)="$event.stopPropagation()">
            <div class="modal-head">
              <h3 class="h2">Nouvelle Classe</h3>
              <button class="close-x" (click)="showCreateModal = false">✕</button>
            </div>

            <form (ngSubmit)="submitCreateClass()" class="clean-form">
              <div class="form-group">
                <label>Nom de la classe *</label>
                <input 
                  type="text" 
                  [(ngModel)]="newClassName" 
                  name="newClassName" 
                  [class.input-error]="fieldErrors['name']"
                  (input)="clearFieldError('name')"
                  placeholder="ex: Licence 3 - Informatique" 
                  class="input-field" 
                  required>
                @if (fieldErrors['name']) {
                  <span class="field-error-msg animate-fade-in">
                    <app-icon name="alert-circle" [size]="12" color="#DC2626"></app-icon>
                    <span>{{ fieldErrors['name'] }}</span>
                  </span>
                }
              </div>

              <div class="grid-2">
                <div class="form-group">
                  <label>Niveau *</label>
                  <input 
                    type="text" 
                    [(ngModel)]="newClassLevel" 
                    name="newClassLevel" 
                    [class.input-error]="fieldErrors['level']"
                    (input)="clearFieldError('level')"
                    placeholder="ex: Licence 3, Bac+2" 
                    class="input-field" 
                    required>
                  @if (fieldErrors['level']) {
                    <span class="field-error-msg animate-fade-in">
                      <app-icon name="alert-circle" [size]="12" color="#DC2626"></app-icon>
                      <span>{{ fieldErrors['level'] }}</span>
                    </span>
                  }
                </div>
                <div class="form-group">
                  <label>Code de classe *</label>
                  <input 
                    type="text" 
                    [(ngModel)]="newClassCode" 
                    name="newClassCode" 
                    [class.input-error]="fieldErrors['code']"
                    (input)="clearFieldError('code')"
                    placeholder="ex: L3-INFO-2026" 
                    class="input-field" 
                    required>
                  @if (fieldErrors['code']) {
                    <span class="field-error-msg animate-fade-in">
                      <app-icon name="alert-circle" [size]="12" color="#DC2626"></app-icon>
                      <span>{{ fieldErrors['code'] }}</span>
                    </span>
                  }
                </div>
              </div>

              <div class="form-group">
                <label>Promotion / Année Académique *</label>
                <select [(ngModel)]="newClassPromotionId" name="newClassPromotionId" class="input-field" required>
                  @for (p of availablePromotionsForNewClass(); track p.id) {
                    <option [value]="p.id">
                      {{ p.name || p.label }} ({{ getStatusLabel(p.status) }}){{ p.isActive ? ' — Contexte actif' : '' }}
                    </option>
                  }
                </select>
                <span class="caption text-muted" style="font-size: 11px; margin-top: 4px; display: block;">
                  Seules les promotions en cours ou à venir sont disponibles (les promotions archivées sont exclues).
                </span>
              </div>

              <div class="form-group">
                <label>Description courte</label>
                <input type="text" [(ngModel)]="newClassDesc" name="newClassDesc" placeholder="Objectifs et informations" class="input-field">
              </div>

              <div class="modal-btn-row">
                <button type="button" class="btn btn-outline" (click)="showCreateModal = false">Annuler</button>
                <button type="submit" class="btn btn-primary btn-sm" [class.is-loading]="isSubmitting" [disabled]="isSubmitting || !newClassName.trim() || !newClassCode.trim()">
                  @if (isSubmitting) {
                    <span class="btn-spinner spinner-sm"></span>
                    <span>Création...</span>
                  } @else {
                    <span>Créer la classe</span>
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- MODAL ADD STUDENT -->
      @if (showAddStudentModal && selectedClass) {
        <div class="modal-backdrop" (click)="showAddStudentModal = false">
          <div class="modal-card card" (click)="$event.stopPropagation()">
            <div class="modal-head">
              <h3 class="h2">Ajouter un élève</h3>
              <button class="close-x" (click)="showAddStudentModal = false">✕</button>
            </div>

            <form (ngSubmit)="submitAddStudent()" class="clean-form">
              <div class="grid-2">
                <div class="form-group">
                  <label>Prénom *</label>
                  <input 
                    type="text" 
                    [(ngModel)]="newStudentPrenom" 
                    name="newStudentPrenom" 
                    [class.input-error]="studentFieldErrors['prenom']"
                    (input)="clearStudentFieldError('prenom')"
                    placeholder="Fatou" 
                    class="input-field" 
                    required>
                  @if (studentFieldErrors['prenom']) {
                    <span class="field-error-msg animate-fade-in">
                      <app-icon name="alert-circle" [size]="12" color="#DC2626"></app-icon>
                      <span>{{ studentFieldErrors['prenom'] }}</span>
                    </span>
                  }
                </div>
                <div class="form-group">
                  <label>Nom *</label>
                  <input 
                    type="text" 
                    [(ngModel)]="newStudentNom" 
                    name="newStudentNom" 
                    [class.input-error]="studentFieldErrors['nom']"
                    (input)="clearStudentFieldError('nom')"
                    placeholder="Sow" 
                    class="input-field" 
                    required>
                  @if (studentFieldErrors['nom']) {
                    <span class="field-error-msg animate-fade-in">
                      <app-icon name="alert-circle" [size]="12" color="#DC2626"></app-icon>
                      <span>{{ studentFieldErrors['nom'] }}</span>
                    </span>
                  }
                </div>
              </div>

              <div class="form-group">
                <label>Email de l'étudiant *</label>
                <input 
                  type="email" 
                  [(ngModel)]="newStudentEmail" 
                  name="newStudentEmail" 
                  [class.input-error]="studentFieldErrors['email']"
                  (input)="clearStudentFieldError('email')"
                  placeholder="fatou.sow@univ.edu" 
                  class="input-field" 
                  required>
                @if (studentFieldErrors['email']) {
                  <span class="field-error-msg animate-fade-in">
                    <app-icon name="alert-circle" [size]="12" color="#DC2626"></app-icon>
                    <span>{{ studentFieldErrors['email'] }}</span>
                  </span>
                }
              </div>

              <div class="form-group">
                <label>Matricule</label>
                <input type="text" [(ngModel)]="newStudentMatricule" name="newStudentMatricule" placeholder="ETU-2026-0042" class="input-field">
              </div>

              <div class="modal-btn-row">
                <button type="button" class="btn btn-outline" (click)="showAddStudentModal = false">Annuler</button>
                <button type="submit" class="btn btn-primary btn-sm" [class.is-loading]="isSubmitting" [disabled]="isSubmitting || !newStudentPrenom.trim() || !newStudentEmail.trim()">
                  @if (isSubmitting) {
                    <span class="btn-spinner spinner-sm"></span>
                    <span>Ajout...</span>
                  } @else {
                    <span>Ajouter à la classe</span>
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- MODAL INVITATIONS PAR EMAIL -->
      @if (showInviteModal && selectedClass) {
        <div class="modal-backdrop" (click)="showInviteModal = false">
          <div class="modal-card card" (click)="$event.stopPropagation()">
            <div class="modal-head">
              <div>
                <h3 class="h2">Inviter des élèves par Email</h3>
                <p class="body-small">Envoyez une invitation officielle pour rejoindre {{ selectedClass.name }}.</p>
              </div>
              <button class="close-x" (click)="showInviteModal = false">✕</button>
            </div>

            <form (ngSubmit)="submitSendInvitations()" class="clean-form">
              <div class="form-group">
                <label>Adresses Email des élèves *</label>
                <textarea 
                  [(ngModel)]="inviteEmails" 
                  name="inviteEmails" 
                  rows="4" 
                  placeholder="amadou@gmail.com, fatou@ecole.sn&#10;moussa@univ.edu" 
                  required
                  class="input-field"
                  style="width: 100%; border-radius: 8px; padding: 10px 12px; border: 1.5px solid var(--color-border); font-family: inherit; font-size: 13px;"></textarea>
                <span class="field-hint" style="font-size: 11px; color: var(--color-text-secondary); margin-top: 4px; display: block;">
                  Séparez les adresses email par des virgules ou des retours à la ligne.
                </span>
              </div>

              <div class="form-group">
                <label>Message personnalisé (Optionnel)</label>
                <input 
                  type="text" 
                  [(ngModel)]="inviteMessage" 
                  name="inviteMessage" 
                  placeholder="ex: Bonjour, rejoignez notre classe QuizzBoard pour accéder aux quiz et cours." 
                  class="input-field"
                  style="width: 100%; border-radius: 8px; padding: 10px 12px; border: 1.5px solid var(--color-border); font-size: 13px;">
              </div>

              @if (inviteSuccess) {
                <div class="alert-success animate-fade-in" style="padding: 10px 14px; border-radius: 8px; background: #DCFCE7; border: 1px solid #86EFAC; color: #166534; font-size: 13px; margin-top: 10px;">
                  ✓ {{ inviteSuccess }}
                </div>
              }

              @if (inviteError) {
                <div class="alert-error animate-fade-in" style="padding: 10px 14px; border-radius: 8px; background: #FEE2E2; border: 1px solid #FCA5A5; color: #991B1B; font-size: 13px; margin-top: 10px;">
                  ✕ {{ inviteError }}
                </div>
              }

              <div class="modal-btn-row" style="margin-top: 20px;">
                <button type="button" class="btn btn-outline" (click)="showInviteModal = false" [disabled]="inviteSending">Annuler</button>
                <button type="submit" class="btn btn-primary" [disabled]="inviteSending || !inviteEmails.trim()">
                  <app-icon name="check-circle" [size]="15" color="var(--color-navy)"></app-icon>
                  <span>{{ inviteSending ? 'Envoi en cours...' : 'Envoyer les invitations' }}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- MODAL ASSIGN QUIZ -->
      @if (showAssignQuizModal && selectedClass) {
        <div class="modal-backdrop" (click)="showAssignQuizModal = false">
          <div class="modal-card card" (click)="$event.stopPropagation()">
            <div class="modal-head">
              <h3 class="h2">Choisir un Quiz à Assigner</h3>
              <button class="close-x" (click)="showAssignQuizModal = false">✕</button>
            </div>

            <div class="quiz-picker-list">
              @for (q of availableQuizzes(); track q.id) {
                <div class="picker-item" (click)="assignQuiz(q.id)">
                  <img [src]="q.coverImage" class="picker-thumb">
                  <div class="picker-info">
                    <strong style="font-size: 13px;">{{ q.title }}</strong>
                    <span class="body-small">{{ q.category }} • {{ q.questionsCount }} questions</span>
                  </div>
                  <button class="btn btn-primary btn-sm">Assigner</button>
                </div>
              }
            </div>
          </div>
        </div>
      }

      <!-- MODAL ASSIGN COURSE -->
      @if (showAssignCourseModal && selectedClass) {
        <div class="modal-backdrop" (click)="showAssignCourseModal = false">
          <div class="modal-card card" (click)="$event.stopPropagation()">
            <div class="modal-head">
              <h3 class="h2">Assigner un Cours à {{ selectedClass.name }}</h3>
              <button class="close-x" (click)="showAssignCourseModal = false">✕</button>
            </div>

            <div class="quiz-picker-list">
              @for (crs of getUnassignedCourses(); track crs.id) {
                <div class="picker-item" (click)="assignCourseToClass(crs.id, crs.title)">
                  <img [src]="crs.coverImage" class="picker-thumb">
                  <div class="picker-info">
                    <strong style="font-size: 13px;">{{ crs.title }}</strong>
                    <span class="body-small">{{ crs.category }} • {{ crs.chapters.length }} chapitres • ~{{ crs.estimatedHours }}h</span>
                  </div>
                  <button type="button" class="btn btn-primary btn-sm">Assigner</button>
                </div>
              }
              @if (getUnassignedCourses().length === 0) {
                <div class="empty-assigned-box" style="padding: 20px; text-align: center;">
                  <p class="body-small text-muted">Tous vos cours sont déjà assignés à cette classe.</p>
                </div>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .class-page {
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

    .status-context-banner {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 12px 18px;
      border-radius: var(--radius-md);
      margin-bottom: 4px;

      .banner-title {
        font-size: 13.5px;
        font-weight: 800;
        margin-bottom: 2px;
      }

      .banner-sub {
        font-size: 12px;
        line-height: 1.4;
      }

      .banner-pill {
        margin-left: auto;
        font-size: 11px;
        font-weight: 800;
        padding: 4px 10px;
        border-radius: var(--radius-full);
        white-space: nowrap;
      }

      &.banner-archived {
        background: #F8FAFC;
        border: 1.5px solid #CBD5E1;
        color: #334155;

        .banner-title { color: #1E293B; }
        .banner-sub { color: #64748B; }
        .banner-pill {
          background: #E2E8F0;
          color: #475569;
        }
      }

      &.banner-upcoming {
        background: #FEFCE8;
        border: 1.5px solid #FDE047;
        color: #713F12;

        .banner-title { color: #854D0E; }
        .banner-sub { color: #A16207; }
        .banner-pill {
          background: #FEF08A;
          color: #854D0E;
        }
      }
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

    /* 3-4 CARDS PER ROW GRID (BREATHING ROOM, NEVER CRAMPED) */
    .classes-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(330px, 1fr));
      gap: 18px;
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
    }

    .class-card-premium {
      padding: 18px 20px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      border-radius: var(--radius-md);
      background: #FFFFFF;
      border: 1.5px solid var(--color-border);
      box-shadow: 0 2px 6px rgba(3, 36, 71, 0.04);
      transition: all 0.2s ease;
      cursor: pointer;

      &:hover {
        transform: translateY(-2px);
        border-color: #CBD5E1;
        box-shadow: 0 8px 20px rgba(3, 36, 71, 0.08);
      }

      .card-head-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;

        .head-left-group {
          display: flex;
          align-items: center;
          gap: 8px;

          .class-badge-icon {
            width: 34px;
            height: 34px;
            border-radius: var(--radius-sm);
            background: #EEF2FF;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 1px solid #E0E7FF;
            flex-shrink: 0;
          }

          .level-pill-badge {
            font-size: 11px;
            font-weight: 700;
            color: var(--color-navy);
            background: #F1F5F9;
            padding: 3px 8px;
            border-radius: var(--radius-full);
            white-space: nowrap;
          }
        }

        .promo-pill-tag {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          font-weight: 800;
          color: #B45309;
          background: #FEF3C7;
          border: 1px solid #FDE68A;
          padding: 3px 9px;
          border-radius: var(--radius-full);
          white-space: nowrap;

          .promo-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: #D97706;
          }
        }
      }

      .card-body-block {
        display: flex;
        flex-direction: column;
        gap: 4px;

        .class-title-text {
          font-size: 16px;
          font-weight: 800;
          color: var(--color-navy);
          margin: 0;
          line-height: 1.35;
          letter-spacing: -0.01em;
        }

        .class-code-line {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11.5px;
          color: var(--color-text-secondary);

          .code-val {
            font-family: monospace;
            font-size: 11px;
            font-weight: 700;
            background: #F8FAFC;
            border: 1px solid #E2E8F0;
            padding: 1px 6px;
            border-radius: 4px;
            color: #475569;
          }
        }
      }

      .card-stats-row {
        display: flex;
        align-items: center;
        gap: 8px;

        .stat-bubble {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11.5px;
          color: var(--color-navy);
          background: #F8FAFC;
          border: 1px solid #F1F5F9;
          padding: 4px 10px;
          border-radius: var(--radius-sm);
        }
      }

      .card-footer-btns {
        display: flex;
        align-items: center;
        gap: 8px;
        padding-top: 12px;
        border-top: 1px solid #F1F5F9;
        margin-top: auto;

        .btn-manage {
          flex: 1;
          height: 34px;
          border-radius: var(--radius-sm);
          border: 1.5px solid var(--color-border);
          background: #FFFFFF;
          color: var(--color-navy);
          font-size: 12.5px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease;

          &:hover {
            border-color: var(--color-navy);
            background: var(--color-navy);
            color: #FFFFFF;
          }
        }

        .btn-live-gold {
          height: 34px;
          padding: 0 14px;
          border-radius: var(--radius-sm);
          border: 1.5px solid var(--color-primary);
          background: var(--color-primary);
          color: var(--color-navy);
          font-size: 12.5px;
          font-weight: 800;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          transition: all 0.15s ease;

          &:hover {
            background: #F0B800;
            transform: scale(1.02);
            box-shadow: var(--shadow-sm);
          }
        }

        .btn-live-disabled {
          height: 34px;
          padding: 0 12px;
          border-radius: var(--radius-sm);
          border: 1.5px dashed #CBD5E1;
          background: #F8FAFC;
          color: #94A3B8;
          font-size: 12px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          cursor: not-allowed;
          user-select: none;
        }
      }
    }

    /* LIST MODE (ROWS) */
    .classes-list-rows {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .class-list-row {
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

          .level-pill {
            font-size: 9px;
            font-weight: 700;
            color: var(--color-navy);
            background: var(--color-navy-light);
            padding: 1px 5px;
            border-radius: var(--radius-xs);
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
      }
    }

    /* FOCUS VIEW STYLES */
    .class-focus-view {
      display: flex;
      flex-direction: column;
      gap: 16px;

      .focus-top-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 10px;
      }

      .class-hero-card {
        background-size: cover;
        background-position: center;
        padding: 24px 24px 20px 24px;
        border: none;
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-sm);
        position: relative;
        overflow: hidden;

        .hero-content {
          position: relative;
          z-index: 2;
        }

        .hero-top {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;

          .badge-code {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            background: rgba(255, 255, 255, 0.16);
            backdrop-filter: blur(4px);
            color: #FFFFFF;
            border: 1px solid rgba(255, 255, 255, 0.25);
            padding: 3px 9px;
            border-radius: var(--radius-full);
            font-size: 11px;
            font-weight: 600;

            strong { color: #FFFFFF; letter-spacing: 0.5px; font-weight: 800; }
          }
        }

        .hero-title {
          color: #FFFFFF;
          margin: 12px 0 5px 0;
          font-size: 22px;
          font-weight: 800;
          letter-spacing: -0.3px;
        }

        .hero-desc {
          color: #CBD5E1;
          max-width: 750px;
          font-size: 13px;
          line-height: 1.5;
          margin: 0;
        }

        .hero-metrics {
          display: flex;
          gap: 18px;
          margin-top: 14px;
          flex-wrap: wrap;
          color: #CBD5E1;
          font-size: 12px;
          font-weight: 600;

          span {
            display: inline-flex;
            align-items: center;
            gap: 6px;
          }
        }
      }

      .section-card {
        padding: 16px 20px;

        .section-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 14px;
        }
      }
    }

    .table-wrap {
      overflow-x: auto;
      table { width: 100%; border-collapse: collapse; }
      th { background: var(--color-navy); color: #FFFFFF; padding: 9px 12px; font-size: 11.5px; text-align: left; font-weight: 700; }
      td { padding: 10px 12px; border-bottom: 1px solid var(--color-border); font-size: 12px; vertical-align: middle; }

      .student-cell {
        display: flex;
        align-items: center;
        gap: 10px;

        .student-avatar {
          width: 32px;
          height: 32px;
          border-radius: var(--radius-full);
          background: var(--color-navy);
          color: #FFFFFF;
          font-size: 11px;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          background-size: cover;
          background-position: center;
          flex-shrink: 0;
        }

        .student-names {
          display: flex;
          flex-direction: column;
          gap: 1px;

          .st-fullname { font-size: 12.5px; font-weight: 700; color: var(--color-navy); }
          .st-date { font-size: 10px; color: var(--color-text-secondary); }
        }
      }

      .meta-cell {
        display: flex;
        flex-direction: column;
        gap: 2px;

        .st-email { font-size: 11.5px; color: var(--color-text-primary); }
        .st-mat {
          font-size: 10px;
          background: var(--color-background);
          border: 1px solid var(--color-border);
          border-radius: 4px;
          padding: 1px 5px;
          width: fit-content;
          color: var(--color-text-secondary);
        }
      }

      .progress-cell {
        display: flex;
        flex-direction: column;
        gap: 4px;
        min-width: 140px;

        .progress-meta {
          display: flex;
          align-items: baseline;
          gap: 5px;

          .prog-pct { font-size: 11.5px; font-weight: 800; color: #0284C7; }
          .score-pct { font-size: 11.5px; font-weight: 800; color: #059669; }
          .prog-sub { font-size: 10px; color: var(--color-text-secondary); font-weight: 500; }
        }

        .progress-track {
          height: 6px;
          width: 100%;
          background: #E2E8F0;
          border-radius: 3px;
          overflow: hidden;

          .progress-fill {
            height: 100%;
            border-radius: 3px;
            transition: width 0.3s ease;

            &.course-fill {
              background: #0284C7;
            }

            &.quiz-fill {
              background: #059669;
            }
          }
        }
      }
    }

    .empty-assigned-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 24px 16px;
      border: 1.5px dashed var(--color-border);
      border-radius: var(--radius-sm);
      text-align: center;
      color: var(--color-text-secondary);
      margin-top: 10px;
      font-size: 12.5px;
    }

    .assigned-quizzes-grid,
    .assigned-courses-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
      gap: 12px;
      margin-top: 10px;
    }

    .quiz-mini-card,
    .course-mini-card {
      padding: 10px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      background: #FFFFFF;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);

      .mini-cover {
        height: 70px;
        background-size: cover;
        background-position: center;
        border-radius: var(--radius-xs);
        padding: 6px;
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        position: relative;
        overflow: hidden;

        .cover-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(3, 36, 71, 0.2) 0%, rgba(3, 36, 71, 0.7) 100%);
        }

        .category-chip {
          position: relative;
          z-index: 2;
          background: rgba(3, 36, 71, 0.85);
          color: #FFFFFF;
          font-size: 9px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: var(--radius-xs);
        }

        .level-chip {
          position: relative;
          z-index: 2;
          background: rgba(255, 255, 255, 0.9);
          color: var(--color-navy);
          font-size: 8.5px;
          font-weight: 800;
          padding: 2px 5px;
          border-radius: var(--radius-xs);
        }
      }

      .mini-body {
        display: flex;
        flex-direction: column;
        gap: 3px;

        .mini-title { font-size: 12px; font-weight: 800; color: var(--color-navy); margin: 0; line-height: 1.3; }
        .mini-meta { font-size: 10px; color: var(--color-text-secondary); }

        .mini-features {
          display: flex;
          flex-direction: column;
          gap: 3px;
          font-size: 10.5px;
          font-weight: 600;
          color: var(--color-text-secondary);

          .feat-item {
            display: inline-flex;
            align-items: center;
            gap: 5px;
          }
        }
      }

      .mini-actions {
        display: flex;
        gap: 6px;
        margin-top: auto;
        padding-top: 6px;
        border-top: 1px solid var(--color-border);
      }
    }

    .quiz-picker-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-height: 380px;
      overflow-y: auto;

      .picker-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 8px 12px;
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm);
        cursor: pointer;
        transition: background 0.15s ease;

        &:hover { background: var(--color-navy-light); }
        .picker-thumb { width: 40px; height: 40px; border-radius: var(--radius-xs); object-fit: cover; }
        .picker-info { flex: 1; display: flex; flex-direction: column; }
      }
    }

    .btn-icon-danger {
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px;
      border-radius: var(--radius-xs);
      &:hover { background: #FEE2E2; }
    }

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
      max-width: 500px;
      padding: 24px;
      background: #FFFFFF;

      .modal-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
        .close-x { background: none; border: none; font-size: 18px; cursor: pointer; color: var(--color-text-secondary); }
      }
    }

    .clean-form {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .modal-btn-row {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 8px;
    }
  `]
})
export class ClassManageComponent {
  private classService = inject(ClasseService);
  private quizService = inject(QuizService);
  private courseService = inject(CourseService);
  private liveService = inject(LiveSessionService);
  public promotionService = inject(PromotionService);
  public confirmService = inject(ConfirmDialogService);
  private router = inject(Router);
  private invitationService = inject(InvitationService);

  classes = this.classService.getClasses();
  allQuizzes = this.quizService.getQuizzes();
  allCourses = this.courseService.getCourses();
  selectedClass: Classe | null = null;
  activeTestQuiz: Quiz | null = null;

  searchQuery = '';
  filterLevel: 'ALL' | 'LICENCE' | 'MASTER' = 'ALL';
  selectedPromotionFilter = 'ACTIVE'; // 'ACTIVE' (default) | 'ALL' | specific promotionId
  viewMode: 'grid' | 'list' = 'grid';

  currentPage = 1;
  pageSize = 8;
  isFilterLoading = false;
  get isLoading(): boolean {
    return this.classService.isLoading() || this.isFilterLoading;
  }
  isSubmitting = false;

  showCreateModal = false;
  showAddStudentModal = false;
  showInviteModal = false;
  showAssignQuizModal = false;
  showAssignCourseModal = false;

  inviteEmails = '';
  inviteMessage = '';
  inviteSending = false;
  inviteSuccess = '';
  inviteError = '';

  newClassName = '';
  newClassLevel = 'Licence 3';
  newClassCode = '';
  newClassDesc = '';
  newClassPromotionId = 'promo-7';

  newStudentPrenom = '';
  newStudentNom = '';
  newStudentEmail = '';
  newStudentMatricule = '';

  getStatusLabel(status: string): string {
    switch (status) {
      case 'IN_PROGRESS': return 'En cours';
      case 'UPCOMING': return 'À venir';
      case 'ARCHIVED': return 'Archivée';
      default: return status;
    }
  }

  currentViewedPromotion(): Promotion | null {
    if (this.selectedPromotionFilter === 'ALL') return null;
    if (this.selectedPromotionFilter === 'ACTIVE') return this.promotionService.activePromotion();
    return this.promotionService.promotions().find(p => p.id === this.selectedPromotionFilter) || null;
  }

  currentPermissions(): PromotionPermissions {
    const promo = this.currentViewedPromotion();
    if (!promo) {
      return {
        canPrepare: true,
        canMutate: true,
        canEvaluate: true,
        canLaunchLive: true,
        isReadOnly: false
      };
    }
    return this.promotionService.getPermissions(promo);
  }

  getClassPermissions(c: Classe | null | undefined): PromotionPermissions {
    if (!c) return this.promotionService.getPermissions(this.promotionService.activePromotion());
    if (!c.promotionId) return this.promotionService.getPermissions(this.promotionService.activePromotion());
    const promo = this.promotionService.promotions().find(p => p.id === c.promotionId);
    return this.promotionService.getPermissions(promo);
  }

  filteredClasses(): Classe[] {
    const activePromoId = this.promotionService.activePromotion()?.id;

    return this.classes().filter(c => {
      // 1. Local Promotion filter without altering global header active promotion
      let matchPromotion = true;
      if (this.selectedPromotionFilter === 'ACTIVE') {
        matchPromotion = !c.promotionId || c.promotionId === activePromoId;
      } else if (this.selectedPromotionFilter === 'ALL') {
        matchPromotion = true;
      } else {
        matchPromotion = c.promotionId === this.selectedPromotionFilter;
      }

      // 2. Search query matching
      const matchSearch = !this.searchQuery ||
        c.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        c.code.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        c.level.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        (c.promotionLabel && c.promotionLabel.toLowerCase().includes(this.searchQuery.toLowerCase()));

      // 3. Level matching
      const matchLevel = this.filterLevel === 'ALL' ||
        (this.filterLevel === 'LICENCE' && c.level.toLowerCase().includes('licence')) ||
        (this.filterLevel === 'MASTER' && c.level.toLowerCase().includes('master'));

      return matchPromotion && matchSearch && matchLevel;
    });
  }

  paginatedClasses(): Classe[] {
    const list = this.filteredClasses();
    const start = (this.currentPage - 1) * this.pageSize;
    return list.slice(start, start + this.pageSize);
  }

  openClass(c: Classe) {
    this.selectedClass = c;
  }

  availablePromotionsForNewClass(): Promotion[] {
    return this.promotionService.promotions().filter(p => p.status !== 'ARCHIVED');
  }

  fieldErrors: Record<string, string> = {};
  studentFieldErrors: Record<string, string> = {};

  clearFieldError(field: string): void {
    if (this.fieldErrors[field]) delete this.fieldErrors[field];
  }

  clearStudentFieldError(field: string): void {
    if (this.studentFieldErrors[field]) delete this.studentFieldErrors[field];
  }

  openCreateModal() {
    this.fieldErrors = {};
    this.newClassName = '';
    this.newClassLevel = 'Licence 3';
    this.newClassCode = `CL-${Math.floor(1000 + Math.random() * 9000)}`;
    this.newClassDesc = '';

    const active = this.promotionService.activePromotion();
    if (active && active.status !== 'ARCHIVED') {
      this.newClassPromotionId = active.id;
    } else {
      const available = this.availablePromotionsForNewClass();
      this.newClassPromotionId = available.length > 0 ? available[0].id : '';
    }

    this.showCreateModal = true;
  }

  submitCreateClass() {
    this.fieldErrors = {};
    if (!this.newClassName.trim()) {
      this.fieldErrors['name'] = 'Le nom de la classe est obligatoire (ex: Licence 3 - Informatique).';
    }
    if (!this.newClassLevel.trim()) {
      this.fieldErrors['level'] = 'Le niveau d\'étude est obligatoire.';
    }
    if (!this.newClassCode.trim()) {
      this.fieldErrors['code'] = 'Le code d\'identification de la classe est obligatoire.';
    }

    if (Object.keys(this.fieldErrors).length > 0) return;

    this.isSubmitting = true;
    setTimeout(() => {
      this.isSubmitting = false;
      const promo = this.promotionService.promotions().find(p => p.id === this.newClassPromotionId);
      const newGroup = this.classService.addClass({
        name: this.newClassName.trim(),
        level: this.newClassLevel.trim(),
        code: this.newClassCode.trim().toUpperCase(),
        description: this.newClassDesc.trim(),
        promotionId: this.newClassPromotionId,
        promotionLabel: promo ? promo.label : 'Promotion 2025 - 2026',
        creatorId: 'u1',
        creatorName: 'Professeur',
        color: '#032447'
      });

      this.showCreateModal = false;
      this.selectedClass = newGroup;
    }, 450);
  }

  submitAddStudent() {
    if (!this.selectedClass) return;

    this.studentFieldErrors = {};
    if (!this.newStudentPrenom.trim()) {
      this.studentFieldErrors['prenom'] = 'Le prénom de l\'élève est obligatoire.';
    }
    if (!this.newStudentNom.trim()) {
      this.studentFieldErrors['nom'] = 'Le nom de famille est obligatoire.';
    }
    if (!this.newStudentEmail.trim()) {
      this.studentFieldErrors['email'] = 'L\'adresse email est obligatoire.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.newStudentEmail.trim())) {
      this.studentFieldErrors['email'] = 'Veuillez saisir une adresse email valide.';
    }

    if (Object.keys(this.studentFieldErrors).length > 0) return;

    this.isSubmitting = true;
    setTimeout(() => {
      this.isSubmitting = false;
      this.classService.addStudentToClass(this.selectedClass!.id, {
        prenom: this.newStudentPrenom.trim(),
        nom: this.newStudentNom.trim(),
        email: this.newStudentEmail.trim(),
        matricule: this.newStudentMatricule.trim()
      });

      this.showAddStudentModal = false;
      this.newStudentPrenom = '';
      this.newStudentNom = '';
      this.newStudentEmail = '';
      this.newStudentMatricule = '';
    }, 400);
  }

  async removeStudent(studentId: string) {
    if (!this.selectedClass) return;
    const ok = await this.confirmService.confirm({
      title: 'Retirer l\'élève',
      message: 'Voulez-vous vraiment retirer cet apprenant de cette classe ?',
      confirmText: 'Retirer l\'élève',
      cancelText: 'Annuler',
      variant: 'danger',
      icon: 'trash'
    });
    if (!ok) return;
    this.classService.removeStudentFromClass(this.selectedClass.id, studentId);
  }

  getAssignedQuizzes(): Quiz[] {
    if (!this.selectedClass) return [];
    return this.allQuizzes().filter(q => this.selectedClass?.assignedQuizIds.includes(q.id));
  }

  availableQuizzes(): Quiz[] {
    if (!this.selectedClass) return [];
    return this.allQuizzes().filter(q => !this.selectedClass?.assignedQuizIds.includes(q.id));
  }

  assignQuiz(quizId: string) {
    if (!this.selectedClass) return;
    this.classService.assignQuizToClass(this.selectedClass.id, quizId);
    this.showAssignQuizModal = false;
  }

  unassignQuiz(quizId: string) {
    if (!this.selectedClass) return;
    this.classService.unassignQuizFromClass(this.selectedClass.id, quizId);
  }

  getAssignedCourses(): Course[] {
    if (!this.selectedClass) return [];
    return this.allCourses().filter(c => (c.assignedClassIds || []).includes(this.selectedClass!.id));
  }

  getUnassignedCourses(): Course[] {
    if (!this.selectedClass) return [];
    return this.allCourses().filter(c => !(c.assignedClassIds || []).includes(this.selectedClass!.id));
  }

  assignCourseToClass(courseId: string, courseTitle: string) {
    if (!this.selectedClass) return;
    this.courseService.assignCourseToClass(courseId, this.selectedClass.id, this.selectedClass.name);
    this.showAssignCourseModal = false;
  }

  unassignCourseFromClass(courseId: string) {
    if (!this.selectedClass) return;
    this.courseService.unassignCourseFromClass(courseId, this.selectedClass.id);
  }

  launchLiveForClass(c: Classe) {
    const quiz = c.assignedQuizIds.length > 0
      ? this.allQuizzes().find(q => q.id === c.assignedQuizIds[0])
      : this.allQuizzes()[0];
    
    const quizId = quiz?.id || 'q1';
    const session = this.liveService.createLiveSession({
      quizId,
      quizTitle: quiz?.title || 'Quiz de Classe',
      quizQuestionsCount: quiz?.questionsCount || 5,
      hostId: 'u1',
      hostName: 'Professeur',
      audienceType: 'CLASS',
      targetClassId: c.id,
      targetClassName: c.name
    });
    this.router.navigate(['/app/live/host', session.id]);
  }

  openInviteModal() {
    this.showInviteModal = true;
    this.inviteEmails = '';
    this.inviteMessage = '';
    this.inviteSuccess = '';
    this.inviteError = '';
  }

  async submitSendInvitations() {
    if (!this.selectedClass) return;
    const raw = this.inviteEmails.trim();
    if (!raw) {
      this.inviteError = 'Veuillez saisir au moins une adresse email.';
      return;
    }

    const emails = raw.split(/[\n,;]+/).map(e => e.trim()).filter(e => e.length > 0);
    if (emails.length === 0) {
      this.inviteError = 'Aucune adresse email valide trouvée.';
      return;
    }

    this.inviteSending = true;
    this.inviteError = '';
    this.inviteSuccess = '';

    try {
      const sent = await this.invitationService.createInvitations({
        type: 'CLASS',
        resourceId: this.selectedClass.id,
        targetEmails: emails,
        message: this.inviteMessage.trim() || undefined
      });
      this.inviteSending = false;
      this.inviteSuccess = `${sent.length} invitation(s) envoyée(s) avec succès par email !`;
      setTimeout(() => {
        this.showInviteModal = false;
      }, 1800);
    } catch (err: any) {
      this.inviteSending = false;
      this.inviteError = err?.error?.message || "Erreur lors de l'envoi des invitations.";
    }
  }
}
