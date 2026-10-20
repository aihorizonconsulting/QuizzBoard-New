import { ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { CommunityService } from '../../../core/services/community.service';
import { QuizService } from '../../../core/services/quiz.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { FileUploadService } from '../../../core/services/file-upload.service';
import { Community, CommunityMember, ForumComment, ForumTopic, Meeting, MeetingPlatform, ResourceFile } from '../../../core/models/community.model';
import { Quiz } from '../../../core/models/quiz.model';
import { extractFieldErrors, getGeneralErrorMessage } from '../../../core/utils/form-error.util';
import { IconComponent, IconName } from '../icon/icon.component';
import { QuizModalPlayerComponent } from '../quiz-modal-player/quiz-modal-player.component';

export type HubTab = 'DISCUSSIONS' | 'DOCUMENTS' | 'MEETINGS' | 'QUIZ' | 'MEMBERS' | 'SETTINGS';

/** Valeurs du paramètre « onglet » des liens (notifications, emails). */
const TAB_PARAMS: Record<string, HubTab> = {
  discussions: 'DISCUSSIONS', documents: 'DOCUMENTS', reunions: 'MEETINGS', quiz: 'QUIZ', membres: 'MEMBERS', parametres: 'SETTINGS'
};

/** Mêmes formats et même limite que le serveur. */
const DOCUMENT_EXTENSIONS = ['pdf', 'doc', 'docx', 'odt', 'rtf', 'txt', 'ppt', 'pptx', 'odp', 'xls', 'xlsx', 'ods', 'csv', 'zip', 'rar', '7z', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'mp3', 'mp4'];
const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;
/** Documents que le navigateur sait afficher : bouton « Ouvrir ». */
const PREVIEWABLE = ['PDF', 'IMAGE', 'MEDIA'];

const PLATFORM_LABELS: Record<MeetingPlatform, string> = {
  JITSI: 'Jitsi Meet', GOOGLE_MEET: 'Google Meet', ZOOM: 'Zoom', TEAMS: 'Microsoft Teams', OTHER: 'Visioconférence'
};

interface MeetingDraft {
  title: string;
  description: string;
  meetingUrl: string;
  platform: MeetingPlatform;
  scheduledAt: string;
  durationMinutes: number;
  notifyMembers: boolean;
}

/**
 * Espace d'une communauté, commun aux formateurs et aux apprenants : discussions, documents (dépôt de fichiers et liens),
 * réunions en visio, quiz partagés, membres et paramètres. Les actions proposées dépendent du rôle dans la communauté
 * (créateur, modérateur, membre) ; le serveur vérifie les mêmes droits.
 */
@Component({
  selector: 'app-community-hub',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, QuizModalPlayerComponent],
  template: `
    <div class="hub animate-fade-in">
      <div class="hub-top">
        <button class="btn btn-outline btn-sm" (click)="back.emit()">
          <app-icon name="arrow-left" [size]="14"></app-icon>
          <span>Toutes les communautés</span>
        </button>
        @if (community()?.accessCode; as code) {
          <button class="code-chip" (click)="copyCode(code)" title="Copier le code d'accès">
            <app-icon [name]="codeCopied() ? 'check' : 'copy'" [size]="13"></app-icon>
            <span>Code d'accès : <strong>{{ code }}</strong></span>
          </button>
        }
      </div>

      @if (loading()) {
        <div class="card state-box">
          <div class="spinner"></div>
          <p>Chargement de la communauté...</p>
        </div>
      } @else if (loadError()) {
        <div class="card state-box">
          <app-icon name="alert-circle" [size]="28" color="var(--color-danger)"></app-icon>
          <p>{{ loadError() }}</p>
          <button class="btn btn-outline btn-sm" (click)="load(true)">Réessayer</button>
        </div>
      } @else if (community(); as c) {
        <!-- EN-TÊTE -->
        <header class="hero card" [style.backgroundImage]="heroBackground(c)">
          <div class="hero-badges">
            <span class="hero-badge">
              <app-icon [name]="c.isPrivate ? 'lock' : 'globe'" [size]="12" color="#FFFFFF"></app-icon>
              {{ c.isPrivate ? 'Privée' : 'Publique' }}
            </span>
            @if (c.category) { <span class="hero-badge accent">{{ c.category }}</span> }
            @if (c.myRole) { <span class="hero-badge role">{{ roleLabel(c.myRole) }}</span> }
          </div>
          <h1 class="hero-title">{{ c.name }}</h1>
          @if (c.description) { <p class="hero-desc">{{ c.description }}</p> }
          <div class="hero-foot">
            <div class="hero-metrics">
              <span><app-icon name="users" [size]="14" color="#CBD5E1"></app-icon> {{ count(c.membersCount, 'membre') }}</span>
              <span><app-icon name="message-square" [size]="14" color="#CBD5E1"></app-icon> {{ count(c.topicsCount, 'discussion') }}</span>
              <span><app-icon name="folder" [size]="14" color="#CBD5E1"></app-icon> {{ count(c.resourcesCount, 'document') }}</span>
              <span><app-icon name="video" [size]="14" color="#CBD5E1"></app-icon> {{ count(upcomingMeetings().length, 'réunion') }} à venir</span>
              <span>Animée par <strong>{{ c.creatorName }}</strong></span>
            </div>
            @if (c.myRole && c.myRole !== 'CREATOR' && c.myRole !== 'ADMIN') {
              <button class="btn btn-sm hero-leave" (click)="leave()">
                <app-icon name="log-out" [size]="13" color="#FFFFFF"></app-icon>
                <span>Quitter</span>
              </button>
            }
          </div>
          @if (nextMeeting(); as next) {
            <div class="next-meeting">
              <app-icon name="calendar" [size]="16" color="var(--color-orange)"></app-icon>
              <span>{{ meetingStatus(next) === 'LIVE' ? 'Réunion en cours' : 'Prochaine réunion' }} : <strong>{{ next.title }}</strong> — {{ formatDateTime(next.scheduledAt) }}</span>
              <a class="btn btn-primary btn-sm" [href]="next.meetingUrl" target="_blank" rel="noopener">Rejoindre</a>
            </div>
          }
        </header>

        <!-- ONGLETS -->
        <nav class="tabs">
          @for (t of tabs(); track t.id) {
            <button type="button" class="tab" [class.active]="tab() === t.id" (click)="selectTab(t.id)">
              <app-icon [name]="t.icon" [size]="15"></app-icon>
              <span>{{ t.label }}</span>
              @if (t.count !== null) { <span class="tab-count">{{ t.count }}</span> }
            </button>
          }
        </nav>

        <!-- ============================== DISCUSSIONS ============================== -->
        @if (tab() === 'DISCUSSIONS') {
          <section class="panel">
            <div class="card composer">
              <h3 class="panel-title"><app-icon name="message-square" [size]="16"></app-icon> Lancer une discussion</h3>
              <input type="text" class="input-field" [(ngModel)]="topicTitle" maxlength="300" placeholder="Titre : question, annonce, partage d'expérience...">
              <textarea class="input-field" rows="3" [(ngModel)]="topicContent" placeholder="Votre message..."></textarea>
              @if (topicError()) { <p class="form-error">{{ topicError() }}</p> }
              <div class="row-end">
                <button class="btn btn-primary btn-sm" [disabled]="busy() || !topicTitle.trim() || !topicContent.trim()" (click)="publishTopic()">Publier</button>
              </div>
            </div>

            @for (topic of c.topics || []; track topic.id) {
              <article class="card topic" [class.pinned]="topic.isPinned">
                <div class="topic-head">
                  <div class="avatar">{{ initial(topic.authorName) }}</div>
                  <div class="topic-meta">
                    <strong>{{ topic.authorName }}</strong>
                    <span>{{ formatDateTime(topic.createdAt) }}</span>
                  </div>
                  <div class="topic-flags">
                    @if (topic.isPinned) { <span class="flag flag-pin"><app-icon name="pin" [size]="11"></app-icon> Épinglé</span> }
                    @if (topic.isLocked) { <span class="flag flag-lock"><app-icon name="lock" [size]="11"></app-icon> Verrouillé</span> }
                    @if (topic.isReported && c.canManage) { <span class="flag flag-report"><app-icon name="alert" [size]="11"></app-icon> Signalé</span> }
                  </div>
                </div>
                <h4 class="topic-title">{{ topic.title }}</h4>
                <p class="topic-body">{{ topic.content }}</p>

                <div class="topic-actions">
                  @if (c.canManage) {
                    <button class="link-btn" (click)="moderate(topic, { isPinned: !topic.isPinned })">{{ topic.isPinned ? 'Désépingler' : 'Épingler' }}</button>
                    <button class="link-btn" (click)="moderate(topic, { isLocked: !topic.isLocked })">{{ topic.isLocked ? 'Rouvrir les réponses' : 'Verrouiller' }}</button>
                    @if (topic.isReported) { <button class="link-btn" (click)="moderate(topic, { isReported: false })">Lever le signalement</button> }
                  } @else if (topic.authorId !== myId()) {
                    <button class="link-btn" (click)="report(topic)">Signaler</button>
                  }
                  @if (c.canManage || topic.authorId === myId()) {
                    <button class="link-btn danger" (click)="deleteTopic(topic)">Supprimer</button>
                  }
                </div>

                <div class="comments">
                  @for (comment of topic.comments; track comment.id) {
                    <div class="comment">
                      <div class="avatar small">{{ initial(comment.authorName) }}</div>
                      <div class="comment-body">
                        <div class="comment-head">
                          <strong>{{ comment.authorName }}</strong>
                          <span>{{ formatDateTime(comment.createdAt) }}</span>
                          @if (c.canManage || comment.authorId === myId()) {
                            <button class="icon-btn" title="Supprimer cette réponse" (click)="deleteComment(topic, comment)">
                              <app-icon name="trash" [size]="12"></app-icon>
                            </button>
                          }
                        </div>
                        <p>{{ comment.content }}</p>
                      </div>
                    </div>
                  }
                  @if (topic.isLocked) {
                    <p class="muted small-note"><app-icon name="lock" [size]="12"></app-icon> Ce sujet n'accepte plus de réponses.</p>
                  } @else {
                    <div class="reply-row">
                      <input type="text" class="input-field" [(ngModel)]="replyTexts[topic.id]" placeholder="Répondre..." (keyup.enter)="reply(topic)">
                      <button class="btn btn-outline btn-sm" [disabled]="busy() || !replyTexts[topic.id]?.trim()" (click)="reply(topic)">Répondre</button>
                    </div>
                  }
                </div>
              </article>
            } @empty {
              <div class="card empty">
                <app-icon name="message-square" [size]="28" color="var(--color-text-secondary)"></app-icon>
                <p>Aucune discussion pour le moment. Lancez la première !</p>
              </div>
            }
          </section>
        }

        <!-- ============================== DOCUMENTS ============================== -->
        @if (tab() === 'DOCUMENTS') {
          <section class="panel">
            @if (c.canShare) {
              <div class="card composer">
                <div class="composer-head">
                  <h3 class="panel-title"><app-icon name="upload" [size]="16"></app-icon> Partager un document</h3>
                  <div class="segmented">
                    <button type="button" [class.active]="docMode() === 'FILE'" (click)="docMode.set('FILE'); docError.set('')">Fichier</button>
                    <button type="button" [class.active]="docMode() === 'LINK'" (click)="docMode.set('LINK'); docError.set('')">Lien</button>
                  </div>
                </div>

                @if (docMode() === 'FILE') {
                  <label class="dropzone" [class.dragging]="dragging()" (dragover)="onDragOver($event)" (dragleave)="dragging.set(false)" (drop)="onDrop($event)">
                    <input type="file" hidden [accept]="acceptAttr" (change)="onFileInput($event)">
                    @if (selectedFile(); as f) {
                      <app-icon name="file-text" [size]="22" color="var(--color-navy)"></app-icon>
                      <span><strong>{{ f.name }}</strong> ({{ humanSize(f.size) }})</span>
                      <span class="muted">Cliquez pour choisir un autre fichier</span>
                    } @else {
                      <app-icon name="upload" [size]="22" color="var(--color-navy)"></app-icon>
                      <span><strong>Cliquez pour choisir un fichier</strong> ou déposez-le ici</span>
                      <span class="muted">PDF, Word, PowerPoint, Excel, texte, ZIP, images, MP3/MP4 — 20 Mo maximum</span>
                    }
                  </label>
                  <input type="text" class="input-field" [(ngModel)]="docTitle" maxlength="200" placeholder="Titre (ex : Chapitre 2 — Les jointures)">
                  <textarea class="input-field" rows="2" [(ngModel)]="docDescription" maxlength="1000" placeholder="Description (facultatif)"></textarea>
                  @if (uploadProgress() !== null) {
                    <div class="progress"><div class="progress-bar" [style.width.%]="uploadProgress()"></div></div>
                    <p class="muted small-note">Envoi en cours : {{ uploadProgress() }} %</p>
                  }
                  @if (docError()) { <p class="form-error">{{ docError() }}</p> }
                  <div class="row-end">
                    <button class="btn btn-primary btn-sm" [disabled]="!selectedFile() || uploadProgress() !== null" (click)="submitDocument()">Partager le document</button>
                  </div>
                } @else {
                  <input type="text" class="input-field" [(ngModel)]="linkTitle" maxlength="200" placeholder="Titre (ex : Vidéo du cours sur YouTube)">
                  <input type="url" class="input-field" [(ngModel)]="linkUrl" placeholder="https://...">
                  <textarea class="input-field" rows="2" [(ngModel)]="linkDescription" maxlength="1000" placeholder="Description (facultatif)"></textarea>
                  @if (docError()) { <p class="form-error">{{ docError() }}</p> }
                  <div class="row-end">
                    <button class="btn btn-primary btn-sm" [disabled]="busy() || !linkTitle.trim() || !linkUrl.trim()" (click)="submitLink()">Partager le lien</button>
                  </div>
                }
              </div>
            } @else {
              <p class="info-note"><app-icon name="help-circle" [size]="14"></app-icon> Les documents sont partagés par l'animateur et les modérateurs de la communauté.</p>
            }

            <div class="docs">
              @for (res of c.resources || []; track res.id) {
                <div class="card doc">
                  <div class="doc-icon" [attr.data-type]="res.fileType">{{ typeBadge(res) }}</div>
                  <div class="doc-info">
                    <h4>{{ res.title }}</h4>
                    @if (res.description) { <p class="doc-desc">{{ res.description }}</p> }
                    <span class="muted">
                      {{ res.kind === 'LINK' ? 'Lien' : (res.fileSize || 'Fichier') }} • par {{ res.uploadedByName }} • {{ formatDate(res.uploadedAt) }}
                      @if (res.kind === 'FILE') { • {{ res.downloadCount }} téléchargement(s) }
                    </span>
                  </div>
                  <div class="doc-actions">
                    @if (res.kind === 'LINK') {
                      <a class="btn btn-outline btn-sm" [href]="res.fileUrl" target="_blank" rel="noopener">
                        <app-icon name="external-link" [size]="13"></app-icon><span>Ouvrir</span>
                      </a>
                    } @else {
                      @if (isPreviewable(res)) {
                        <button class="btn btn-outline btn-sm" [disabled]="downloadingId() === res.id" (click)="openDocument(res)">
                          <app-icon name="eye" [size]="13"></app-icon><span>Ouvrir</span>
                        </button>
                      }
                      <button class="btn btn-primary btn-sm" [disabled]="downloadingId() === res.id" (click)="downloadDocument(res)">
                        <app-icon name="download" [size]="13" color="var(--color-navy)"></app-icon><span>{{ downloadingId() === res.id ? '...' : 'Télécharger' }}</span>
                      </button>
                    }
                    @if (c.canManage || res.uploadedById === myId()) {
                      <button class="icon-btn" title="Supprimer" (click)="deleteResource(res)"><app-icon name="trash" [size]="14"></app-icon></button>
                    }
                  </div>
                </div>
              } @empty {
                <div class="card empty">
                  <app-icon name="folder" [size]="28" color="var(--color-text-secondary)"></app-icon>
                  <p>Aucun document partagé pour le moment.</p>
                </div>
              }
            </div>
          </section>
        }

        <!-- ============================== RÉUNIONS ============================== -->
        @if (tab() === 'MEETINGS') {
          <section class="panel">
            @if (c.canManage && !meetingFormOpen()) {
              <div class="row-end">
                <button class="btn btn-primary btn-sm" (click)="openMeetingForm()">
                  <app-icon name="plus" [size]="14" color="var(--color-navy)"></app-icon><span>Programmer une réunion</span>
                </button>
              </div>
            }

            @if (meetingFormOpen()) {
              <div class="card composer">
                <h3 class="panel-title"><app-icon name="video" [size]="16"></app-icon> {{ editingMeetingId() ? 'Modifier la réunion' : 'Programmer une réunion' }}</h3>
                <div class="form-grid">
                  <label class="field span-2">
                    <span>Titre *</span>
                    <input type="text" class="input-field" [(ngModel)]="meetingDraft.title" maxlength="200" placeholder="Ex : Séance de révision du chapitre 3" [class.input-error]="meetingErrors()['title']">
                    @if (meetingErrors()['title']) { <small class="form-error">{{ meetingErrors()['title'] }}</small> }
                  </label>
                  <label class="field">
                    <span>Date et heure *</span>
                    <input type="datetime-local" class="input-field" [(ngModel)]="meetingDraft.scheduledAt" [class.input-error]="meetingErrors()['scheduledAt']">
                    @if (meetingErrors()['scheduledAt']) { <small class="form-error">{{ meetingErrors()['scheduledAt'] }}</small> }
                  </label>
                  <label class="field">
                    <span>Durée</span>
                    <select class="input-field" [(ngModel)]="meetingDraft.durationMinutes">
                      @for (d of durations; track d) { <option [ngValue]="d">{{ durationLabel(d) }}</option> }
                    </select>
                  </label>
                  <label class="field">
                    <span>Plateforme</span>
                    <select class="input-field" [(ngModel)]="meetingDraft.platform">
                      <option value="JITSI">Jitsi Meet (lien créé automatiquement)</option>
                      <option value="GOOGLE_MEET">Google Meet</option>
                      <option value="ZOOM">Zoom</option>
                      <option value="TEAMS">Microsoft Teams</option>
                      <option value="OTHER">Autre</option>
                    </select>
                  </label>
                  <label class="field">
                    <span>Lien de la réunion {{ meetingDraft.platform === 'JITSI' ? '(facultatif)' : '*' }}</span>
                    <input type="url" class="input-field" [(ngModel)]="meetingDraft.meetingUrl" [placeholder]="meetingDraft.platform === 'JITSI' ? 'Laissez vide : une salle Jitsi sera créée' : 'https://...'" [class.input-error]="meetingErrors()['meetingUrl']">
                    @if (meetingErrors()['meetingUrl']) { <small class="form-error">{{ meetingErrors()['meetingUrl'] }}</small> }
                  </label>
                  <label class="field span-2">
                    <span>Ordre du jour (facultatif)</span>
                    <textarea class="input-field" rows="2" [(ngModel)]="meetingDraft.description" maxlength="1000" placeholder="Points abordés, documents à préparer..."></textarea>
                  </label>
                  <label class="check span-2">
                    <input type="checkbox" [(ngModel)]="meetingDraft.notifyMembers">
                    <span>Prévenir les membres (notification sur QuizzBoard et e-mail avec le lien)</span>
                  </label>
                </div>
                @if (meetingErrors()['general']) { <p class="form-error">{{ meetingErrors()['general'] }}</p> }
                <div class="row-end">
                  <button class="btn btn-outline btn-sm" (click)="closeMeetingForm()">Annuler</button>
                  <button class="btn btn-primary btn-sm" [disabled]="busy()" (click)="submitMeeting()">{{ editingMeetingId() ? 'Enregistrer' : 'Programmer' }}</button>
                </div>
              </div>
            }

            @for (m of upcomingMeetings(); track m.id) {
              <div class="card meeting" [class.live]="meetingStatus(m) === 'LIVE'">
                <div class="meeting-date">
                  <span class="day">{{ dayOf(m.scheduledAt) }}</span>
                  <span class="month">{{ monthOf(m.scheduledAt) }}</span>
                </div>
                <div class="meeting-info">
                  <div class="meeting-tags">
                    <span class="flag">{{ platformLabel(m.platform) }}</span>
                    @if (meetingStatus(m) === 'LIVE') { <span class="flag flag-live">En cours</span> }
                  </div>
                  <h4>{{ m.title }}</h4>
                  <span class="muted">{{ formatDateTime(m.scheduledAt) }} • {{ durationLabel(m.durationMinutes) }} • animée par {{ m.hostName }}</span>
                  @if (m.description) { <p class="doc-desc">{{ m.description }}</p> }
                </div>
                <div class="doc-actions">
                  <a class="btn btn-primary btn-sm" [href]="m.meetingUrl" target="_blank" rel="noopener">
                    <app-icon name="video" [size]="13" color="var(--color-navy)"></app-icon><span>Rejoindre</span>
                  </a>
                  <button class="btn btn-outline btn-sm" title="Ajouter à mon agenda (Google, Outlook, téléphone)" (click)="downloadIcs(m)">
                    <app-icon name="calendar" [size]="13"></app-icon><span>Agenda</span>
                  </button>
                  @if (c.canManage) {
                    <button class="icon-btn" title="Modifier" (click)="openMeetingForm(m)"><app-icon name="edit" [size]="14"></app-icon></button>
                    <button class="icon-btn" title="Annuler la réunion" (click)="cancelMeeting(m)"><app-icon name="trash" [size]="14"></app-icon></button>
                  }
                </div>
              </div>
            } @empty {
              @if (!meetingFormOpen()) {
                <div class="card empty">
                  <app-icon name="video" [size]="28" color="var(--color-text-secondary)"></app-icon>
                  <p>Aucune réunion à venir.{{ c.canManage ? ' Programmez une séance en visio : les membres seront prévenus.' : '' }}</p>
                </div>
              }
            }

            @if (pastMeetings().length) {
              <details class="past">
                <summary>Réunions passées ({{ pastMeetings().length }})</summary>
                @for (m of pastMeetings(); track m.id) {
                  <div class="past-row">
                    <span><strong>{{ m.title }}</strong> — {{ formatDateTime(m.scheduledAt) }}</span>
                    @if (c.canManage) { <button class="icon-btn" title="Supprimer" (click)="cancelMeeting(m)"><app-icon name="trash" [size]="13"></app-icon></button> }
                  </div>
                }
              </details>
            }
          </section>
        }

        <!-- ============================== QUIZ ============================== -->
        @if (tab() === 'QUIZ') {
          <section class="panel">
            @if (c.canManage) {
              <div class="card composer inline">
                <app-icon name="share" [size]="16"></app-icon>
                <select class="input-field" [(ngModel)]="quizToShare">
                  <option value="">Choisir un quiz à partager...</option>
                  @if (shareableQuizzes().mine.length) {
                    <optgroup label="Mes quiz">
                      @for (q of shareableQuizzes().mine; track q.id) { <option [value]="q.id">{{ q.title }}</option> }
                    </optgroup>
                  }
                  @if (shareableQuizzes().others.length) {
                    <optgroup label="Quiz publics">
                      @for (q of shareableQuizzes().others; track q.id) { <option [value]="q.id">{{ q.title }}</option> }
                    </optgroup>
                  }
                </select>
                <button class="btn btn-primary btn-sm" [disabled]="busy() || !quizToShare" (click)="shareQuiz()">Partager</button>
              </div>
            }
            @if (quizzesLoading()) {
              <div class="card state-box"><div class="spinner"></div></div>
            } @else {
              <div class="quiz-grid">
                @for (q of sharedQuizzes(); track q.id) {
                  <div class="card quiz">
                    <span class="flag">{{ q.category || 'Quiz' }}</span>
                    <h4>{{ q.title }}</h4>
                    <span class="muted">{{ q.questionsCount || q.questions?.length || 0 }} questions</span>
                    <div class="row-end">
                      @if (c.canManage) { <button class="link-btn danger" (click)="unshareQuiz(q)">Retirer</button> }
                      <button class="btn btn-primary btn-sm" (click)="activeQuiz.set(q)">
                        <app-icon name="play" [size]="12" color="var(--color-navy)"></app-icon><span>Jouer</span>
                      </button>
                    </div>
                  </div>
                } @empty {
                  <div class="card empty span-all">
                    <app-icon name="play" [size]="28" color="var(--color-text-secondary)"></app-icon>
                    <p>Aucun quiz partagé dans cette communauté.</p>
                  </div>
                }
              </div>
            }
          </section>
        }

        <!-- ============================== MEMBRES ============================== -->
        @if (tab() === 'MEMBERS') {
          <section class="panel">
            @if (c.accessCode) {
              <div class="card invite">
                <div>
                  <strong>Inviter des membres</strong>
                  <p class="muted">Partagez le code <strong>{{ c.accessCode }}</strong> : il suffit de le saisir dans « Rejoindre par code ».</p>
                </div>
                <button class="btn btn-outline btn-sm" (click)="copyInvite(c)"><app-icon name="copy" [size]="13"></app-icon><span>Copier l'invitation</span></button>
              </div>
            }
            <input type="search" class="input-field" [(ngModel)]="memberSearch" placeholder="Rechercher un membre...">
            <div class="card members">
              @for (m of filteredMembers(); track m.userId) {
                <div class="member">
                  <div class="avatar">{{ initial(m.name) }}</div>
                  <div class="member-info">
                    <strong>{{ m.name }} @if (m.userId === myId()) { <span class="muted">(vous)</span> }</strong>
                    <span class="muted">{{ m.email || 'Membre depuis le ' + formatDate(m.joinedAt) }}</span>
                  </div>
                  <span class="role-badge" [attr.data-role]="m.role">{{ roleLabel(m.role) }}</span>
                  <span class="member-stats" title="Sur les quiz partagés dans la communauté">{{ m.quizzesCompleted }} quiz • {{ m.totalXp }} XP</span>
                  <div class="member-actions">
                    @if (isOwner() && m.role !== 'CREATOR') {
                      <button class="link-btn" (click)="setRole(m, m.role === 'MODERATOR' ? 'STUDENT' : 'MODERATOR')">{{ m.role === 'MODERATOR' ? 'Retirer modérateur' : 'Nommer modérateur' }}</button>
                    }
                    @if (canRemove(m)) {
                      <button class="link-btn danger" (click)="removeMember(m)">Retirer</button>
                    }
                  </div>
                </div>
              } @empty {
                <p class="muted empty-line">Aucun membre ne correspond à la recherche.</p>
              }
            </div>
          </section>
        }

        <!-- ============================== PARAMÈTRES ============================== -->
        @if (tab() === 'SETTINGS' && isOwner()) {
          <section class="panel">
            <div class="card composer">
              <h3 class="panel-title"><app-icon name="settings" [size]="16"></app-icon> Paramètres de la communauté</h3>
              <div class="form-grid">
                <label class="field span-2">
                  <span>Nom *</span>
                  <input type="text" class="input-field" [(ngModel)]="settings.name" maxlength="150" [class.input-error]="settingsErrors()['name']">
                  @if (settingsErrors()['name']) { <small class="form-error">{{ settingsErrors()['name'] }}</small> }
                </label>
                <label class="field span-2">
                  <span>Description</span>
                  <textarea class="input-field" rows="3" [(ngModel)]="settings.description" maxlength="1000"></textarea>
                </label>
                <label class="field">
                  <span>Catégorie</span>
                  <select class="input-field" [(ngModel)]="settings.category">
                    @for (cat of categoryOptions(); track cat) { <option [value]="cat">{{ cat }}</option> }
                  </select>
                </label>
                <label class="field">
                  <span>Visibilité</span>
                  <select class="input-field" [(ngModel)]="settings.isPrivate">
                    <option [ngValue]="false">Publique : visible par tous, chacun peut la rejoindre</option>
                    <option [ngValue]="true">Privée : accessible seulement avec le code</option>
                  </select>
                </label>
                <label class="check span-2">
                  <input type="checkbox" [(ngModel)]="settings.membersCanShare">
                  <span>Les membres peuvent aussi partager des documents (sinon : vous et les modérateurs uniquement)</span>
                </label>
                <div class="field span-2">
                  <span>Image de couverture</span>
                  <div class="cover-row">
                    @if (settings.coverImage) { <img [src]="settings.coverImage" alt="Couverture" class="cover-preview"> }
                    <label class="btn btn-outline btn-sm">
                      <input type="file" hidden accept="image/png,image/jpeg,image/webp" (change)="onCoverInput($event)">
                      <app-icon name="image" [size]="13"></app-icon><span>{{ coverUploading() ? 'Envoi...' : (settings.coverImage ? 'Changer' : 'Ajouter une image') }}</span>
                    </label>
                    @if (settings.coverImage) { <button class="link-btn danger" (click)="settings.coverImage = ''">Retirer</button> }
                  </div>
                </div>
              </div>
              @if (settingsErrors()['general']) { <p class="form-error">{{ settingsErrors()['general'] }}</p> }
              <div class="row-end">
                <button class="btn btn-primary btn-sm" [disabled]="busy() || coverUploading()" (click)="saveSettings()">Enregistrer</button>
              </div>
            </div>

            <div class="card composer">
              <h3 class="panel-title"><app-icon name="lock" [size]="16"></app-icon> Code d'accès</h3>
              <p class="muted">Code actuel : <strong class="code">{{ c.accessCode }}</strong>. Si le code a circulé trop largement, générez-en un nouveau : l'ancien ne fonctionnera plus (les membres actuels restent membres).</p>
              <div class="row-end"><button class="btn btn-outline btn-sm" (click)="regenerateCode()"><app-icon name="refresh-cw" [size]="13"></app-icon><span>Nouveau code</span></button></div>
            </div>

            <div class="card composer danger-zone">
              <h3 class="panel-title"><app-icon name="alert" [size]="16" color="var(--color-danger)"></app-icon> Supprimer la communauté</h3>
              <p class="muted">Les discussions, documents, réunions et adhésions seront définitivement supprimés.</p>
              <div class="row-end"><button class="btn btn-sm btn-danger-solid" (click)="deleteCommunity(c)">Supprimer définitivement</button></div>
            </div>
          </section>
        }
      }
    </div>

    @if (activeQuiz(); as q) {
      <app-quiz-modal-player [quiz]="q" (closed)="activeQuiz.set(null)"></app-quiz-modal-player>
    }
  `,
  styles: [`
    .hub { display: flex; flex-direction: column; gap: 16px; }
    .hub-top { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
    .code-chip { display: inline-flex; align-items: center; gap: 8px; padding: 7px 12px; border: 1px dashed var(--color-border); border-radius: 8px; background: #FFFFFF; color: var(--color-navy); font-size: 13px; cursor: pointer; }
    .code-chip strong { letter-spacing: 1px; }
    .state-box { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 40px; text-align: center; color: var(--color-text-secondary); }
    .spinner { width: 28px; height: 28px; border: 3px solid #E2E8F0; border-top-color: var(--color-orange); border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .hero { padding: 24px; color: #FFFFFF; background-color: #032447; background-size: cover; background-position: center; border: none; display: flex; flex-direction: column; gap: 10px; }
    .hero-badges { display: flex; gap: 8px; flex-wrap: wrap; }
    .hero-badge { display: inline-flex; align-items: center; gap: 5px; padding: 3px 10px; border-radius: 999px; background: rgba(255,255,255,0.18); font-size: 12px; font-weight: 700; }
    .hero-badge.accent { background: var(--color-orange); }
    .hero-badge.role { background: rgba(255,255,255,0.92); color: var(--color-navy); }
    .hero-title { margin: 4px 0 0; font-size: 26px; font-weight: 800; color: #FFFFFF; }
    .hero-desc { margin: 0; color: #CBD5E1; max-width: 760px; line-height: 1.5; }
    .hero-foot { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
    .hero-metrics { display: flex; gap: 16px; flex-wrap: wrap; font-size: 13px; color: #CBD5E1; }
    .hero-metrics span { display: inline-flex; align-items: center; gap: 6px; }
    .hero-leave { background: rgba(255,255,255,0.15); color: #FFFFFF; border: 1px solid rgba(255,255,255,0.35); }
    .next-meeting { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; background: #FFFFFF; color: var(--color-navy); border-radius: 10px; padding: 10px 14px; font-size: 14px; }
    .next-meeting span { flex: 1; min-width: 200px; }

    .tabs { display: flex; gap: 6px; overflow-x: auto; border-bottom: 1px solid var(--color-border); padding-bottom: 2px; }
    .tab { display: inline-flex; align-items: center; gap: 7px; padding: 10px 14px; border: none; background: none; color: var(--color-text-secondary); font-weight: 700; font-size: 14px; border-bottom: 3px solid transparent; cursor: pointer; white-space: nowrap; }
    .tab.active { color: var(--color-navy); border-bottom-color: var(--color-orange); }
    .tab-count { background: #EEF2F6; color: var(--color-navy); border-radius: 999px; padding: 1px 8px; font-size: 12px; }

    .panel { display: flex; flex-direction: column; gap: 12px; }
    .panel-title { display: flex; align-items: center; gap: 8px; margin: 0; font-size: 15px; font-weight: 800; color: var(--color-navy); }
    .composer { display: flex; flex-direction: column; gap: 10px; padding: 16px; }
    .composer.inline { flex-direction: row; align-items: center; }
    .composer.inline select { flex: 1; }
    .composer-head { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; }
    .row-end { display: flex; justify-content: flex-end; align-items: center; gap: 8px; flex-wrap: wrap; }
    .form-error { color: var(--color-danger); font-size: 13px; margin: 0; }
    .muted { color: var(--color-text-secondary); font-size: 13px; }
    .small-note { display: flex; align-items: center; gap: 6px; margin: 4px 0 0; }
    .info-note { display: flex; align-items: center; gap: 8px; margin: 0; padding: 10px 14px; background: #F1F5F9; border-radius: 8px; color: var(--color-text-secondary); font-size: 13px; }
    .empty { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 32px; text-align: center; color: var(--color-text-secondary); }
    .empty p { margin: 0; }
    .empty-line { padding: 16px; text-align: center; margin: 0; }
    .link-btn { background: none; border: none; padding: 0; color: var(--color-navy); font-weight: 700; font-size: 13px; cursor: pointer; text-decoration: underline; text-underline-offset: 3px; }
    .link-btn.danger { color: var(--color-danger); }
    .icon-btn { display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; border: 1px solid var(--color-border); border-radius: 8px; background: #FFFFFF; color: var(--color-text-secondary); cursor: pointer; }
    .icon-btn:hover { color: var(--color-danger); border-color: var(--color-danger); }
    .btn-danger-solid { background: var(--color-danger); color: #FFFFFF; border: none; }
    .avatar { width: 36px; height: 36px; min-width: 36px; border-radius: 50%; background: #EEF2F6; color: var(--color-navy); display: flex; align-items: center; justify-content: center; font-weight: 800; }
    .avatar.small { width: 28px; height: 28px; min-width: 28px; font-size: 12px; }
    .flag { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 999px; background: #EEF2F6; color: var(--color-navy); font-size: 11px; font-weight: 700; }
    .flag-pin { background: #FFF7ED; color: #C2410C; }
    .flag-lock { background: #F1F5F9; color: #475569; }
    .flag-report { background: #FEF2F2; color: #B91C1C; }
    .flag-live { background: #DCFCE7; color: #15803D; }

    .topic { padding: 16px; display: flex; flex-direction: column; gap: 8px; }
    .topic.pinned { border-left: 4px solid var(--color-orange); }
    .topic-head { display: flex; align-items: center; gap: 10px; }
    .topic-meta { display: flex; flex-direction: column; flex: 1; font-size: 13px; }
    .topic-meta span { color: var(--color-text-secondary); font-size: 12px; }
    .topic-flags { display: flex; gap: 6px; flex-wrap: wrap; }
    .topic-title { margin: 0; font-size: 16px; font-weight: 800; color: var(--color-navy); }
    .topic-body { margin: 0; white-space: pre-wrap; line-height: 1.55; color: #334155; }
    .topic-actions { display: flex; gap: 14px; flex-wrap: wrap; }
    .comments { display: flex; flex-direction: column; gap: 8px; border-top: 1px solid #F1F5F9; padding-top: 10px; }
    .comment { display: flex; gap: 8px; }
    .comment-body { flex: 1; background: #F8FAFC; border-radius: 10px; padding: 8px 12px; }
    .comment-body p { margin: 2px 0 0; white-space: pre-wrap; font-size: 14px; }
    .comment-head { display: flex; align-items: center; gap: 8px; font-size: 13px; }
    .comment-head span { color: var(--color-text-secondary); font-size: 12px; flex: 1; }
    .comment-head .icon-btn { width: 24px; height: 24px; }
    .reply-row { display: flex; gap: 8px; }
    .reply-row input { flex: 1; }

    .segmented { display: inline-flex; border: 1px solid var(--color-border); border-radius: 8px; overflow: hidden; }
    .segmented button { border: none; background: #FFFFFF; padding: 6px 14px; font-weight: 700; font-size: 13px; color: var(--color-text-secondary); cursor: pointer; }
    .segmented button.active { background: var(--color-navy); color: #FFFFFF; }
    .dropzone { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 22px; border: 2px dashed #CBD5E1; border-radius: 12px; background: #F8FAFC; text-align: center; cursor: pointer; font-size: 14px; }
    .dropzone.dragging { border-color: var(--color-orange); background: #FFF7ED; }
    .progress { height: 8px; background: #E2E8F0; border-radius: 999px; overflow: hidden; }
    .progress-bar { height: 100%; background: var(--color-orange); transition: width 0.2s; }
    .docs { display: flex; flex-direction: column; gap: 10px; }
    .doc { display: flex; align-items: center; gap: 14px; padding: 14px 16px; }
    .doc-icon { width: 46px; height: 46px; min-width: 46px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; color: #FFFFFF; background: #64748B; }
    .doc-icon[data-type="PDF"] { background: #DC2626; }
    .doc-icon[data-type="DOC"] { background: #2563EB; }
    .doc-icon[data-type="SLIDES"] { background: #EA580C; }
    .doc-icon[data-type="SHEET"] { background: #16A34A; }
    .doc-icon[data-type="IMAGE"] { background: #9333EA; }
    .doc-icon[data-type="LINK"] { background: var(--color-navy); }
    .doc-info { flex: 1; min-width: 0; }
    .doc-info h4 { margin: 0 0 2px; font-size: 15px; font-weight: 800; color: var(--color-navy); overflow-wrap: anywhere; }
    .doc-desc { margin: 2px 0 4px; font-size: 13px; color: #475569; white-space: pre-wrap; }
    .doc-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }

    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .field { display: flex; flex-direction: column; gap: 5px; font-size: 13px; font-weight: 700; color: var(--color-navy); }
    .span-2 { grid-column: span 2; }
    .check { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #334155; cursor: pointer; }
    .meeting { display: flex; align-items: center; gap: 16px; padding: 14px 16px; }
    .meeting.live { border: 2px solid #22C55E; }
    .meeting-date { display: flex; flex-direction: column; align-items: center; justify-content: center; width: 56px; min-width: 56px; height: 56px; border-radius: 12px; background: #FFF7ED; color: #C2410C; }
    .meeting-date .day { font-size: 20px; font-weight: 800; line-height: 1; }
    .meeting-date .month { font-size: 11px; font-weight: 700; text-transform: uppercase; }
    .meeting-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
    .meeting-info h4 { margin: 0; font-size: 15px; font-weight: 800; color: var(--color-navy); }
    .meeting-tags { display: flex; gap: 6px; }
    .past { background: #FFFFFF; border: 1px solid var(--color-border); border-radius: 12px; padding: 10px 16px; }
    .past summary { cursor: pointer; font-weight: 700; color: var(--color-navy); }
    .past-row { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 8px 0; border-top: 1px solid #F1F5F9; font-size: 14px; }

    .quiz-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
    .quiz { padding: 16px; display: flex; flex-direction: column; gap: 6px; align-items: flex-start; }
    .quiz h4 { margin: 0; font-size: 15px; font-weight: 800; color: var(--color-navy); }
    .quiz .row-end { width: 100%; margin-top: auto; }
    .span-all { grid-column: 1 / -1; }

    .invite { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 14px 16px; flex-wrap: wrap; }
    .invite p { margin: 2px 0 0; }
    .members { padding: 4px 0; }
    .member { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-bottom: 1px solid #F1F5F9; flex-wrap: wrap; }
    .member:last-child { border-bottom: none; }
    .member-info { flex: 1; min-width: 160px; display: flex; flex-direction: column; font-size: 14px; }
    .role-badge { padding: 3px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; background: #EEF2F6; color: var(--color-navy); }
    .role-badge[data-role="CREATOR"] { background: var(--color-orange); color: #FFFFFF; }
    .role-badge[data-role="MODERATOR"] { background: #DBEAFE; color: #1D4ED8; }
    .member-stats { font-size: 12px; color: var(--color-text-secondary); min-width: 110px; }
    .member-actions { display: flex; gap: 12px; }

    .cover-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .cover-preview { width: 120px; height: 64px; object-fit: cover; border-radius: 8px; border: 1px solid var(--color-border); }
    .code { letter-spacing: 1px; color: var(--color-navy); }
    .danger-zone { border-color: #FECACA; }

    @media (max-width: 720px) {
      .form-grid { grid-template-columns: 1fr; }
      .span-2 { grid-column: span 1; }
      .doc, .meeting { flex-wrap: wrap; }
      .doc-actions { width: 100%; justify-content: flex-start; }
      .composer.inline { flex-direction: column; align-items: stretch; }
      .hero-title { font-size: 21px; }
    }
  `]
})
export class CommunityHubComponent implements OnChanges, OnDestroy {
  @Input({ required: true }) communityId!: string;
  /** Onglet demandé par un lien (documents, reunions, quiz, membres...). */
  @Input() initialTab: string | null = null;
  @Output() back = new EventEmitter<void>();
  /** La communauté a été quittée ou supprimée. */
  @Output() left = new EventEmitter<void>();

  private commService = inject(CommunityService);
  private quizService = inject(QuizService);
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  private confirmDialog = inject(ConfirmDialogService);
  private fileUpload = inject(FileUploadService);
  private cdr = inject(ChangeDetectorRef);

  community = signal<Community | null>(null);
  loading = signal(true);
  loadError = signal('');
  tab = signal<HubTab>('DISCUSSIONS');
  busy = signal(false);
  codeCopied = signal(false);
  /** Heure courante, rafraîchie chaque minute (réunions « en cours »). */
  now = signal(Date.now());
  private clock = setInterval(() => this.now.set(Date.now()), 60_000);
  private uploadSub?: Subscription;

  myId = computed(() => this.auth.currentUser()?.id ?? null);
  isOwner = computed(() => ['CREATOR', 'ADMIN'].includes(this.community()?.myRole ?? ''));

  tabs = computed(() => {
    const c = this.community();
    if (!c) return [];
    const list: { id: HubTab; label: string; icon: IconName; count: number | null }[] = [
      { id: 'DISCUSSIONS', label: 'Discussions', icon: 'message-square', count: c.topics?.length ?? 0 },
      { id: 'DOCUMENTS', label: 'Documents', icon: 'folder', count: c.resources?.length ?? 0 },
      { id: 'MEETINGS', label: 'Réunions', icon: 'video', count: this.upcomingMeetings().length },
      { id: 'QUIZ', label: 'Quiz', icon: 'play', count: c.sharedQuizIds?.length ?? 0 },
      { id: 'MEMBERS', label: 'Membres', icon: 'users', count: c.members?.length ?? 0 }
    ];
    if (this.isOwner()) list.push({ id: 'SETTINGS', label: 'Paramètres', icon: 'settings', count: null });
    return list;
  });

  // ---------------------------------------------------------------- Formulaires
  topicTitle = '';
  topicContent = '';
  topicError = signal('');
  replyTexts: Record<string, string> = {};

  docMode = signal<'FILE' | 'LINK'>('FILE');
  selectedFile = signal<File | null>(null);
  dragging = signal(false);
  uploadProgress = signal<number | null>(null);
  docError = signal('');
  docTitle = '';
  docDescription = '';
  linkTitle = '';
  linkUrl = '';
  linkDescription = '';
  downloadingId = signal<string | null>(null);
  readonly acceptAttr = DOCUMENT_EXTENSIONS.map(e => '.' + e).join(',');

  meetingFormOpen = signal(false);
  editingMeetingId = signal<string | null>(null);
  meetingErrors = signal<Record<string, string>>({});
  meetingDraft: MeetingDraft = this.emptyMeetingDraft();
  readonly durations = [30, 45, 60, 90, 120, 180];

  sharedQuizzes = signal<Quiz[]>([]);
  quizzesLoading = signal(false);
  private quizzesLoadedFor: string | null = null;
  quizToShare = '';
  activeQuiz = signal<Quiz | null>(null);

  memberSearch = '';

  settings = { name: '', description: '', category: '', isPrivate: false, membersCanShare: false, coverImage: '' };
  settingsErrors = signal<Record<string, string>>({});
  coverUploading = signal(false);
  private readonly categories = ['Tech & Informatique', 'Data & IA', 'Pédagogie & EdTech', 'Business & Marketing', 'Santé & Sciences', 'Examens & Révisions'];

  // ---------------------------------------------------------------- Dérivés
  upcomingMeetings = computed(() => (this.community()?.meetings ?? []).filter(m => this.meetingEnd(m) >= this.now()));
  pastMeetings = computed(() => (this.community()?.meetings ?? []).filter(m => this.meetingEnd(m) < this.now()).reverse());
  /** Bandeau : réunion en cours ou dans les 7 prochains jours. */
  nextMeeting = computed(() => {
    const next = this.upcomingMeetings()[0];
    return next && this.meetingStart(next) - this.now() < 7 * 24 * 3600_000 ? next : null;
  });

  filteredMembers = () => {
    const q = this.memberSearch.trim().toLowerCase();
    const members = this.community()?.members ?? [];
    return q ? members.filter(m => m.name.toLowerCase().includes(q) || (m.email ?? '').toLowerCase().includes(q)) : members;
  };

  shareableQuizzes = computed(() => {
    const shared = new Set(this.community()?.sharedQuizIds ?? []);
    const me = this.myId();
    const available = this.quizService.getQuizzes()().filter(q => !shared.has(q.id));
    return {
      mine: available.filter(q => q.creatorId === me),
      others: available.filter(q => q.creatorId !== me && (q.visibility === 'PUBLIC' || !q.visibility))
    };
  });

  categoryOptions = () => {
    const current = this.settings.category;
    return current && !this.categories.includes(current) ? [current, ...this.categories] : this.categories;
  };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['communityId'] && this.communityId) {
      this.load(true);
    }
  }

  ngOnDestroy(): void {
    clearInterval(this.clock);
    this.uploadSub?.unsubscribe();
  }

  async load(resetTab = false): Promise<void> {
    this.loading.set(true);
    this.loadError.set('');
    try {
      const detail = await this.commService.fetchDetail(this.communityId);
      this.community.set(detail);
      this.fillSettings(detail);
      if (resetTab) {
        const wanted = TAB_PARAMS[(this.initialTab ?? '').toLowerCase()] ?? 'DISCUSSIONS';
        this.selectTab(wanted === 'SETTINGS' && !this.isOwner() ? 'DISCUSSIONS' : wanted, false);
      }
    } catch (err) {
      this.loadError.set(getGeneralErrorMessage(err, 'Cette communauté n\'a pas pu être ouverte.'));
    } finally {
      this.loading.set(false);
    }
  }

  /** Recharge le détail après une action, sans écran de chargement. */
  private async reload(): Promise<void> {
    try {
      this.community.set(await this.commService.fetchDetail(this.communityId));
    } catch (err) {
      this.toast.apiError(err, 'La communauté n\'a pas pu être actualisée.');
    }
  }

  /** Exécute une action serveur : bouton désactivé pendant l'appel, message en cas d'erreur, rafraîchissement. */
  private async run(action: () => Promise<unknown>, success: string | null, fallback: string): Promise<boolean> {
    this.busy.set(true);
    try {
      await action();
      if (success) this.toast.success(success);
      await this.reload();
      return true;
    } catch (err) {
      this.toast.apiError(err, fallback);
      return false;
    } finally {
      this.busy.set(false);
      this.cdr.markForCheck();
    }
  }

  /** Change d'onglet ; par défaut, actualise aussi le contenu (nouveaux messages, documents ou réunions des autres membres). */
  selectTab(tab: HubTab, refresh = true): void {
    this.tab.set(tab);
    if (tab === 'QUIZ' && (refresh || this.quizzesLoadedFor !== this.communityId)) this.loadQuizzes();
    if (tab === 'SETTINGS' && this.community()) this.fillSettings(this.community()!);
    else if (refresh) this.reload();
  }

  // ---------------------------------------------------------------- En-tête
  copyCode(code: string): void {
    navigator.clipboard?.writeText(code);
    this.codeCopied.set(true);
    setTimeout(() => this.codeCopied.set(false), 2000);
  }

  copyInvite(c: Community): void {
    const text = `Rejoignez la communauté « ${c.name} » sur QuizzBoard : connectez-vous sur ${window.location.origin}, ouvrez Communautés puis « Rejoindre par code » et saisissez le code ${c.accessCode}.`;
    navigator.clipboard?.writeText(text);
    this.toast.success('Invitation copiée : collez-la dans un message ou un e-mail.');
  }

  async leave(): Promise<void> {
    const c = this.community();
    if (!c) return;
    const ok = await this.confirmDialog.confirm({
      title: 'Quitter la communauté ?', message: `Vous ne verrez plus les discussions, documents et réunions de « ${c.name} ». Vous pourrez revenir avec le code d'accès.`,
      confirmText: 'Quitter', variant: 'warning', icon: 'log-out'
    });
    if (!ok) return;
    try {
      await this.commService.leave(c.id);
      this.toast.success('Vous avez quitté la communauté.');
      this.left.emit();
    } catch (err) {
      this.toast.apiError(err, 'Impossible de quitter la communauté pour le moment.');
    }
  }

  // ---------------------------------------------------------------- Discussions
  async publishTopic(): Promise<void> {
    this.topicError.set('');
    const title = this.topicTitle.trim();
    const content = this.topicContent.trim();
    if (!title || !content) return;
    this.busy.set(true);
    try {
      await this.commService.createTopic(this.communityId, { title, content });
      this.topicTitle = '';
      this.topicContent = '';
      await this.reload();
    } catch (err) {
      this.topicError.set(getGeneralErrorMessage(err, 'Votre sujet n\'a pas pu être publié.'));
    } finally {
      this.busy.set(false);
      this.cdr.markForCheck();
    }
  }

  async reply(topic: ForumTopic): Promise<void> {
    const text = (this.replyTexts[topic.id] || '').trim();
    if (!text || this.busy()) return;
    const ok = await this.run(() => this.commService.addComment(topic.id, text), null, 'Votre réponse n\'a pas pu être publiée.');
    if (ok) this.replyTexts[topic.id] = '';
  }

  moderate(topic: ForumTopic, flags: { isPinned?: boolean; isLocked?: boolean; isReported?: boolean }): void {
    this.run(() => this.commService.moderateTopic(this.communityId, topic.id, flags), null, 'Le sujet n\'a pas pu être modifié.');
  }

  async report(topic: ForumTopic): Promise<void> {
    const ok = await this.confirmDialog.confirm({
      title: 'Signaler ce sujet ?', message: 'L\'équipe d\'animation et les administrateurs seront avertis que ce contenu pose problème.',
      confirmText: 'Signaler', variant: 'warning', icon: 'alert'
    });
    if (ok) this.run(() => this.commService.reportTopic(topic.id), 'Sujet signalé. Merci, il va être vérifié.', 'Le signalement n\'a pas pu être envoyé.');
  }

  async deleteTopic(topic: ForumTopic): Promise<void> {
    const ok = await this.confirmDialog.confirm({
      title: 'Supprimer ce sujet ?', message: `« ${topic.title} » et ses ${topic.comments.length} réponse(s) seront supprimés.`,
      confirmText: 'Supprimer', variant: 'danger', icon: 'trash'
    });
    if (ok) this.run(() => this.commService.deleteTopic(this.communityId, topic.id), 'Sujet supprimé.', 'Le sujet n\'a pas pu être supprimé.');
  }

  async deleteComment(topic: ForumTopic, comment: ForumComment): Promise<void> {
    const ok = await this.confirmDialog.confirm({
      title: 'Supprimer cette réponse ?', message: 'La réponse sera définitivement supprimée.', confirmText: 'Supprimer', variant: 'danger', icon: 'trash'
    });
    if (ok) this.run(() => this.commService.deleteComment(topic.id, comment.id), null, 'La réponse n\'a pas pu être supprimée.');
  }

  // ---------------------------------------------------------------- Documents
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(true);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) this.pickFile(file);
  }

  onFileInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.pickFile(file);
    input.value = '';
  }

  private pickFile(file: File): void {
    this.docError.set('');
    const ext = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : '';
    if (!DOCUMENT_EXTENSIONS.includes(ext)) {
      this.docError.set('Format non pris en charge. Formats acceptés : PDF, Word, PowerPoint, Excel, texte, ZIP, images, MP3 et MP4.');
      return;
    }
    if (file.size > MAX_DOCUMENT_BYTES) {
      this.docError.set(`Fichier trop volumineux (${this.humanSize(file.size)}) : 20 Mo maximum.`);
      return;
    }
    this.selectedFile.set(file);
    if (!this.docTitle.trim()) this.docTitle = file.name.replace(/\.[^.]+$/, '');
    this.cdr.markForCheck();
  }

  submitDocument(): void {
    const file = this.selectedFile();
    if (!file) return;
    this.docError.set('');
    this.uploadProgress.set(0);
    this.uploadSub = this.commService.uploadDocument(this.communityId, file, this.docTitle, this.docDescription).subscribe({
      next: async (event) => {
        this.uploadProgress.set(event.progress);
        if (event.resource) {
          this.selectedFile.set(null);
          this.docTitle = '';
          this.docDescription = '';
          this.uploadProgress.set(null);
          this.toast.success(`« ${event.resource.title} » est partagé avec les membres.`);
          await this.reload();
          this.cdr.markForCheck();
        }
      },
      error: (err) => {
        this.uploadProgress.set(null);
        this.docError.set(getGeneralErrorMessage(err, 'Le document n\'a pas pu être envoyé.'));
      }
    });
  }

  async submitLink(): Promise<void> {
    this.docError.set('');
    this.busy.set(true);
    try {
      await this.commService.addLink(this.communityId, { title: this.linkTitle, url: this.linkUrl.trim(), description: this.linkDescription });
      this.linkTitle = '';
      this.linkUrl = '';
      this.linkDescription = '';
      this.toast.success('Lien partagé avec les membres.');
      await this.reload();
    } catch (err) {
      this.docError.set(getGeneralErrorMessage(err, 'Le lien n\'a pas pu être partagé.'));
    } finally {
      this.busy.set(false);
      this.cdr.markForCheck();
    }
  }

  isPreviewable(res: ResourceFile): boolean {
    return PREVIEWABLE.includes(res.fileType);
  }

  /** Ouvre le document dans un nouvel onglet (PDF, image, audio/vidéo). */
  async openDocument(res: ResourceFile): Promise<void> {
    const win = window.open('', '_blank');
    const blob = await this.fetchDocument(res);
    if (!blob) {
      win?.close();
      return;
    }
    const url = URL.createObjectURL(new Blob([blob], { type: res.contentType?.split(';')[0] || blob.type }));
    if (win) {
      win.location.href = url;
    } else {
      this.saveBlob(url, res);
    }
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  async downloadDocument(res: ResourceFile): Promise<void> {
    const blob = await this.fetchDocument(res);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    this.saveBlob(url, res);
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  private async fetchDocument(res: ResourceFile): Promise<Blob | null> {
    this.downloadingId.set(res.id);
    try {
      const blob = await this.commService.downloadDocument(this.communityId, res.id);
      this.community.update(c => c ? { ...c, resources: (c.resources ?? []).map(r => r.id === res.id ? { ...r, downloadCount: r.downloadCount + 1 } : r) } : c);
      return blob;
    } catch (err) {
      this.toast.apiError(err, 'Le document n\'a pas pu être téléchargé.');
      return null;
    } finally {
      this.downloadingId.set(null);
    }
  }

  private saveBlob(url: string, res: ResourceFile): void {
    const a = document.createElement('a');
    a.href = url;
    a.download = res.originalFileName || res.title;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async deleteResource(res: ResourceFile): Promise<void> {
    const ok = await this.confirmDialog.confirm({
      title: 'Supprimer ce document ?', message: `« ${res.title} » ne sera plus accessible aux membres.`, confirmText: 'Supprimer', variant: 'danger', icon: 'trash'
    });
    if (ok) this.run(() => this.commService.deleteResource(this.communityId, res.id), 'Document supprimé.', 'Le document n\'a pas pu être supprimé.');
  }

  typeBadge(res: ResourceFile): string {
    if (res.kind === 'LINK') return 'LIEN';
    const ext = res.originalFileName?.split('.').pop()?.toUpperCase();
    return ext && ext.length <= 4 ? ext : res.fileType;
  }

  humanSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} Mo`;
  }

  // ---------------------------------------------------------------- Réunions
  private emptyMeetingDraft(): MeetingDraft {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(18, 0, 0, 0);
    return { title: '', description: '', meetingUrl: '', platform: 'JITSI', scheduledAt: this.toLocalInput(tomorrow), durationMinutes: 60, notifyMembers: true };
  }

  openMeetingForm(meeting?: Meeting): void {
    this.meetingErrors.set({});
    this.editingMeetingId.set(meeting?.id ?? null);
    this.meetingDraft = meeting
      ? { title: meeting.title, description: meeting.description ?? '', meetingUrl: meeting.meetingUrl, platform: meeting.platform,
          scheduledAt: meeting.scheduledAt.slice(0, 16), durationMinutes: meeting.durationMinutes, notifyMembers: true }
      : this.emptyMeetingDraft();
    this.meetingFormOpen.set(true);
  }

  closeMeetingForm(): void {
    this.meetingFormOpen.set(false);
    this.editingMeetingId.set(null);
  }

  async submitMeeting(): Promise<void> {
    this.meetingErrors.set({});
    const d = this.meetingDraft;
    const errors: Record<string, string> = {};
    if (!d.title.trim()) errors['title'] = 'Donnez un titre à la réunion.';
    if (!d.scheduledAt) errors['scheduledAt'] = 'Choisissez la date et l\'heure.';
    if (d.platform !== 'JITSI' && !d.meetingUrl.trim()) errors['meetingUrl'] = 'Collez le lien de la réunion.';
    if (Object.keys(errors).length) {
      this.meetingErrors.set(errors);
      return;
    }
    const form = { ...d, title: d.title.trim(), meetingUrl: d.meetingUrl.trim() };
    const editing = this.editingMeetingId();
    this.busy.set(true);
    try {
      if (editing) {
        await this.commService.updateMeeting(this.communityId, editing, form);
        this.toast.success(d.notifyMembers ? 'Réunion modifiée : les membres ont été prévenus.' : 'Réunion modifiée.');
      } else {
        await this.commService.scheduleMeeting(this.communityId, form);
        this.toast.success(d.notifyMembers ? 'Réunion programmée : les membres ont été prévenus par notification et e-mail.' : 'Réunion programmée.');
      }
      this.closeMeetingForm();
      await this.reload();
    } catch (err) {
      const fields = extractFieldErrors(err);
      this.meetingErrors.set(Object.keys(fields).length ? fields : { general: getGeneralErrorMessage(err, 'La réunion n\'a pas pu être enregistrée.') });
    } finally {
      this.busy.set(false);
      this.cdr.markForCheck();
    }
  }

  async cancelMeeting(m: Meeting): Promise<void> {
    const past = this.meetingEnd(m) < this.now();
    const ok = await this.confirmDialog.confirm({
      title: past ? 'Supprimer cette réunion ?' : 'Annuler la réunion ?', message: `« ${m.title} » (${this.formatDateTime(m.scheduledAt)}) sera retirée de la communauté.`,
      confirmText: past ? 'Supprimer' : 'Annuler la réunion', cancelText: 'Retour', variant: 'danger', icon: 'trash'
    });
    if (ok) this.run(() => this.commService.deleteMeeting(this.communityId, m.id), past ? 'Réunion supprimée.' : 'Réunion annulée.', 'La réunion n\'a pas pu être annulée.');
  }

  meetingStatus(m: Meeting): 'LIVE' | 'UPCOMING' | 'PAST' {
    const now = this.now();
    if (this.meetingEnd(m) < now) return 'PAST';
    return this.meetingStart(m) <= now ? 'LIVE' : 'UPCOMING';
  }

  private meetingStart(m: Meeting): number {
    return new Date(m.scheduledAt).getTime();
  }

  private meetingEnd(m: Meeting): number {
    return this.meetingStart(m) + (m.durationMinutes || 60) * 60_000;
  }

  /** Fichier .ics : ajout à Google Agenda, Outlook ou au calendrier du téléphone. */
  downloadIcs(m: Meeting): void {
    const stamp = (t: number) => new Date(t).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/([,;])/g, '\\$1').replace(/\r?\n/g, '\\n');
    const community = this.community()?.name ?? 'QuizzBoard';
    const description = [m.description ?? '', `Lien de la réunion : ${m.meetingUrl}`, `Communauté : ${community}`].filter(Boolean).join('\n');
    const ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//QuizzBoard//Communautes//FR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      'BEGIN:VEVENT', `UID:${m.id}@quizzboard.com`, `DTSTAMP:${stamp(Date.now())}`,
      `DTSTART:${stamp(this.meetingStart(m))}`, `DTEND:${stamp(this.meetingEnd(m))}`,
      `SUMMARY:${esc(m.title)}`, `DESCRIPTION:${esc(description)}`, `LOCATION:${esc(m.meetingUrl)}`, `URL:${m.meetingUrl}`,
      'END:VEVENT', 'END:VCALENDAR'
    ].join('\r\n');
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${m.title.replace(/[^\p{L}\p{N} _-]+/gu, '').trim() || 'reunion'}.ics`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  platformLabel(p: MeetingPlatform): string {
    return PLATFORM_LABELS[p] ?? 'Visioconférence';
  }

  durationLabel(minutes: number): string {
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest ? `${h} h ${rest}` : `${h} h`;
  }

  // ---------------------------------------------------------------- Quiz
  private async loadQuizzes(): Promise<void> {
    this.quizzesLoading.set(true);
    try {
      this.sharedQuizzes.set(await this.commService.getSharedQuizzes(this.communityId));
      this.quizzesLoadedFor = this.communityId;
    } catch (err) {
      this.toast.apiError(err, 'Les quiz de la communauté n\'ont pas pu être chargés.');
    } finally {
      this.quizzesLoading.set(false);
    }
  }

  async shareQuiz(): Promise<void> {
    const quizId = this.quizToShare;
    if (!quizId) return;
    const ok = await this.run(() => this.commService.shareQuiz(this.communityId, quizId), 'Quiz partagé : les membres ont été prévenus.', 'Le quiz n\'a pas pu être partagé.');
    if (ok) {
      this.quizToShare = '';
      await this.loadQuizzes();
    }
  }

  async unshareQuiz(q: Quiz): Promise<void> {
    const ok = await this.confirmDialog.confirm({
      title: 'Retirer ce quiz ?', message: `« ${q.title} » ne sera plus proposé dans la communauté (le quiz lui-même n'est pas supprimé).`,
      confirmText: 'Retirer', variant: 'warning', icon: 'x-circle'
    });
    if (!ok) return;
    if (await this.run(() => this.commService.unshareQuiz(this.communityId, q.id), 'Quiz retiré de la communauté.', 'Le quiz n\'a pas pu être retiré.')) {
      await this.loadQuizzes();
    }
  }

  // ---------------------------------------------------------------- Membres
  canRemove(m: CommunityMember): boolean {
    const role = this.community()?.myRole;
    if (m.role === 'CREATOR' || m.userId === this.myId()) return false;
    return role === 'CREATOR' || role === 'ADMIN' || (role === 'MODERATOR' && m.role === 'STUDENT');
  }

  setRole(m: CommunityMember, role: CommunityMember['role']): void {
    this.run(() => this.commService.setMemberRole(this.communityId, m.userId, role),
      role === 'MODERATOR' ? `${m.name} est maintenant modérateur.` : `${m.name} n'est plus modérateur.`, 'Le rôle n\'a pas pu être modifié.');
  }

  async removeMember(m: CommunityMember): Promise<void> {
    const ok = await this.confirmDialog.confirm({
      title: 'Retirer ce membre ?', message: `${m.name} n'aura plus accès à la communauté. Il pourra revenir avec le code d'accès, sauf si vous en générez un nouveau.`,
      confirmText: 'Retirer', variant: 'danger', icon: 'x-circle'
    });
    if (ok) this.run(() => this.commService.removeMember(this.communityId, m.userId), `${m.name} a été retiré de la communauté.`, 'Le membre n\'a pas pu être retiré.');
  }

  // ---------------------------------------------------------------- Paramètres
  private fillSettings(c: Community): void {
    this.settings = {
      name: c.name, description: c.description ?? '', category: c.category ?? this.categories[0],
      isPrivate: c.isPrivate, membersCanShare: c.membersCanShare, coverImage: c.coverImage ?? ''
    };
    this.settingsErrors.set({});
  }

  async onCoverInput(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.coverUploading.set(true);
    try {
      this.settings.coverImage = await this.fileUpload.uploadFileAndGetUrl(file, 'general');
    } catch (err) {
      this.toast.apiError(err, 'L\'image n\'a pas pu être envoyée.');
    } finally {
      this.coverUploading.set(false);
      this.cdr.markForCheck();
    }
  }

  async saveSettings(): Promise<void> {
    this.settingsErrors.set({});
    if (!this.settings.name.trim()) {
      this.settingsErrors.set({ name: 'Le nom de la communauté est obligatoire.' });
      return;
    }
    this.busy.set(true);
    try {
      const saved = await this.commService.updateSettings(this.communityId, { ...this.settings, name: this.settings.name.trim() });
      this.community.set(saved);
      this.fillSettings(saved);
      this.toast.success('Paramètres enregistrés.');
    } catch (err) {
      const fields = extractFieldErrors(err);
      this.settingsErrors.set(Object.keys(fields).length ? fields : { general: getGeneralErrorMessage(err, 'Les paramètres n\'ont pas pu être enregistrés.') });
    } finally {
      this.busy.set(false);
      this.cdr.markForCheck();
    }
  }

  async regenerateCode(): Promise<void> {
    const ok = await this.confirmDialog.confirm({
      title: 'Générer un nouveau code ?', message: 'L\'ancien code ne permettra plus de rejoindre la communauté. Les membres actuels restent membres.',
      confirmText: 'Nouveau code', variant: 'warning', icon: 'refresh-cw'
    });
    if (!ok) return;
    try {
      const code = await this.commService.regenerateCode(this.communityId);
      this.community.update(c => c ? { ...c, accessCode: code } : c);
      this.toast.success(`Nouveau code d'accès : ${code}`);
    } catch (err) {
      this.toast.apiError(err, 'Le code n\'a pas pu être renouvelé.');
    }
  }

  async deleteCommunity(c: Community): Promise<void> {
    const ok = await this.confirmDialog.confirm({
      title: 'Supprimer définitivement ?', message: `« ${c.name} », ses ${c.topicsCount} discussion(s), ${c.resourcesCount} document(s) et ${c.meetingsCount} réunion(s) seront supprimés pour tous les membres.`,
      confirmText: 'Supprimer la communauté', variant: 'danger', icon: 'trash'
    });
    if (!ok) return;
    try {
      await this.commService.deleteCommunity(c.id);
      this.toast.success('Communauté supprimée.');
      this.left.emit();
    } catch (err) {
      this.toast.apiError(err, 'La communauté n\'a pas pu être supprimée.');
    }
  }

  // ---------------------------------------------------------------- Affichage
  roleLabel(role: string | null | undefined): string {
    switch (role) {
      case 'CREATOR': return 'Créateur';
      case 'MODERATOR': return 'Modérateur';
      case 'ADMIN': return 'Administrateur';
      default: return 'Membre';
    }
  }

  /** « 0 membre », « 1 membre », « 3 membres ». */
  count(n: number, word: string): string {
    return `${n} ${word}${n > 1 ? 's' : ''}`;
  }

  initial(name: string | null | undefined): string {
    return (name || '?').trim().charAt(0).toUpperCase();
  }

  heroBackground(c: Community): string {
    const overlay = 'linear-gradient(rgba(3, 36, 71, 0.78), rgba(3, 36, 71, 0.94))';
    return c.coverImage ? `${overlay}, url("${c.coverImage}")` : overlay;
  }

  formatDateTime(value: string | null | undefined): string {
    if (!value) return '';
    return new Date(value).toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
  }

  formatDate(value: string | null | undefined): string {
    if (!value) return '';
    return new Date(value).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  dayOf(value: string): string {
    return String(new Date(value).getDate());
  }

  monthOf(value: string): string {
    return new Date(value).toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '');
  }

  private toLocalInput(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
}
