import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { TransactionRecord } from '../../../core/models/admin.model';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-admin-finances',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, PaginationComponent],
  template: `
    <div class="admin-finances-page animate-fade-in">
      <!-- HEADER -->
      <div class="page-header">
        <div>
          <h1 class="h1">Finances & Abonnements SaaS</h1>
          <p class="body-small">Suivi des flux de facturation Wave, Orange Money et Stripe, gestion des licences et MRR.</p>
        </div>

        <button type="button" class="btn btn-primary btn-sm" (click)="showLicenseModal = true">
          <app-icon name="award" [size]="15" color="var(--color-navy)"></app-icon>
          <span>Accorder une Licence Partenaire</span>
        </button>
      </div>

      <!-- KPI METRICS -->
      <div class="kpi-finances-grid">
        <div class="card kpi-fin-card">
          <span class="lbl">Revenu Récurrent Mensuel (MRR)</span>
          <div class="val text-success">{{ metrics().mrrFcfa | number }} FCFA</div>
          <span class="sub">~{{ metrics().mrrUsd }} $ USD • Base de 420 formateurs payants</span>
        </div>

        <div class="card kpi-fin-card">
          <span class="lbl">Projection Annuelle (ARR)</span>
          <div class="val text-navy">17 760 000 FCFA</div>
          <span class="sub">+18.4% de croissance par trimestre</span>
        </div>

        <div class="card kpi-fin-card">
          <span class="lbl">Taux de Rétention Formateurs</span>
          <div class="val text-primary">94.2%</div>
          <span class="sub">Moins de 2.1% de churn mensuel</span>
        </div>

        <div class="card kpi-fin-card">
          <span class="lbl">Volume Total Collecté</span>
          <div class="val">8 420 000 FCFA</div>
          <span class="sub">Depuis le lancement officiel</span>
        </div>
      </div>

      <!-- PAYMENT OPERATORS DISTRIBUTION -->
      <div class="card gateways-card">
        <div class="card-title-row">
          <h3 class="h3" style="margin: 0; font-size: 16px;">Répartition par Opérateur de Paiement</h3>
          <span class="badge badge-primary">Afrique de l'Ouest & International</span>
        </div>

        <div class="gateways-grid">
          <!-- WAVE -->
          <div class="gateway-box wave">
            <div class="gw-top">
              <span class="gw-name">Wave Mobile Money</span>
              <span class="gw-share">65% du volume</span>
            </div>
            <div class="gw-amount">962 000 FCFA / mois</div>
            <div class="gw-progress">
              <div class="gw-fill" style="width: 65%;"></div>
            </div>
            <span class="gw-fees">Frais opérateur : 1% • Sénégal & Côte d'Ivoire</span>
          </div>

          <!-- ORANGE MONEY -->
          <div class="gateway-box om">
            <div class="gw-top">
              <span class="gw-name">Orange Money</span>
              <span class="gw-share">25% du volume</span>
            </div>
            <div class="gw-amount">370 000 FCFA / mois</div>
            <div class="gw-progress">
              <div class="gw-fill" style="width: 25%;"></div>
            </div>
            <span class="gw-fees">Frais opérateur : 1.5% • Mali, CI, SN</span>
          </div>

          <!-- STRIPE / CARTES -->
          <div class="gateway-box stripe">
            <div class="gw-top">
              <span class="gw-name">Stripe & Cartes Bancaires</span>
              <span class="gw-share">10% du volume</span>
            </div>
            <div class="gw-amount">148 000 FCFA / mois</div>
            <div class="gw-progress">
              <div class="gw-fill" style="width: 10%;"></div>
            </div>
            <span class="gw-fees">Visa / Mastercard / Maghreb & Europe</span>
          </div>
        </div>
      </div>

      <!-- TRANSACTIONS TABLE -->
      <div class="card table-container">
        <div class="table-header-strip">
          <div>
            <h3 class="h3" style="margin: 0; font-size: 15px;">Historique des Règlements & Souscriptions</h3>
            <p class="body-small text-muted" style="margin: 2px 0 0 0;">Transactions enregistrées en temps réel.</p>
          </div>

          <div class="tx-filters">
            <button 
              type="button" 
              class="filter-pill"
              [class.active]="selectedMethod === 'ALL'"
              (click)="setMethodFilter('ALL')">
              Toutes
            </button>
            <button
              type="button"
              class="filter-pill"
              [class.active]="selectedMethod === 'PAYDUNYA'"
              (click)="setMethodFilter('PAYDUNYA')">
              PayDunya
            </button>
            <button
              type="button"
              class="filter-pill"
              [class.active]="selectedMethod === 'WAVE'"
              (click)="setMethodFilter('WAVE')">
              Wave
            </button>
            <button
              type="button"
              class="filter-pill"
              [class.active]="selectedMethod === 'ORANGE_MONEY'"
              (click)="setMethodFilter('ORANGE_MONEY')">
              Orange Money
            </button>
            <button 
              type="button" 
              class="filter-pill" 
              [class.active]="selectedMethod === 'STRIPE'" 
              (click)="setMethodFilter('STRIPE')">
              Stripe
            </button>
          </div>
        </div>

        <table class="data-table">
          <thead>
            <tr>
              <th>Réf. Transaction</th>
              <th>Utilisateur / Établissement</th>
              <th>Formule</th>
              <th>Montant FCFA</th>
              <th>Moyen de Paiement</th>
              <th>Statut</th>
              <th>Date</th>
              <th style="text-align: right;">Reçu</th>
            </tr>
          </thead>
          <tbody>
            @for (tx of paginatedTransactions(); track tx.id) {
              <tr>
                <td>
                  <span class="ref-badge">{{ tx.reference }}</span>
                </td>

                <td>
                  <div>
                    <strong>{{ tx.userName }}</strong>
                    <div class="body-small text-muted">{{ tx.organization || tx.userEmail }}</div>
                  </div>
                </td>

                <td>
                  <span class="badge badge-primary">STARTER</span>
                </td>

                <td>
                  <strong>{{ tx.amountFcfa | number }} FCFA</strong>
                  <div class="body-small text-muted">{{ tx.amountUsd }} $</div>
                </td>

                <td>
                  <span class="pay-method-badge" [ngClass]="'method-' + tx.paymentMethod.toLowerCase()">
                    {{ tx.paymentMethod }}
                  </span>
                </td>

                <td>
                  @if (tx.status === 'PAID') {
                    <span class="status-pill paid">Payé</span>
                  } @else if (tx.status === 'REFUNDED') {
                    <span class="status-pill refunded">Remboursé</span>
                  } @else {
                    <span class="status-pill pending">En attente</span>
                  }
                </td>

                <td class="date-cell">{{ tx.date || (tx.createdAt | date:'yyyy-MM-dd') }}</td>

                <td style="text-align: right;">
                  <button type="button" class="btn btn-outline btn-xs" (click)="downloadReceipt(tx)">
                    <app-icon name="file-text" [size]="12"></app-icon>
                    <span>Reçu PDF</span>
                  </button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <app-pagination
        [currentPage]="currentPage"
        [pageSize]="pageSize"
        [totalItems]="filteredTransactions().length"
        (pageChange)="currentPage = $event">
      </app-pagination>

      <!-- MODAL ACCORDER LICENCE -->
      @if (showLicenseModal) {
        <div class="modal-backdrop animate-fade-in" (click)="showLicenseModal = false">
          <div class="modal-card card animate-scale-up" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2 class="modal-title">Accorder une Licence Partenaire STARTER</h2>
              <button type="button" class="btn-close" (click)="showLicenseModal = false">✕</button>
            </div>

            <form (ngSubmit)="handleGrantLicense()" class="license-form">
              <div class="form-group">
                <label>Nom de l'Université ou Entreprise Partenaire *</label>
                <input 
                  type="text" 
                  [(ngModel)]="licensePartner" 
                  name="licensePartner" 
                  class="input-field" 
                  placeholder="ex: Université Gaston Berger de Saint-Louis" 
                  [class.input-error]="fieldErrors['partner']"
                  (input)="clearFieldError('partner')"
                  required>
                @if (fieldErrors['partner']) {
                  <span class="field-error-msg">
                    <app-icon name="alert" [size]="13" color="var(--color-danger)"></app-icon>
                    <span>{{ fieldErrors['partner'] }}</span>
                  </span>
                }
              </div>

              <div class="form-group">
                <label>Email du Formateur / Doyen Référent *</label>
                <input 
                  type="email" 
                  [(ngModel)]="licenseEmail" 
                  name="licenseEmail" 
                  class="input-field" 
                  placeholder="ex: doyen.faseg@ugb.edu.sn" 
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

              <div class="form-group">
                <label>Durée de la Licence Gratuite / Partenariat *</label>
                <select [(ngModel)]="licenseDuration" name="licenseDuration" class="input-field">
                  <option value="6">6 Mois (Semestre Académique)</option>
                  <option value="12">12 Mois (Année Universitaire Complète)</option>
                  <option value="24">24 Mois (Convention Partenaire)</option>
                </select>
              </div>

              <div class="modal-actions">
                <button type="button" class="btn btn-outline" (click)="showLicenseModal = false">Annuler</button>
                <button type="submit" class="btn btn-primary" [disabled]="!licensePartner || !licenseEmail">
                  <app-icon name="check" [size]="15" color="var(--color-navy)"></app-icon>
                  <span>Activer la Licence STARTER</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .admin-finances-page {
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

    .kpi-finances-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;

      @media (max-width: 1100px) {
        grid-template-columns: repeat(2, 1fr);
      }

      @media (max-width: 600px) {
        grid-template-columns: 1fr;
      }

      .kpi-fin-card {
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 6px;

        .lbl {
          font-size: 12px;
          font-weight: 700;
          color: var(--color-text-secondary);
          text-transform: uppercase;
        }

        .val {
          font-size: 26px;
          font-weight: 900;
          color: var(--color-navy);

          &.text-success { color: var(--color-success); }
          &.text-primary { color: #D97706; }
          &.text-navy { color: var(--color-navy); }
        }

        .sub {
          font-size: 11.5px;
          color: var(--color-text-secondary);
        }
      }
    }

    .gateways-card {
      padding: 22px;
      display: flex;
      flex-direction: column;
      gap: 18px;

      .card-title-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .gateways-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 16px;

        @media (max-width: 900px) {
          grid-template-columns: 1fr;
        }

        .gateway-box {
          padding: 18px;
          border-radius: var(--radius-md);
          display: flex;
          flex-direction: column;
          gap: 10px;
          background: var(--color-background);
          border: 1px solid var(--color-border);

          .gw-top {
            display: flex;
            justify-content: space-between;
            align-items: center;

            .gw-name {
              font-size: 13.5px;
              font-weight: 800;
              color: var(--color-navy);
            }

            .gw-share {
              font-size: 11.5px;
              font-weight: 800;
              color: var(--color-text-secondary);
            }
          }

          .gw-amount {
            font-size: 20px;
            font-weight: 900;
            color: var(--color-navy);
          }

          .gw-progress {
            width: 100%;
            height: 7px;
            background: #E2E8F0;
            border-radius: var(--radius-full);
            overflow: hidden;

            .gw-fill {
              height: 100%;
              border-radius: var(--radius-full);
            }
          }

          &.wave .gw-fill { background: #00D2D3; }
          &.om .gw-fill { background: #FF6600; }
          &.stripe .gw-fill { background: #6366F1; }

          .gw-fees {
            font-size: 11px;
            color: var(--color-text-secondary);
          }
        }
      }
    }

    .table-container {
      padding: 0;
      overflow-x: auto;

      .table-header-strip {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 18px 20px;
        border-bottom: 1px solid var(--color-border);
        flex-wrap: wrap;
        gap: 12px;

        .tx-filters {
          display: flex;
          background: var(--color-background);
          padding: 3px;
          border-radius: var(--radius-full);
          gap: 3px;

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

      .ref-badge {
        font-family: monospace;
        font-size: 12px;
        font-weight: 700;
        color: var(--color-navy);
        background: #F1F5F9;
        padding: 3px 6px;
        border-radius: 4px;
      }

      .pay-method-badge {
        font-size: 10.5px;
        font-weight: 800;
        padding: 2px 7px;
        border-radius: 4px;

        &.method-wave { background: rgba(0, 210, 211, 0.15); color: #008489; }
        &.method-orange_money { background: rgba(255, 102, 0, 0.15); color: #C44D00; }
        &.method-stripe { background: rgba(99, 102, 241, 0.15); color: #4338CA; }
      }

      .status-pill {
        font-size: 10.5px;
        font-weight: 800;
        padding: 3px 8px;
        border-radius: var(--radius-full);

        &.paid { background: rgba(16, 185, 129, 0.15); color: var(--color-success); }
        &.refunded { background: rgba(239, 68, 68, 0.15); color: var(--color-danger); }
        &.pending { background: rgba(245, 158, 11, 0.15); color: #B45309; }
      }

      .btn-xs {
        padding: 4px 8px;
        font-size: 11px;
        display: inline-flex;
        align-items: center;
        gap: 4px;
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
      max-width: 480px;
      padding: 26px;
      background: #FFFFFF;
      border-radius: var(--radius-lg);

      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 18px;

        .modal-title {
          font-size: 17px;
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

      .license-form {
        display: flex;
        flex-direction: column;
        gap: 14px;

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
export class AdminFinancesComponent {
  private adminService = inject(AdminService);
  private confirmService = inject(ConfirmDialogService);

  metrics = this.adminService.getMetrics();
  transactions = this.adminService.getTransactions();

  selectedMethod = 'ALL';
  currentPage = 1;
  pageSize = 10;
  showLicenseModal = false;

  licensePartner = '';
  licenseEmail = '';
  licenseDuration = '12';
  fieldErrors: Record<string, string> = {};

  clearFieldError(field: string): void {
    if (this.fieldErrors[field]) {
      const updated = { ...this.fieldErrors };
      delete updated[field];
      this.fieldErrors = updated;
    }
  }

  filteredTransactions(): TransactionRecord[] {
    return this.transactions().filter(tx => {
      return this.selectedMethod === 'ALL' || tx.paymentMethod === this.selectedMethod;
    });
  }

  paginatedTransactions(): TransactionRecord[] {
    const list = this.filteredTransactions();
    const maxPage = Math.max(1, Math.ceil(list.length / this.pageSize));
    if (this.currentPage > maxPage) {
      this.currentPage = maxPage;
    }
    const start = (this.currentPage - 1) * this.pageSize;
    return list.slice(start, start + this.pageSize);
  }

  setMethodFilter(method: string): void {
    this.selectedMethod = method;
    this.currentPage = 1;
  }

  async downloadReceipt(tx: TransactionRecord) {
    const confirmed = await this.confirmService.confirm({
      title: 'Télécharger le reçu fiscal ?',
      message: `Génération du justificatif officiel pour la transaction ${tx.reference} d'un montant de ${tx.amountFcfa} FCFA payée via ${tx.paymentMethod}.`,
      confirmText: 'Télécharger le Reçu PDF',
      variant: 'primary',
      icon: 'file-text'
    });
    if (confirmed) {
      // Mock download
    }
  }

  async handleGrantLicense() {
    this.fieldErrors = {};
    if (!this.licensePartner.trim()) {
      this.fieldErrors['partner'] = 'Le nom de l\'université ou entreprise est obligatoire.';
    }
    if (!this.licenseEmail.trim()) {
      this.fieldErrors['email'] = 'L\'adresse email est obligatoire.';
    } else if (!this.licenseEmail.includes('@')) {
      this.fieldErrors['email'] = 'Format d\'adresse email invalide.';
    }

    if (Object.keys(this.fieldErrors).length > 0) return;

    const confirmed = await this.confirmService.confirm({
      title: 'Confirmer l\'activation de la licence ?',
      message: `Une licence STARTER gratuite de ${this.licenseDuration} mois sera attribuée à ${this.licensePartner} (${this.licenseEmail}).`,
      confirmText: 'Activer la Licence',
      variant: 'primary',
      icon: 'award'
    });
    if (confirmed) {
      this.showLicenseModal = false;
      this.licensePartner = '';
      this.licenseEmail = '';
      this.fieldErrors = {};
    }
  }
}
