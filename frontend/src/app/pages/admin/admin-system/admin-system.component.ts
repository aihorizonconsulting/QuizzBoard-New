import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { AuditLog } from '../../../core/models/admin.model';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-admin-system',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, PaginationComponent],
  template: `
    <div class="admin-system-page animate-fade-in">
      <!-- HEADER -->
      <div class="page-header">
        <div>
          <h1 class="h1">Surveillance Système, Quotas IA & Audit</h1>
          <p class="body-small">État réel des services, usage de l'IA, sessions Live en cours et journal d'audit des administrateurs.</p>
        </div>

        <button type="button" class="btn btn-outline btn-sm" (click)="exportAuditLogs()">
          <app-icon name="download" [size]="15"></app-icon>
          <span>Exporter Journal d'Audit</span>
        </button>
      </div>

      <!-- IA, INFRASTRUCTURE ET LIVE (données réelles) -->
      @if (stats(); as s) {
        <div class="infra-grid">
          <div class="card infra-card">
            <div class="infra-head">
              <div class="infra-title-wrap">
                <span class="infra-icon-dot google"></span>
                <strong>Intelligence artificielle</strong>
              </div>
              <span class="badge badge-primary">Génération IA</span>
            </div>
            <div class="infra-body">
              <div class="metric-line">
                <span>Générations ce mois :</span>
                <strong>{{ s.aiGenerationsThisMonth | number }} (quiz et cours)</strong>
              </div>
              <div class="metric-line">
                <span>Google Gemini :</span>
                <strong [class.text-success]="service('gemini')?.status === 'UP'">{{ service('gemini')?.detail }}</strong>
              </div>
              <div class="metric-line">
                <span>Groq :</span>
                <strong [class.text-success]="service('groq')?.status === 'UP'">{{ service('groq')?.detail }}</strong>
              </div>
            </div>
          </div>

          <div class="card infra-card">
            <div class="infra-head">
              <div class="infra-title-wrap">
                <span class="infra-icon-dot groq"></span>
                <strong>Serveurs & services</strong>
              </div>
              <span class="badge badge-orange">Vérifié à {{ s.checkedAt | date:'HH:mm' }}</span>
            </div>
            <div class="infra-body">
              @for (id of ['database', 'redis', 'smtp', 'paydunya']; track id) {
                <div class="metric-line">
                  <span>{{ service(id)?.name }} :</span>
                  <strong [class.text-success]="service(id)?.status === 'UP'">{{ service(id)?.detail }}</strong>
                </div>
              }
            </div>
          </div>

          <div class="card infra-card">
            <div class="infra-head">
              <div class="infra-title-wrap">
                <span class="infra-icon-dot ws"></span>
                <strong>Sessions Live</strong>
              </div>
              <span class="badge badge-navy">Temps Réel</span>
            </div>
            <div class="infra-body">
              <div class="metric-line">
                <span>Sessions en cours :</span>
                <strong class="text-primary">{{ s.activeLiveSessions }}</strong>
              </div>
              <div class="metric-line">
                <span>Joueurs dans ces sessions :</span>
                <strong class="text-navy">{{ s.activeLivePlayers }}</strong>
              </div>
              <div class="metric-line">
                <span>Sessions créées ce mois :</span>
                <strong>{{ s.liveSessionsThisMonth }}</strong>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- SECURITY AUDIT TRAIL -->
      <div class="card audit-card">
        <div class="audit-header">
          <div>
            <h3 class="h3" style="margin: 0; font-size: 16px;">Journal d'Audit & Traçabilité de Sécurité</h3>
            <p class="body-small text-muted" style="margin: 2px 0 0 0;">Historique immuable de chaque action opérée par les administrateurs.</p>
          </div>

          <div class="audit-search-wrap">
            <app-icon name="search" [size]="14" color="var(--color-text-secondary)"></app-icon>
            <input 
              type="text" 
              [(ngModel)]="searchLog" 
              (ngModelChange)="currentPage = 1"
              placeholder="Filtrer les logs..." 
              class="search-mini">
          </div>
        </div>

        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Horodatage</th>
                <th>Sévérité</th>
                <th>Administrateur</th>
                <th>Action Opérée</th>
                <th>Cible</th>
                <th>Adresse IP & Géolocalisation</th>
              </tr>
            </thead>
            <tbody>
              @for (log of paginatedLogs(); track log.id) {
                <tr>
                  <td class="time-cell">
                    <strong>{{ log.timestamp | date:'dd/MM/yyyy HH:mm' }}</strong>
                  </td>

                  <td>
                    <span class="sev-badge" [ngClass]="'sev-' + log.severity.toLowerCase()">
                      {{ log.severity }}
                    </span>
                  </td>

                  <td>
                    <span class="admin-name">{{ log.adminName }}</span>
                  </td>

                  <td>
                    <strong class="action-text">{{ log.action }}</strong>
                  </td>

                  <td>
                    <span class="target-text">{{ log.target }}</span>
                  </td>

                  <td class="ip-cell">
                    <code>{{ log.ipAddress || '-' }}</code>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <app-pagination
          [currentPage]="currentPage"
          [pageSize]="pageSize"
          [totalItems]="filteredLogs().length"
          (pageChange)="currentPage = $event">
        </app-pagination>
      </div>
    </div>
  `,
  styles: [`
    .admin-system-page {
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

    .infra-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;

      @media (max-width: 992px) {
        grid-template-columns: 1fr;
      }

      .infra-card {
        padding: 22px;
        display: flex;
        flex-direction: column;
        gap: 16px;

        .infra-head {
          display: flex;
          justify-content: space-between;
          align-items: center;

          .infra-title-wrap {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
            color: var(--color-navy);

            .infra-icon-dot {
              width: 10px;
              height: 10px;
              border-radius: 50%;

              &.google { background-color: #4285F4; box-shadow: 0 0 0 2px rgba(66, 133, 244, 0.25); }
              &.groq { background-color: #F97316; box-shadow: 0 0 0 2px rgba(249, 115, 22, 0.25); }
              &.ws { background-color: #10B981; box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.25); }
            }
          }
        }

        .infra-body {
          display: flex;
          flex-direction: column;
          gap: 10px;
          background: var(--color-background);
          border-radius: var(--radius-sm);
          padding: 14px;

          .metric-line {
            display: flex;
            justify-content: space-between;
            font-size: 12.5px;
            color: var(--color-text-secondary);

            strong {
              color: var(--color-navy);

              &.text-success { color: var(--color-success); }
              &.text-primary { color: #D97706; }
              &.text-navy { color: var(--color-navy); }
            }
          }
        }
      }
    }

    .audit-card {
      padding: 0;
      overflow: hidden;

      .audit-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 18px 20px;
        border-bottom: 1px solid var(--color-border);
        flex-wrap: wrap;
        gap: 12px;

        .audit-search-wrap {
          display: flex;
          align-items: center;
          background: var(--color-background);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          padding: 0 10px;
          height: 34px;
          gap: 6px;

          .search-mini {
            border: none;
            background: transparent;
            font-size: 12px;
            outline: none;
            color: var(--color-navy);
          }
        }
      }

      .table-wrap {
        overflow-x: auto;
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

      .time-cell {
        font-size: 12px;
        color: var(--color-text-secondary);
        white-space: nowrap;
      }

      .sev-badge {
        font-size: 9.5px;
        font-weight: 800;
        padding: 2px 7px;
        border-radius: 4px;
        text-transform: uppercase;

        &.sev-info { background: #E0F2FE; color: #0369A1; }
        &.sev-warning { background: #FEF3C7; color: #B45309; }
        &.sev-critical { background: #FEE2E2; color: #B91C1C; }
      }

      .admin-name {
        font-weight: 700;
        color: var(--color-navy);
      }

      .action-text {
        color: var(--color-navy);
      }

      .target-text {
        color: var(--color-text-secondary);
        font-size: 12px;
      }

      .ip-cell code {
        font-size: 11px;
        color: #64748B;
        background: #F1F5F9;
        padding: 2px 6px;
        border-radius: 4px;
      }
    }
  `]
})
export class AdminSystemComponent {
  private adminService = inject(AdminService);
  stats = this.adminService.getDashboard();

  constructor() {
    this.adminService.loadDashboard();
    this.adminService.loadAuditLogs();
  }

  service(id: string) {
    return this.stats()?.services.find(svc => svc.id === id);
  }
  auditLogs = this.adminService.getAuditLogs();

  searchLog = '';
  currentPage = 1;
  pageSize = 10;

  filteredLogs(): AuditLog[] {
    return this.auditLogs().filter(log => {
      const q = this.searchLog.toLowerCase().trim();
      return !q ||
        log.action.toLowerCase().includes(q) ||
        log.target.toLowerCase().includes(q) ||
        log.adminName.toLowerCase().includes(q) ||
        (log.ipAddress || '').toLowerCase().includes(q);
    });
  }

  paginatedLogs(): AuditLog[] {
    const list = this.filteredLogs();
    const maxPage = Math.max(1, Math.ceil(list.length / this.pageSize));
    if (this.currentPage > maxPage) {
      this.currentPage = maxPage;
    }
    const start = (this.currentPage - 1) * this.pageSize;
    return list.slice(start, start + this.pageSize);
  }

  exportAuditLogs() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.auditLogs(), null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `quizzboard_audit_logs_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }
}
