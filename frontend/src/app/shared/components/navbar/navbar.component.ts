import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { JoinModalService } from '../../../core/services/join-modal.service';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, IconComponent],
  template: `
    <header class="site-header">
      <div class="header-container">
        <!-- Logo -->
        <a routerLink="/" class="brand-logo" (click)="isMobileMenuOpen = false">
          <img src="/logo.png" alt="QUIZZ Logo" class="brand-logo-img">
          <span class="logo-text">QUIZZ<span class="logo-dot">BOARD</span></span>
        </a>

        <!-- Desktop Public Nav Links -->
        <nav class="nav-links">
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}">Accueil</a>
          <a routerLink="/decouvrir" routerLinkActive="active">Découvrir</a>
          <a routerLink="/tarifs" routerLinkActive="active">Tarifs & Forfaits</a>
          <button type="button" (click)="joinModalService.open()" class="nav-link-badge">
            <app-icon name="play" [size]="14" color="var(--color-orange)"></app-icon>
            <span>Rejoindre avec un PIN</span>
          </button>
        </nav>

        <!-- Right Desktop CTA & Auth -->
        <div class="header-actions">
          @if (authService.isAuthenticated()) {
            <a [routerLink]="authService.dashboardUrl()" class="btn btn-secondary btn-sm">
              <app-icon name="user" [size]="15" color="#FFFFFF"></app-icon>
              <span>Mon Espace ({{ authService.currentUser()?.prenom }})</span>
            </a>
          } @else {
            <a routerLink="/connexion" class="btn btn-outline btn-sm">Connexion</a>
            <a routerLink="/inscription" class="btn btn-primary btn-sm">
              <app-icon name="sparkles" [size]="15" color="var(--color-navy)"></app-icon>
              <span>Créer un Quiz</span>
            </a>
          }
        </div>

        <!-- Mobile Hamburger Toggle -->
        <button 
          class="mobile-menu-btn" 
          (click)="isMobileMenuOpen = !isMobileMenuOpen" 
          [attr.aria-label]="isMobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'">
          <span class="hamburger-bar" [class.open]="isMobileMenuOpen"></span>
          <span class="hamburger-bar" [class.open]="isMobileMenuOpen"></span>
          <span class="hamburger-bar" [class.open]="isMobileMenuOpen"></span>
        </button>
      </div>

      <!-- Mobile Dropdown Drawer -->
      @if (isMobileMenuOpen) {
        <div class="mobile-drawer animate-fade-in">
          <nav class="mobile-nav-links">
            <a routerLink="/" (click)="isMobileMenuOpen = false" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}">Accueil</a>
            <a routerLink="/decouvrir" (click)="isMobileMenuOpen = false" routerLinkActive="active">Découvrir les Quiz</a>
            <a routerLink="/tarifs" (click)="isMobileMenuOpen = false" routerLinkActive="active">Tarifs & Forfaits</a>
            <button type="button" (click)="isMobileMenuOpen = false; joinModalService.open()" class="mobile-pin-btn">
              <app-icon name="play" [size]="15" color="var(--color-orange)"></app-icon>
              <span>Rejoindre avec un PIN</span>
            </button>
          </nav>

          <div class="mobile-actions">
            @if (authService.isAuthenticated()) {
              <a [routerLink]="authService.dashboardUrl()" (click)="isMobileMenuOpen = false" class="btn btn-secondary btn-full">
                <app-icon name="user" [size]="15" color="#FFFFFF"></app-icon>
                <span>Mon Espace ({{ authService.currentUser()?.prenom }})</span>
              </a>
            } @else {
              <a routerLink="/connexion" (click)="isMobileMenuOpen = false" class="btn btn-outline btn-full">Connexion</a>
              <a routerLink="/inscription" (click)="isMobileMenuOpen = false" class="btn btn-primary btn-full">
                <app-icon name="sparkles" [size]="15" color="var(--color-navy)"></app-icon>
                <span>Créer un Quiz Gratuit</span>
              </a>
            }
          </div>
        </div>
      }
    </header>
  `,
  styles: [`
    :host {
      position: sticky;
      top: 0;
      z-index: 1000;
      display: block;
      width: 100%;
    }

    .site-header {
      background-color: rgba(255, 255, 255, 0.96);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--color-border);
      width: 100%;
      box-shadow: 0 4px 16px rgba(3, 36, 71, 0.06);
      transition: all 0.2s ease;
    }

    .header-container {
      width: 100%;
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 24px;
      height: var(--navbar-height);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .brand-logo {
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: 800;
      font-size: 20px;
      color: var(--color-navy);

      .brand-logo-img {
        height: 38px;
        width: auto;
        object-fit: contain;
      }

      .logo-dot {
        color: var(--color-orange);
      }
    }

    .nav-links {
      display: flex;
      align-items: center;
      gap: 28px;

      a {
        font-size: 14px;
        font-weight: 600;
        color: var(--color-text-secondary);
        transition: color 0.15s ease;

        &:hover, &.active {
          color: var(--color-navy);
        }
      }

      .nav-link-badge {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        background-color: var(--color-navy-light);
        color: var(--color-navy);
        padding: 6px 14px;
        border-radius: var(--radius-full);
        font-weight: 700;
        font-size: 14px;
        border: none;
        cursor: pointer;
        font-family: inherit;
        transition: all 0.15s ease;

        &:hover {
          background-color: rgba(3, 36, 71, 0.12);
        }
      }
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .mobile-menu-btn {
      display: none;
      flex-direction: column;
      justify-content: space-around;
      width: 32px;
      height: 32px;
      background: transparent;
      border: none;
      cursor: pointer;
      padding: 4px;

      .hamburger-bar {
        width: 100%;
        height: 2.5px;
        background-color: var(--color-navy);
        border-radius: 2px;
        transition: all 0.2s ease;
      }
    }

    .mobile-drawer {
      display: none;
      background: #FFFFFF;
      border-top: 1px solid var(--color-border);
      padding: 20px 24px 24px 24px;
      box-shadow: var(--shadow-lg);

      .mobile-nav-links {
        display: flex;
        flex-direction: column;
        gap: 14px;
        margin-bottom: 20px;

        a {
          font-size: 15px;
          font-weight: 700;
          color: var(--color-navy);
          padding: 8px 0;
          border-bottom: 1px solid var(--color-background);

          &.mobile-pin-btn {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            color: var(--color-orange);
          }
        }
      }

      .mobile-actions {
        display: flex;
        flex-direction: column;
        gap: 10px;

        .btn-full { width: 100%; }
      }
    }

    @media (max-width: 860px) {
      .nav-links { display: none; }
      .header-actions { display: none; }
      .mobile-menu-btn { display: flex; }
      .mobile-drawer { display: block; }
    }
  `]
})
export class NavbarComponent {
  isMobileMenuOpen = false;
  public joinModalService = inject(JoinModalService);
  public authService = inject(AuthService);
}
