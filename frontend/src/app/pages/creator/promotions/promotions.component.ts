import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PromotionService } from '../../../core/services/promotion.service';
import { ClasseService } from '../../../core/services/classe.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { Promotion, PromotionStatus } from '../../../core/models/promotion.model';
import { Classe } from '../../../core/models/classe.model';
import { IconComponent } from '../../../shared/components/icon/icon.component';

@Component({
  selector: 'app-promotions',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, IconComponent],
  template: `
    <div class="promotions-page animate-fade-in">
      
      <!-- ========================================== -->
      <!-- VUE DÉTAIL D'UNE PROMOTION (AU CLIC)       -->
      <!-- ========================================== -->
      @if (selectedPromotion) {
        <div class="promo-detail-view animate-fade-in">
          
          <!-- Top Back Bar -->
          <div class="detail-nav-bar">
            <button type="button" class="btn btn-outline btn-back" (click)="selectedPromotion = null">
              <app-icon name="arrow-left" [size]="15"></app-icon>
              <span>Retour à la liste des promotions</span>
            </button>

            <div class="detail-top-right">
              @if (selectedPromotion.id === promotionService.activePromotionId()) {
                <div class="active-pill-highlight" [class.archived]="selectedPromotion.status === 'ARCHIVED'">
                  <app-icon [name]="selectedPromotion.status === 'ARCHIVED' ? 'lock' : 'check-circle'" [size]="16"></app-icon>
                  <span>Promotion actuellement active (Contexte de travail)</span>
                </div>
              } @else {
                <button 
                  type="button" 
                  class="btn btn-primary btn-sm btn-activate"
                  (click)="setActivePromotion(selectedPromotion)">
                  <app-icon name="check" [size]="15" color="var(--color-navy)"></app-icon>
                  <span>Définir comme promotion active</span>
                </button>
              }
            </div>
          </div>

          <!-- Hero Card Promotion -->
          <div class="promo-detail-hero card">
            <div class="hero-top">
              <div class="hero-badges">
                <span class="status-pill-lg" [ngClass]="getStatusBadgeClass(selectedPromotion.status)">
                  <span class="dot-indicator"></span>
                  {{ getStatusLabel(selectedPromotion.status) }}
                </span>
                <span class="code-tag">{{ selectedPromotion.code }}</span>
                @if (selectedPromotion.id === promotionService.activePromotionId()) {
                  <span class="current-active-tag">★ CONTEXTE ACTIF</span>
                }
              </div>

              <!-- Actions selon statut -->
              <div class="hero-actions">
                @if (selectedPromotion.status === 'UPCOMING') {
                  <button 
                    type="button" 
                    class="btn btn-success btn-sm action-btn"
                    (click)="startPromotion(selectedPromotion)">
                    <app-icon name="play" [size]="13" color="#FFFFFF"></app-icon>
                    <span>Démarrer en cours</span>
                  </button>
                } @else if (selectedPromotion.status === 'IN_PROGRESS') {
                  <button 
                    type="button" 
                    class="btn btn-danger btn-sm action-btn"
                    (click)="archivePromotion(selectedPromotion)">
                    <app-icon name="archive" [size]="13" color="#FFFFFF"></app-icon>
                    <span>Archiver la promotion</span>
                  </button>
                } @else if (selectedPromotion.status === 'ARCHIVED') {
                  <span class="locked-status-tag">
                    <app-icon name="lock" [size]="13" color="#64748B"></app-icon>
                    <span>Historique verrouillé (Lecture seule)</span>
                  </span>
                }
              </div>
            </div>

            <div class="hero-main">
              <h1 class="hero-title">{{ selectedPromotion.name }}</h1>
              <div class="hero-sub-row">
                <span class="hero-year">Année académique : <strong>{{ selectedPromotion.year }}</strong></span>
                <span class="sep">•</span>
                <span class="hero-dates">Du <strong>{{ formatDate(selectedPromotion.startDate) }}</strong> au <strong>{{ formatDate(selectedPromotion.endDate) }}</strong></span>
              </div>
              @if (selectedPromotion.description) {
                <p class="hero-desc">{{ selectedPromotion.description }}</p>
              }
            </div>
          </div>

          <!-- Status Information Banner -->
          @if (selectedPromotion.status === 'ARCHIVED') {
            <div class="detail-banner banner-archived animate-fade-in">
              <div class="banner-icon-box">
                <app-icon name="lock" [size]="20" color="#475569"></app-icon>
              </div>
              <div class="banner-texts">
                <strong>Promotion Archivée (Lecture seule intégrale)</strong>
                <p>Cette promotion est clôturée et conservée pour l'historique pédagogique. Les créations, modifications, ajouts d'apprenants et sessions Live sont désactivés.</p>
              </div>
            </div>
          } @else if (selectedPromotion.status === 'UPCOMING') {
            <div class="detail-banner banner-upcoming animate-fade-in">
              <div class="banner-icon-box">
                <app-icon name="clock" [size]="20" color="#854D0E"></app-icon>
              </div>
              <div class="banner-texts">
                <strong>Promotion À Venir (Phase de préparation pédagogique)</strong>
                <p>Vous pouvez dès à présent structurer vos classes et préinscrire vos apprenants. Les évaluations et sessions Live débuteront dès le passage en cours.</p>
              </div>
            </div>
          } @else {
            <div class="detail-banner banner-in-progress animate-fade-in">
              <div class="banner-icon-box">
                <app-icon name="check-circle" [size]="20" color="#166534"></app-icon>
              </div>
              <div class="banner-texts">
                <strong>Promotion En Cours (Formation active)</strong>
                <p>Toutes les fonctionnalités de cours, quiz, passation d'épreuves et sessions Live sont pleinement actives et opérationnelles.</p>
              </div>
            </div>
          }

          <!-- Detailed Key Stats Grid -->
          <div class="detail-stats-grid">
            <div class="detail-stat-card card">
              <div class="stat-icon-wrap icon-navy">
                <app-icon name="users" [size]="20" color="var(--color-navy)"></app-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ selectedPromotion.studentsCount }}</div>
                <div class="stat-label">Apprenants inscrits</div>
              </div>
            </div>

            <div class="detail-stat-card card">
              <div class="stat-icon-wrap icon-gold">
                <app-icon name="school" [size]="20" color="#B45309"></app-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ selectedPromotion.classesCount }}</div>
                <div class="stat-label">Classes rattachées</div>
              </div>
            </div>

            <div class="detail-stat-card card">
              <div class="stat-icon-wrap icon-green">
                <app-icon name="file-text" [size]="20" color="#166534"></app-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ selectedPromotion.quizzesCount || 4 }}</div>
                <div class="stat-label">Quiz pédagogiques</div>
              </div>
            </div>

            <div class="detail-stat-card card">
              <div class="stat-icon-wrap icon-purple">
                <app-icon name="award" [size]="20" color="#6B21A8"></app-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">78.5%</div>
                <div class="stat-label">Moyenne de cohorte</div>
              </div>
            </div>
          </div>

          <!-- Classes Section for This Promotion -->
          <div class="detail-classes-section card">
            <div class="section-top">
              <div>
                <h3 class="section-title">Classes de la {{ selectedPromotion.name }}</h3>
                <p class="section-subtitle">Groupes d'étudiants rattachés à cette promotion.</p>
              </div>
              <a routerLink="/app/classes" class="btn btn-outline btn-sm">
                <span>Accéder à Mes Classes ➔</span>
              </a>
            </div>

            @if (getClassesForPromotion(selectedPromotion.id).length === 0) {
              <div class="empty-classes-notice">
                <app-icon name="school" [size]="28" color="#94A3B8"></app-icon>
                <p>Aucune classe n'est encore configurée pour cette promotion.</p>
                <a routerLink="/app/classes" class="btn btn-primary btn-xs">
                  <span>Créer une classe dans Mes Classes</span>
                </a>
              </div>
            } @else {
              <div class="classes-mini-grid">
                @for (cls of getClassesForPromotion(selectedPromotion.id); track cls.id) {
                  <div class="class-mini-card">
                    <div class="class-mini-head">
                      <span class="level-badge">{{ cls.level }}</span>
                      <span class="code-badge">{{ cls.code }}</span>
                    </div>
                    <h4 class="class-mini-name">{{ cls.name }}</h4>
                    <p class="class-mini-desc">{{ cls.description }}</p>
                    <div class="class-mini-foot">
                      <span><app-icon name="users" [size]="12"></app-icon> {{ cls.students.length }} élèves</span>
                      <span><app-icon name="file-text" [size]="12"></app-icon> {{ cls.assignedQuizIds.length }} quiz</span>
                    </div>
                  </div>
                }
              </div>
            }
          </div>

        </div>
      }

      <!-- ========================================== -->
      <!-- VUE PRINCIPALE : LISTE DES PROMOTIONS      -->
      <!-- ========================================== -->
      @if (!selectedPromotion) {
        <!-- HEADER -->
        <div class="page-header">
          <div>
            <div class="page-eyebrow">
              <app-icon name="calendar" [size]="14" color="var(--color-navy)"></app-icon>
              <span>ESPACE FORMATEUR • GESTION DES PROMOTIONS</span>
            </div>
            <h1 class="page-title">Promotions & Années Académiques</h1>
            <p class="page-subtitle">
              Activez une promotion comme contexte principal de travail, ou consultez n'importe quelle promotion historique.
            </p>
          </div>

          <button type="button" class="btn btn-primary" (click)="openCreateModal()">
            <app-icon name="plus" [size]="16" color="var(--color-navy)"></app-icon>
            <span>Créer une Promotion</span>
          </button>
        </div>

        <!-- TOP METRICS ROW -->
        <div class="metrics-grid">
          <!-- 1. CONTEXTE ACTIF DU FORMATEUR -->
          <div class="metric-card active-promo-card" [class.card-archived]="promotionService.isGlobalReadOnly()">
            <div class="metric-top">
              <span class="active-badge" [class.badge-archived]="promotionService.isGlobalReadOnly()">
                <span class="pulse-dot" [class.dot-gray]="promotionService.isGlobalReadOnly()"></span>
                {{ promotionService.isGlobalReadOnly() ? 'CONTEXTE ACTIF ARCHIVÉ' : 'CONTEXTE ACTIF ACTUEL' }}
              </span>
              <app-icon [name]="promotionService.isGlobalReadOnly() ? 'lock' : 'check-circle'" [size]="20" [color]="promotionService.isGlobalReadOnly() ? '#94A3B8' : '#16A34A'"></app-icon>
            </div>
            @if (promotionService.activePromotion(); as activeP) {
              <div class="active-promo-title">
                {{ activeP.name }}
              </div>
              <div class="active-promo-meta">
                <span>Année {{ activeP.year }}</span>
                <span>•</span>
                <span>{{ activeP.studentsCount }} apprenants</span>
                <span>•</span>
                <span>{{ activeP.classesCount }} classes</span>
              </div>
            } @else {
              <div class="active-promo-title">
                Aucune promotion
              </div>
              <div class="active-promo-meta">
                <span>Créez votre première promotion ci-dessous</span>
              </div>
            }
            <span class="active-hint">
              {{ promotionService.isGlobalReadOnly() ? '⚠️ Mode lecture seule actif sur toutes vos pages' : 'Toutes vos pages utilisent ce contexte par défaut' }}
            </span>
          </div>

          <!-- 2. TOTAL APPRENANTS -->
          <div class="metric-card">
            <div class="metric-top">
              <span class="metric-lbl">TOTAL ÉLÈVES INSCRITS</span>
              <div class="metric-icon-wrap icon-navy">
                <app-icon name="users" [size]="18" color="var(--color-navy)"></app-icon>
              </div>
            </div>
            <div class="metric-val">{{ getTotalStudents() }}</div>
            <span class="metric-sub">Répartis sur l'ensemble des promotions</span>
          </div>

          <!-- 3. COHORTES ACTIVES / PRÉPARATION -->
          <div class="metric-card">
            <div class="metric-top">
              <span class="metric-lbl">COHORTES EN ACTIVITÉ</span>
              <div class="metric-icon-wrap icon-gold">
                <app-icon name="award" [size]="18" color="#B45309"></app-icon>
              </div>
            </div>
            <div class="metric-val">{{ getActiveOrUpcomingCount() }}</div>
            <span class="metric-sub">{{ countByStatus('IN_PROGRESS') }} En cours • {{ getUpcomingCount() }} À venir</span>
          </div>

          <!-- 4. ARCHIVES HISTORIQUES -->
          <div class="metric-card">
            <div class="metric-top">
              <span class="metric-lbl">PROMOTIONS HISTORIQUES</span>
              <div class="metric-icon-wrap icon-gray">
                <app-icon name="book-open" [size]="18" color="#475569"></app-icon>
              </div>
            </div>
            <div class="metric-val">{{ countByStatus('ARCHIVED') }}</div>
            <span class="metric-sub">Archivées (Lecture seule pour historique)</span>
          </div>
        </div>

        <!-- TOOLBAR : STATUT TABS + SEARCH + VIEW TOGGLE (GRILLE 4 / LISTE) -->
        <div class="toolbar-card card">
          <div class="status-tabs">
            <button 
              type="button" 
              class="tab-btn" 
              [class.active]="selectedTab === 'ALL'"
              (click)="selectedTab = 'ALL'">
              Toutes ({{ promotions().length }})
            </button>
            <button 
              type="button" 
              class="tab-btn" 
              [class.active]="selectedTab === 'IN_PROGRESS'"
              (click)="selectedTab = 'IN_PROGRESS'">
              <span class="tab-dot dot-green"></span>
              En cours ({{ countByStatus('IN_PROGRESS') }})
            </button>
            <button 
              type="button" 
              class="tab-btn" 
              [class.active]="selectedTab === 'UPCOMING'"
              (click)="selectedTab = 'UPCOMING'">
              <span class="tab-dot dot-yellow"></span>
              À venir ({{ countByStatus('UPCOMING') }})
            </button>
            <button 
              type="button" 
              class="tab-btn" 
              [class.active]="selectedTab === 'ARCHIVED'"
              (click)="selectedTab = 'ARCHIVED'">
              <span class="tab-dot dot-gray"></span>
              Archivées ({{ countByStatus('ARCHIVED') }})
            </button>
          </div>

          <div class="toolbar-right">
            <div class="search-box">
              <app-icon name="search" [size]="15" color="#94A3B8"></app-icon>
              <input 
                type="text" 
                [(ngModel)]="searchQuery" 
                placeholder="Rechercher une promotion..." 
                class="search-input">
            </div>

            <!-- TOGGLE GRILLE / LISTE -->
            <div class="view-toggle-group">
              <button 
                type="button" 
                class="toggle-btn" 
                [class.active]="viewMode === 'grid'" 
                (click)="viewMode = 'grid'" 
                title="Affichage Grille (4 par ligne)">
                <app-icon name="grid" [size]="15"></app-icon>
              </button>
              <button 
                type="button" 
                class="toggle-btn" 
                [class.active]="viewMode === 'list'" 
                (click)="viewMode = 'list'" 
                title="Affichage Liste">
                <app-icon name="list" [size]="15"></app-icon>
              </button>
            </div>
          </div>
        </div>

        <!-- SKELETON LOADER STATE -->
        @if (promotionService.isLoading()) {
          <div class="promotions-grid-4 animate-fade-in" style="margin-bottom: 24px;">
            @for (i of [1, 2, 3, 4]; track i) {
              <div class="promo-card-compact card" style="pointer-events: none; border-color: #E2E8F0;">
                <div class="compact-head">
                  <div class="skeleton-shimmer" style="height: 18px; width: 75px; border-radius: 9999px;"></div>
                  <div class="skeleton-shimmer" style="height: 14px; width: 45px; border-radius: 4px;"></div>
                </div>
                <div class="compact-body" style="margin: 14px 0;">
                  <div class="skeleton-shimmer" style="height: 20px; width: 80%; border-radius: 4px; margin-bottom: 8px;"></div>
                  <div class="skeleton-shimmer" style="height: 14px; width: 40%; border-radius: 4px;"></div>
                </div>
                <div class="compact-foot" style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed #F1F5F9;">
                  <div class="skeleton-shimmer" style="height: 14px; width: 110px; border-radius: 4px;"></div>
                  <div class="skeleton-shimmer" style="height: 26px; width: 60px; border-radius: 6px;"></div>
                </div>
              </div>
            }
          </div>
        } @else if (promotions().length === 0) {
          <!-- INITIAL ZERO STATE WITH PRIMARY CTA -->
          <div class="empty-state card animate-fade-in" style="text-align: center; padding: 48px 24px; border: 2px dashed #CBD5E1; background: #FAFBFD;">
            <div class="empty-icon-wrap" style="width: 68px; height: 68px; margin: 0 auto 16px; border-radius: 50%; background: #EFF6FF; border: 1px solid #DBEAFE; display: flex; align-items: center; justify-content: center;">
              <app-icon name="calendar" [size]="32" color="var(--color-navy)"></app-icon>
            </div>
            <h3 style="font-size: 20px; font-weight: 800; color: var(--color-navy); margin-bottom: 8px;">Aucune promotion configurée</h3>
            <p style="color: var(--color-text-secondary); max-width: 480px; margin: 0 auto 24px; font-size: 14px; line-height: 1.6;">
              Structurez votre première cohorte annuelle ou académique afin d'y rattacher vos classes, vos apprenants et vos parcours d'évaluation.
            </p>
            <button type="button" class="btn btn-primary btn-lg" (click)="openCreateModal()" style="display: inline-flex; align-items: center; gap: 8px; margin: 0 auto; box-shadow: 0 4px 14px rgba(255,107,0,0.25);">
              <app-icon name="plus" [size]="18" color="var(--color-navy)"></app-icon>
              <span>Créer ma Première Promotion</span>
            </button>
          </div>
        } @else if (filteredPromotions().length === 0) {
          <!-- FILTER ZERO STATE -->
          <div class="empty-state card animate-fade-in" style="text-align: center; padding: 40px 24px;">
            <div class="empty-icon-wrap" style="width: 56px; height: 56px; margin: 0 auto 14px; border-radius: 50%; background: #F1F5F9; display: flex; align-items: center; justify-content: center;">
              <app-icon name="search" [size]="28" color="var(--color-navy)"></app-icon>
            </div>
            <h3 style="font-size: 18px; font-weight: 800; color: var(--color-navy); margin-bottom: 6px;">Aucune promotion trouvée</h3>
            <p style="color: var(--color-text-secondary); margin-bottom: 18px; font-size: 13px;">Ajustez votre recherche ou vos filtres pour afficher des promotions.</p>
            <button type="button" class="btn btn-primary" (click)="selectedTab = 'ALL'; searchQuery = ''">
              Réinitialiser les filtres
            </button>
          </div>
        } @else {
          <!-- AFFICHAGE MODE GRILLE : 4 PROMOS PAR LIGNE AVEC CARTES MINIMALES -->
          @if (viewMode === 'grid') {
            <div class="promotions-grid-4">
              @for (p of filteredPromotions(); track p.id) {
                <div 
                  class="promo-card-compact card card-interactive" 
                  [class.is-active-card]="p.id === promotionService.activePromotionId()"
                  (click)="openPromotionDetail(p)">
                  
                  <!-- Card Head : Statut & Badge Actif -->
                  <div class="compact-head">
                    <span class="compact-status-badge" [ngClass]="getStatusBadgeClass(p.status)">
                      <span class="status-dot"></span>
                      {{ getStatusLabel(p.status) }}
                    </span>

                    @if (p.id === promotionService.activePromotionId()) {
                      <span class="compact-active-pill" [class.archived]="p.status === 'ARCHIVED'" title="Promotion actuellement active">
                        <app-icon [name]="p.status === 'ARCHIVED' ? 'lock' : 'check'" [size]="11"></app-icon>
                        <span>Active</span>
                      </span>
                    }
                  </div>

                  <!-- Card Body : Titre épuré & Année -->
                  <div class="compact-body">
                    <h3 class="compact-name">{{ p.name }}</h3>
                    <div class="compact-year">{{ p.year }}</div>
                  </div>

                  <!-- Card Foot : Effectifs & Bouton Activer -->
                  <div class="compact-foot">
                    <div class="compact-counts">
                      <span><strong>{{ p.studentsCount }}</strong> élève{{ p.studentsCount > 1 ? 's' : '' }}</span>
                      <span class="dot-sep">•</span>
                      <span><strong>{{ p.classesCount }}</strong> classe{{ p.classesCount > 1 ? 's' : '' }}</span>
                    </div>

                    @if (p.id !== promotionService.activePromotionId()) {
                      <button 
                        type="button" 
                        class="btn-quick-activate" 
                        (click)="$event.stopPropagation(); setActivePromotion(p)" 
                        title="Définir comme promotion active">
                        Activer
                      </button>
                    }
                  </div>
                </div>
              }
            </div>
          }

          <!-- AFFICHAGE MODE LISTE : FORMAT TABLEAU ÉPURÉ -->
          @if (viewMode === 'list') {
            <div class="promotions-table-wrapper card">
              <table class="promotions-table">
                <thead>
                  <tr>
                    <th>Promotion</th>
                    <th>Année</th>
                    <th>Statut Métier</th>
                    <th>Effectif Apprenants</th>
                    <th>Classes</th>
                    <th>Contexte de travail</th>
                    <th style="text-align: right;">Action</th>
                  </tr>
                </thead>
                <tbody>
                  @for (p of filteredPromotions(); track p.id) {
                    <tr class="promo-table-row" [class.row-active]="p.id === promotionService.activePromotionId()" (click)="openPromotionDetail(p)">
                      <td>
                        <div class="table-name-cell">
                          <span class="table-promo-name">{{ p.name }}</span>
                          <span class="table-promo-code">{{ p.code }}</span>
                        </div>
                      </td>
                      <td>
                        <span class="table-year">{{ p.year }}</span>
                      </td>
                      <td>
                        <span class="compact-status-badge" [ngClass]="getStatusBadgeClass(p.status)">
                          <span class="status-dot"></span>
                          {{ getStatusLabel(p.status) }}
                        </span>
                      </td>
                      <td>
                        <span class="table-count"><strong>{{ p.studentsCount }}</strong> apprenants</span>
                      </td>
                      <td>
                        <span class="table-count"><strong>{{ p.classesCount }}</strong> classes</span>
                      </td>
                      <td>
                        @if (p.id === promotionService.activePromotionId()) {
                          <span class="table-active-badge" [class.archived]="p.status === 'ARCHIVED'">
                            <app-icon [name]="p.status === 'ARCHIVED' ? 'lock' : 'check'" [size]="12"></app-icon>
                            <span>Active</span>
                          </span>
                        } @else {
                          <button 
                            type="button" 
                            class="btn-table-activate" 
                            (click)="$event.stopPropagation(); setActivePromotion(p)">
                            Définir active
                          </button>
                        }
                      </td>
                      <td style="text-align: right;">
                        <button type="button" class="btn btn-outline btn-xs" (click)="$event.stopPropagation(); openPromotionDetail(p)">
                          <span>Détails ➔</span>
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        }
      }

      <!-- ========================================== -->
      <!-- MODALE DE CRÉATION DE PROMOTION            -->
      <!-- ========================================== -->
      @if (showCreateModal) {
        <div class="modal-backdrop animate-fade-in" (click)="showCreateModal = false">
          <div class="modal-card card animate-scale-up" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div class="modal-title-wrap">
                <app-icon name="calendar" [size]="20" color="var(--color-navy)"></app-icon>
                <h2>Créer une Nouvelle Promotion</h2>
              </div>
              <button type="button" class="btn-close" (click)="showCreateModal = false">
                <app-icon name="x" [size]="18"></app-icon>
              </button>
            </div>

            <form (ngSubmit)="submitCreatePromotion()" class="modal-form">
              <div class="modal-body">
                <div class="form-row-2">
                  <div class="form-group">
                    <label>Nom de la Promotion *</label>
                    <input 
                      type="text" 
                      [(ngModel)]="newPromoName" 
                      name="newPromoName"
                      [class.input-error]="fieldErrors['name']"
                      (input)="clearFieldError('name')"
                      required 
                      placeholder="ex: Promotion 9" 
                      class="form-input">
                    @if (fieldErrors['name']) {
                      <span class="field-error-msg animate-fade-in">
                        <app-icon name="alert-circle" [size]="12" color="#DC2626"></app-icon>
                        <span>{{ fieldErrors['name'] }}</span>
                      </span>
                    }
                  </div>
                  <div class="form-group">
                    <label>Année Académique *</label>
                    <input 
                      type="text" 
                      [(ngModel)]="newPromoYear" 
                      name="newPromoYear"
                      [class.input-error]="fieldErrors['year']"
                      (input)="clearFieldError('year')"
                      required 
                      placeholder="ex: 2027 - 2028" 
                      class="form-input">
                    @if (fieldErrors['year']) {
                      <span class="field-error-msg animate-fade-in">
                        <app-icon name="alert-circle" [size]="12" color="#DC2626"></app-icon>
                        <span>{{ fieldErrors['year'] }}</span>
                      </span>
                    }
                  </div>
                </div>

                <div class="form-row-2">
                  <div class="form-group">
                    <label>Date de Début *</label>
                    <input 
                      type="date" 
                      [(ngModel)]="newPromoStartDate" 
                      name="newPromoStartDate"
                      [class.input-error]="fieldErrors['startDate']"
                      (input)="clearFieldError('startDate')"
                      required 
                      class="form-input">
                    @if (fieldErrors['startDate']) {
                      <span class="field-error-msg animate-fade-in">
                        <app-icon name="alert-circle" [size]="12" color="#DC2626"></app-icon>
                        <span>{{ fieldErrors['startDate'] }}</span>
                      </span>
                    }
                  </div>
                  <div class="form-group">
                    <label>Date de Fin *</label>
                    <input 
                      type="date" 
                      [(ngModel)]="newPromoEndDate" 
                      name="newPromoEndDate"
                      [class.input-error]="fieldErrors['endDate']"
                      (input)="clearFieldError('endDate')"
                      required 
                      class="form-input">
                    @if (fieldErrors['endDate']) {
                      <span class="field-error-msg animate-fade-in">
                        <app-icon name="alert-circle" [size]="12" color="#DC2626"></app-icon>
                        <span>{{ fieldErrors['endDate'] }}</span>
                      </span>
                    }
                  </div>
                </div>

                <div class="form-group">
                  <label>Statut Métier Initial *</label>
                  <select [(ngModel)]="newPromoStatus" name="newPromoStatus" class="form-input">
                    <option value="UPCOMING">🟡 À VENIR (Phase de préparation — Recommandé)</option>
                    <option value="IN_PROGRESS">🟢 EN COURS (Formation active)</option>
                  </select>
                  @if (newPromoStatus === 'IN_PROGRESS' && promotionService.getInProgressPromotion()) {
                    <div class="single-promo-warning animate-fade-in">
                      <app-icon name="lock" [size]="13" color="#B45309"></app-icon>
                      <span><strong>Règle d'unicité :</strong> Une seule promotion peut être en cours. La « <strong>{{ promotionService.getInProgressPromotion()?.name }}</strong> » sera automatiquement archivée.</span>
                    </div>
                  }
                </div>

                <div class="form-group">
                  <label>Description & Notes pédagogiques</label>
                  <textarea 
                    [(ngModel)]="newPromoDesc" 
                    name="newPromoDesc"
                    rows="2" 
                    placeholder="Objectifs, filières concernées, contexte..." 
                    class="form-textarea">
                  </textarea>
                </div>

                <div class="checkbox-option">
                  <label class="check-label">
                    <input type="checkbox" [(ngModel)]="setImmediatelyActive" name="setImmediatelyActive">
                    <span><strong>Définir immédiatement comme promotion active</strong> (mettra à jour votre Header et le contexte par défaut de vos pages)</span>
                  </label>
                </div>
              </div>

              <div class="modal-actions">
                <button type="button" class="btn btn-outline" (click)="showCreateModal = false">
                  Annuler
                </button>
                <button type="submit" class="btn btn-primary" [class.is-loading]="isCreating" [disabled]="isCreating || !newPromoName.trim() || !newPromoYear.trim()">
                  @if (isCreating) {
                    <span class="btn-spinner spinner-sm"></span>
                    <span>Création...</span>
                  } @else {
                    <app-icon name="check" [size]="16" color="var(--color-navy)"></app-icon>
                    <span>Créer la Promotion</span>
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      }

    </div>
  `,
  styles: [`
    .promotions-page {
      display: flex;
      flex-direction: column;
      gap: 20px;
      padding-bottom: 40px;
    }

    /* PAGE HEADER */
    .page-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 20px;
      flex-wrap: wrap;

      .page-eyebrow {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.06em;
        color: var(--color-navy);
        text-transform: uppercase;
        margin-bottom: 4px;
      }

      .page-title {
        font-size: 24px;
        font-weight: 800;
        color: var(--color-navy);
        margin: 0 0 6px 0;
      }

      .page-subtitle {
        font-size: 13.5px;
        color: var(--color-text-secondary);
        margin: 0;
        max-width: 780px;
        line-height: 1.5;
      }
    }

    /* TOP METRICS */
    .metrics-grid {
      display: grid;
      grid-template-columns: 1.4fr 1fr 1fr 1fr;
      gap: 16px;

      @media (max-width: 1024px) {
        grid-template-columns: 1fr 1fr;
      }

      @media (max-width: 640px) {
        grid-template-columns: 1fr;
      }

      .metric-card {
        background: #FFFFFF;
        border-radius: var(--radius-lg);
        border: 1px solid var(--color-border);
        padding: 18px 20px;
        display: flex;
        flex-direction: column;
        gap: 6px;
        box-shadow: var(--shadow-sm);

        .metric-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;

          .metric-lbl {
            font-size: 11px;
            font-weight: 800;
            color: var(--color-text-secondary);
            letter-spacing: 0.04em;
            text-transform: uppercase;
          }

          .metric-icon-wrap {
            width: 32px;
            height: 32px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;

            &.icon-navy { background: #EEF2F6; }
            &.icon-gold { background: #FEF3C7; }
            &.icon-gray { background: #F1F5F9; }
          }
        }

        .metric-val {
          font-size: 26px;
          font-weight: 800;
          color: var(--color-navy);
          line-height: 1.1;
        }

        .metric-sub {
          font-size: 11.5px;
          color: var(--color-text-secondary);
        }

        &.active-promo-card {
          background: linear-gradient(135deg, #032447 0%, #0F3560 100%);
          color: #FFFFFF;
          border-color: #032447;

          .active-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            font-size: 10px;
            font-weight: 800;
            letter-spacing: 0.05em;
            background: rgba(22, 163, 74, 0.25);
            color: #4ADE80;
            padding: 3px 8px;
            border-radius: var(--radius-full);

            .pulse-dot {
              width: 6px;
              height: 6px;
              border-radius: 50%;
              background: #4ADE80;
              box-shadow: 0 0 0 2px rgba(74, 222, 128, 0.3);
              animation: pulse 1.8s infinite;

              &.dot-gray {
                background: #94A3B8;
                box-shadow: none;
                animation: none;
              }
            }

            &.badge-archived {
              background: rgba(148, 163, 184, 0.2);
              color: #CBD5E1;
            }
          }

          .active-promo-title {
            font-size: 18px;
            font-weight: 800;
            color: #FFFFFF;
          }

          .active-promo-meta {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 12px;
            color: rgba(255, 255, 255, 0.8);
          }

          .active-hint {
            font-size: 11px;
            color: rgba(255, 255, 255, 0.6);
            margin-top: auto;
          }

          &.card-archived {
            background: linear-gradient(135deg, #334155 0%, #1E293B 100%);
            border-color: #475569;
          }
        }
      }
    }

    /* TOOLBAR */
    .toolbar-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 10px 16px;
      flex-wrap: wrap;

      .status-tabs {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;

        .tab-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: var(--radius-full);
          border: 1px solid transparent;
          background: transparent;
          font-size: 12.5px;
          font-weight: 600;
          color: var(--color-text-secondary);
          cursor: pointer;
          transition: all 0.15s ease;

          &:hover {
            background: #F1F5F9;
            color: var(--color-navy);
          }

          &.active {
            background: var(--color-navy);
            color: #FFFFFF;
            font-weight: 700;
          }

          .tab-dot {
            width: 7px;
            height: 7px;
            border-radius: 50%;
            &.dot-green { background: #16A34A; }
            &.dot-yellow { background: #EAB308; }
            &.dot-gray { background: #64748B; }
          }
        }
      }

      .toolbar-right {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-left: auto;

        .search-box {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #F8FAFC;
          border: 1.5px solid var(--color-border);
          border-radius: var(--radius-full);
          padding: 6px 14px;
          min-width: 240px;

          .search-input {
            border: none;
            background: transparent;
            font-size: 12.5px;
            font-family: inherit;
            outline: none;
            width: 100%;
          }
        }

        .view-toggle-group {
          display: flex;
          background: #F1F5F9;
          padding: 3px;
          border-radius: var(--radius-sm);
          gap: 2px;

          .toggle-btn {
            border: none;
            background: transparent;
            padding: 5px 8px;
            border-radius: 4px;
            cursor: pointer;
            color: #64748B;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.15s ease;

            &.active {
              background: #FFFFFF;
              color: var(--color-navy);
              box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
            }
          }
        }
      }
    }

    /* ======================================================== */
    /* GRILLE DE 4 PROMOS PAR LIGNE (CARTES COMPACTES & ÉPURÉES)*/
    /* ======================================================== */
    .promotions-grid-4 {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 16px;

      @media (max-width: 1280px) {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }

      @media (max-width: 900px) {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      @media (max-width: 580px) {
        grid-template-columns: 1fr;
      }

      .promo-card-compact {
        background: #FFFFFF;
        border-radius: var(--radius-lg);
        border: 1px solid var(--color-border);
        padding: 16px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        gap: 12px;
        cursor: pointer;
        box-shadow: var(--shadow-sm);
        transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
        position: relative;

        &:hover {
          transform: translateY(-2px);
          border-color: #CBD5E1;
          box-shadow: var(--shadow-md);
        }

        &.is-active-card {
          border-color: #86EFAC;
          background: #FFFFFF;
          box-shadow: 0 2px 6px rgba(22, 163, 74, 0.08);
        }

        .compact-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 6px;

          .compact-status-badge {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            font-size: 11px;
            font-weight: 700;
            padding: 3px 8px;
            border-radius: var(--radius-full);

            .status-dot {
              width: 6px;
              height: 6px;
              border-radius: 50%;
            }

            &.badge-in-progress {
              background: #DCFCE7;
              color: #15803D;
              .status-dot { background: #16A34A; }
            }

            &.badge-upcoming {
              background: #FEF08A;
              color: #854D0E;
              .status-dot { background: #CA8A04; }
            }

            &.badge-archived {
              background: #F1F5F9;
              color: #475569;
              .status-dot { background: #64748B; }
            }
          }

          .compact-active-pill {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            font-size: 10.5px;
            font-weight: 800;
            color: #15803D;
            background: #DCFCE7;
            padding: 2px 7px;
            border-radius: var(--radius-full);

            &.archived {
              color: #475569;
              background: #E2E8F0;
            }
          }
        }

        .compact-body {
          .compact-name {
            font-size: 16px;
            font-weight: 800;
            color: var(--color-navy);
            margin: 0 0 3px 0;
            line-height: 1.25;
          }

          .compact-year {
            font-size: 12px;
            font-weight: 600;
            color: var(--color-text-secondary);
          }
        }

        .compact-foot {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 6px;
          padding-top: 10px;
          border-top: 1px solid #F1F5F9;

          .compact-counts {
            font-size: 11.5px;
            color: var(--color-text-secondary);
            display: flex;
            align-items: center;
            gap: 4px;

            strong {
              color: var(--color-navy);
              font-weight: 700;
            }

            .dot-sep {
              color: #CBD5E1;
            }
          }

          .btn-quick-activate {
            font-size: 11px;
            font-weight: 700;
            color: var(--color-navy);
            background: #FEF3C7;
            border: 1px solid #FDE047;
            border-radius: var(--radius-full);
            padding: 3px 9px;
            cursor: pointer;
            transition: all 0.15s ease;

            &:hover {
              background: #FCD34D;
              transform: scale(1.04);
            }
          }
        }
      }
    }

    /* ======================================================== */
    /* AFFICHAGE FORMAT LISTE (TABLE ÉPURÉE)                    */
    /* ======================================================== */
    .promotions-table-wrapper {
      padding: 0;
      overflow-x: auto;

      .promotions-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 13px;

        th {
          text-align: left;
          padding: 12px 16px;
          font-size: 11px;
          font-weight: 800;
          color: var(--color-text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.04em;
          border-bottom: 1.5px solid var(--color-border);
          background: #F8FAFC;
        }

        td {
          padding: 12px 16px;
          border-bottom: 1px solid #F1F5F9;
          vertical-align: middle;
        }

        .promo-table-row {
          cursor: pointer;
          transition: background 0.15s ease;

          &:hover {
            background: #F8FAFC;
          }

          &.row-active {
            background: #F0FDF4;
          }

          .table-name-cell {
            display: flex;
            flex-direction: column;

            .table-promo-name {
              font-weight: 800;
              color: var(--color-navy);
            }

            .table-promo-code {
              font-size: 11px;
              color: var(--color-text-secondary);
            }
          }

          .table-year {
            font-weight: 600;
            color: var(--color-navy);
          }

          .table-count {
            font-size: 12.5px;
            color: var(--color-text-secondary);
            strong {
              color: var(--color-navy);
            }
          }

          .table-active-badge {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            font-size: 11px;
            font-weight: 800;
            color: #15803D;
            background: #DCFCE7;
            padding: 3px 8px;
            border-radius: var(--radius-full);

            &.archived {
              color: #475569;
              background: #E2E8F0;
            }
          }

          .btn-table-activate {
            font-size: 11px;
            font-weight: 700;
            color: var(--color-navy);
            background: #FEF3C7;
            border: 1px solid #FDE047;
            border-radius: var(--radius-full);
            padding: 3px 9px;
            cursor: pointer;
            transition: all 0.15s ease;

            &:hover {
              background: #FCD34D;
            }
          }
        }
      }
    }

    /* ======================================================== */
    /* VUE DÉTAIL D'UNE PROMOTION (FOCUS VIEW)                  */
    /* ======================================================== */
    .promo-detail-view {
      display: flex;
      flex-direction: column;
      gap: 16px;

      .detail-nav-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        flex-wrap: wrap;

        .btn-back {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-weight: 700;
        }

        .active-pill-highlight {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #DCFCE7;
          border: 1px solid #86EFAC;
          color: #15803D;
          padding: 6px 14px;
          border-radius: var(--radius-full);
          font-size: 12px;
          font-weight: 800;

          &.archived {
            background: #F1F5F9;
            border-color: #CBD5E1;
            color: #475569;
          }
        }

        .btn-activate {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-weight: 700;
        }
      }

      .promo-detail-hero {
        padding: 24px;
        display: flex;
        flex-direction: column;
        gap: 16px;

        .hero-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;

          .hero-badges {
            display: flex;
            align-items: center;
            gap: 8px;

            .status-pill-lg {
              display: inline-flex;
              align-items: center;
              gap: 6px;
              font-size: 12px;
              font-weight: 800;
              padding: 4px 10px;
              border-radius: var(--radius-full);

              .dot-indicator {
                width: 7px;
                height: 7px;
                border-radius: 50%;
              }

              &.badge-in-progress {
                background: #DCFCE7;
                color: #15803D;
                .dot-indicator { background: #16A34A; }
              }

              &.badge-upcoming {
                background: #FEF08A;
                color: #854D0E;
                .dot-indicator { background: #CA8A04; }
              }

              &.badge-archived {
                background: #F1F5F9;
                color: #475569;
                .dot-indicator { background: #64748B; }
              }
            }

            .code-tag {
              font-size: 11px;
              font-weight: 700;
              color: var(--color-navy);
              background: #EEF2F6;
              padding: 4px 8px;
              border-radius: var(--radius-xs);
            }

            .current-active-tag {
              font-size: 11px;
              font-weight: 800;
              color: #B45309;
              background: #FEF3C7;
              border: 1px solid #FDE047;
              padding: 4px 8px;
              border-radius: var(--radius-xs);
            }
          }

          .hero-actions {
            .action-btn {
              display: inline-flex;
              align-items: center;
              gap: 6px;
              font-weight: 700;
            }

            .locked-status-tag {
              display: inline-flex;
              align-items: center;
              gap: 6px;
              font-size: 12px;
              font-weight: 700;
              color: #475569;
              background: #F1F5F9;
              padding: 5px 12px;
              border-radius: var(--radius-full);
              border: 1px solid #CBD5E1;
            }
          }
        }

        .hero-main {
          .hero-title {
            font-size: 26px;
            font-weight: 800;
            color: var(--color-navy);
            margin: 0 0 6px 0;
          }

          .hero-sub-row {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 13.5px;
            color: var(--color-text-secondary);
            flex-wrap: wrap;

            .sep { color: #CBD5E1; }
          }

          .hero-desc {
            font-size: 14px;
            color: var(--color-text-secondary);
            margin: 10px 0 0 0;
            line-height: 1.5;
            max-width: 800px;
          }
        }
      }

      .detail-banner {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 14px 18px;
        border-radius: var(--radius-md);
        border: 1.5px solid transparent;

        .banner-icon-box {
          margin-top: 2px;
        }

        .banner-texts {
          strong {
            font-size: 13px;
            display: block;
            margin-bottom: 2px;
          }
          p {
            font-size: 12.5px;
            margin: 0;
            line-height: 1.45;
          }
        }

        &.banner-archived {
          background: #F8FAFC;
          border-color: #CBD5E1;
          color: #334155;
        }

        &.banner-upcoming {
          background: #FEFCE8;
          border-color: #FDE047;
          color: #854D0E;
        }

        &.banner-in-progress {
          background: #F0FDF4;
          border-color: #BBF7D0;
          color: #166534;
        }
      }

      .detail-stats-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 16px;

        @media (max-width: 900px) {
          grid-template-columns: repeat(2, 1fr);
        }

        .detail-stat-card {
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 14px;

          .stat-icon-wrap {
            width: 44px;
            height: 44px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;

            &.icon-navy { background: #EEF2F6; }
            &.icon-gold { background: #FEF3C7; }
            &.icon-green { background: #DCFCE7; }
            &.icon-purple { background: #F3E8FF; }
          }

          .stat-info {
            .stat-value {
              font-size: 22px;
              font-weight: 800;
              color: var(--color-navy);
              line-height: 1.1;
            }
            .stat-label {
              font-size: 12px;
              color: var(--color-text-secondary);
              font-weight: 600;
            }
          }
        }
      }

      .detail-classes-section {
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 16px;

        .section-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;

          .section-title {
            font-size: 16px;
            font-weight: 800;
            color: var(--color-navy);
            margin: 0;
          }

          .section-subtitle {
            font-size: 12.5px;
            color: var(--color-text-secondary);
            margin: 3px 0 0 0;
          }
        }

        .empty-classes-notice {
          padding: 30px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          color: var(--color-text-secondary);
          font-size: 13px;
        }

        .classes-mini-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;

          @media (max-width: 900px) {
            grid-template-columns: 1fr;
          }

          .class-mini-card {
            background: #F8FAFC;
            border: 1px solid var(--color-border);
            border-radius: var(--radius-sm);
            padding: 14px;
            display: flex;
            flex-direction: column;
            gap: 8px;

            .class-mini-head {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 8px;

              .level-badge {
                font-size: 10.5px;
                font-weight: 700;
                color: var(--color-navy);
                background: #FFFFFF;
                border: 1px solid var(--color-border);
                padding: 2px 6px;
                border-radius: 4px;
              }

              .code-badge {
                font-size: 10.5px;
                color: var(--color-text-secondary);
              }
            }

            .class-mini-name {
              font-size: 14px;
              font-weight: 800;
              color: var(--color-navy);
              margin: 0;
            }

            .class-mini-desc {
              font-size: 12px;
              color: var(--color-text-secondary);
              margin: 0;
              line-height: 1.4;
            }

            .class-mini-foot {
              display: flex;
              align-items: center;
              justify-content: space-between;
              font-size: 11px;
              color: var(--color-text-secondary);
              margin-top: auto;
              padding-top: 6px;
              border-top: 1px solid rgba(0, 0, 0, 0.05);

              span {
                display: inline-flex;
                align-items: center;
                gap: 4px;
              }
            }
          }
        }
      }
    }

    /* EMPTY STATE */
    .empty-state {
      padding: 40px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;

      .empty-icon-wrap {
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: #F1F5F9;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      h3 {
        font-size: 18px;
        font-weight: 800;
        color: var(--color-navy);
        margin: 0;
      }

      p {
        font-size: 13.5px;
        color: var(--color-text-secondary);
        margin: 0;
      }
    }

    /* MODAL DE CRÉATION */
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(3, 36, 71, 0.55);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1050;
      padding: 20px;
    }

    .modal-card {
      width: 100%;
      max-width: 520px;
      background: #FFFFFF;
      border-radius: var(--radius-md);
      box-shadow: 0 20px 40px -15px rgba(3, 36, 71, 0.35);
      overflow: hidden;

      .modal-header {
        padding: 16px 20px;
        border-bottom: 1px solid var(--color-border);
        display: flex;
        align-items: center;
        justify-content: space-between;

        .modal-title-wrap {
          display: flex;
          align-items: center;
          gap: 10px;

          h2 {
            font-size: 16px;
            font-weight: 800;
            color: var(--color-navy);
            margin: 0;
          }
        }

        .btn-close {
          background: transparent;
          border: none;
          cursor: pointer;
          color: var(--color-text-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px;
          border-radius: 4px;
          &:hover {
            background: #F1F5F9;
            color: var(--color-navy);
          }
        }
      }

      .modal-form {
        .modal-body {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 14px;

          .form-row-2 {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
          }

          .form-group {
            display: flex;
            flex-direction: column;
            gap: 6px;

            label {
              font-size: 11.5px;
              font-weight: 700;
              color: var(--color-navy);
            }

            .form-input, .form-textarea {
              padding: 8px 12px;
              border: 1.5px solid var(--color-border);
              border-radius: var(--radius-sm);
              font-size: 13px;
              background: #F8FAFC;
              font-family: inherit;
              outline: none;
              transition: border-color 0.15s ease, background 0.15s ease;
              &:focus {
                border-color: var(--color-navy);
                background: #FFFFFF;
              }
            }

            .single-promo-warning {
              display: flex;
              align-items: center;
              gap: 8px;
              margin-top: 6px;
              font-size: 11.5px;
              color: #B45309;
              background: #FEFCE8;
              padding: 6px 10px;
              border-radius: var(--radius-xs);
              border: 1px solid #FDE047;
              line-height: 1.4;
            }
          }

          .checkbox-option {
            background: #F8FAFC;
            border: 1px solid var(--color-border);
            border-radius: var(--radius-sm);
            padding: 8px 12px;

            .check-label {
              display: flex;
              align-items: flex-start;
              gap: 8px;
              font-size: 11.5px;
              color: var(--color-navy);
              cursor: pointer;

              input {
                margin-top: 2px;
              }
            }
          }
        }

        .modal-actions {
          padding: 14px 20px;
          background: #F8FAFC;
          border-top: 1px solid var(--color-border);
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
        }
      }
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
export class PromotionsComponent {
  public promotionService = inject(PromotionService);
  public classService = inject(ClasseService);
  public confirmService = inject(ConfirmDialogService);

  promotions = this.promotionService.promotions;

  // View state: Grille (4 par ligne) ou Liste
  viewMode: 'grid' | 'list' = 'grid';

  // Promotion sélectionnée pour affichage de la page de détail (Focus view)
  selectedPromotion: Promotion | null = null;

  selectedTab: 'ALL' | 'IN_PROGRESS' | 'UPCOMING' | 'ARCHIVED' = 'ALL';
  searchQuery: string = '';

  // Modal Création State
  showCreateModal = false;
  isCreating = false;
  newPromoName = '';
  newPromoYear = '';
  newPromoStartDate = '';
  newPromoEndDate = '';
  newPromoStatus: PromotionStatus = 'UPCOMING';
  newPromoDesc = '';
  setImmediatelyActive = false;

  filteredPromotions(): Promotion[] {
    let list = this.promotions();

    if (this.selectedTab !== 'ALL') {
      list = list.filter(p => p.status === this.selectedTab);
    }

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.year.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q))
      );
    }

    return list;
  }

  openPromotionDetail(p: Promotion): void {
    this.selectedPromotion = p;
  }

  getClassesForPromotion(promotionId: string): Classe[] {
    return this.classService.getClasses()().filter((c: Classe) => c.promotionId === promotionId);
  }

  countByStatus(status: PromotionStatus): number {
    return this.promotions().filter(p => p.status === status).length;
  }

  getUpcomingCount(): number {
    return this.countByStatus('UPCOMING');
  }

  getActiveOrUpcomingCount(): number {
    return this.countByStatus('IN_PROGRESS') + this.countByStatus('UPCOMING');
  }

  getTotalStudents(): number {
    return this.promotions().reduce((acc, p) => acc + (p.studentsCount || 0), 0);
  }

  getStatusBadgeClass(status: PromotionStatus): string {
    switch (status) {
      case 'IN_PROGRESS': return 'badge-in-progress';
      case 'UPCOMING': return 'badge-upcoming';
      case 'ARCHIVED': return 'badge-archived';
      default: return 'badge-archived';
    }
  }

  getStatusLabel(status: PromotionStatus): string {
    switch (status) {
      case 'IN_PROGRESS': return 'En cours';
      case 'UPCOMING': return 'À venir';
      case 'ARCHIVED': return 'Archivée';
      default: return status;
    }
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '--';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  }

  /**
   * Définit une promotion comme contexte actif principal (qu'elle soit Archivée, En cours, ou À venir)
   * Si archivée, informe l'utilisateur que tout l'espace Formateur passe en lecture seule.
   */
  async setActivePromotion(p: Promotion): Promise<void> {
    if (p.id === this.promotionService.activePromotionId()) return;

    if (p.status === 'ARCHIVED') {
      const ok = await this.confirmService.confirm({
        title: 'Activer une promotion archivée',
        message: `Vous êtes sur le point d'activer la « ${p.name} » comme contexte de travail actif.\n\nToutes les pages (classes, dashboard, etc.) afficheront les données de cette promotion, et l'ensemble de votre espace Formateur passera en LECTURE SEULE pour consulter son historique.\n\nSouhaitez-vous continuer ?`,
        confirmText: 'Activer en lecture seule',
        cancelText: 'Annuler',
        variant: 'warning',
        icon: 'lock'
      });
      if (!ok) return;
    } else if (p.status === 'UPCOMING') {
      const ok = await this.confirmService.confirm({
        title: 'Activer une promotion en préparation',
        message: `Vous définissez la « ${p.name} » (à venir) comme contexte actif.\n\nVous pourrez préparer les classes et préinscrire les apprenants. Les évaluations et Live seront disponibles dès le démarrage en cours.`,
        confirmText: 'Définir comme active',
        cancelText: 'Annuler',
        variant: 'primary',
        icon: 'calendar'
      });
      if (!ok) return;
    }

    this.promotionService.setActivePromotion(p.id);
  }

  /**
   * Démarre une promotion en phase de préparation pour la passer au statut EN COURS.
   * RÈGLE D'UNICITÉ : Une seule promotion peut être En cours à la fois.
   */
  async startPromotion(p: Promotion): Promise<void> {
    const currentInProgress = this.promotionService.getInProgressPromotion();

    if (currentInProgress && currentInProgress.id !== p.id) {
      const ok = await this.confirmService.confirm({
        title: 'Basculement vers la nouvelle promotion',
        message: `La « ${currentInProgress.name} » est actuellement EN COURS.\n\nIl ne peut y avoir qu'UNE SEULE promotion en cours à la fois. Démarrer la « ${p.name} » va automatiquement ARCHIVER la « ${currentInProgress.name} » (passage en lecture seule) et définir la « ${p.name} » comme votre nouvelle promotion active.\n\nSouhaitez-vous continuer ce basculement ?`,
        confirmText: 'Démarrer et archiver l\'ancienne',
        cancelText: 'Annuler',
        variant: 'warning',
        icon: 'play'
      });
      if (!ok) return;
    } else {
      const ok = await this.confirmService.confirm({
        title: 'Démarrer la formation',
        message: `Voulez-vous démarrer la « ${p.name} » ?\n\nLa cohorte passera au statut EN COURS. Les évaluations, présences et sessions Live seront immédiatement débloquées.`,
        confirmText: 'Démarrer la formation',
        cancelText: 'Annuler',
        variant: 'success',
        icon: 'play'
      });
      if (!ok) return;
    }

    this.promotionService.changePromotionStatus(p.id, 'IN_PROGRESS');
  }

  /**
   * Archive une promotion terminée (verrouillage en lecture seule)
   */
  async archivePromotion(p: Promotion): Promise<void> {
    const isCurrentlyActive = p.id === this.promotionService.activePromotionId();
    const msg = isCurrentlyActive
      ? `Voulez-vous archiver la « ${p.name} » ?\n\nATTENTION : Une promotion archivée passe définitivement en LECTURE SEULE (aucune modification ni changement de statut possible).\n\nComme cette promotion est actuellement votre contexte actif, votre espace Formateur passera en mode consultation historique.`
      : `Voulez-vous archiver la « ${p.name} » ?\n\nATTENTION : Une promotion archivée passe définitivement en LECTURE SEULE (aucune modification ni changement de statut possible). Ses données restent consultables dans l'historique.`;

    const ok = await this.confirmService.confirm({
      title: 'Archiver la promotion',
      message: msg,
      confirmText: 'Archiver définitivement',
      cancelText: 'Annuler',
      variant: 'danger',
      icon: 'archive'
    });
    if (!ok) return;

    this.promotionService.archivePromotion(p.id);
  }

  fieldErrors: Record<string, string> = {};

  clearFieldError(field: string): void {
    if (this.fieldErrors[field]) {
      delete this.fieldErrors[field];
    }
  }

  openCreateModal(): void {
    this.fieldErrors = {};
    const nextNum = this.promotions().length + 6;
    this.newPromoName = `Promotion ${nextNum}`;
    this.newPromoYear = '2027 - 2028';
    this.newPromoStartDate = '2027-09-01';
    this.newPromoEndDate = '2028-06-30';
    this.newPromoStatus = 'UPCOMING';
    this.newPromoDesc = '';
    this.setImmediatelyActive = false;
    this.showCreateModal = true;
  }

  async submitCreatePromotion(): Promise<void> {
    this.fieldErrors = {};
    if (!this.newPromoName.trim()) {
      this.fieldErrors['name'] = 'Le nom de la promotion est obligatoire (ex: Promotion 9).';
    }
    if (!this.newPromoYear.trim()) {
      this.fieldErrors['year'] = 'L\'année académique est obligatoire (ex: 2027 - 2028).';
    }
    if (!this.newPromoStartDate) {
      this.fieldErrors['startDate'] = 'La date de début est obligatoire.';
    }
    if (!this.newPromoEndDate) {
      this.fieldErrors['endDate'] = 'La date de fin est obligatoire.';
    } else if (this.newPromoStartDate && this.newPromoEndDate < this.newPromoStartDate) {
      this.fieldErrors['endDate'] = 'La date de fin doit être postérieure à la date de début.';
    }

    if (Object.keys(this.fieldErrors).length > 0) return;

    if (this.newPromoStatus === 'IN_PROGRESS') {
      const currentInProgress = this.promotionService.getInProgressPromotion();
      if (currentInProgress) {
        const ok = await this.confirmService.confirm({
          title: 'Création en statut En cours',
          message: `La « ${currentInProgress.name} » est actuellement EN COURS.\n\nUne seule promotion peut être en cours à la fois. Créer la « ${this.newPromoName.trim()} » en statut EN COURS va automatiquement ARCHIVER la « ${currentInProgress.name} ».\n\nConfirmez-vous la création et ce basculement ?`,
          confirmText: 'Créer et archiver l\'ancienne',
          cancelText: 'Annuler',
          variant: 'warning',
          icon: 'plus'
        });
        if (!ok) return;
      }
    }

    this.isCreating = true;
    setTimeout(() => {
      this.isCreating = false;
      const created = this.promotionService.createPromotion({
        name: this.newPromoName.trim(),
        year: this.newPromoYear.trim(),
        startDate: this.newPromoStartDate || '2027-09-01',
        endDate: this.newPromoEndDate || '2028-06-30',
        status: this.newPromoStatus,
        description: this.newPromoDesc.trim() || undefined,
        setAsActive: this.newPromoStatus === 'IN_PROGRESS' || this.setImmediatelyActive
      });

      this.showCreateModal = false;
      this.selectedPromotion = created;
    }, 450);
  }
}
