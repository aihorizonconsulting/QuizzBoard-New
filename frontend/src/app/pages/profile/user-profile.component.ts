import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { IconComponent } from '../../shared/components/icon/icon.component';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="profile-page animate-fade-in">
      @if (authService.currentUser(); as user) {
        <section class="profile-header">
          <div class="avatar">
            {{ getInitials(user.prenom, user.nom) }}
          </div>
          <div>
            <p class="eyebrow">Profil utilisateur</p>
            <h1>{{ user.prenom }} {{ user.nom }}</h1>
            <p class="muted">{{ user.email }}</p>
          </div>
        </section>

        <section class="profile-grid">
          <div class="info-panel">
            <h2>Compte</h2>
            <div class="info-row">
              <span>Rôle</span>
              <strong>{{ formatRole(user.role) }}</strong>
            </div>
            <div class="info-row">
              <span>Forfait</span>
              <strong>{{ user.subscriptionTier }}</strong>
            </div>
            <div class="info-row">
              <span>Expiration</span>
              <strong>{{ user.subscriptionExpiresAt ? (user.subscriptionExpiresAt | date:'dd/MM/yyyy HH:mm') : 'Aucune' }}</strong>
            </div>
            <div class="info-row">
              <span>Statut</span>
              <strong>{{ user.status || 'ACTIVE' }}</strong>
            </div>
          </div>

          <div class="info-panel">
            <h2>Activité</h2>
            <div class="stat-row">
              <span><app-icon name="star" [size]="16"></app-icon> XP</span>
              <strong>{{ user.xpPoints || 0 }}</strong>
            </div>
            <div class="stat-row">
              <span><app-icon name="award" [size]="16"></app-icon> Niveau</span>
              <strong>{{ user.level || 1 }}</strong>
            </div>
            <div class="stat-row">
              <span><app-icon name="flame" [size]="16"></app-icon> Série</span>
              <strong>{{ user.streakDays || 0 }} jour(s)</strong>
            </div>
          </div>
        </section>
      }
    </div>
  `,
  styles: [`
    .profile-page {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .profile-header {
      display: flex;
      align-items: center;
      gap: 18px;
      background: #FFFFFF;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: 22px;
    }

    .avatar {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      background: var(--color-primary);
      color: var(--color-navy);
      font-weight: 900;
      font-size: 22px;
    }

    .eyebrow {
      margin: 0 0 4px;
      font-size: 12px;
      font-weight: 800;
      color: var(--color-text-secondary);
      text-transform: uppercase;
    }

    h1, h2 { margin: 0; color: var(--color-navy); }
    h1 { font-size: 28px; }
    h2 { font-size: 17px; }
    .muted { margin: 4px 0 0; color: var(--color-text-secondary); }

    .profile-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
    }

    .info-panel {
      background: #FFFFFF;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: 18px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .info-row, .stat-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding-top: 12px;
      border-top: 1px solid var(--color-border);
      color: var(--color-text-secondary);
    }

    .stat-row span {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }

    .info-row strong, .stat-row strong {
      color: var(--color-navy);
      text-align: right;
    }

    @media (max-width: 760px) {
      .profile-header { align-items: flex-start; flex-direction: column; }
      .profile-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class UserProfileComponent {
  authService = inject(AuthService);

  getInitials(firstName?: string, lastName?: string): string {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || 'QB';
  }

  formatRole(role: string): string {
    if (role === 'CREATOR') return 'Professeur';
    if (role === 'LEARNER') return 'Apprenant';
    return 'Administrateur';
  }
}
