import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ParticipationService } from '../../../core/services/participation.service';
import { Certificate } from '../../../core/models/participation.model';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-certificates',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, IconComponent, PaginationComponent],
  template: `
    <div class="certificates-page animate-fade-in">
      <!-- =========================================================================
           VUE 1 : ANNUAIRE / LISTE DES CERTIFICATS
           ========================================================================= -->
      @if (!selectedCert) {
        <div class="page-header">
          <div>
            <h1 class="h1">Mes Certificats de Réussite</h1>
            <p class="body-small">Retrouvez vos attestations et diplômes officiels vérifiables avec code d'authenticité.</p>
          </div>

          <div class="badge badge-primary" style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; font-size: 13px; font-weight: 800;">
            <app-icon name="award" [size]="15" color="var(--color-navy)"></app-icon>
            <span>{{ certificates().length }} Certificat{{ certificates().length > 1 ? 's' : '' }} Obtenu{{ certificates().length > 1 ? 's' : '' }}</span>
          </div>
        </div>

        <!-- UNIFIED COMPACT SEARCH & FILTER TOOLBAR (IDENTICAL TO CREATOR PAGES) -->
        <div class="filter-toolbar card">
          <div class="search-box">
            <app-icon name="search" [size]="16" color="var(--color-text-secondary)"></app-icon>
            <input 
              type="text" 
              [(ngModel)]="searchQuery" 
              placeholder="Rechercher un certificat par titre ou code d'authenticité..." 
              class="search-input"
              (ngModelChange)="currentPage = 1">
            @if (searchQuery) {
              <button class="clear-btn" (click)="searchQuery = ''; currentPage = 1">✕</button>
            }
          </div>

          <div class="filter-pills">
            <button 
              type="button" 
              class="pill-btn" 
              [class.active]="filterScore === 'ALL'" 
              (click)="filterScore = 'ALL'; currentPage = 1">
              Tous ({{ certificates().length }})
            </button>
            <button 
              type="button" 
              class="pill-btn" 
              [class.active]="filterScore === 'EXCELLENT'" 
              (click)="filterScore = 'EXCELLENT'; currentPage = 1">
              Excellence (≥ 90%)
            </button>
            <button 
              type="button" 
              class="pill-btn" 
              [class.active]="filterScore === 'PASSED'" 
              (click)="filterScore = 'PASSED'; currentPage = 1">
              Réussite (80-89%)
            </button>
          </div>

          <div class="view-toggle-group">
            <button 
              type="button" 
              class="toggle-btn" 
              [class.active]="viewMode === 'grid'" 
              (click)="viewMode = 'grid'" 
              title="Grille">
              <app-icon name="grid" [size]="15"></app-icon>
            </button>
            <button 
              type="button" 
              class="toggle-btn" 
              [class.active]="viewMode === 'list'" 
              (click)="viewMode = 'list'" 
              title="Liste">
              <app-icon name="list" [size]="15"></app-icon>
            </button>
          </div>
        </div>

        <!-- CERTIFICATES LIST OR EMPTY -->
        @if (filteredCertificates().length === 0) {
          <div class="empty-state-box card">
            <div class="empty-icon-wrap">
              <app-icon name="award" [size]="28" color="var(--color-navy)"></app-icon>
            </div>
            <h3 class="empty-title">Aucun certificat trouvé</h3>
            <p class="empty-desc">
              Obtenez 80% ou plus à une évaluation pour décrocher automatiquement votre certificat d'excellence.
            </p>
            <a routerLink="/app/learner/classes" class="btn btn-primary btn-sm">
              <app-icon name="arrow-right" [size]="14" color="var(--color-navy)"></app-icon>
              <span>Accéder à mes Quiz de Classe</span>
            </a>
          </div>
        } @else {
          <!-- GRID VIEW (4 ITEMS PER ROW ON DESKTOP) -->
          @if (viewMode === 'grid') {
            <div class="certs-grid">
              @for (cert of paginatedCertificates(); track cert.id) {
                <div class="cert-item-card card card-interactive" (click)="openCertificate(cert)">
                  <div class="cert-card-top">
                    <div class="cert-seal">
                      <app-icon name="award" [size]="22" color="var(--color-navy)"></app-icon>
                    </div>

                    <span class="score-badge" [class.gold]="cert.scorePercent >= 90">
                      {{ cert.scorePercent >= 90 ? '🏆 Mention Très Bien' : '⭐ Mention Bien' }} • {{ cert.scorePercent }}%
                    </span>
                  </div>

                  <div class="cert-card-body">
                    <h3 class="cert-card-title">{{ cert.quizTitle }}</h3>
                    <span class="cert-issuer">{{ cert.issuerName }}</span>
                    <div class="cert-meta">
                      <span>Délivré le {{ cert.issuedAt }}</span>
                      <span class="cert-code">#{{ cert.verificationCode }}</span>
                    </div>
                  </div>

                  <div class="cert-card-actions" (click)="$event.stopPropagation()">
                    <button class="btn btn-primary btn-sm btn-full" (click)="openCertificate(cert)">
                      <app-icon name="award" [size]="14" color="var(--color-navy)"></app-icon>
                      <span>Consulter le Diplôme</span>
                    </button>
                  </div>
                </div>
              }
            </div>
          } @else {
            <!-- LIST VIEW -->
            <div class="certs-list">
              @for (cert of paginatedCertificates(); track cert.id) {
                <div class="cert-row card card-interactive" (click)="openCertificate(cert)">
                  <div class="row-seal">
                    <app-icon name="award" [size]="20" color="var(--color-navy)"></app-icon>
                  </div>

                  <div class="row-info">
                    <div class="row-tags">
                      <span class="score-badge" [class.gold]="cert.scorePercent >= 90">
                        {{ cert.scorePercent }}%
                      </span>
                      <span class="cert-code">#{{ cert.verificationCode }}</span>
                    </div>
                    <h3 class="row-title">{{ cert.quizTitle }}</h3>
                    <span class="body-small text-muted">{{ cert.issuerName }} • Délivré le {{ cert.issuedAt }}</span>
                  </div>

                  <div class="row-action" (click)="$event.stopPropagation()">
                    <button class="btn btn-primary btn-sm" (click)="openCertificate(cert)">
                      <span>Consulter</span>
                      <app-icon name="arrow-right" [size]="13" color="var(--color-navy)"></app-icon>
                    </button>
                  </div>
                </div>
              }
            </div>
          }

          <!-- PAGINATION -->
          <app-pagination 
            [currentPage]="currentPage" 
            [pageSize]="pageSize" 
            [totalItems]="filteredCertificates().length" 
            (pageChange)="currentPage = $event">
          </app-pagination>
        }
      }

      <!-- =========================================================================
           VUE 2 : DIPLÔME OFFICIEL GRAND FORMAT (RESPONSIVE)
           ========================================================================= -->
      @if (selectedCert) {
        <div class="certificate-view animate-fade-in">
          <!-- Back & Action Bar -->
          <div class="action-top-row">
            <button class="btn btn-outline btn-sm btn-back" (click)="selectedCert = null">
              <app-icon name="arrow-right" [size]="13" style="transform: rotate(180deg);"></app-icon>
              <span>Retour à la liste des certificats</span>
            </button>

            <button class="btn btn-primary btn-sm" (click)="printCertificate()">
              <app-icon name="printer" [size]="14" color="var(--color-navy)"></app-icon>
              <span>Imprimer / Télécharger en PDF</span>
            </button>
          </div>

          <!-- Official Parchment Card -->
          <div class="cert-diploma-wrapper card">
            <div class="cert-inner-frame">
              <div class="diploma-header">
                <div class="diploma-seal">
                  <app-icon name="award" [size]="40" color="var(--color-navy)"></app-icon>
                </div>
                <div class="diploma-label">CERTIFICAT OFFICIEL D'EXCELLENCE</div>
                <span class="org-sub">DÉLIVRÉ PAR QUIZZBOARD ACADEMY</span>
              </div>

              <div class="diploma-body">
                <p class="awarded-txt">Cette attestation d'excellence académique est décernée à :</p>
                <h2 class="student-name">{{ selectedCert.recipientName }}</h2>
                <p class="completion-txt">Pour avoir validé avec brio l'évaluation de certification :</p>
                <h3 class="exam-title">{{ selectedCert.quizTitle }}</h3>

                <div class="diploma-badges-row">
                  <div class="badge-item">
                    <span class="b-lbl">SCORE ATTEINT</span>
                    <strong class="b-val">{{ selectedCert.scorePercent }}%</strong>
                  </div>
                  <div class="badge-item">
                    <span class="b-lbl">MENTION</span>
                    <strong class="b-val">{{ selectedCert.scorePercent >= 90 ? 'Très Bien' : 'Bien' }}</strong>
                  </div>
                  <div class="badge-item">
                    <span class="b-lbl">DATE D'ÉMISSION</span>
                    <strong class="b-val">{{ selectedCert.issuedAt }}</strong>
                  </div>
                  <div class="badge-item">
                    <span class="b-lbl">CODE VÉRIFICATION</span>
                    <strong class="b-val code-mono">{{ selectedCert.verificationCode }}</strong>
                  </div>
                </div>
              </div>

              <div class="diploma-footer">
                <div class="signature-block">
                  <span class="signature-script">Dr. Amadou Diallo</span>
                  <span class="signature-role">Directeur Pédagogique & Certification</span>
                </div>

                <div class="security-seal-block">
                  <span class="verified-tag">
                    <app-icon name="check" [size]="12" color="#16A34A"></app-icon>
                    Authenticité Certifiée
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .certificates-page {
      display: flex;
      flex-direction: column;
      gap: 20px;
      width: 100%;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
    }

    /* UNIFIED COMPACT SEARCH & FILTER TOOLBAR */
    .filter-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      padding: 10px 16px;
      flex-wrap: wrap;
      background: #FFFFFF;

      .search-box {
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 1;
        min-width: 220px;
        height: 36px;
        background: var(--color-background);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm);
        padding: 0 12px;

        .search-input {
          flex: 1;
          border: none;
          background: transparent;
          outline: none;
          font-size: 13px;
          color: var(--color-text-primary);
          width: 100%;
        }

        .clear-btn {
          border: none;
          background: transparent;
          cursor: pointer;
          color: var(--color-text-secondary);
          font-size: 12px;
        }
      }

      .filter-pills {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;

        .pill-btn {
          background: #FFFFFF;
          border: 1px solid var(--color-border);
          padding: 5px 14px;
          border-radius: var(--radius-full);
          font-size: 12px;
          font-weight: 600;
          color: var(--color-text-secondary);
          cursor: pointer;
          transition: all 0.15s ease;

          &:hover { background: var(--color-background); }
          &.active {
            background: var(--color-navy);
            color: #FFFFFF;
            border-color: var(--color-navy);
          }
        }
      }

      .view-toggle-group {
        display: flex;
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm);
        overflow: hidden;
        background: #FFFFFF;

        .toggle-btn {
          border: none;
          background: transparent;
          padding: 6px 10px;
          cursor: pointer;
          color: var(--color-text-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;

          &:hover { background: var(--color-background); }
          &.active {
            background: var(--color-navy);
            color: #FFFFFF;
            ::ng-deep svg { stroke: #FFFFFF !important; }
          }
        }
      }
    }

    /* GRID VIEW (4 ITEMS PER ROW ON DESKTOP LIKE CLASS MANAGE) */
    .certs-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 16px;
    }

    .cert-item-card {
      padding: 18px 20px;
      background: #FFFFFF;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 14px;
      box-shadow: var(--shadow-sm);
      transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);

      &:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-md);
        border-color: #CBD5E1;
      }

      .cert-card-top {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 10px;

        .cert-seal {
          width: 44px;
          height: 44px;
          border-radius: var(--radius-md);
          background: var(--color-primary-light);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .score-badge {
          font-size: 11px;
          font-weight: 800;
          background: var(--color-navy-light);
          color: var(--color-navy);
          padding: 3px 8px;
          border-radius: var(--radius-xs);

          &.gold {
            background: var(--color-primary-light);
            color: var(--color-navy);
          }
        }
      }

      .cert-card-body {
        display: flex;
        flex-direction: column;
        gap: 6px;

        .cert-card-title {
          font-size: 14.5px;
          font-weight: 800;
          color: var(--color-navy);
          margin: 0;
          line-height: 1.3;
        }

        .cert-issuer {
          font-size: 12px;
          color: var(--color-text-secondary);
        }

        .cert-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 11px;
          color: var(--color-text-secondary);
          margin-top: 4px;

          .cert-code {
            font-family: monospace;
            font-weight: 700;
            color: var(--color-navy);
          }
        }
      }

      .cert-card-actions {
        .btn-full { width: 100%; justify-content: center; gap: 6px; }
      }
    }

    /* LIST VIEW */
    .certs-list {
      display: flex;
      flex-direction: column;
      gap: 10px;

      .cert-row {
        padding: 12px 18px;
        display: flex;
        align-items: center;
        gap: 16px;
        background: #FFFFFF;

        .row-seal {
          width: 38px;
          height: 38px;
          border-radius: var(--radius-sm);
          background: var(--color-primary-light);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .row-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;

          .row-tags {
            display: flex;
            align-items: center;
            gap: 8px;

            .score-badge {
              font-size: 10.5px;
              font-weight: 800;
              background: var(--color-navy-light);
              color: var(--color-navy);
              padding: 1px 6px;
              border-radius: var(--radius-xs);
              &.gold { background: var(--color-primary-light); }
            }

            .cert-code { font-size: 11px; font-family: monospace; color: var(--color-text-secondary); }
          }

          .row-title { font-size: 14px; font-weight: 800; color: var(--color-navy); margin: 0; }
        }
      }
    }

    /* DIPLOMA VIEW */
    .certificate-view {
      display: flex;
      flex-direction: column;
      gap: 18px;

      .action-top-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 12px;
      }

      .cert-diploma-wrapper {
        padding: 16px;
        background: #FFFFFF;
        box-shadow: var(--shadow-md);

        .cert-inner-frame {
          border: 2px solid var(--color-primary);
          border-radius: var(--radius-md);
          padding: 32px 28px;
          background: #FFFCF5;
          text-align: center;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .diploma-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;

          .diploma-seal {
            width: 64px;
            height: 64px;
            border-radius: 50%;
            background: var(--color-primary-light);
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 4px;
          }

          .diploma-label {
            display: inline-block;
            background: var(--color-navy);
            color: var(--color-primary);
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 0.12em;
            padding: 4px 16px;
            border-radius: var(--radius-full);
          }

          .org-sub { font-size: 11px; color: var(--color-text-secondary); font-weight: 700; }
        }

        .diploma-body {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;

          .awarded-txt { font-size: 12.5px; color: var(--color-text-secondary); margin: 0; }
          .student-name {
            font-size: 26px;
            font-weight: 900;
            color: var(--color-navy);
            border-bottom: 2px solid var(--color-primary);
            padding-bottom: 4px;
            margin: 2px 0 12px 0;
          }

          .completion-txt { font-size: 12.5px; color: var(--color-text-secondary); margin: 0; }
          .exam-title { font-size: 17px; font-weight: 800; color: var(--color-navy); margin: 2px 0 16px 0; }

          .diploma-badges-row {
            display: flex;
            justify-content: center;
            gap: 16px;
            flex-wrap: wrap;
            background: #FFFFFF;
            border: 1px solid var(--color-border);
            border-radius: var(--radius-md);
            padding: 12px 20px;
            width: 100%;
            max-width: 600px;

            .badge-item {
              display: flex;
              flex-direction: column;
              gap: 2px;
              min-width: 90px;

              .b-lbl { font-size: 10px; font-weight: 700; color: var(--color-text-secondary); }
              .b-val { font-size: 13.5px; color: var(--color-navy); }
              .code-mono { font-family: monospace; font-weight: 800; }
            }
          }
        }

        .diploma-footer {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          padding-top: 18px;
          border-top: 1px solid rgba(226, 232, 240, 0.8);
          gap: 16px;
          flex-wrap: wrap;

          .signature-block {
            text-align: left;
            .signature-script {
              font-family: cursive, sans-serif;
              font-size: 18px;
              font-weight: 700;
              color: var(--color-navy);
              display: block;
            }
            .signature-role { font-size: 11px; color: var(--color-text-secondary); }
          }

          .verified-tag {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            font-size: 11.5px;
            font-weight: 700;
            color: #166534;
            background: #DCFCE7;
            padding: 4px 10px;
            border-radius: var(--radius-full);
          }
        }
      }
    }

    .empty-state-box {
      padding: 50px 20px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      background: #FFFFFF;

      .empty-icon-wrap {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: var(--color-navy-light);
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 16px;
      }

      .empty-title { font-size: 17px; font-weight: 800; color: var(--color-navy); margin: 0 0 6px 0; }
      .empty-desc { font-size: 13px; color: var(--color-text-secondary); max-width: 440px; margin: 0 0 20px 0; }
    }

    @media (max-width: 768px) {
      .certs-grid { grid-template-columns: 1fr; }
      .diploma-body .student-name { font-size: 20px; }
      .diploma-footer { flex-direction: column; align-items: center; text-align: center; .signature-block { text-align: center; } }
    }
  `]
})
export class CertificatesComponent {
  private partService = inject(ParticipationService);
  certificates = this.partService.getCertificates();

  selectedCert: Certificate | null = null;

  searchQuery = '';
  filterScore: 'ALL' | 'EXCELLENT' | 'PASSED' = 'ALL';
  viewMode: 'grid' | 'list' = 'grid';

  currentPage = 1;
  pageSize = 8;

  filteredCertificates(): Certificate[] {
    return this.certificates().filter(cert => {
      const matchSearch = !this.searchQuery ||
        cert.quizTitle.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        cert.verificationCode.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        cert.issuerName.toLowerCase().includes(this.searchQuery.toLowerCase());

      const matchScore = this.filterScore === 'ALL' ||
        (this.filterScore === 'EXCELLENT' && cert.scorePercent >= 90) ||
        (this.filterScore === 'PASSED' && cert.scorePercent < 90);

      return matchSearch && matchScore;
    });
  }

  paginatedCertificates(): Certificate[] {
    const list = this.filteredCertificates();
    const start = (this.currentPage - 1) * this.pageSize;
    return list.slice(start, start + this.pageSize);
  }

  openCertificate(cert: Certificate) {
    this.selectedCert = cert;
  }

  printCertificate() {
    window.print();
  }
}
