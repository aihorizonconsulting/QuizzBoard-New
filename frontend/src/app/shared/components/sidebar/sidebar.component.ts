import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { JoinModalService } from '../../../core/services/join-modal.service';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, IconComponent],
  template: `
    <!-- Mobile Backdrop -->
    @if (isMobileOpen) {
      <div class="mobile-sidebar-backdrop" (click)="closeMobile.emit()"></div>
    }

    <aside class="app-sidebar" [class.mobile-open]="isMobileOpen">
      <!-- Sidebar Header / Logo -->
      <div class="sidebar-header">
        <a routerLink="/" (click)="closeMobile.emit()" class="sidebar-brand">
          <img src="/logo.png" alt="QUIZZ Logo" class="brand-logo-img">
          <span class="logo-text">QUIZZ<span class="logo-dot">BOARD</span></span>
        </a>
        
        <button class="mobile-close-btn" (click)="closeMobile.emit()">✕</button>
      </div>

      <!-- Navigation Links -->
      <nav class="sidebar-nav">
        <!-- FORMATEUR / CRÉATEUR NAVIGATION -->
        @if (authService.isCreator()) {
          <div class="nav-section-label">ESPACE FORMATEUR</div>
          
          <a routerLink="/app/dashboard" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}" class="nav-item">
            <app-icon name="bar-chart" [size]="17" class="nav-icon"></app-icon>
            <span class="nav-label">Tableau de Bord</span>
          </a>

          <a routerLink="/app/quizzes" routerLinkActive="active" class="nav-item">
            <app-icon name="file-text" [size]="17" class="nav-icon"></app-icon>
            <span class="nav-label">Mes Quiz</span>
          </a>

          <a routerLink="/app/courses" routerLinkActive="active" class="nav-item">
            <app-icon name="book-open" [size]="17" class="nav-icon"></app-icon>
            <span class="nav-label">Mes Cours</span>
          </a>

          <a routerLink="/app/live" routerLinkActive="active" class="nav-item">
            <app-icon name="play" [size]="17" class="nav-icon"></app-icon>
            <span class="nav-label">Sessions Live</span>
            <span class="mini-badge">LIVE</span>
          </a>

          <a routerLink="/app/classes" routerLinkActive="active" class="nav-item">
            <app-icon name="school" [size]="17" class="nav-icon"></app-icon>
            <span class="nav-label">Mes Classes</span>
          </a>

          <a routerLink="/app/promotions" routerLinkActive="active" class="nav-item">
            <app-icon name="calendar" [size]="17" class="nav-icon"></app-icon>
            <span class="nav-label">Promotions</span>
          </a>

          <a routerLink="/app/quizzes/create" routerLinkActive="active" class="nav-item nav-item-highlight">
            <app-icon name="sparkles" [size]="17" color="var(--color-primary)" class="nav-icon"></app-icon>
            <span class="nav-label">Générateur IA</span>
            <span class="mini-badge">IA</span>
          </a>

          <a routerLink="/app/communities" routerLinkActive="active" class="nav-item">
            <app-icon name="users" [size]="17" class="nav-icon"></app-icon>
            <span class="nav-label">Communautés & Hub</span>
          </a>

          <a routerLink="/app/decouvrir" routerLinkActive="active" class="nav-item">
            <app-icon name="compass" [size]="17" class="nav-icon"></app-icon>
            <span class="nav-label">Découvrir</span>
          </a>

          <a routerLink="/app/subscription" routerLinkActive="active" class="nav-item">
            <app-icon name="credit-card" [size]="17" class="nav-icon"></app-icon>
            <span class="nav-label">Mon Forfait ({{ authService.subscriptionTier() }})</span>
          </a>
        }

        <!-- APPRENANT NAVIGATION -->
        @if (authService.isLearner()) {
          <div class="nav-section-label">ESPACE APPRENANT</div>

          <a routerLink="/app/learner/dashboard" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}" class="nav-item">
            <app-icon name="award" [size]="17" class="nav-icon"></app-icon>
            <span class="nav-label">Mon Espace & XP</span>
          </a>

          <a routerLink="/app/learner/classes" routerLinkActive="active" class="nav-item">
            <app-icon name="school" [size]="17" class="nav-icon"></app-icon>
            <span class="nav-label">Mes Classes & Cours</span>
          </a>

          <button type="button" class="nav-item nav-item-highlight" (click)="joinModalService.open(); closeMobile.emit()">
            <app-icon name="play" [size]="17" color="var(--color-primary)" class="nav-icon"></app-icon>
            <span class="nav-label">Rejoindre un Quiz</span>
          </button>

          <a routerLink="/app/decouvrir" routerLinkActive="active" class="nav-item">
            <app-icon name="compass" [size]="17" class="nav-icon"></app-icon>
            <span class="nav-label">Découvrir</span>
          </a>

          <a routerLink="/app/learner/communities" routerLinkActive="active" class="nav-item">
            <app-icon name="message-square" [size]="17" class="nav-icon"></app-icon>
            <span class="nav-label">Mes Communautés</span>
          </a>

          <a routerLink="/app/learner/certificates" routerLinkActive="active" class="nav-item">
            <app-icon name="file-text" [size]="17" class="nav-icon"></app-icon>
            <span class="nav-label">Mes Certificats</span>
          </a>
        }

        <!-- SUPERADMIN NAVIGATION -->
        @if (authService.isAdmin()) {
          <div class="nav-section-label">SUPERADMINISTRATION</div>

          <a routerLink="/admin/dashboard" routerLinkActive="active" class="nav-item">
            <app-icon name="shield" [size]="17" class="nav-icon"></app-icon>
            <span class="nav-label">Supervision Globale</span>
          </a>

          <a routerLink="/admin/users" routerLinkActive="active" class="nav-item">
            <app-icon name="users" [size]="17" class="nav-icon"></app-icon>
            <span class="nav-label">Gestion Utilisateurs</span>
          </a>

          <a routerLink="/admin/content" routerLinkActive="active" class="nav-item">
            <app-icon name="shield" [size]="17" class="nav-icon"></app-icon>
            <span class="nav-label">Surveillance & Modération</span>
          </a>

          <a routerLink="/admin/finances" routerLinkActive="active" class="nav-item">
            <app-icon name="credit-card" [size]="17" class="nav-icon"></app-icon>
            <span class="nav-label">Finances & Abonnements</span>
          </a>

          <a routerLink="/admin/system" routerLinkActive="active" class="nav-item">
            <app-icon name="cpu" [size]="17" class="nav-icon"></app-icon>
            <span class="nav-label">Surveillance IA & Logs</span>
          </a>

          <a routerLink="/admin/settings" routerLinkActive="active" class="nav-item">
            <app-icon name="settings" [size]="17" class="nav-icon"></app-icon>
            <span class="nav-label">Paramètres Plateforme</span>
          </a>
        }
      </nav>

      <!-- USER PROFILE AT BOTTOM -->
      <div class="sidebar-footer">
        <!-- User Summary -->
        <div class="user-card">
          <div class="user-avatar-icon" title="Profil utilisateur">
            <app-icon name="user" [size]="15" color="#FFFFFF"></app-icon>
          </div>
          <div class="user-info">
            <div class="user-name">{{ authService.currentUser()?.prenom }} {{ authService.currentUser()?.nom }}</div>
            <div class="user-role">{{ authService.currentUser()?.role }} • {{ authService.subscriptionTier() }}</div>
          </div>
          <button (click)="openLogoutModal()" title="Déconnexion" class="logout-btn">
            <app-icon name="log-out" [size]="15" color="#94A3B8"></app-icon>
          </button>
        </div>
      </div>
    </aside>

    <!-- LOGOUT CONFIRMATION MODAL -->
    @if (showLogoutModal) {
      <div class="modal-backdrop animate-fade-in" (click)="showLogoutModal = false">
        <div class="modal-card card" (click)="$event.stopPropagation()">
          <div class="modal-icon-wrap">
            <div class="logout-bubble">
              <app-icon name="log-out" [size]="28" color="var(--color-danger)"></app-icon>
            </div>
          </div>

          <div class="modal-text">
            <h3 class="h2" style="color: var(--color-navy); margin-bottom: 8px;">Confirmer la déconnexion</h3>
            <p class="body-small" style="line-height: 22px;">
              Êtes-vous certain de vouloir fermer la session de 
              <strong>{{ authService.currentUser()?.prenom }} {{ authService.currentUser()?.nom }}</strong> ?
            </p>
          </div>

          <div class="modal-action-row">
            <button type="button" class="btn btn-outline" (click)="showLogoutModal = false">
              Annuler
            </button>
            <button type="button" class="btn btn-danger" (click)="confirmLogout()">
              <app-icon name="log-out" [size]="15" color="#FFFFFF"></app-icon>
              <span>Se déconnecter</span>
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .app-sidebar {
      width: var(--sidebar-width);
      height: 100vh;
      background-color: var(--color-navy);
      color: #FFFFFF;
      display: flex;
      flex-direction: column;
      position: fixed;
      left: 0;
      top: 0;
      z-index: 90;
      border-right: 1px solid rgba(255, 255, 255, 0.08);
    }

    .sidebar-header {
      height: var(--navbar-height);
      padding: 0 24px;
      display: flex;
      align-items: center;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }

    .sidebar-brand {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 800;
      font-size: 18px;
      color: #FFFFFF;

      .brand-logo-img {
        height: 30px;
        width: auto;
        object-fit: contain;
      }

      .logo-dot {
        color: var(--color-primary);
      }
    }

    .sidebar-nav {
      flex: 1;
      padding: 14px 12px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .nav-section-label {
      font-size: 10.5px;
      font-weight: 800;
      letter-spacing: 0.08em;
      color: #94A3B8;
      padding: 10px 10px 4px 10px;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 11px;
      height: 40px;
      padding: 0 12px;
      border-radius: var(--radius-sm);
      color: #CBD5E1;
      font-size: 13.5px;
      font-weight: 600;
      transition: all 0.15s ease;
      text-decoration: none;
      border: none;
      background: transparent;
      cursor: pointer;
      font-family: inherit;
      width: 100%;
      text-align: left;

      .nav-label {
        flex: 1;
      }

      .mini-badge {
        background-color: var(--color-orange);
        color: #FFFFFF;
        font-size: 9.5px;
        font-weight: 800;
        padding: 2px 6px;
        border-radius: var(--radius-full);
      }

      &:hover {
        background-color: var(--color-navy-hover);
        color: #FFFFFF;
      }

      &.active {
        background-color: var(--color-primary);
        color: var(--color-navy);
        font-weight: 700;

        ::ng-deep svg {
          stroke: var(--color-navy) !important;
        }

        .mini-badge {
          background-color: var(--color-navy);
          color: var(--color-primary);
        }
      }

      &.nav-item-highlight {
        border: 1px dashed rgba(255, 196, 0, 0.4);
      }
    }

    .sidebar-footer {
      padding: 14px 12px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      background-color: #021B35;
    }

    .user-card {
      display: flex;
      align-items: center;
      gap: 8px;

      .user-avatar {
        width: 30px;
        height: 30px;
        border-radius: var(--radius-full);
        object-fit: cover;
        border: 1.5px solid var(--color-primary);
      }

      .user-avatar-icon {
        width: 30px;
        height: 30px;
        border-radius: var(--radius-full);
        background: rgba(255, 255, 255, 0.12);
        border: 1.5px solid var(--color-primary);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .user-info {
        flex: 1;
        overflow: hidden;

        .user-name {
          font-size: 11.5px;
          font-weight: 700;
          color: #FFFFFF;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .user-role {
          font-size: 9.5px;
          color: #94A3B8;
        }
      }

      .logout-btn {
        background: none;
        border: none;
        cursor: pointer;
        padding: 4px;
        border-radius: var(--radius-xs);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.15s ease;

        &:hover {
          background: rgba(239, 68, 68, 0.2);
          ::ng-deep svg { stroke: #EF4444 !important; }
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
      -webkit-backdrop-filter: blur(6px) !important;
      z-index: 999999 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      padding: 20px !important;
      margin: 0 !important;
    }

    .modal-card {
      width: 100%;
      max-width: 440px;
      padding: 32px 28px;
      text-align: center;
      background: #FFFFFF;
      border-radius: var(--radius-xl);
      box-shadow: var(--shadow-xl);

      .modal-icon-wrap {
        display: flex;
        justify-content: center;
        margin-bottom: 16px;

        .logout-bubble {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: var(--color-danger-light);
          display: flex;
          align-items: center;
          justify-content: center;
        }
      }

      .modal-text {
        margin-bottom: 24px;
      }

      .modal-action-row {
        display: flex;
        justify-content: center;
        gap: 12px;

        .btn { flex: 1; }
      }
    }

    .mobile-close-btn {
      display: none;
      background: none;
      border: none;
      color: #FFFFFF;
      font-size: 20px;
      cursor: pointer;
    }

    @media (max-width: 768px) {
      .app-sidebar {
        transform: translateX(-100%);
        transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        z-index: 1000;
        width: 290px;

        &.mobile-open {
          transform: translateX(0);
        }
      }

      .mobile-close-btn {
        display: block;
      }

      .mobile-sidebar-backdrop {
        position: fixed;
        inset: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(3, 36, 71, 0.7);
        backdrop-filter: blur(4px);
        z-index: 999;
      }
    }
  `]
})
export class SidebarComponent {
  @Input() isMobileOpen = false;
  @Output() closeMobile = new EventEmitter<void>();

  public authService = inject(AuthService);
  public joinModalService = inject(JoinModalService);
  private router = inject(Router);

  showLogoutModal = false;

  openLogoutModal() {
    this.showLogoutModal = true;
  }

  confirmLogout() {
    this.showLogoutModal = false;
    this.authService.logout();
    this.router.navigate(['/connexion']);
  }
}
