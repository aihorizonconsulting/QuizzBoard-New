import { Component, inject } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { filter } from 'rxjs/operators';
import { SidebarComponent } from '../../shared/components/sidebar/sidebar.component';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { PromotionService } from '../../core/services/promotion.service';
import { AppNotification } from '../../core/models/notification.model';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { ConfirmModalComponent } from '../../shared/components/confirm-modal/confirm-modal.component';

@Component({
  selector: 'app-app-layout',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterOutlet, SidebarComponent, IconComponent, ConfirmModalComponent],
  template: `
    <div class="app-container">
      <!-- Fixed / Mobile Drawer Sidebar -->
      <app-sidebar 
        [isMobileOpen]="isMobileSidebarOpen" 
        (closeMobile)="isMobileSidebarOpen = false">
      </app-sidebar>

      <!-- Main Body Area -->
      <div class="app-main">
        <!-- Top App Bar -->
        <header class="app-topbar">
          <div class="topbar-left">
            <!-- Mobile Hamburger Toggle -->
            <button class="mobile-toggle-btn" (click)="isMobileSidebarOpen = !isMobileSidebarOpen" title="Ouvrir le menu">
              <span class="bar"></span>
              <span class="bar"></span>
              <span class="bar"></span>
            </button>

            <h2 class="topbar-welcome">
              Bonjour, <span>{{ authService.currentUser()?.prenom }}</span>
            </h2>
            <span class="role-badge" [ngClass]="'role-' + authService.currentUser()?.role?.toLowerCase()">
              {{ authService.currentUser()?.role }}
            </span>
          </div>

          <div class="topbar-right">

            @if (authService.isLearner()) {
              <div class="xp-pill">
                <app-icon name="zap" [size]="16" color="var(--color-orange)"></app-icon>
                <span class="xp-val">{{ authService.currentUser()?.xpPoints }} XP</span>
                <span class="xp-streak">
                  <app-icon name="flame" [size]="14" color="var(--color-orange)"></app-icon>
                  {{ authService.currentUser()?.streakDays }}j
                </span>
              </div>
            }

            <!-- PROMOTION ACTUELLEMENT ACTIVE (UNIQUEMENT POUR FORMATEURS / CREATORS) -->
            @if (authService.isCreator()) {
              @if (promotionService.activePromotion(); as activePromo) {
                <a 
                  routerLink="/app/promotions" 
                  class="active-promo-header-pill" 
                  [class.is-archived]="activePromo.status === 'ARCHIVED'"
                  [class.is-upcoming]="activePromo.status === 'UPCOMING'"
                  title="Promotion actuellement active comme contexte de travail. Cliquez pour gérer vos promotions.">
                  @if (activePromo.status === 'ARCHIVED') {
                    <span class="active-dot dot-gray"></span>
                    <span class="active-promo-label">Contexte Actif :</span>
                    <strong class="active-promo-name">{{ promotionService.activePromotionLabel() }}</strong>
                    <span class="header-status-tag tag-archived">
                      <app-icon name="lock" [size]="10" color="#475569"></app-icon>
                      <span>Lecture seule</span>
                    </span>
                  } @else if (activePromo.status === 'UPCOMING') {
                    <span class="active-dot dot-yellow"></span>
                    <span class="active-promo-label">Contexte Actif :</span>
                    <strong class="active-promo-name">{{ promotionService.activePromotionLabel() }}</strong>
                    <span class="header-status-tag tag-upcoming">
                      <app-icon name="clock" [size]="10" color="#854D0E"></app-icon>
                      <span>Préparation</span>
                    </span>
                  } @else {
                    <span class="active-pulse-dot"></span>
                    <span class="active-promo-label">Promotion actuelle :</span>
                    <strong class="active-promo-name">{{ promotionService.activePromotionLabel() }}</strong>
                  }
                  <app-icon name="arrow-right" [size]="12" color="var(--color-navy)"></app-icon>
                </a>
              } @else {
                <a 
                  routerLink="/app/promotions" 
                  class="active-promo-header-pill promo-pill-empty" 
                  title="Aucune promotion configurée. Cliquez pour créer votre première promotion.">
                  <span class="active-pulse-dot" style="background: var(--color-primary, #4F46E5);"></span>
                  <span class="active-promo-label">Promotions :</span>
                  <strong class="active-promo-name">Créer ma 1ère promotion</strong>
                  <app-icon name="arrow-right" [size]="12" color="var(--color-navy)"></app-icon>
                </a>
              }
            }

            <!-- Notification Bell with Flyout Modal Dropdown -->
            <div class="notif-wrapper">
              <button 
                type="button" 
                class="bell-btn" 
                [class.active]="isNotificationOpen"
                (click)="toggleNotifications()" 
                title="Centre de notifications">
                <app-icon name="bell" [size]="18" color="var(--color-navy)"></app-icon>
                @if (notificationService.unreadCount() > 0) {
                  <span class="notif-badge">{{ notificationService.unreadCount() }}</span>
                }
              </button>

              <!-- NOTIFICATION FLYOUT / MODAL -->
              @if (isNotificationOpen) {
                <div class="notif-backdrop" (click)="isNotificationOpen = false"></div>
                <div class="notif-dropdown card animate-fade-in" (click)="$event.stopPropagation()">
                  <!-- HEADER -->
                  <div class="notif-header">
                    <div class="notif-title-row">
                      <div class="notif-title">
                        <app-icon name="bell" [size]="15" color="var(--color-navy)"></app-icon>
                        <h3>Notifications</h3>
                      </div>
                      @if (notificationService.unreadCount() > 0) {
                        <span class="unread-pill">{{ notificationService.unreadCount() }} non lue{{ notificationService.unreadCount() > 1 ? 's' : '' }}</span>
                      }
                    </div>

                    <div class="notif-actions-row">
                      @if (notificationService.unreadCount() > 0) {
                        <button type="button" class="btn-text" (click)="notificationService.markAllAsRead()">
                          Tout marquer comme lu
                        </button>
                      }
                      <button type="button" class="btn-text btn-text-danger" (click)="notificationService.clearAll()">
                        Tout effacer
                      </button>
                    </div>
                  </div>

                  <!-- FILTER TABS -->
                  <div class="notif-tabs">
                    <button 
                      type="button" 
                      class="tab-btn" 
                      [class.active]="notifFilter === 'ALL'" 
                      (click)="notifFilter = 'ALL'">
                      Toutes ({{ notificationService.notifications().length }})
                    </button>
                    <button 
                      type="button" 
                      class="tab-btn" 
                      [class.active]="notifFilter === 'UNREAD'" 
                      (click)="notifFilter = 'UNREAD'">
                      Non lues ({{ notificationService.unreadCount() }})
                    </button>
                    <button 
                      type="button" 
                      class="tab-btn" 
                      [class.active]="notifFilter === 'LIVE'" 
                      (click)="notifFilter = 'LIVE'">
                      Live
                    </button>
                  </div>

                  <!-- NOTIFICATIONS LIST -->
                  <div class="notif-list">
                    @if (filteredNotifications().length === 0) {
                      <div class="notif-empty">
                        <div class="empty-icon-circle">
                          <app-icon name="check-circle" [size]="24" color="#10B981"></app-icon>
                        </div>
                        <p class="empty-msg">Vous êtes à jour !</p>
                        <span class="empty-sub">Aucune notification pour ce filtre</span>
                      </div>
                    } @else {
                      @for (n of filteredNotifications(); track n.id) {
                        <div 
                          class="notif-item" 
                          [class.unread]="!n.isRead"
                          (click)="onNotificationClick(n)">
                          
                          <div class="notif-icon-box" [ngClass]="'type-' + n.type.toLowerCase()">
                            @switch (n.type) {
                              @case ('LIVE') {
                                <app-icon name="play" [size]="14"></app-icon>
                              }
                              @case ('QUIZ_RESULT') {
                                <app-icon name="award" [size]="14"></app-icon>
                              }
                              @case ('COMMUNITY') {
                                <app-icon name="message-square" [size]="14"></app-icon>
                              }
                              @case ('SYSTEM') {
                                <app-icon name="sparkles" [size]="14"></app-icon>
                              }
                              @case ('CERTIFICATE') {
                                <app-icon name="check-circle" [size]="14"></app-icon>
                              }
                            }
                          </div>

                          <div class="notif-content">
                            <div class="notif-line1">
                              <span class="item-title">{{ n.title }}</span>
                              @if (!n.isRead) {
                                <span class="blue-dot"></span>
                              }
                            </div>
                            <p class="item-message">{{ n.message }}</p>
                            <span class="item-time">{{ n.timeAgo }}</span>
                          </div>

                          <button 
                            type="button" 
                            class="del-notif-btn" 
                            (click)="deleteNotification($event, n.id)"
                            title="Supprimer">
                            ✕
                          </button>
                        </div>
                      }
                    }
                  </div>
                </div>
              }
            </div>

            <!-- Profile Chip -->
            <div class="profile-chip" title="Profil utilisateur">
              <div class="avatar-icon-wrapper">
                <app-icon name="user" [size]="18" color="var(--color-navy)"></app-icon>
              </div>
            </div>
          </div>
        </header>

        <!-- Dynamic Content Routed Area -->
        <main class="app-workspace">
          @if (!authService.isLearner() && promotionService.isGlobalReadOnly() && promotionService.activePromotion(); as activePromo) {
            <div class="global-workspace-readonly-banner animate-fade-in">
              <div class="banner-left">
                <span class="banner-lock-icon">
                  <app-icon name="lock" [size]="15" color="#475569"></app-icon>
                </span>
                <span class="banner-text">
                  <strong>Espace Formateur en Lecture Seule :</strong> Votre contexte actif est la <strong>{{ activePromo.name }} ({{ activePromo.year }})</strong> (promotion archivée). Toutes les données affichées sont en consultation historique. Les créations, modifications, suppressions et sessions Live sont désactivées.
                </span>
              </div>
              <a routerLink="/app/promotions" class="btn-switch-promo">
                Changer de promotion ➔
              </a>
            </div>
          }
          <router-outlet></router-outlet>
        </main>
      </div>

      <!-- GLOBAL CONFIRM MODAL DIALOG -->
      <app-confirm-modal></app-confirm-modal>
    </div>
  `,
  styles: [`
    .app-container {
      display: flex;
      min-height: 100vh;
      width: 100%;
      max-width: 100vw;
      overflow-x: hidden;
      background-color: var(--color-background);
    }

    .app-main {
      flex: 1;
      min-width: 0;
      margin-left: var(--sidebar-width);
      max-width: calc(100vw - var(--sidebar-width));
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      padding-top: var(--navbar-height);
      overflow-x: hidden;
    }

    .app-workspace {
      flex: 1;
      min-width: 0;
      width: 100%;
      max-width: 100%;
      padding: 22px 28px 48px 28px;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .global-workspace-readonly-banner {
      margin-bottom: 4px;
      background: #F8FAFC;
      border: 1.5px solid #CBD5E1;
      border-radius: var(--radius-md, 10px);
      padding: 10px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);

      .banner-left {
        display: flex;
        align-items: center;
        gap: 10px;

        .banner-lock-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          background: #E2E8F0;
          border-radius: var(--radius-xs, 6px);
          flex-shrink: 0;
        }

        .banner-text {
          font-size: 12.5px;
          color: #334155;
          line-height: 1.4;

          strong {
            color: #0F172A;
          }
        }
      }

      .btn-switch-promo {
        font-size: 11.5px;
        font-weight: 700;
        color: var(--color-navy, #032447);
        background: #FFFFFF;
        border: 1px solid var(--color-border, #E2E8F0);
        padding: 5px 12px;
        border-radius: var(--radius-full, 9999px);
        text-decoration: none;
        white-space: nowrap;
        transition: all 0.15s ease;

        &:hover {
          background: #FEF3C7;
          border-color: #FDE047;
          transform: translateY(-1px);
        }
      }
    }

    .app-topbar {
      height: var(--navbar-height);
      background-color: #FFFFFF;
      border-bottom: 1px solid var(--color-border);
      padding: 0 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: fixed;
      top: 0;
      left: var(--sidebar-width);
      right: 0;
      z-index: 100;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }

    .topbar-left {
      display: flex;
      align-items: center;
      gap: 12px;

      .mobile-toggle-btn {
        display: none;
        flex-direction: column;
        justify-content: space-around;
        width: 32px;
        height: 32px;
        background: transparent;
        border: none;
        cursor: pointer;
        padding: 4px;

        .bar {
          width: 100%;
          height: 2.5px;
          background-color: var(--color-navy);
          border-radius: 2px;
        }
      }

      .topbar-welcome {
        font-size: 18px;
        font-weight: 700;
        color: var(--color-navy);
        span { color: #0F172A; }
      }

      .role-badge {
        font-size: 11px;
        font-weight: 800;
        padding: 2px 8px;
        border-radius: var(--radius-full);
        text-transform: uppercase;

        &.role-creator { background: var(--color-primary-light); color: var(--color-navy); }
        &.role-learner { background: var(--color-navy-light); color: var(--color-navy); }
        &.role-admin { background: var(--color-orange-light); color: var(--color-orange); }
      }
    }

    .topbar-right {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .xp-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background-color: var(--color-orange-light);
      padding: 6px 14px;
      border-radius: var(--radius-full);
      font-size: 13px;
      font-weight: 700;

      .xp-val { color: var(--color-orange); }
      .xp-streak {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        color: var(--color-text-primary);
        border-left: 1px solid rgba(244, 81, 11, 0.2);
        padding-left: 8px;
      }
    }

    /* ACTIVE PROMOTION HEADER PILL */
    .active-promo-header-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 14px;
      background: #F8FAFC;
      border: 1.5px solid var(--color-border);
      border-radius: var(--radius-full);
      text-decoration: none;
      transition: all 0.2s ease;
      cursor: pointer;

      &:hover {
        background: #FFFFFF;
        border-color: var(--color-navy);
        box-shadow: var(--shadow-sm);
        transform: translateY(-1px);
      }

      .active-pulse-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #16A34A;
        box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.2);
        animation: pulse 1.8s infinite;
      }

      .active-promo-label {
        font-size: 11.5px;
        color: var(--color-text-secondary);
        font-weight: 600;
      }

      .active-promo-name {
        font-size: 13px;
        font-weight: 800;
        color: var(--color-navy);
      }

      .active-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;

        &.dot-gray {
          background: #64748B;
        }
        &.dot-yellow {
          background: #D97706;
        }
      }

      .header-status-tag {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 10px;
        font-weight: 800;
        padding: 2px 7px;
        border-radius: var(--radius-full);
        letter-spacing: 0.02em;

        &.tag-archived {
          background: #E2E8F0;
          color: #475569;
        }
        &.tag-upcoming {
          background: #FEF08A;
          color: #854D0E;
        }
      }

      &.is-archived {
        background: #F1F5F9;
        border-color: #CBD5E1;
      }

      &.is-upcoming {
        background: #FEFCE8;
        border-color: #FDE047;
      }
    }

    /* PROMOTION MODAL */
    .promo-modal-backdrop {
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

    .promo-modal-card {
      width: 100%;
      max-width: 480px;
      background: #FFFFFF;
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-xl);
      overflow: hidden;
      display: flex;
      flex-direction: column;

      .modal-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 18px 20px;
        border-bottom: 1px solid var(--color-border);

        .modal-title-row {
          display: flex;
          align-items: center;
          gap: 8px;
          h3 { font-size: 16px; font-weight: 800; color: var(--color-navy); margin: 0; }
        }

        .btn-close-modal {
          background: transparent;
          border: none;
          font-size: 14px;
          color: var(--color-text-secondary);
          cursor: pointer;
          &:hover { color: #DC2626; }
        }
      }

      .modal-body {
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 14px;

        .modal-desc {
          font-size: 13px;
          color: var(--color-text-secondary);
          line-height: 1.5;
          margin: 0;
        }

        .form-row-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 4px;

          .form-label {
            font-size: 12px;
            font-weight: 700;
            color: var(--color-navy);
          }

          .form-input {
            width: 100%;
            height: 38px;
            border: 1.5px solid var(--color-border);
            border-radius: var(--radius-sm);
            padding: 0 12px;
            font-size: 13.5px;
            font-family: inherit;
            color: var(--color-text-primary);
            outline: none;
            background: #FFFFFF;

            &:focus {
              border-color: var(--color-navy);
              box-shadow: 0 0 0 3px rgba(3, 36, 71, 0.08);
            }
          }
        }
      }

      .modal-foot {
        padding: 14px 20px;
        background: #F8FAFC;
        border-top: 1px solid var(--color-border);
        display: flex;
        justify-content: flex-end;
        gap: 10px;
      }
    }

    .notif-wrapper {
      position: relative;
    }

    .bell-btn {
      width: 38px;
      height: 38px;
      border-radius: var(--radius-md);
      background-color: #F8FAFC;
      border: 1px solid var(--color-border);
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      cursor: pointer;
      transition: all 0.15s ease;

      &:hover, &.active {
        background-color: #FFFFFF;
        border-color: var(--color-navy);
      }

      .notif-badge {
        min-width: 16px;
        height: 16px;
        background-color: var(--color-orange);
        color: #FFFFFF;
        border-radius: var(--radius-full);
        position: absolute;
        top: -3px;
        right: -3px;
        font-size: 9.5px;
        font-weight: 800;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0 4px;
        border: 2px solid #FFFFFF;
      }
    }

    .notif-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 200;
      background: transparent;
    }

    .notif-dropdown {
      position: absolute;
      top: calc(100% + 10px);
      right: 0;
      width: 390px;
      max-width: 90vw;
      background: #FFFFFF;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      box-shadow: 0 10px 25px -5px rgba(3, 36, 71, 0.15), 0 8px 10px -6px rgba(3, 36, 71, 0.1);
      z-index: 210;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .notif-header {
      padding: 14px 16px 10px 16px;
      border-bottom: 1px solid var(--color-border);

      .notif-title-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;

        .notif-title {
          display: flex;
          align-items: center;
          gap: 6px;

          h3 {
            font-size: 14px;
            font-weight: 800;
            color: var(--color-navy);
            margin: 0;
          }
        }

        .unread-pill {
          background: var(--color-orange-light);
          color: var(--color-orange);
          font-size: 10px;
          font-weight: 800;
          padding: 2px 7px;
          border-radius: var(--radius-full);
        }
      }

      .notif-actions-row {
        display: flex;
        gap: 12px;

        .btn-text {
          background: none;
          border: none;
          padding: 0;
          font-size: 11px;
          font-weight: 700;
          color: var(--color-navy);
          cursor: pointer;
          &:hover { text-decoration: underline; }

          &.btn-text-danger {
            color: var(--color-text-secondary);
            &:hover { color: var(--color-danger); }
          }
        }
      }
    }

    .notif-tabs {
      display: flex;
      background: #F8FAFC;
      border-bottom: 1px solid var(--color-border);
      padding: 4px;
      gap: 4px;

      .tab-btn {
        flex: 1;
        border: none;
        background: transparent;
        font-size: 11px;
        font-weight: 700;
        color: var(--color-text-secondary);
        padding: 5px 8px;
        border-radius: var(--radius-xs);
        cursor: pointer;
        transition: all 0.15s ease;

        &:hover { color: var(--color-navy); }
        &.active {
          background: #FFFFFF;
          color: var(--color-navy);
          box-shadow: var(--shadow-sm);
        }
      }
    }

    .notif-list {
      max-height: 380px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;

      .notif-item {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        padding: 12px 16px;
        border-bottom: 1px solid var(--color-border);
        cursor: pointer;
        transition: background 0.15s ease;
        position: relative;

        &:hover {
          background: #F8FAFC;
        }

        &.unread {
          background: #FFFDF5;
        }

        .notif-icon-box {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;

          &.type-live {
            background: var(--color-navy);
            color: #FFFFFF;
          }
          &.type-quiz_result {
            background: var(--color-orange-light);
            color: var(--color-orange);
          }
          &.type-community {
            background: var(--color-navy-light);
            color: var(--color-navy);
          }
          &.type-system {
            background: var(--color-primary-light);
            color: var(--color-navy);
          }
          &.type-certificate {
            background: #DCFCE7;
            color: #059669;
          }
        }

        .notif-content {
          flex: 1;
          min-width: 0;

          .notif-line1 {
            display: flex;
            align-items: center;
            gap: 6px;

            .item-title {
              font-size: 12px;
              font-weight: 800;
              color: var(--color-navy);
            }

            .blue-dot {
              width: 6px;
              height: 6px;
              border-radius: 50%;
              background: var(--color-orange);
            }
          }

          .item-message {
            font-size: 11.5px;
            color: var(--color-text-secondary);
            margin: 2px 0 4px 0;
            line-height: 16px;
          }

          .item-time {
            font-size: 10px;
            color: var(--color-text-secondary);
            font-weight: 600;
          }
        }

        .del-notif-btn {
          background: none;
          border: none;
          font-size: 11px;
          color: #94A3B8;
          cursor: pointer;
          padding: 2px 4px;
          opacity: 0;
          transition: opacity 0.15s ease;

          &:hover { color: var(--color-danger); }
        }

        &:hover .del-notif-btn {
          opacity: 1;
        }
      }

      .notif-empty {
        padding: 36px 16px;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;

        .empty-icon-circle {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: #DCFCE7;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 4px;
        }

        .empty-msg {
          font-size: 13px;
          font-weight: 800;
          color: var(--color-navy);
          margin: 0;
        }

        .empty-sub {
          font-size: 11px;
          color: var(--color-text-secondary);
        }
      }
    }

    @media (max-width: 480px) {
      .notif-dropdown {
        position: fixed;
        top: 65px;
        right: 12px;
        left: 12px;
        width: auto;
      }
    }

    .avatar-sm {
      width: 38px;
      height: 38px;
      border-radius: var(--radius-full);
      object-fit: cover;
      border: 2px solid var(--color-primary);
    }

    .avatar-icon-wrapper {
      width: 38px;
      height: 38px;
      border-radius: var(--radius-full);
      background: var(--color-primary-light);
      border: 2px solid var(--color-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover {
        box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.2);
        transform: scale(1.05);
      }
    }

    @media (max-width: 768px) {
      .app-main { margin-left: 0; max-width: 100vw; }
      .app-topbar { left: 0; right: 0; padding: 0 12px; gap: 8px; }
      .topbar-left .mobile-toggle-btn { display: flex; }
      .topbar-welcome { display: none !important; }
      .role-badge { display: none !important; }
      .btn-action-top span { display: none; }
      .active-promo-header-pill {
        padding: 4px 10px;
        gap: 6px;
        .active-promo-label { display: none; }
        .arrow-icon { display: none; }
        .header-status-tag { font-size: 9px; padding: 1px 5px; }
      }
      .global-workspace-readonly-banner {
        flex-direction: column;
        align-items: flex-start;
        gap: 10px;
        .btn-switch-promo { width: 100%; text-align: center; }
      }
      .app-workspace { padding: 12px 12px 40px 12px; }
    }
  `]
})
export class AppLayoutComponent {
  isMobileSidebarOpen = false;
  isNotificationOpen = false;
  notifFilter: 'ALL' | 'UNREAD' | 'LIVE' = 'ALL';

  public authService = inject(AuthService);
  public notificationService = inject(NotificationService);
  public promotionService = inject(PromotionService);
  private router = inject(Router);

  constructor() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.isMobileSidebarOpen = false;
      this.isNotificationOpen = false;
    });
  }

  toggleNotifications(): void {
    this.isNotificationOpen = !this.isNotificationOpen;
  }

  filteredNotifications(): AppNotification[] {
    const list = this.notificationService.notifications();
    if (this.notifFilter === 'UNREAD') {
      return list.filter(n => !n.isRead);
    }
    if (this.notifFilter === 'LIVE') {
      return list.filter(n => n.type === 'LIVE');
    }
    return list;
  }

  onNotificationClick(notification: AppNotification): void {
    this.notificationService.markAsRead(notification.id);
    if (notification.actionLink) {
      this.isNotificationOpen = false;
      this.router.navigateByUrl(notification.actionLink);
    }
  }

  deleteNotification(event: Event, id: string): void {
    event.stopPropagation();
    this.notificationService.deleteNotification(id);
  }
}
