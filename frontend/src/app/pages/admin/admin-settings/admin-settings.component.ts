import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { PlatformSettings } from '../../../core/models/admin.model';
import { IconComponent } from '../../../shared/components/icon/icon.component';

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div class="admin-settings-page animate-fade-in">
      <!-- HEADER -->
      <div class="page-header">
        <div>
          <h1 class="h1">Configuration Globale & Quotas</h1>
          <p class="body-small">Ajustement des quotas des formules, des connecteurs de paiement et du mode maintenance.</p>
        </div>

        <button type="button" class="btn btn-primary btn-sm" (click)="saveSettings()">
          <app-icon name="check" [size]="15" color="var(--color-navy)"></app-icon>
          <span>Enregistrer les Réglages</span>
        </button>
      </div>

      <div class="settings-grid">
        <!-- 1. QUOTAS FORMULE GRATUITE & PRIX -->
        <div class="card settings-card">
          <div class="card-head">
            <h3 class="h3" style="margin: 0; font-size: 16px;">Plafonds & Quotas Formule FREE</h3>
            <span class="badge badge-primary">Règles SaaS</span>
          </div>

          <div class="form-body">
            <div class="form-group">
              <label>Nombre Maximum de Quiz Actifs par Formateur Gratuit</label>
              <input type="number" [(ngModel)]="currentSettings.freeMaxQuizzes" class="input-field" min="1" max="10">
              <span class="hint">Au-delà de cette limite, le formateur est invité à passer en formule STARTER.</span>
            </div>

            <div class="form-group">
              <label>Participants Maximum par Arène Live (Formule FREE)</label>
              <input type="number" [(ngModel)]="currentSettings.freeMaxLiveParticipants" class="input-field" min="5" max="50">
              <span class="hint">Recommandé : 25 participants pour le format gratuit, 200 pour le format STARTER.</span>
            </div>

            <div class="form-group">
              <label>Générations d'Évaluations par IA par Mois (FREE)</label>
              <input type="number" [(ngModel)]="currentSettings.freeAiCreditsMonth" class="input-field" min="1" max="20">
              <span class="hint">Quota mensuel réinitialisé le 1er de chaque mois.</span>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Tarif STARTER Mensuel (FCFA)</label>
                <input type="number" [(ngModel)]="currentSettings.starterPriceFcfa" class="input-field">
              </div>
              <div class="form-group">
                <label>Tarif STARTER Mensuel (USD $)</label>
                <input type="number" [(ngModel)]="currentSettings.starterPriceUsd" class="input-field">
              </div>
            </div>
          </div>
        </div>

        <!-- 2. CONNECTEURS DE PAIEMENT MOBILE MONEY -->
        <div class="card settings-card">
          <div class="card-head">
            <h3 class="h3" style="margin: 0; font-size: 16px;">Passerelles de Paiement Actives</h3>
            <span class="badge badge-orange">Fintech</span>
          </div>

          <div class="gateways-toggles-list">
            <!-- WAVE -->
            <div class="toggle-row">
              <div class="toggle-info">
                <div class="gw-title-wrap">
                  <span class="dot-gw wave"></span>
                  <strong>Wave Mobile Money (Sénégal & Côte d'Ivoire)</strong>
                </div>
                <p class="body-small text-muted">Passerelle prioritaire à 1% de frais. Recommandée pour l'Afrique de l'Ouest.</p>
              </div>
              <label class="switch-toggle">
                <input type="checkbox" [(ngModel)]="currentSettings.waveActive">
                <span class="slider"></span>
              </label>
            </div>

            <!-- ORANGE MONEY -->
            <div class="toggle-row">
              <div class="toggle-info">
                <div class="gw-title-wrap">
                  <span class="dot-gw om"></span>
                  <strong>Orange Money (UEMOA & Mali)</strong>
                </div>
                <p class="body-small text-muted">API Web & Mobile Money Orange Money Pay.</p>
              </div>
              <label class="switch-toggle">
                <input type="checkbox" [(ngModel)]="currentSettings.omActive">
                <span class="slider"></span>
              </label>
            </div>

            <!-- STRIPE -->
            <div class="toggle-row">
              <div class="toggle-info">
                <div class="gw-title-wrap">
                  <span class="dot-gw stripe"></span>
                  <strong>Stripe (Cartes Bancaires Internationales)</strong>
                </div>
                <p class="body-small text-muted">Visa, Mastercard et devises étrangères pour la diaspora et le Maghreb.</p>
              </div>
              <label class="switch-toggle">
                <input type="checkbox" [(ngModel)]="currentSettings.stripeActive">
                <span class="slider"></span>
              </label>
            </div>
          </div>
        </div>

        <!-- 3. MODE MAINTENANCE & INFOS SYSTÈME -->
        <div class="card settings-card full-span">
          <div class="card-head">
            <h3 class="h3" style="margin: 0; font-size: 16px;">Disponibilité & Mode Maintenance</h3>
            @if (currentSettings.isMaintenanceMode) {
              <span class="badge badge-orange">MAINTENANCE EN COURS</span>
            } @else {
              <span class="badge badge-primary">EN SERVICE</span>
            }
          </div>

          <div class="maintenance-box">
            <div class="maintenance-toggle-row">
              <div>
                <strong>Activer le Mode Maintenance Plateforme</strong>
                <p class="body-small text-muted">Lorsque ce mode est activé, seuls les administrateurs peuvent se connecter. Les apprenants et formateurs voient une page d'information soignée.</p>
              </div>

              <label class="switch-toggle">
                <input type="checkbox" [(ngModel)]="currentSettings.isMaintenanceMode">
                <span class="slider"></span>
              </label>
            </div>

            <div class="form-group" style="margin-top: 14px;">
              <label>Message public affiché aux utilisateurs</label>
              <textarea 
                [(ngModel)]="currentSettings.maintenanceMessage" 
                rows="3" 
                class="input-field" 
                placeholder="Message explicatif..."></textarea>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .admin-settings-page {
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

    .settings-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;

      @media (max-width: 992px) {
        grid-template-columns: 1fr;
      }

      .settings-card {
        padding: 24px;
        display: flex;
        flex-direction: column;
        gap: 18px;

        &.full-span {
          grid-column: 1 / -1;
        }

        .card-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .form-body {
          display: flex;
          flex-direction: column;
          gap: 16px;

          .form-group {
            display: flex;
            flex-direction: column;
            gap: 6px;

            label {
              font-size: 12.5px;
              font-weight: 700;
              color: var(--color-navy);
            }

            .hint {
              font-size: 11px;
              color: var(--color-text-secondary);
            }
          }

          .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
          }
        }
      }
    }

    .gateways-toggles-list {
      display: flex;
      flex-direction: column;
      gap: 14px;

      .toggle-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 14px 16px;
        background: var(--color-background);
        border-radius: var(--radius-sm);
        gap: 16px;

        .toggle-info {
          display: flex;
          flex-direction: column;
          gap: 3px;

          .gw-title-wrap {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 13.5px;
            color: var(--color-navy);

            .dot-gw {
              width: 8px;
              height: 8px;
              border-radius: 50%;

              &.wave { background: #00D2D3; }
              &.om { background: #FF6600; }
              &.stripe { background: #6366F1; }
            }
          }
        }
      }
    }

    .maintenance-box {
      background: var(--color-background);
      border-radius: var(--radius-sm);
      padding: 16px;

      .maintenance-toggle-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
      }
    }

    /* SWITCH TOGGLE */
    .switch-toggle {
      position: relative;
      display: inline-block;
      width: 44px;
      height: 24px;
      flex-shrink: 0;

      input {
        opacity: 0;
        width: 0;
        height: 0;

        &:checked + .slider {
          background-color: var(--color-primary);

          &:before {
            transform: translateX(20px);
            background-color: var(--color-navy);
          }
        }
      }

      .slider {
        position: absolute;
        cursor: pointer;
        inset: 0;
        background-color: #CBD5E1;
        transition: .2s;
        border-radius: 24px;

        &:before {
          position: absolute;
          content: "";
          height: 18px;
          width: 18px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: .2s;
          border-radius: 50%;
        }
      }
    }
  `]
})
export class AdminSettingsComponent {
  private adminService = inject(AdminService);
  private confirmService = inject(ConfirmDialogService);

  currentSettings: PlatformSettings = { ...this.adminService.getSettings()() };

  async saveSettings() {
    const confirmed = await this.confirmService.confirm({
      title: 'Enregistrer la configuration de la plateforme ?',
      message: 'Les nouveaux quotas, états de passerelles et règles d\'accès prendront effet immédiatement sur l\'ensemble des comptes formateurs et apprenants.',
      confirmText: 'Valider et Appliquer',
      variant: 'primary',
      icon: 'check'
    });
    if (confirmed) {
      this.adminService.updateSettings(this.currentSettings);
    }
  }
}
