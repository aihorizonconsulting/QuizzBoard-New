import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { QuizService } from '../../../core/services/quiz.service';
import { CourseService } from '../../../core/services/course.service';
import { CommunityService } from '../../../core/services/community.service';
import { ParticipationService } from '../../../core/services/participation.service';
import { QuizPlayerModalService } from '../../../core/services/quiz-player-modal.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { Quiz } from '../../../core/models/quiz.model';
import { Course } from '../../../core/models/course.model';
import { Certificate } from '../../../core/models/participation.model';
import { ForumTopic } from '../../../core/models/community.model';
import { IconComponent } from '../../../shared/components/icon/icon.component';

interface AdminTopicItem extends ForumTopic {
  communityName: string;
  isReported?: boolean;
}

@Component({
  selector: 'app-admin-content',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div class="admin-content-page animate-fade-in">
      <!-- HEADER -->
      <div class="page-header">
        <div>
          <div class="superadmin-badge-strip">
            <span class="badge badge-orange">
              <app-icon name="shield" [size]="13" color="var(--color-orange)"></app-icon>
              <span>SURVEILLANCE & MODÉRATION CENTRALE</span>
            </span>
            <span class="badge badge-primary">
              <span>Intégrité Pédagogique 100%</span>
            </span>
          </div>
          <h1 class="h1" style="margin-top: 8px;">Surveillance Globale & Modération</h1>
          <p class="body-small">Supervision de l'ensemble des contenus de la plateforme : Quiz, Cours, Hub & Forums et Certificats délivrés.</p>
        </div>

        <!-- 4 PILLARS TABS TOGGLE -->
        <div class="tabs-header-toggle">
          <button 
            type="button" 
            class="tab-btn" 
            [class.active]="activeTab === 'QUIZZES'" 
            (click)="activeTab = 'QUIZZES'">
            <app-icon name="file-text" [size]="14"></app-icon>
            <span>Quiz ({{ quizzes().length }})</span>
          </button>

          <button 
            type="button" 
            class="tab-btn" 
            [class.active]="activeTab === 'COURSES'" 
            (click)="activeTab = 'COURSES'">
            <app-icon name="book-open" [size]="14"></app-icon>
            <span>Cours ({{ courses().length }})</span>
          </button>

          <button 
            type="button" 
            class="tab-btn" 
            [class.active]="activeTab === 'FORUMS_HUB'" 
            (click)="activeTab = 'FORUMS_HUB'">
            <app-icon name="message-square" [size]="14"></app-icon>
            <span>Hub & Forums ({{ allForumTopics().length }})</span>
          </button>

          <button 
            type="button" 
            class="tab-btn" 
            [class.active]="activeTab === 'CERTIFICATES'" 
            (click)="activeTab = 'CERTIFICATES'">
            <app-icon name="award" [size]="14"></app-icon>
            <span>Certificats ({{ certificates().length }})</span>
          </button>
        </div>
      </div>

      <!-- SEARCH & FILTER TOOLBAR -->
      <div class="card toolbar-card">
        <div class="toolbar-search">
          <app-icon name="search" [size]="16" color="var(--color-text-secondary)"></app-icon>
          <input 
            type="text" 
            [(ngModel)]="searchQuery" 
            [placeholder]="getSearchPlaceholder()" 
            class="search-input">
          @if (searchQuery) {
            <button type="button" class="btn-clear" (click)="searchQuery = ''">✕</button>
          }
        </div>

        <div class="filters-row">
          @if (activeTab === 'QUIZZES') {
            <div class="filter-group">
              <span class="filter-lbl">Visibilité :</span>
              <div class="pill-group">
                <button type="button" class="filter-pill" [class.active]="selectedVis === 'ALL'" (click)="selectedVis = 'ALL'">Tous</button>
                <button type="button" class="filter-pill" [class.active]="selectedVis === 'PUBLIC'" (click)="selectedVis = 'PUBLIC'">Publics</button>
                <button type="button" class="filter-pill" [class.active]="selectedVis === 'PRIVATE'" (click)="selectedVis = 'PRIVATE'">Privés</button>
              </div>
            </div>
          } @else if (activeTab === 'FORUMS_HUB') {
            <div class="filter-group">
              <span class="filter-lbl">Statut Modération :</span>
              <div class="pill-group">
                <button type="button" class="filter-pill" [class.active]="forumFilter === 'ALL'" (click)="forumFilter = 'ALL'">Tous les sujets</button>
                <button type="button" class="filter-pill" [class.active]="forumFilter === 'REPORTED'" (click)="forumFilter = 'REPORTED'">⚠️ Signalés (1)</button>
              </div>
            </div>
          } @else if (activeTab === 'CERTIFICATES') {
            <div class="filter-group">
              <span class="filter-lbl">Validité :</span>
              <div class="pill-group">
                <button type="button" class="filter-pill" [class.active]="certFilter === 'ALL'" (click)="certFilter = 'ALL'">Tous</button>
                <button type="button" class="filter-pill" [class.active]="certFilter === 'VALID'" (click)="certFilter = 'VALID'">✅ Valides</button>
                <button type="button" class="filter-pill" [class.active]="certFilter === 'REVOKED'" (click)="certFilter = 'REVOKED'">❌ Révoqués</button>
              </div>
            </div>
          }
        </div>
      </div>

      <!-- TAB 1: QUIZZES TABLE -->
      @if (activeTab === 'QUIZZES') {
        <div class="card table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th style="min-width: 250px;">Quiz & Code</th>
                <th style="min-width: 180px;">Formateur</th>
                <th style="width: 150px;">Catégorie</th>
                <th style="width: 100px;">Questions</th>
                <th style="width: 120px;">Participations</th>
                <th style="width: 110px;">Visibilité</th>
                <th style="width: 110px;">Date</th>
                <th style="width: 190px; text-align: right;">Modération</th>
              </tr>
            </thead>
            <tbody>
              @for (quiz of filteredQuizzes(); track quiz.id) {
                <tr>
                  <td>
                    <div class="quiz-title-cell">
                      <strong>{{ quiz.title }}</strong>
                      <span class="code-badge">Code PIN : {{ quiz.shareCode }}</span>
                    </div>
                  </td>

                  <td>
                    <span class="creator-name">{{ quiz.creatorName }}</span>
                  </td>

                  <td>
                    <span class="category-pill">{{ quiz.category }}</span>
                  </td>

                  <td>
                    <strong>{{ quiz.questionsCount || quiz.questions?.length || 5 }}</strong>
                  </td>

                  <td>
                    <span class="participations-badge">{{ quiz.participationsCount }} joués</span>
                  </td>

                  <td>
                    @if (quiz.visibility === 'PUBLIC') {
                      <span class="vis-badge public">Public</span>
                    } @else {
                      <span class="vis-badge private">Privé</span>
                    }
                  </td>

                  <td class="date-cell">{{ quiz.createdAt }}</td>

                  <td>
                    <div class="actions-cell">
                      <button 
                        type="button" 
                        class="btn-action btn-test" 
                        title="Tester le quiz dans l'arène"
                        (click)="testQuiz(quiz)">
                        <app-icon name="play" [size]="13" color="var(--color-navy)"></app-icon>
                        <span>Tester</span>
                      </button>

                      <button 
                        type="button" 
                        class="btn-action" 
                        (click)="confirmToggleVisibility(quiz)"
                        [title]="quiz.visibility === 'PUBLIC' ? 'Masquer du catalogue public' : 'Rendre public'">
                        <app-icon [name]="quiz.visibility === 'PUBLIC' ? 'eye-off' : 'eye'" [size]="13"></app-icon>
                        <span>{{ quiz.visibility === 'PUBLIC' ? 'Masquer' : 'Publier' }}</span>
                      </button>

                      <button 
                        type="button" 
                        class="btn-action btn-danger-icon" 
                        title="Supprimer ce quiz"
                        (click)="confirmDeleteQuiz(quiz)">
                        <app-icon name="trash" [size]="13" color="var(--color-danger)"></app-icon>
                      </button>
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="8" class="empty-cell">
                    <app-icon name="search" [size]="28" color="var(--color-text-secondary)"></app-icon>
                    <p>Aucun quiz trouvé.</p>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      <!-- TAB 2: COURSES TABLE -->
      @if (activeTab === 'COURSES') {
        <div class="card table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th style="min-width: 260px;">Cours Magistral</th>
                <th style="width: 130px;">Niveau</th>
                <th style="width: 120px;">Chapitres</th>
                <th style="width: 160px;">Certification</th>
                <th style="width: 160px;">Étudiants Inscrits</th>
                <th style="width: 110px;">Date</th>
                <th style="width: 120px; text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (course of filteredCourses(); track course.id) {
                <tr>
                  <td>
                    <div class="quiz-title-cell">
                      <strong>{{ course.title }}</strong>
                      <div class="body-small text-muted">{{ course.description | slice:0:65 }}...</div>
                    </div>
                  </td>

                  <td>
                    <span class="level-badge" [ngClass]="'lvl-' + course.level.toLowerCase()">
                      {{ course.level }}
                    </span>
                  </td>

                  <td>
                    <strong>{{ course.chapters.length || 0 }} chapitres</strong>
                  </td>

                  <td>
                    @if (course.hasCertificate) {
                      <span class="cert-pill with-cert">
                        <app-icon name="award" [size]="12" color="var(--color-orange)"></app-icon>
                        <span>Certifiant ({{ course.certificateMinimumScore || 80 }}%)</span>
                      </span>
                    } @else {
                      <span class="cert-pill no-cert">Sans diplôme</span>
                    }
                  </td>

                  <td>
                    <span class="participations-badge">{{ course.assignedClassNames.length ? (course.assignedClassNames.length * 32) : 28 }} apprenants</span>
                  </td>

                  <td class="date-cell">{{ course.createdAt }}</td>

                  <td>
                    <div class="actions-cell">
                      <button 
                        type="button" 
                        class="btn-action btn-danger-icon" 
                        title="Supprimer ce cours"
                        (click)="confirmDeleteCourse(course)">
                        <app-icon name="trash" [size]="13" color="var(--color-danger)"></app-icon>
                      </button>
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="7" class="empty-cell">
                    <p>Aucun cours trouvé.</p>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      <!-- TAB 3: FORUMS & HUB COMMUNAUTAIRE TABLE -->
      @if (activeTab === 'FORUMS_HUB') {
        <div class="card table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th style="min-width: 260px;">Sujet de Discussion (Topic)</th>
                <th style="min-width: 180px;">Communauté / Hub</th>
                <th style="width: 160px;">Auteur</th>
                <th style="width: 100px;">Réponses</th>
                <th style="width: 130px;">Statut Modération</th>
                <th style="width: 110px;">Date</th>
                <th style="width: 180px; text-align: right;">Modération Hub</th>
              </tr>
            </thead>
            <tbody>
              @for (topic of filteredForumTopics(); track topic.id) {
                <tr [class.is-reported-row]="topic.isReported">
                  <td>
                    <div class="quiz-title-cell">
                      <strong>{{ topic.title }}</strong>
                      <div class="body-small text-muted">{{ topic.content | slice:0:70 }}...</div>
                    </div>
                  </td>

                  <td>
                    <span class="org-cell">{{ topic.communityName }}</span>
                  </td>

                  <td>
                    <div class="author-cell">
                      <span>{{ topic.authorName }}</span>
                    </div>
                  </td>

                  <td>
                    <strong>{{ topic.commentsCount || 0 }} réponses</strong>
                  </td>

                  <td>
                    @if (topic.isReported) {
                      <span class="mod-status-pill warning">
                        <span>⚠️ Signalé</span>
                      </span>
                    } @else if (topic.isLocked) {
                      <span class="mod-status-pill locked">
                        <span>🔒 Verrouillé</span>
                      </span>
                    } @else {
                      <span class="mod-status-pill normal">
                        <span>✅ Conforme</span>
                      </span>
                    }
                  </td>

                  <td class="date-cell">{{ topic.createdAt | slice:0:10 }}</td>

                  <td>
                    <div class="actions-cell">
                      <button 
                        type="button" 
                        class="btn-action" 
                        (click)="confirmToggleTopicLock(topic)"
                        [title]="topic.isLocked ? 'Déverrouiller le sujet' : 'Verrouiller le sujet'">
                        <app-icon [name]="topic.isLocked ? 'check' : 'lock'" [size]="13"></app-icon>
                        <span>{{ topic.isLocked ? 'Débloquer' : 'Bloquer' }}</span>
                      </button>

                      <button 
                        type="button" 
                        class="btn-action btn-danger-icon" 
                        title="Supprimer ce sujet du hub"
                        (click)="confirmDeleteTopic(topic)">
                        <app-icon name="trash" [size]="13" color="var(--color-danger)"></app-icon>
                      </button>
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="7" class="empty-cell">
                    <p>Aucun sujet de forum trouvé.</p>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      <!-- TAB 4: REGISTRE DES CERTIFICATS DÉLIVRÉS -->
      @if (activeTab === 'CERTIFICATES') {
        <div class="card table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 170px;">Code d'Authenticité</th>
                <th style="min-width: 200px;">Apprenant Titulaire</th>
                <th style="min-width: 220px;">Évaluation Réussie</th>
                <th style="width: 90px;">Score</th>
                <th style="min-width: 180px;">Établissement / Formateur</th>
                <th style="width: 110px;">Délivrance</th>
                <th style="width: 120px;">Statut</th>
                <th style="width: 180px; text-align: right;">Actions Registre</th>
              </tr>
            </thead>
            <tbody>
              @for (cert of filteredCertificates(); track cert.id) {
                <tr [class.is-revoked-row]="cert.status === 'REVOKED'">
                  <td>
                    <span class="cert-code-badge">{{ cert.verificationCode }}</span>
                  </td>

                  <td>
                    <strong class="user-name">{{ cert.recipientName }}</strong>
                  </td>

                  <td>
                    <span>{{ cert.quizTitle }}</span>
                  </td>

                  <td>
                    <span class="score-pill">{{ cert.scorePercent }}%</span>
                  </td>

                  <td>
                    <span class="issuer-name">{{ cert.issuerName }}</span>
                  </td>

                  <td class="date-cell">{{ cert.issuedAt }}</td>

                  <td>
                    @if (cert.status === 'REVOKED') {
                      <span class="status-pill suspended">❌ Révoqué</span>
                    } @else {
                      <span class="status-pill active">✅ Authentique</span>
                    }
                  </td>

                  <td>
                    <div class="actions-cell">
                      <button 
                        type="button" 
                        class="btn-action" 
                        (click)="confirmToggleCertificate(cert)"
                        [class.btn-warn]="cert.status !== 'REVOKED'"
                        [class.btn-succ]="cert.status === 'REVOKED'"
                        [title]="cert.status === 'REVOKED' ? 'Réhabiliter le certificat' : 'Révoquer le certificat'">
                        <app-icon [name]="cert.status === 'REVOKED' ? 'check' : 'shield'" [size]="13"></app-icon>
                        <span>{{ cert.status === 'REVOKED' ? 'Réhabiliter' : 'Révoquer' }}</span>
                      </button>
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="8" class="empty-cell">
                    <p>Aucun certificat enregistré.</p>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
  styles: [`
    .admin-content-page {
      display: flex;
      flex-direction: column;
      gap: 22px;
    }

    .superadmin-badge-strip {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;

      .tabs-header-toggle {
        display: flex;
        background: #E2E8F0;
        padding: 4px;
        border-radius: var(--radius-full);
        gap: 4px;
        flex-wrap: wrap;

        .tab-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border: none;
          background: transparent;
          padding: 6px 14px;
          border-radius: var(--radius-full);
          font-size: 12.5px;
          font-weight: 700;
          color: var(--color-navy);
          cursor: pointer;
          transition: all 0.15s ease;

          &.active {
            background: #FFFFFF;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
          }
        }
      }
    }

    .toolbar-card {
      padding: 16px 20px;
      display: flex;
      flex-direction: column;
      gap: 14px;

      .toolbar-search {
        display: flex;
        align-items: center;
        background: var(--color-background);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm);
        padding: 0 14px;
        height: 42px;
        gap: 10px;

        .search-input {
          flex: 1;
          border: none;
          background: transparent;
          font-size: 13.5px;
          color: var(--color-navy);
          outline: none;
        }

        .btn-clear {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 14px;
          color: var(--color-text-secondary);
        }
      }

      .filters-row {
        display: flex;
        align-items: center;
        gap: 20px;

        .filter-group {
          display: flex;
          align-items: center;
          gap: 8px;

          .filter-lbl {
            font-size: 12px;
            font-weight: 700;
            color: var(--color-text-secondary);
          }

          .pill-group {
            display: flex;
            background: var(--color-background);
            padding: 3px;
            border-radius: var(--radius-full);
            gap: 2px;

            .filter-pill {
              border: none;
              background: transparent;
              padding: 4px 12px;
              border-radius: var(--radius-full);
              font-size: 11.5px;
              font-weight: 700;
              color: var(--color-text-secondary);
              cursor: pointer;

              &.active {
                background: #FFFFFF;
                color: var(--color-navy);
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
              }
            }
          }
        }
      }
    }

    .table-container {
      padding: 0;
      overflow-x: auto;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;

      th {
        background: var(--color-navy);
        color: #FFFFFF;
        padding: 12px 18px;
        font-size: 12.5px;
        font-weight: 700;
      }

      td {
        padding: 12px 18px;
        border-bottom: 1px solid var(--color-border);
        font-size: 13px;
        vertical-align: middle;
      }

      tr:hover td {
        background: #F8FAFC;
      }

      tr.is-reported-row td {
        background: #FEF3C7;
      }

      tr.is-revoked-row td {
        background: #FFF5F5;
        opacity: 0.8;
      }

      .quiz-title-cell {
        display: flex;
        flex-direction: column;
        gap: 3px;

        strong {
          color: var(--color-navy);
          font-size: 13.5px;
        }

        .code-badge {
          font-size: 11px;
          font-weight: 700;
          color: var(--color-text-secondary);
        }
      }

      .category-pill {
        font-size: 11px;
        font-weight: 700;
        background: var(--color-background);
        padding: 3px 8px;
        border-radius: var(--radius-sm);
        color: var(--color-navy);
      }

      .participations-badge {
        font-size: 11.5px;
        font-weight: 700;
        color: var(--color-navy);
      }

      .vis-badge {
        font-size: 10.5px;
        font-weight: 800;
        padding: 2px 7px;
        border-radius: var(--radius-full);

        &.public { background: rgba(16, 185, 129, 0.12); color: var(--color-success); }
        &.private { background: #E2E8F0; color: #475569; }
      }

      .level-badge {
        font-size: 10.5px;
        font-weight: 800;
        padding: 2px 7px;
        border-radius: var(--radius-full);

        &.lvl-beginner { background: #DCFCE7; color: #166534; }
        &.lvl-intermediate { background: #FEF3C7; color: #92400E; }
        &.lvl-advanced { background: #FEE2E2; color: #991B1B; }
      }

      .cert-pill {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        font-size: 11px;
        font-weight: 700;

        &.with-cert { color: #D97706; }
        &.no-cert { color: #94A3B8; }
      }

      .cert-code-badge {
        font-family: monospace;
        font-size: 12px;
        font-weight: 800;
        background: #F1F5F9;
        padding: 3px 7px;
        border-radius: 4px;
        color: var(--color-navy);
      }

      .score-pill {
        font-weight: 900;
        color: var(--color-success);
        font-size: 13.5px;
      }

      .mod-status-pill {
        font-size: 11px;
        font-weight: 800;
        padding: 3px 8px;
        border-radius: var(--radius-full);

        &.normal { background: rgba(16, 185, 129, 0.12); color: var(--color-success); }
        &.warning { background: #FEF3C7; color: #B45309; }
        &.locked { background: #F1F5F9; color: #475569; }
      }

      .status-pill {
        font-size: 11px;
        font-weight: 800;
        padding: 3px 8px;
        border-radius: var(--radius-full);

        &.active { background: rgba(16, 185, 129, 0.12); color: var(--color-success); }
        &.suspended { background: rgba(239, 68, 68, 0.12); color: var(--color-danger); }
      }

      .date-cell {
        font-size: 11.5px;
        color: var(--color-text-secondary);
      }

      .actions-cell {
        display: flex;
        justify-content: flex-end;
        align-items: center;
        gap: 6px;

        .btn-action {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 9px;
          border-radius: var(--radius-sm);
          font-size: 11.5px;
          font-weight: 700;
          cursor: pointer;
          border: 1px solid var(--color-border);
          background: #FFFFFF;
          transition: all 0.15s ease;

          &:hover {
            background: var(--color-background);
            color: var(--color-navy);
          }

          &.btn-test {
            background: var(--color-primary);
            border-color: var(--color-primary);
            color: var(--color-navy);

            &:hover {
              filter: brightness(0.95);
            }
          }

          &.btn-warn:hover {
            background: #FEF3C7;
            border-color: #F59E0B;
            color: #B45309;
          }

          &.btn-succ {
            background: rgba(16, 185, 129, 0.1);
            border-color: var(--color-success);
            color: var(--color-success);
          }

          &.btn-danger-icon {
            padding: 4px 6px;
            &:hover {
              background: #FEE2E2;
              border-color: var(--color-danger);
            }
          }
        }
      }

      .empty-cell {
        text-align: center;
        padding: 40px;
        color: var(--color-text-secondary);
      }
    }
  `]
})
export class AdminContentComponent {
  private quizService = inject(QuizService);
  private courseService = inject(CourseService);
  private communityService = inject(CommunityService);
  private participationService = inject(ParticipationService);
  private quizPlayerModalService = inject(QuizPlayerModalService);
  private confirmService = inject(ConfirmDialogService);

  quizzes = this.quizService.getQuizzes();
  courses = this.courseService.getCourses();
  communities = this.communityService.getCommunities();
  certificates = this.participationService.getCertificates();

  activeTab: 'QUIZZES' | 'COURSES' | 'FORUMS_HUB' | 'CERTIFICATES' = 'QUIZZES';
  searchQuery = '';
  selectedVis = 'ALL';
  forumFilter = 'ALL';
  certFilter = 'ALL';

  // Extract all forum topics across communities with extra mock metadata
  allForumTopics = computed<AdminTopicItem[]>(() => {
    const list: AdminTopicItem[] = [];
    for (const comm of this.communities()) {
      for (const topic of comm.topics || []) {
        list.push({
          ...topic,
          communityName: comm.name,
          isReported: false
        });
      }
    }
    // Add a reported topic for demo moderation
    list.unshift({
      id: 'topic-rep-1',
      communityId: 'comm-info-2026',
      communityName: 'Club National des Formateurs',
      title: 'Partage d\'annales d\'examens non officielles',
      content: 'Ce sujet contient des liens externes non vérifiés signalés par plusieurs enseignants pour violation de droits.',
      authorName: 'Jean-Paul Badji',
      authorId: 'user-suspended-test',
      createdAt: '2026-03-01',
      commentsCount: 8,
      comments: [],
      isPinned: false,
      isLocked: false,
      isReported: true
    });
    return list;
  });

  filteredQuizzes = computed(() => {
    return this.quizzes().filter(q => {
      const matchSearch = !this.searchQuery ||
        q.title.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        q.creatorName.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        q.shareCode.toLowerCase().includes(this.searchQuery.toLowerCase());
      const matchVis = this.selectedVis === 'ALL' || q.visibility === this.selectedVis;
      return matchSearch && matchVis;
    });
  });

  filteredCourses = computed(() => {
    return this.courses().filter(c => {
      return !this.searchQuery ||
        c.title.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        c.level.toLowerCase().includes(this.searchQuery.toLowerCase());
    });
  });

  filteredForumTopics = computed(() => {
    return this.allForumTopics().filter(t => {
      const matchSearch = !this.searchQuery ||
        t.title.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        t.authorName.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        t.communityName.toLowerCase().includes(this.searchQuery.toLowerCase());
      const matchFilter = this.forumFilter === 'ALL' || (this.forumFilter === 'REPORTED' && t.isReported);
      return matchSearch && matchFilter;
    });
  });

  filteredCertificates = computed(() => {
    return this.certificates().filter(c => {
      const matchSearch = !this.searchQuery ||
        c.recipientName.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        c.quizTitle.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        c.verificationCode.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        c.issuerName.toLowerCase().includes(this.searchQuery.toLowerCase());
      const matchFilter = this.certFilter === 'ALL' ||
        (this.certFilter === 'VALID' && c.status !== 'REVOKED') ||
        (this.certFilter === 'REVOKED' && c.status === 'REVOKED');
      return matchSearch && matchFilter;
    });
  });

  getSearchPlaceholder(): string {
    switch (this.activeTab) {
      case 'QUIZZES': return 'Rechercher un quiz par titre, enseignant ou code...';
      case 'COURSES': return 'Rechercher un cours par titre ou niveau...';
      case 'FORUMS_HUB': return 'Rechercher un sujet par mot-clé, auteur ou communauté...';
      case 'CERTIFICATES': return 'Rechercher par code certificat, étudiant ou formateur...';
    }
  }

  testQuiz(quiz: Quiz) {
    this.quizPlayerModalService.open(quiz);
  }

  async confirmToggleVisibility(quiz: Quiz) {
    const isPublic = quiz.visibility === 'PUBLIC';
    const confirmed = await this.confirmService.confirm({
      title: isPublic ? 'Masquer ce quiz du catalogue public ?' : 'Rendre ce quiz public ?',
      message: isPublic
        ? `Le quiz "${quiz.title}" ne sera plus visible sur la page Découvrir. Seuls les élèves disposant du code privé pourront y accéder.`
        : `Le quiz "${quiz.title}" sera accessible librement à toute la communauté QuizzBoard.`,
      confirmText: isPublic ? 'Masquer' : 'Publier',
      variant: 'primary',
      icon: isPublic ? 'eye-off' : 'eye'
    });
    if (confirmed) {
      this.quizService.toggleVisibility(quiz.id);
    }
  }

  async confirmDeleteQuiz(quiz: Quiz) {
    const confirmed = await this.confirmService.confirm({
      title: `Supprimer le quiz "${quiz.title}" ?`,
      message: `Attention : cette action supprimera définitivement le quiz et toutes les participations associées.`,
      confirmText: 'Supprimer',
      variant: 'danger',
      icon: 'trash'
    });
    if (confirmed) {
      this.quizService.deleteQuiz(quiz.id);
    }
  }

  async confirmDeleteCourse(course: Course) {
    const confirmed = await this.confirmService.confirm({
      title: `Supprimer le cours "${course.title}" ?`,
      message: `Attention : tous les chapitres et inscriptions des étudiants à ce cours seront supprimés.`,
      confirmText: 'Supprimer',
      variant: 'danger',
      icon: 'trash'
    });
    if (confirmed) {
      this.courseService.deleteCourse(course.id);
    }
  }

  async confirmToggleTopicLock(topic: AdminTopicItem) {
    const willLock = !topic.isLocked;
    const confirmed = await this.confirmService.confirm({
      title: willLock ? 'Verrouiller ce sujet de forum ?' : 'Déverrouiller le sujet ?',
      message: willLock 
        ? `Le sujet "${topic.title}" restera visible en lecture seule mais aucun nouveau commentaire ne pourra y être ajouté.`
        : `Les apprenants et formateurs pourront à nouveau participer à la discussion.`,
      confirmText: willLock ? 'Verrouiller' : 'Déverrouiller',
      variant: willLock ? 'warning' : 'primary',
      icon: 'lock'
    });
    if (confirmed) {
      this.communityService.toggleTopicLock(topic.communityId, topic.id);
    }
  }

  async confirmDeleteTopic(topic: AdminTopicItem) {
    const confirmed = await this.confirmService.confirm({
      title: `Supprimer définitivement ce sujet de forum ?`,
      message: `Le sujet "${topic.title}" posté dans "${topic.communityName}" ainsi que tous les commentaires associés seront immédiatement purgés de la plateforme.`,
      confirmText: 'Supprimer le Sujet',
      variant: 'danger',
      icon: 'trash'
    });
    if (confirmed) {
      this.communityService.deleteTopic(topic.communityId, topic.id);
    }
  }

  async confirmToggleCertificate(cert: Certificate) {
    const isRevoking = cert.status !== 'REVOKED';
    const confirmed = await this.confirmService.confirm({
      title: isRevoking ? 'Révoquer ce certificat officiel ?' : 'Réhabiliter le certificat ?',
      message: isRevoking
        ? `Le certificat officiel ${cert.verificationCode} délivré à ${cert.recipientName} sera invalidé dans le registre central. Tout scan du QR Code indiquera qu'il a été révoqué pour fraude ou contestation.`
        : `Le certificat ${cert.verificationCode} sera restauré et redeviendra vérifiable avec succès.`,
      confirmText: isRevoking ? 'Révoquer le Certificat' : 'Réhabiliter',
      variant: isRevoking ? 'danger' : 'primary',
      icon: 'shield'
    });
    if (confirmed) {
      this.participationService.toggleCertificateStatus(cert.id);
    }
  }
}
