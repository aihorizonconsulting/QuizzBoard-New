import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { User, UserRole, SubscriptionTier } from '../../../core/models/user.model';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, PaginationComponent],
  template: `
    <div class="admin-users-page animate-fade-in">
      <!-- HEADER -->
      <div class="page-header">
        <div>
          <h1 class="h1">Gestion des Utilisateurs & Rôles</h1>
          <p class="body-small">Contrôle des comptes, attributions de forfaits STARTER et gestion des accès.</p>
        </div>

        <button type="button" class="btn btn-primary btn-sm" (click)="openCreateModal()">
          <app-icon name="user" [size]="15" color="var(--color-navy)"></app-icon>
          <span>Créer un Utilisateur</span>
        </button>
      </div>

      <!-- METRIC STRIP -->
      <div class="metrics-strip">
        <div class="metric-box card">
          <span class="m-val">{{ users().length }}</span>
          <span class="m-label">Total Inscrits</span>
        </div>
        <div class="metric-box card">
          <span class="m-val text-primary">{{ starterCount() }}</span>
          <span class="m-label">Formateurs STARTER</span>
        </div>
        <div class="metric-box card">
          <span class="m-val text-navy">{{ freeCount() }}</span>
          <span class="m-label">Formateurs FREE</span>
        </div>
        <div class="metric-box card">
          <span class="m-val text-blue">{{ learnersCount() }}</span>
          <span class="m-label">Apprenants</span>
        </div>
        <div class="metric-box card">
          <span class="m-val text-danger">{{ suspendedCount() }}</span>
          <span class="m-label">Comptes Suspendus</span>
        </div>
      </div>

      <!-- SEARCH & FILTER TOOLBAR -->
      <div class="card toolbar-card">
        <div class="toolbar-search">
          <app-icon name="search" [size]="16" color="var(--color-text-secondary)"></app-icon>
          <input 
            type="text" 
            [(ngModel)]="searchQuery" 
            (ngModelChange)="resetPage()"
            placeholder="Rechercher par nom, prénom, email ou université..." 
            class="search-input">
          @if (searchQuery) {
            <button type="button" class="btn-clear" (click)="searchQuery = ''; resetPage()">✕</button>
          }
        </div>

        <div class="filters-row">
          <!-- RÔLE FILTER -->
          <div class="filter-group">
            <span class="filter-lbl">Rôle :</span>
            <div class="pill-group">
              <button 
                type="button" 
                class="filter-pill" 
                [class.active]="selectedRole === 'ALL'" 
                (click)="setRoleFilter('ALL')">
                Tous
              </button>
              <button 
                type="button" 
                class="filter-pill" 
                [class.active]="selectedRole === 'CREATOR'" 
                (click)="setRoleFilter('CREATOR')">
                Formateurs
              </button>
              <button 
                type="button" 
                class="filter-pill" 
                [class.active]="selectedRole === 'LEARNER'" 
                (click)="setRoleFilter('LEARNER')">
                Apprenants
              </button>
              <button 
                type="button" 
                class="filter-pill" 
                [class.active]="selectedRole === 'ADMIN'" 
                (click)="setRoleFilter('ADMIN')">
                Admins
              </button>
            </div>
          </div>

          <!-- FORFAIT FILTER -->
          <div class="filter-group">
            <span class="filter-lbl">Forfait :</span>
            <div class="pill-group">
              <button 
                type="button" 
                class="filter-pill" 
                [class.active]="selectedTier === 'ALL'" 
                (click)="setTierFilter('ALL')">
                Tous
              </button>
              <button 
                type="button" 
                class="filter-pill" 
                [class.active]="selectedTier === 'STARTER'" 
                (click)="setTierFilter('STARTER')">
                STARTER
              </button>
              <button 
                type="button" 
                class="filter-pill" 
                [class.active]="selectedTier === 'FREE'" 
                (click)="setTierFilter('FREE')">
                FREE
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- USERS TABLE -->
      <div class="card table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th style="min-width: 250px;">Utilisateur</th>
              <th style="min-width: 200px;">Organisation</th>
              <th style="width: 100px;">Rôle</th>
              <th style="width: 110px;">Forfait</th>
              <th style="width: 100px;">Statut</th>
              <th style="width: 90px;">XP</th>
              <th style="width: 105px;">Date</th>
              <th style="width: 160px; text-align: right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (user of paginatedUsers(); track user.id) {
              <tr [class.is-suspended]="user.status === 'SUSPENDED'">
                <td>
                  <div class="user-cell">
                    <div 
                      class="user-avatar-icon-cell"
                      style="width: 38px; height: 38px; min-width: 38px; border-radius: 50%; background: #EEF2F6; display: flex; align-items: center; justify-content: center; border: 1.5px solid var(--color-border); flex-shrink: 0;">
                      <app-icon name="user" [size]="18" color="var(--color-navy)"></app-icon>
                    </div>
                    <div>
                      <strong class="user-name">{{ user.prenom }} {{ user.nom }}</strong>
                      <div class="user-email">{{ user.email }}</div>
                      @if (user.phoneNumber) {
                        <div class="user-phone">{{ user.phoneNumber }}</div>
                      }
                    </div>
                  </div>
                </td>

                <td>
                  <span class="org-cell">{{ user.organization || 'Indépendant' }}</span>
                </td>

                <td>
                  <span class="role-badge" [ngClass]="'role-' + user.role.toLowerCase()">
                    {{ user.role }}
                  </span>
                </td>

                <td>
                  <div class="tier-cell">
                    <span class="tier-badge" [ngClass]="'tier-' + user.subscriptionTier.toLowerCase()">
                      {{ user.subscriptionTier }}
                    </span>
                    <button 
                      type="button" 
                      class="btn-switch-tier" 
                      title="Changer de formule"
                      (click)="confirmSwitchTier(user)">
                      ⇄
                    </button>
                  </div>
                </td>

                <td>
                  @if (user.status === 'SUSPENDED') {
                    <span class="status-pill suspended">
                      <span class="dot-red"></span>
                      <span>Suspendu</span>
                    </span>
                  } @else {
                    <span class="status-pill active">
                      <span class="dot-green"></span>
                      <span>Actif</span>
                    </span>
                  }
                </td>

                <td>
                  <span class="xp-val">
                    <app-icon name="zap" [size]="13" color="var(--color-orange)"></app-icon>
                    <span>{{ user.xpPoints }}</span>
                  </span>
                </td>

                <td class="date-cell">{{ user.createdAt }}</td>

                <td>
                  <div class="actions-cell">
                    <!-- TOGGLE SUSPENSION -->
                    <button 
                      type="button" 
                      class="btn-action" 
                      [class.btn-warn]="user.status !== 'SUSPENDED'"
                      [class.btn-succ]="user.status === 'SUSPENDED'"
                      (click)="confirmToggleSuspend(user)"
                      [title]="user.status === 'SUSPENDED' ? 'Réactiver le compte' : 'Suspendre le compte'">
                      <app-icon [name]="user.status === 'SUSPENDED' ? 'check' : 'shield'" [size]="14"></app-icon>
                      <span>{{ user.status === 'SUSPENDED' ? 'Réactiver' : 'Suspendre' }}</span>
                    </button>

                    <!-- DELETE BUTTON -->
                    <button 
                      type="button" 
                      class="btn-action btn-danger-icon" 
                      title="Supprimer définitivement"
                      (click)="confirmDeleteUser(user)">
                      <app-icon name="trash" [size]="14" color="var(--color-danger)"></app-icon>
                    </button>
                  </div>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="8" class="empty-cell">
                  <app-icon name="search" [size]="28" color="var(--color-text-secondary)"></app-icon>
                  <p>Aucun utilisateur trouvé correspondant à ces filtres.</p>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <app-pagination
        [currentPage]="currentPage"
        [pageSize]="pageSize"
        [totalItems]="filteredUsers().length"
        (pageChange)="currentPage = $event">
      </app-pagination>

      <!-- MODAL CRÉATION UTILISATEUR -->
      @if (showCreateModal) {
        <div class="modal-backdrop animate-fade-in" (click)="showCreateModal = false">
          <div class="modal-card card animate-scale-up" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2 class="modal-title">Créer un Nouveau Compte</h2>
              <button type="button" class="btn-close" (click)="showCreateModal = false">✕</button>
            </div>

            <form (ngSubmit)="handleCreateUser()" class="create-form">
              <div class="form-row">
                <div class="form-group">
                  <label>Prénom *</label>
                  <input 
                    type="text" 
                    [(ngModel)]="newUserData.prenom" 
                    name="prenom" 
                    class="input-field" 
                    placeholder="ex: Mamadou" 
                    [class.input-error]="fieldErrors['prenom']"
                    (input)="clearFieldError('prenom')"
                    required>
                  @if (fieldErrors['prenom']) {
                    <span class="field-error-msg">
                      <app-icon name="alert" [size]="13" color="var(--color-danger)"></app-icon>
                      <span>{{ fieldErrors['prenom'] }}</span>
                    </span>
                  }
                </div>
                <div class="form-group">
                  <label>Nom *</label>
                  <input 
                    type="text" 
                    [(ngModel)]="newUserData.nom" 
                    name="nom" 
                    class="input-field" 
                    placeholder="ex: Diop" 
                    [class.input-error]="fieldErrors['nom']"
                    (input)="clearFieldError('nom')"
                    required>
                  @if (fieldErrors['nom']) {
                    <span class="field-error-msg">
                      <app-icon name="alert" [size]="13" color="var(--color-danger)"></app-icon>
                      <span>{{ fieldErrors['nom'] }}</span>
                    </span>
                  }
                </div>
              </div>

              <div class="form-group">
                <label>Email Universitaire ou Professionnel *</label>
                <input 
                  type="email" 
                  [(ngModel)]="newUserData.email" 
                  name="email" 
                  class="input-field" 
                  placeholder="ex: m.diop@esp.sn" 
                  [class.input-error]="fieldErrors['email']"
                  (input)="clearFieldError('email')"
                  required>
                @if (fieldErrors['email']) {
                  <span class="field-error-msg">
                    <app-icon name="alert" [size]="13" color="var(--color-danger)"></app-icon>
                    <span>{{ fieldErrors['email'] }}</span>
                  </span>
                }
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Rôle Système *</label>
                  <select [(ngModel)]="newUserData.role" name="role" class="input-field">
                    <option value="CREATOR">Formateur / Enseignant</option>
                    <option value="LEARNER">Apprenant / Étudiant</option>
                    <option value="ADMIN">SuperAdministrateur</option>
                  </select>
                </div>

                <div class="form-group">
                  <label>Formule / Forfait *</label>
                  <select [(ngModel)]="newUserData.subscriptionTier" name="subscriptionTier" class="input-field">
                    <option value="FREE">FREE (Gratuit 0 F)</option>
                    <option value="STARTER">STARTER (999 F / mois)</option>
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label>Organisation ou École</label>
                <input type="text" [(ngModel)]="newUserData.organization" name="organization" class="input-field" placeholder="ex: Université Numérique Cheikh Hamidou Kane">
              </div>

              <div class="form-group">
                <label>Numéro de Téléphone (Mobile Money)</label>
                <input type="text" [(ngModel)]="newUserData.phoneNumber" name="phoneNumber" class="input-field" placeholder="ex: +221 77 123 45 67">
              </div>

              <div class="modal-actions">
                <button type="button" class="btn btn-outline" (click)="showCreateModal = false">Annuler</button>
                <button type="submit" class="btn btn-primary" [disabled]="!newUserData.prenom || !newUserData.nom || !newUserData.email">
                  <app-icon name="check" [size]="16" color="var(--color-navy)"></app-icon>
                  <span>Créer le Compte</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .admin-users-page {
      display: flex;
      flex-direction: column;
      gap: 22px;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }

    /* METRICS STRIP */
    .metrics-strip {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 14px;

      .metric-box {
        padding: 16px 18px;
        display: flex;
        flex-direction: column;
        gap: 4px;

        .m-val {
          font-size: 24px;
          font-weight: 900;
          color: var(--color-navy);

          &.text-primary { color: #D97706; }
          &.text-navy { color: var(--color-navy); }
          &.text-blue { color: #2563EB; }
          &.text-danger { color: var(--color-danger); }
        }

        .m-label {
          font-size: 11.5px;
          font-weight: 700;
          color: var(--color-text-secondary);
          text-transform: uppercase;
        }
      }
    }

    /* TOOLBAR */
    .toolbar-card {
      padding: 16px 20px;
      display: flex;
      flex-direction: column;
      gap: 14px;

      .toolbar-search {
        position: relative;
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
        gap: 24px;
        flex-wrap: wrap;

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
              transition: all 0.15s ease;

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

    /* DATA TABLE */
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

      tr.is-suspended td {
        background: #FFF5F5;
        opacity: 0.85;
      }

      .user-cell {
        display: flex;
        align-items: center;
        gap: 12px;

        .avatar-sm {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          object-fit: cover;
          flex-shrink: 0;
        }

        .user-name {
          color: var(--color-navy);
          font-size: 13.5px;
        }

        .user-email {
          font-size: 12px;
          color: var(--color-text-secondary);
        }

        .user-phone {
          font-size: 11px;
          color: #94A3B8;
        }
      }

      .org-cell {
        color: var(--color-text-secondary);
        font-size: 12.5px;
      }

      .role-badge {
        font-size: 10px;
        font-weight: 800;
        padding: 3px 8px;
        border-radius: 4px;
        text-transform: uppercase;

        &.role-creator { background: #FEF3C7; color: #92400E; }
        &.role-learner { background: #E0E7FF; color: #3730A3; }
        &.role-admin { background: #FFEDD5; color: #C2410C; }
      }

      .tier-cell {
        display: inline-flex;
        align-items: center;
        gap: 6px;

        .tier-badge {
          font-size: 10.5px;
          font-weight: 800;
          padding: 2px 7px;
          border-radius: var(--radius-full);

          &.tier-starter { background: var(--color-primary-light); color: var(--color-navy); }
          &.tier-free { background: #E2E8F0; color: #475569; }
        }

        .btn-switch-tier {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          border: 1px solid var(--color-border);
          background: #FFFFFF;
          font-size: 12px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;

          &:hover {
            background: var(--color-navy);
            color: #FFFFFF;
          }
        }
      }

      .status-pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 11px;
        font-weight: 800;
        padding: 3px 8px;
        border-radius: var(--radius-full);

        &.active {
          background: rgba(16, 185, 129, 0.1);
          color: var(--color-success);

          .dot-green {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: var(--color-success);
          }
        }

        &.suspended {
          background: rgba(239, 68, 68, 0.1);
          color: var(--color-danger);

          .dot-red {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: var(--color-danger);
          }
        }
      }

      .xp-val {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-weight: 800;
        color: var(--color-navy);
      }

      .date-cell {
        font-size: 11.5px;
        color: var(--color-text-secondary);
      }

      .actions-cell {
        display: flex;
        justify-content: flex-end;
        align-items: center;
        gap: 8px;

        .btn-action {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 4px 9px;
          border-radius: var(--radius-sm);
          font-size: 11.5px;
          font-weight: 700;
          cursor: pointer;
          border: 1px solid var(--color-border);
          background: #FFFFFF;
          transition: all 0.15s ease;

          &.btn-warn:hover {
            background: #FEF3C7;
            border-color: #F59E0B;
            color: #B45309;
          }

          &.btn-succ {
            background: rgba(16, 185, 129, 0.1);
            border-color: var(--color-success);
            color: var(--color-success);

            &:hover {
              background: var(--color-success);
              color: #FFFFFF;
            }
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

    /* MODAL */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(3, 36, 71, 0.5);
      backdrop-filter: blur(4px);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }

    .modal-card {
      width: 100%;
      max-width: 520px;
      padding: 28px;
      background: #FFFFFF;
      border-radius: var(--radius-lg);

      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;

        .modal-title {
          font-size: 18px;
          font-weight: 800;
          color: var(--color-navy);
          margin: 0;
        }

        .btn-close {
          background: none;
          border: none;
          font-size: 16px;
          cursor: pointer;
          color: var(--color-text-secondary);
        }
      }

      .create-form {
        display: flex;
        flex-direction: column;
        gap: 14px;

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;

          label {
            font-size: 12px;
            font-weight: 700;
            color: var(--color-navy);
          }
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 10px;
          padding-top: 14px;
          border-top: 1px solid var(--color-border);
        }
      }
    }
  `]
})
export class AdminUsersComponent {
  private adminService = inject(AdminService);
  private confirmService = inject(ConfirmDialogService);

  users = this.adminService.getUsers();
  searchQuery = '';
  selectedRole = 'ALL';
  selectedTier = 'ALL';
  currentPage = 1;
  pageSize = 10;

  showCreateModal = false;
  newUserData: Partial<User> = {
    role: 'CREATOR',
    subscriptionTier: 'FREE'
  };

  // COUNTERS
  starterCount = computed(() => this.users().filter(u => u.subscriptionTier === 'STARTER').length);
  freeCount = computed(() => this.users().filter(u => u.subscriptionTier === 'FREE' && u.role === 'CREATOR').length);
  learnersCount = computed(() => this.users().filter(u => u.role === 'LEARNER').length);
  suspendedCount = computed(() => this.users().filter(u => u.status === 'SUSPENDED').length);

  filteredUsers(): User[] {
    return this.users().filter(user => {
      // Search
      const q = this.searchQuery.toLowerCase().trim();
      const matchSearch = !q ||
        user.prenom.toLowerCase().includes(q) ||
        user.nom.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q) ||
        (user.organization && user.organization.toLowerCase().includes(q));

      // Role
      const matchRole = this.selectedRole === 'ALL' || user.role === this.selectedRole;

      // Tier
      const matchTier = this.selectedTier === 'ALL' || user.subscriptionTier === this.selectedTier;

      return matchSearch && matchRole && matchTier;
    });
  }

  paginatedUsers(): User[] {
    const list = this.filteredUsers();
    const maxPage = Math.max(1, Math.ceil(list.length / this.pageSize));
    if (this.currentPage > maxPage) {
      this.currentPage = maxPage;
    }
    const start = (this.currentPage - 1) * this.pageSize;
    return list.slice(start, start + this.pageSize);
  }

  resetPage(): void {
    this.currentPage = 1;
  }

  setRoleFilter(role: string): void {
    this.selectedRole = role;
    this.resetPage();
  }

  setTierFilter(tier: string): void {
    this.selectedTier = tier;
    this.resetPage();
  }

  async confirmSwitchTier(user: User) {
    const nextTier: SubscriptionTier = user.subscriptionTier === 'STARTER' ? 'FREE' : 'STARTER';
    const confirmed = await this.confirmService.confirm({
      title: `Basculer vers le forfait ${nextTier} ?`,
      message: `Souhaitez-vous modifier le forfait de ${user.prenom} ${user.nom} de ${user.subscriptionTier} vers ${nextTier} ?`,
      confirmText: `Passer en ${nextTier}`,
      variant: 'primary',
      icon: 'zap'
    });
    if (confirmed) {
      this.adminService.updateUserTier(user.id, nextTier);
    }
  }

  async confirmToggleSuspend(user: User) {
    const isSuspending = user.status !== 'SUSPENDED';
    const confirmed = await this.confirmService.confirm({
      title: isSuspending ? 'Suspendre ce compte utilisateur ?' : 'Réactiver ce compte ?',
      message: isSuspending
        ? `Le compte de ${user.prenom} ${user.nom} sera immédiatement bloqué. L'utilisateur ne pourra plus animer de quiz ni se connecter.`
        : `Le compte de ${user.prenom} ${user.nom} sera réactivé avec l'ensemble de ses données pédagogiques.`,
      confirmText: isSuspending ? 'Confirmer la Suspension' : 'Réactiver le Compte',
      variant: isSuspending ? 'danger' : 'primary',
      icon: 'shield'
    });
    if (confirmed) {
      this.adminService.toggleUserStatus(user.id);
    }
  }

  async confirmDeleteUser(user: User) {
    const confirmed = await this.confirmService.confirm({
      title: `Supprimer définitivement ${user.prenom} ${user.nom} ?`,
      message: `Attention : cette opération est irréversible. Tous les quiz, classes et historiques associés à ce compte seront effacés de la base centrale.`,
      confirmText: 'Supprimer Définitivement',
      variant: 'danger',
      icon: 'trash'
    });
    if (confirmed) {
      this.adminService.deleteUser(user.id);
    }
  }

  openCreateModal() {
    this.newUserData = {
      prenom: '',
      nom: '',
      email: '',
      role: 'CREATOR',
      subscriptionTier: 'FREE',
      organization: '',
      phoneNumber: ''
    };
    this.fieldErrors = {};
    this.showCreateModal = true;
  }

  fieldErrors: Record<string, string> = {};

  clearFieldError(field: string): void {
    if (this.fieldErrors[field]) {
      const updated = { ...this.fieldErrors };
      delete updated[field];
      this.fieldErrors = updated;
    }
  }

  handleCreateUser() {
    this.fieldErrors = {};
    if (!this.newUserData.prenom?.trim()) {
      this.fieldErrors['prenom'] = 'Le prénom est obligatoire.';
    }
    if (!this.newUserData.nom?.trim()) {
      this.fieldErrors['nom'] = 'Le nom est obligatoire.';
    }
    if (!this.newUserData.email?.trim()) {
      this.fieldErrors['email'] = 'L\'adresse email est obligatoire.';
    } else if (!this.newUserData.email.includes('@')) {
      this.fieldErrors['email'] = 'Format d\'email invalide (ex: utilisateur@domaine.com).';
    }

    if (Object.keys(this.fieldErrors).length > 0) return;

    this.adminService.createUser(this.newUserData);
    this.showCreateModal = false;
  }
}
