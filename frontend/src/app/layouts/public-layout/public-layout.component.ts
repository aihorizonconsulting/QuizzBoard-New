import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { JoinModalService } from '../../core/services/join-modal.service';
import { IconComponent } from '../../shared/components/icon/icon.component';

@Component({
  selector: 'app-public-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, NavbarComponent, IconComponent],
  template: `
    <div class="public-wrapper">
      <!-- Fixed Global Header / Navbar -->
      <app-navbar></app-navbar>

      <!-- Main Public Routed Page (Landing, Pricing, Login, Signup, Join) -->
      <main class="public-content">
        <router-outlet></router-outlet>
      </main>

      <!-- Global Public Footer with Contacts & Socials -->
      <footer class="public-footer">
        <div class="footer-container">
          <!-- BRAND & SOCIALS -->
          <div class="footer-col footer-brand">
            <div class="logo">
              <img src="/logo.png" alt="QUIZZ Logo" style="height: 38px; width: auto; object-fit: contain;">
              <span>QUIZZBOARD</span>
            </div>
            <p class="brand-desc">
              La plateforme d'évaluation interactive par IA, d'arènes multijoueur en direct et de gestion de cohortes étudiantes.
            </p>

            <!-- SOCIAL MEDIA LINKS -->
            <div class="footer-social-row">
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" class="social-icon-btn" title="LinkedIn">
                <app-icon name="linkedin" [size]="16" color="#FFFFFF"></app-icon>
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" class="social-icon-btn" title="Twitter / X">
                <app-icon name="twitter" [size]="16" color="#FFFFFF"></app-icon>
              </a>
              <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" class="social-icon-btn" title="YouTube">
                <app-icon name="youtube" [size]="16" color="#FFFFFF"></app-icon>
              </a>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" class="social-icon-btn" title="GitHub">
                <app-icon name="github" [size]="16" color="#FFFFFF"></app-icon>
              </a>
            </div>
          </div>

          <!-- NAVIGATION LINKS -->
          <div class="footer-col">
            <h4>Navigation</h4>
            <div class="links-list">
              <a routerLink="/">Accueil</a>
              <a routerLink="/decouvrir">Explorer les Quiz</a>
              <a routerLink="/tarifs">Tarifs & Forfaits</a>
              <button type="button" class="footer-link-btn" (click)="joinModalService.open()">Rejoindre un Live (Code PIN)</button>
              <a routerLink="/inscription">Créer un Compte Enseignant</a>
            </div>
          </div>

          <!-- CONTACT & SUPPORT -->
          <div class="footer-col">
            <h4>Contact & Support</h4>
            <div class="contact-list">
              <a href="mailto:quizzboard@gmail.com" class="contact-item">
                <app-icon name="mail" [size]="14" color="var(--color-primary)"></app-icon>
                <span>quizzboard&#64;gmail.com</span>
              </a>
              <a href="tel:+221767516378" class="contact-item">
                <app-icon name="phone" [size]="14" color="var(--color-primary)"></app-icon>
                <span>+221 76 751 63 78 (Dakar)</span>
              </a>
              <div class="contact-item">
                <app-icon name="pin" [size]="14" color="var(--color-primary)"></app-icon>
                <span>Mermoz Dakar</span>
              </div>
              <div class="support-badge">
                <span class="pulse-dot"></span>
                <span>Support 7j/7 (8h - 22h GMT)</span>
              </div>
            </div>
          </div>

          <!-- MOYENS DE PAIEMENT & SÉCURITÉ -->
          <div class="footer-col">
            <h4>Paiement Sécurisé</h4>
            <div class="payment-methods">
              <div class="pay-pill">PayDunya Checkout</div>
              <div class="pay-pill">Mobile Money selon pays</div>
              <div class="pay-pill">Carte bancaire selon activation</div>
            </div>
            <div class="secu-note">
              <app-icon name="shield" [size]="14" color="#10B981"></app-icon>
              <span>Chiffrement SSL 256-bit garanti</span>
            </div>
          </div>
        </div>

        <div class="footer-bottom">
          <p>© 2026 Quizzboard. Tous droits réservés. Développé pour la réussite de vos étudiants.</p>
          <div class="bottom-links">
            <a routerLink="/tarifs">Mentions Légales</a>
            <span>•</span>
            <a routerLink="/tarifs">Politique de Confidentialité</a>
            <span>•</span>
            <a routerLink="/tarifs">Conditions d'Utilisation (CGU)</a>
          </div>
        </div>
      </footer>
    </div>
  `,
  styles: [`
    .public-wrapper {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    .public-content {
      flex: 1;
    }

    .public-footer {
      background-color: #021831;
      color: #FFFFFF;
      padding: 60px 24px 24px 24px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }

    .footer-container {
      max-width: 1200px;
      margin: 0 auto;
      display: grid;
      grid-template-columns: 1.3fr 1fr 1.2fr 1fr;
      gap: 40px;
    }

    @media (max-width: 992px) {
      .footer-container {
        grid-template-columns: 1fr 1fr;
      }
    }

    @media (max-width: 600px) {
      .footer-container {
        grid-template-columns: 1fr;
      }
    }

    .footer-col {
      display: flex;
      flex-direction: column;
      gap: 12px;

      h4 {
        color: var(--color-primary);
        font-size: 13px;
        font-weight: 800;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        margin: 0 0 4px 0;
      }
    }

    .footer-brand {
      .logo {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 20px;
        font-weight: 900;
        margin-bottom: 8px;
        color: #FFFFFF;
      }

      .brand-desc {
        color: #94A3B8;
        font-size: 13px;
        line-height: 22px;
        margin: 0 0 16px 0;
      }

      .footer-social-row {
        display: flex;
        align-items: center;
        gap: 10px;

        .social-icon-btn {
          width: 36px;
          height: 36px;
          border-radius: var(--radius-full);
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;

          &:hover {
            background: var(--color-primary);
            border-color: var(--color-primary);

            ::ng-deep svg {
              stroke: var(--color-navy) !important;
            }
          }
        }
      }
    }

    .links-list {
      display: flex;
      flex-direction: column;
      gap: 10px;

      a, .footer-link-btn {
        font-size: 13.5px;
        color: #94A3B8;
        text-decoration: none;
        background: none;
        border: none;
        padding: 0;
        cursor: pointer;
        font-family: inherit;
        text-align: left;
        transition: all 0.15s ease;

        &:hover {
          color: #FFFFFF;
          transform: translateX(2px);
        }
      }
    }

    .contact-list {
      display: flex;
      flex-direction: column;
      gap: 10px;

      .contact-item {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #CBD5E1;
        font-size: 12.5px;
        transition: color 0.15s ease;

        &:hover {
          color: #FFFFFF;
        }
      }

      .support-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: rgba(16, 185, 129, 0.15);
        color: #10B981;
        border: 1px solid rgba(16, 185, 129, 0.3);
        padding: 4px 10px;
        border-radius: var(--radius-full);
        font-size: 11px;
        font-weight: 700;
        margin-top: 4px;
        width: fit-content;

        .pulse-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #10B981;
          animation: pulseGlow 1.5s infinite;
        }
      }
    }

    .payment-methods {
      display: flex;
      flex-direction: column;
      gap: 6px;

      .pay-pill {
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.1);
        padding: 6px 10px;
        border-radius: var(--radius-xs);
        font-size: 12px;
        color: #CBD5E1;
        font-weight: 600;
      }
    }

    .secu-note {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      color: #94A3B8;
      margin-top: 6px;
    }

    .footer-bottom {
      max-width: 1200px;
      margin: 40px auto 0 auto;
      padding-top: 20px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
      color: #64748B;
      font-size: 12px;

      p { margin: 0; }

      .bottom-links {
        display: flex;
        align-items: center;
        gap: 8px;

        a {
          color: #94A3B8;
          &:hover { color: #FFFFFF; }
        }
      }
    }
  `]
})
export class PublicLayoutComponent {
  public joinModalService = inject(JoinModalService);
}
