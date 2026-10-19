import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { RemedialService } from '../../../core/services/remedial.service';
import { RemedialPack } from '../../../core/models/remedial.model';
import { Quiz } from '../../../core/models/quiz.model';
import { markdownToHtml } from '../../../core/utils/markdown.util';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { QuizModalPlayerComponent } from '../../../shared/components/quiz-modal-player/quiz-modal-player.component';

/**
 * Perfectionnement : après un quiz réussi à moins de 70 %, QuizzBoard prépare un mini-cours et un quiz
 * d'entraînement sur les notions manquées. Contenu réservé à l'abonnement Apprenant Plus.
 */
@Component({
  selector: 'app-learner-remedial',
  standalone: true,
  imports: [CommonModule, RouterLink, IconComponent, QuizModalPlayerComponent],
  template: `
    <div class="remedial-page animate-fade-in">
      @if (!selected()) {
        <div class="page-header">
          <div>
            <h1 class="h1">Perfectionnement & Remise à niveau</h1>
            <p class="body-small">
              Après un quiz réussi à moins de 70 %, QuizzBoard vous prépare automatiquement un mini-cours et un quiz
              d'entraînement sur les notions que vous avez manquées.
            </p>
          </div>
          <span class="badge badge-primary count-badge">
            <app-icon name="trending-up" [size]="14" color="var(--color-navy)"></app-icon>
            <span>{{ packs().length }} parcours</span>
          </span>
        </div>

        @if (!plus()) {
          <div class="upsell-card card">
            <div class="upsell-icon"><app-icon name="lock" [size]="22" color="#92400E"></app-icon></div>
            <div class="upsell-text">
              <strong>Réservé à l'abonnement Apprenant Plus (200 F / mois)</strong>
              <span>Vos parcours sont préparés, mais leur consultation (mini-cours et quiz d'entraînement) nécessite l'abonnement Apprenant Plus. Il donne aussi accès à vos certificats.</span>
            </div>
            <a routerLink="/tarifs" class="btn btn-primary btn-sm">Découvrir Apprenant Plus</a>
          </div>
        }

        @if (!loaded()) {
          <div class="card empty-card"><p class="body-small">Chargement de vos parcours...</p></div>
        } @else if (packs().length === 0) {
          <div class="card empty-card">
            <div class="empty-icon"><app-icon name="check-circle" [size]="28" color="var(--color-success)"></app-icon></div>
            <h3 class="h3">Aucune remise à niveau pour le moment</h3>
            <p class="body-small">Un parcours apparaît ici automatiquement quand vous obtenez moins de 70 % à un quiz.</p>
            <a routerLink="/app/learner/classes" class="btn btn-primary btn-sm">Accéder à mes quiz de classe</a>
          </div>
        } @else {
          <div class="packs-grid">
            @for (pack of packs(); track pack.id) {
              <div class="pack-card card">
                <div class="pack-top">
                  <span class="status-pill" [ngClass]="statusClass(pack)">{{ statusLabel(pack) }}</span>
                  <span class="pack-date">{{ pack.updatedAt | date:'dd/MM/yyyy' }}</span>
                </div>
                <h3 class="pack-title">{{ pack.quizTitle }}</h3>
                <div class="pack-meta">
                  <span>Score obtenu : <strong>{{ pack.scorePercent | number:'1.0-0' }} %</strong></span>
                  <span>{{ pack.missedCount }} notion{{ pack.missedCount > 1 ? 's' : '' }} à revoir</span>
                  @if (pack.bestPracticeScore !== null && pack.bestPracticeScore !== undefined) {
                    <span>Entraînement : <strong>{{ pack.bestPracticeScore | number:'1.0-0' }} %</strong> ({{ pack.practiceAttempts }} essai{{ pack.practiceAttempts > 1 ? 's' : '' }})</span>
                  }
                </div>

                <div class="pack-actions">
                  @if (pack.locked) {
                    <a routerLink="/tarifs" class="btn btn-outline btn-sm btn-full">
                      <app-icon name="lock" [size]="13"></app-icon>
                      <span>Débloquer avec Apprenant Plus</span>
                    </a>
                  } @else if (pack.status === 'READY') {
                    <button type="button" class="btn btn-primary btn-sm" (click)="open(pack)">
                      <app-icon name="book-open" [size]="13" color="var(--color-navy)"></app-icon>
                      <span>Revoir le cours</span>
                    </button>
                    <button type="button" class="btn btn-outline btn-sm" (click)="practice(pack)">
                      <app-icon name="play" [size]="13"></app-icon>
                      <span>S'entraîner</span>
                    </button>
                  } @else if (pack.status === 'FAILED') {
                    <p class="failure-text">{{ pack.failureReason || "L'IA n'a pas pu préparer ce parcours." }}</p>
                    <button type="button" class="btn btn-outline btn-sm btn-full" (click)="retry(pack)">
                      <app-icon name="refresh-cw" [size]="13"></app-icon>
                      <span>Relancer la préparation</span>
                    </button>
                  } @else {
                    <span class="preparing-text">
                      <span class="spinner"></span>
                      Préparation par l'IA en cours (environ 30 secondes)...
                    </span>
                  }
                </div>
              </div>
            }
          </div>
        }
      } @else {
        @if (selected(); as pack) {
          <div class="detail-view">
            <button type="button" class="btn btn-outline btn-sm btn-back" (click)="selected.set(null)">
              <app-icon name="arrow-left" [size]="13"></app-icon>
              <span>Retour au perfectionnement</span>
            </button>

            <div class="detail-head card">
              <div>
                <span class="badge badge-primary">REMISE À NIVEAU</span>
                <h1 class="h2" style="margin: 8px 0 4px 0;">{{ pack.quizTitle }}</h1>
                <p class="body-small">Score obtenu : {{ pack.scorePercent | number:'1.0-0' }} % • {{ pack.content?.chapters?.length || 0 }} chapitre(s) • {{ pack.content?.questions?.length || 0 }} question(s) d'entraînement</p>
              </div>
              <button type="button" class="btn btn-primary" (click)="practice(pack)">
                <app-icon name="play" [size]="14" color="var(--color-navy)"></app-icon>
                <span>Faire le quiz d'entraînement</span>
              </button>
            </div>

            @if (pack.missedNotions.length) {
              <div class="card notions-card">
                <h3 class="h3">Ce que vous avez manqué</h3>
                <ul>
                  @for (notion of pack.missedNotions; track $index) {
                    <li>{{ notion }}</li>
                  }
                </ul>
              </div>
            }

            @for (chapter of pack.content?.chapters || []; track chapter.order) {
              <article class="card chapter-card">
                <span class="chapter-tag">Chapitre {{ chapter.order }} • {{ chapter.estimatedMinutes }} min</span>
                <h2 class="chapter-title">{{ chapter.title }}</h2>
                @if (chapter.summary) {
                  <p class="chapter-summary">{{ chapter.summary }}</p>
                }
                <div class="chapter-body" [innerHTML]="html(chapter.content)"></div>
              </article>
            }
          </div>
        }
      }

      @if (practiceQuiz(); as quiz) {
        <app-quiz-modal-player
          [quiz]="quiz"
          [practice]="true"
          (practiceFinished)="onPracticeFinished($event)"
          (closed)="practiceQuiz.set(null)">
        </app-quiz-modal-player>
      }
    </div>
  `,
  styles: [`
    .remedial-page { display: flex; flex-direction: column; gap: 22px; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; }
    .page-header p { max-width: 760px; }
    .count-badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; font-size: 13px; font-weight: 800; }

    .upsell-card {
      display: flex; align-items: center; gap: 16px; flex-wrap: wrap;
      padding: 18px 20px; background: #FFFBEB; border: 1px solid #FCD34D;
    }
    .upsell-icon { width: 44px; height: 44px; border-radius: 12px; background: #FEF3C7; display: flex; align-items: center; justify-content: center; }
    .upsell-text { flex: 1; min-width: 240px; display: flex; flex-direction: column; gap: 4px; font-size: 13px; color: #78350F; }
    .upsell-text strong { font-size: 14.5px; color: #92400E; }

    .empty-card { padding: 36px; display: flex; flex-direction: column; align-items: center; gap: 10px; text-align: center; }
    .empty-icon { width: 56px; height: 56px; border-radius: 50%; background: rgba(16, 185, 129, 0.1); display: flex; align-items: center; justify-content: center; }

    .packs-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
    .pack-card { padding: 18px; display: flex; flex-direction: column; gap: 10px; }
    .pack-top { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
    .pack-date { font-size: 11.5px; color: var(--color-text-secondary); }
    .pack-title { font-size: 16px; font-weight: 800; color: var(--color-navy); margin: 0; }
    .pack-meta { display: flex; flex-direction: column; gap: 3px; font-size: 12.5px; color: var(--color-text-secondary); }
    .pack-actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: auto; padding-top: 6px; }
    .btn-full { width: 100%; justify-content: center; }

    .status-pill { font-size: 11px; font-weight: 800; padding: 3px 10px; border-radius: 999px; }
    .status-pill.st-ready { background: #DCFCE7; color: #166534; }
    .status-pill.st-mastered { background: #DBEAFE; color: #1E40AF; }
    .status-pill.st-preparing { background: #FEF3C7; color: #92400E; }
    .status-pill.st-failed { background: #FEE2E2; color: #991B1B; }
    .status-pill.st-locked { background: #F1F5F9; color: #475569; }

    .failure-text { font-size: 12px; color: #991B1B; margin: 0; }
    .preparing-text { display: inline-flex; align-items: center; gap: 8px; font-size: 12.5px; color: #92400E; }
    .spinner { width: 14px; height: 14px; border: 2px solid #FCD34D; border-top-color: #92400E; border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .detail-view { display: flex; flex-direction: column; gap: 16px; }
    .btn-back { align-self: flex-start; }
    .detail-head { padding: 20px; display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; }
    .notions-card { padding: 18px 20px; }
    .notions-card ul { margin: 8px 0 0 0; padding-left: 18px; font-size: 13px; color: var(--color-text-secondary); display: flex; flex-direction: column; gap: 4px; }
    .chapter-card { padding: 22px 24px; }
    .chapter-tag { font-size: 11px; font-weight: 800; color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.04em; }
    .chapter-title { font-size: 19px; font-weight: 800; color: var(--color-navy); margin: 6px 0; }
    .chapter-summary { font-size: 13.5px; color: var(--color-text-secondary); border-left: 3px solid var(--color-primary); padding-left: 10px; margin: 0 0 12px 0; }
    .chapter-body { font-size: 14px; line-height: 1.65; color: var(--color-text-primary, #0F172A); }
    .chapter-body ::ng-deep h3, .chapter-body ::ng-deep h4, .chapter-body ::ng-deep h5 { color: var(--color-navy); margin: 14px 0 6px 0; }
    .chapter-body ::ng-deep code { background: #F1F5F9; padding: 1px 5px; border-radius: 4px; font-size: 12.5px; }
    .chapter-body ::ng-deep .md-code { background: #0F172A; color: #E2E8F0; padding: 12px 14px; border-radius: 8px; overflow-x: auto; }
    .chapter-body ::ng-deep .md-code code { background: transparent; color: inherit; padding: 0; }
    .chapter-body ::ng-deep ul, .chapter-body ::ng-deep ol { padding-left: 20px; }
  `]
})
export class RemedialComponent implements OnDestroy {
  private authService = inject(AuthService);
  private remedialService = inject(RemedialService);

  packs = this.remedialService.getPacks();
  loaded = this.remedialService.isLoaded();
  plus = this.authService.hasLearnerPlus;
  selected = signal<RemedialPack | null>(null);
  practiceQuiz = signal<Quiz | null>(null);
  private practicedPackId: string | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  private preparing = computed(() => this.plus() && this.packs().some(p => p.status === 'PENDING' || p.status === 'GENERATING'));

  constructor() {
    this.refresh();
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  /** Recharge la liste ; tant qu'un parcours est en préparation, elle est relue toutes les 5 secondes. */
  private async refresh(): Promise<void> {
    await this.remedialService.loadMine();
    if (this.preparing() && !this.pollTimer) {
      this.pollTimer = setInterval(async () => {
        await this.remedialService.loadMine();
        if (!this.preparing()) this.stopPolling();
      }, 5000);
    }
  }

  private stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  statusLabel(pack: RemedialPack): string {
    if (pack.locked) return 'Apprenant Plus';
    if (pack.status === 'READY') return (pack.bestPracticeScore ?? 0) >= 70 ? 'Maîtrisé ✓' : 'Prêt';
    if (pack.status === 'FAILED') return 'À relancer';
    return 'En préparation';
  }

  statusClass(pack: RemedialPack): string {
    if (pack.locked) return 'st-locked';
    if (pack.status === 'READY') return (pack.bestPracticeScore ?? 0) >= 70 ? 'st-mastered' : 'st-ready';
    if (pack.status === 'FAILED') return 'st-failed';
    return 'st-preparing';
  }

  async open(pack: RemedialPack): Promise<void> {
    const full = await this.remedialService.getPack(pack.id);
    if (full) this.selected.set(full);
  }

  async practice(pack: RemedialPack): Promise<void> {
    const full = pack.content ? pack : await this.remedialService.getPack(pack.id);
    const questions = full?.content?.questions ?? [];
    if (!full || questions.length === 0) return;
    this.practicedPackId = full.id;
    const now = new Date().toISOString();
    this.practiceQuiz.set({
      id: 'remedial-' + full.id,
      title: 'Entraînement : ' + full.quizTitle,
      description: 'Quiz d\'entraînement de remise à niveau',
      category: 'Perfectionnement',
      difficulty: 'MEDIUM',
      status: 'PUBLISHED',
      creatorId: '',
      creatorName: 'QuizzBoard',
      shareCode: '',
      questionsCount: questions.length,
      participationsCount: 0,
      averageScorePercent: 0,
      createdAt: now,
      updatedAt: now,
      questions
    } as Quiz);
  }

  async onPracticeFinished(percentage: number): Promise<void> {
    if (!this.practicedPackId) return;
    const updated = await this.remedialService.recordPractice(this.practicedPackId, percentage);
    const current = this.selected();
    if (updated && current && current.id === updated.id) {
      this.selected.set({ ...current, ...updated });
    }
  }

  async retry(pack: RemedialPack): Promise<void> {
    await this.remedialService.regenerate(pack.id);
    await this.refresh();
  }

  html(content: string): string {
    return markdownToHtml(content);
  }
}
