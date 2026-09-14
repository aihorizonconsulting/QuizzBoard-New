import { Component, inject, OnInit, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { QuizService } from '../../../core/services/quiz.service';
import { QuizPlayerModalService } from '../../../core/services/quiz-player-modal.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { PlatformStats } from '../../../core/models/platform-stats.model';

interface FaqItem {
  question: string;
  answer: string;
}

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, IconComponent],
  template: `
    <div class="landing-page animate-fade-in">
      <!-- 1. HERO SECTION WITH FUN VIDEO BACKGROUND -->
      <section class="hero-video-section">
        <div class="video-bg-container">
          <video 
            autoplay 
            muted 
            loop 
            playsinline 
            class="hero-bg-video"
            poster="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80">
            <source src="https://assets.mixkit.co/videos/preview/mixkit-students-in-a-classroom-smiling-and-studying-42777-large.mp4" type="video/mp4">
          </video>
          <div class="hero-video-overlay"></div>
        </div>

        <div class="hero-content-wrap">
          <div class="hero-badge animate-fade-in">
            <span class="live-pulse-dot"></span>
            <app-icon name="sparkles" [size]="14" color="var(--color-navy)"></app-icon>
            <span>QUIZZBOARD 2.0 • L'ÉVALUATION MULTIJOUEUR LA PLUS FUN</span>
          </div>

          <h1 class="hero-title animate-fade-in">
            Transformez vos cours en <br>
            <span class="highlight-gold">arène interactive.</span>
          </h1>

          <p class="hero-subtitle animate-fade-in">
            Générez des quiz en 10 secondes avec l'IA. Vos élèves dégainent leur smartphone, entrent le code PIN et s'affrontent en direct avec podium, chrono et classements en temps réel.
          </p>

          <div class="hero-cta-group animate-fade-in">
            <a routerLink="/inscription" class="btn btn-primary btn-lg">
              <app-icon name="sparkles" [size]="18" color="var(--color-navy)"></app-icon>
              <span>Créer un Quiz Gratuit</span>
            </a>
            <a routerLink="/decouvrir" class="btn btn-outline-white btn-lg">
              <app-icon name="search" [size]="16" color="#FFFFFF"></app-icon>
              <span>Explorer les Quiz</span>
            </a>
            <a routerLink="/tarifs" class="btn btn-ghost-white btn-lg">
              <span>Voir les Tarifs</span>
            </a>
          </div>

          <!-- PIN QUICK JOIN GLASS BAR -->
          <div class="hero-pin-card glass-panel animate-fade-in">
            <form (ngSubmit)="joinWithPin()" class="pin-form-inline">
              <div class="input-with-icon">
                <app-icon name="smartphone" [size]="18" color="var(--color-text-secondary)" class="input-icon"></app-icon>
                <input 
                  type="text" 
                  [(ngModel)]="pinCode" 
                  name="pinCode"
                  placeholder="Code PIN élève (ex: 842 109)" 
                  class="pin-input-clean"
                  [class.input-error]="pinError"
                  (input)="clearPinError()"
                  required>
              </div>
              <button type="submit" class="btn btn-primary btn-lg">
                <app-icon name="play" [size]="15" color="var(--color-navy)"></app-icon>
                <span>Rejoindre la partie</span>
              </button>
            </form>
            @if (pinError) {
              <div class="field-error-msg" style="margin-top: 8px; justify-content: center; background: rgba(239, 68, 68, 0.12); padding: 6px 12px; border-radius: 6px;">
                <app-icon name="alert" [size]="14" color="var(--color-danger)"></app-icon>
                <span>{{ pinError }}</span>
              </div>
            }
          </div>

          <!-- FUN PILLS ROW -->
          <div class="hero-trust-row animate-fade-in">
            <span class="fun-tag">🎮 100% Interactif</span>
            <span class="trust-sep">•</span>
            <span class="fun-tag">📱 Sans téléchargement</span>
            <span class="trust-sep">•</span>
            <span class="fun-tag">⚡ Podium en direct</span>
            <span class="trust-sep">•</span>
            <span class="fun-tag">✓ Gratuit sans CB</span>
          </div>
        </div>
      </section>

      <!-- 2. METRICS SECTION (DYNAMIQUE DEPUIS ENDPOINT BACKEND RÉEL) -->
      <section class="metrics-section">
        <div class="metrics-container">
          <div class="metric-card">
            <div class="metric-icon-box" style="background: var(--color-navy-light); color: var(--color-navy);">
              <app-icon name="cpu" [size]="22"></app-icon>
            </div>
            <div class="metric-data">
              <div class="metric-value">{{ stats()?.quizzesFormatted || '3+' }}</div>
              <div class="metric-label">Quiz IA Générés</div>
            </div>
          </div>

          <div class="metric-card">
            <div class="metric-icon-box" style="background: var(--color-primary-light); color: var(--color-navy);">
              <app-icon name="users" [size]="22"></app-icon>
            </div>
            <div class="metric-data">
              <div class="metric-value">{{ stats()?.participantsFormatted || '19+' }}</div>
              <div class="metric-label">Participants Actifs</div>
            </div>
          </div>

          <div class="metric-card">
            <div class="metric-icon-box" style="background: var(--color-orange-light); color: var(--color-orange);">
              <app-icon name="zap" [size]="22"></app-icon>
            </div>
            <div class="metric-data">
              <div class="metric-value">{{ stats()?.liveSessionsFormatted || '6+' }}</div>
              <div class="metric-label">Sessions Live Animées</div>
            </div>
          </div>

          <div class="metric-card">
            <div class="metric-icon-box" style="background: var(--color-navy-light); color: var(--color-navy);">
              <app-icon name="school" [size]="22"></app-icon>
            </div>
            <div class="metric-data">
              <div class="metric-value">{{ stats()?.engagementRateFormatted || '98.6%' }}</div>
              <div class="metric-label">Taux d'Engagement</div>
            </div>
          </div>
        </div>
      </section>

      <!-- 3. HOW IT WORKS (COMMENT ÇA MARCHE EN 3 ÉTAPES) -->
      <section class="how-it-works-section">
        <div class="section-top-header">
          <span class="badge badge-navy">SIMPLICITÉ TOTALE</span>
          <h2 class="display-title" style="margin-top: 10px;">Comment ça fonctionne ?</h2>
          <p class="body-lead">L'expérience la plus fluide pour engager une classe en moins d'une minute.</p>
        </div>

        <div class="steps-grid">
          <div class="step-card card">
            <div class="step-badge">1</div>
            <div class="step-icon-wrap" style="background: var(--color-primary-light);">
              <app-icon name="sparkles" [size]="26" color="var(--color-navy)"></app-icon>
            </div>
            <h3 class="step-title">Générez avec l'IA</h3>
            <p class="step-desc">
              Tapez un sujet ou glissez votre support de cours PDF. En 10 secondes, l'IA génère les questions, choix et explications.
            </p>
          </div>

          <div class="step-card card">
            <div class="step-badge">2</div>
            <div class="step-icon-wrap" style="background: var(--color-orange-light);">
              <app-icon name="smartphone" [size]="26" color="var(--color-orange)"></app-icon>
            </div>
            <h3 class="step-title">Projetez le Code PIN</h3>
            <p class="step-desc">
              Projetez la session sur grand écran. Vos étudiants scannent ou entrent le code PIN sur leur smartphone sans créer de compte.
            </p>
          </div>

          <div class="step-card card">
            <div class="step-badge">3</div>
            <div class="step-icon-wrap" style="background: var(--color-navy-light);">
              <app-icon name="trophy" [size]="26" color="var(--color-navy)"></app-icon>
            </div>
            <h3 class="step-title">Vibrez avec le Podium</h3>
            <p class="step-desc">
              Chaque seconde compte ! Les scores s'actualisent en temps réel. Clôturez par le podium animé Or, Argent et Bronze.
            </p>
          </div>
        </div>
      </section>

      <!-- 4. WHY US / 3 CORE PILLARS SECTION -->
      <section class="why-us-section">
        <div class="section-top-header">
          <span class="badge badge-navy">FONCTIONNALITÉS CLÉS</span>
          <h2 class="display-title" style="margin-top: 10px;">Tout ce dont vous avez besoin pour vos cours</h2>
          <p class="body-lead">Une suite complète et ultra-rapide taillée pour les formateurs, universités et apprenants.</p>
        </div>

        <div class="pillars-grid">
          <!-- PILLAR 1: IA GENERATOR -->
          <div class="pillar-card card">
            <div class="pillar-icon-box" style="background: var(--color-primary-light); color: var(--color-navy);">
              <app-icon name="sparkles" [size]="24"></app-icon>
            </div>
            <h3 class="h2">Générateur IA Instantané</h3>
            <p class="body-medium">
              Transformez vos cours, documents PDF ou simples thématiques en quiz complets avec explications pédagogiques détaillées.
            </p>
            
            <div class="pillar-feature-list">
              <div class="feat-item">
                <app-icon name="check" [size]="15" color="var(--color-success)"></app-icon>
                <span>Import de cours PDF ou texte brut</span>
              </div>
              <div class="feat-item">
                <app-icon name="check" [size]="15" color="var(--color-success)"></app-icon>
                <span>QCM, Vrai/Faux et Choix Multiples</span>
              </div>
              <div class="feat-item">
                <app-icon name="check" [size]="15" color="var(--color-success)"></app-icon>
                <span>Explications automatiques par IA</span>
              </div>
            </div>

            <div class="card-mini-widget">
              <div class="widget-row">
                <span class="badge badge-primary">Prompt</span>
                <span class="caption">"Créer 5 questions sur Docker & CI/CD"</span>
              </div>
              <div class="widget-progress">
                <div class="progress-fill" style="width: 100%;"></div>
              </div>
              <span class="caption" style="color: var(--color-success); font-weight: 700;">✓ Quiz généré en 4.2s</span>
            </div>
          </div>

          <!-- PILLAR 2: LIVE MULTIPLAYER ARENA -->
          <div class="pillar-card card">
            <div class="pillar-icon-box" style="background: var(--color-orange-light); color: var(--color-orange);">
              <app-icon name="play" [size]="24"></app-icon>
            </div>
            <h3 class="h2">Sessions Multijoueur en Direct</h3>
            <p class="body-medium">
              Projetez vos questions sur grand écran. Vos étudiants répondent depuis leur téléphone en temps réel avec un code PIN sans inscription.
            </p>

            <div class="pillar-feature-list">
              <div class="feat-item">
                <app-icon name="check" [size]="15" color="var(--color-success)"></app-icon>
                <span>Code PIN à 6 chiffres ultra-simple</span>
              </div>
              <div class="feat-item">
                <app-icon name="check" [size]="15" color="var(--color-success)"></app-icon>
                <span>Classement et Podium en direct</span>
              </div>
              <div class="feat-item">
                <app-icon name="check" [size]="15" color="var(--color-success)"></app-icon>
                <span>Statistiques par question instantanées</span>
              </div>
            </div>

            <div class="card-mini-widget live-widget">
              <div class="live-status-row">
                <span class="pulse-dot"></span>
                <strong>Live en cours : PIN 592 108</strong>
              </div>
              <div class="podium-mini-preview">
                <div class="podium-item">🥇 Fatou (1250 pts)</div>
                <div class="podium-item">🥈 Moussa (1120 pts)</div>
              </div>
            </div>
          </div>

          <!-- PILLAR 3: COMMUNITIES & COHORTS -->
          <div class="pillar-card card">
            <div class="pillar-icon-box" style="background: var(--color-navy-light); color: var(--color-navy);">
              <app-icon name="users" [size]="24"></app-icon>
            </div>
            <h3 class="h2">Communautés & Promotions</h3>
            <p class="body-medium">
              Rassemblez chaque promotion dans un espace privé avec forum d'entraide, supports de cours et réunions.
            </p>

            <div class="pillar-feature-list">
              <div class="feat-item">
                <app-icon name="check" [size]="15" color="var(--color-success)"></app-icon>
                <span>Espace privé par promotion</span>
              </div>
              <div class="feat-item">
                <app-icon name="check" [size]="15" color="var(--color-success)"></app-icon>
                <span>Bibliothèque de documents</span>
              </div>
              <div class="feat-item">
                <app-icon name="check" [size]="15" color="var(--color-success)"></app-icon>
                <span>Forum d'entraide intégré</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 5. TESTIMONIALS SECTION -->
      <section class="testimonials-section">
        <div class="section-top-header">
          <span class="badge badge-primary">ILS UTILISENT QUIZZBOARD</span>
          <h2 class="display-title" style="margin-top: 10px;">Adopté par plus de 850 formateurs et écoles</h2>
          <p class="body-lead">Découvrez les retours d'expérience de ceux qui animent leurs cours chaque semaine.</p>
        </div>

        <div class="testimonials-grid">
          <div class="testi-card card">
            <div class="stars-row">★★★★★</div>
            <p class="testi-quote">
              "L'attention de mes amphithéâtres a été multipliée par 3 dès la première session. Les étudiants attendent le quiz avec impatience !"
            </p>
            <div class="testi-author">
              <div class="author-avatar">AD</div>
              <div>
                <strong>Dr. Aissatou Diop</strong>
                <span>Professeure d'Université & Informatique</span>
              </div>
            </div>
          </div>

          <div class="testi-card card">
            <div class="stars-row">★★★★★</div>
            <p class="testi-quote">
              "L'import de mes supports PDF en quiz complets avec explications me fait économiser au moins 4 heures de préparation par semaine."
            </p>
            <div class="testi-author">
              <div class="author-avatar" style="background: var(--color-orange);">ML</div>
              <div>
                <strong>Marc Lefebvre</strong>
                <span>Lead Formateur Cloud & DevOps</span>
              </div>
            </div>
          </div>

          <div class="testi-card card">
            <div class="stars-row">★★★★★</div>
            <p class="testi-quote">
              "Le podium en direct crée une émulation incroyable. Tout le monde participe, même les élèves les plus discrets au fond de la classe."
            </p>
            <div class="testi-author">
              <div class="author-avatar" style="background: var(--color-primary); color: var(--color-navy);">FK</div>
              <div>
                <strong>Fatou Kanté</strong>
                <span>Responsable Pédagogique - Business School</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 6. FAQ ACCORDION SECTION -->
      <section class="faq-section">
        <div class="section-top-header">
          <span class="badge badge-navy">QUESTIONS FRÉQUENTES</span>
          <h2 class="display-title" style="margin-top: 10px;">Tout ce que vous voulez savoir</h2>
          <p class="body-lead">Des réponses claires à vos questions les plus courantes.</p>
        </div>

        <div class="faq-accordion">
          @for (faq of faqs; track faq.question; let idx = $index) {
            <div class="faq-item card" [class.is-open]="openFaqIndex === idx" (click)="toggleFaq(idx)">
              <div class="faq-question-row">
                <span class="faq-q">{{ faq.question }}</span>
                <span class="faq-icon-toggle">{{ openFaqIndex === idx ? '−' : '+' }}</span>
              </div>
              @if (openFaqIndex === idx) {
                <p class="faq-answer animate-fade-in">{{ faq.answer }}</p>
              }
            </div>
          }
        </div>
      </section>

      <!-- 7. BOTTOM CTA BANNER -->
      <section class="cta-banner-section">
        <div class="cta-banner-card card card-navy">
          <div class="cta-inner">
            <span class="badge badge-primary">DÉMARRAGE IMMÉDIAT</span>
            <h2 class="display-title" style="color: #FFFFFF; margin: 14px 0 10px 0;">
              Prêt à animer votre premier quiz live ?
            </h2>
            <p class="body-lead" style="color: #CBD5E1; max-width: 520px; margin: 0 auto 28px auto;">
              Créez votre compte gratuitement, générez vos questions par IA et lancez vos sessions en direct sans carte bancaire.
            </p>
            <div class="cta-action-row">
              <a routerLink="/inscription" class="btn btn-primary btn-lg">
                <app-icon name="sparkles" [size]="18" color="var(--color-navy)"></app-icon>
                <span>Créer mon Quiz Gratuit</span>
              </a>
              <a routerLink="/tarifs" class="btn btn-outline-light btn-lg">
                <app-icon name="credit-card" [size]="18" color="#FFFFFF"></app-icon>
                <span>Voir les Tarifs</span>
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .landing-page {
      padding-bottom: 60px;
    }

    /* 1. HERO WITH VIDEO BACKGROUND */
    .hero-video-section {
      position: relative;
      min-height: 540px;
      display: flex;
      align-items: center;
      padding: 70px 24px 80px 24px;
      overflow: hidden;
      color: #FFFFFF;
    }

    .video-bg-container {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 1;
      overflow: hidden;

      .hero-bg-video {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .hero-video-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, rgba(2, 24, 49, 0.90) 0%, rgba(3, 36, 71, 0.82) 50%, rgba(2, 24, 49, 0.92) 100%);
      }
    }

    .hero-content-wrap {
      position: relative;
      z-index: 2;
      max-width: 1200px;
      margin: 0 auto;
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      text-align: left;
    }

    .hero-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(8px);
      color: #FFFFFF;
      padding: 6px 18px;
      border-radius: var(--radius-full);
      font-size: 11.5px;
      font-weight: 800;
      letter-spacing: 0.05em;
      margin-bottom: 20px;
      border: 1px solid rgba(255, 255, 255, 0.25);

      .live-pulse-dot {
        width: 8px;
        height: 8px;
        background-color: var(--color-primary);
        border-radius: 50%;
        animation: pulseGlow 1.5s infinite;
      }
    }

    .hero-title {
      font-size: 52px;
      font-weight: 900;
      color: #FFFFFF;
      line-height: 1.12;
      letter-spacing: -0.02em;
      margin-bottom: 18px;
      max-width: 840px;

      .highlight-gold {
        color: var(--color-primary);
        text-shadow: 0 0 25px rgba(255, 196, 0, 0.4);
      }
    }

    .hero-subtitle {
      font-size: 17px;
      color: #E2E8F0;
      line-height: 28px;
      max-width: 700px;
      margin-bottom: 28px;
    }

    .hero-cta-group {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      margin-bottom: 26px;

      .btn-outline-white {
        background: rgba(255, 255, 255, 0.12);
        border: 1.5px solid rgba(255, 255, 255, 0.4);
        color: #FFFFFF;
        backdrop-filter: blur(8px);
        font-weight: 700;

        &:hover {
          background: #FFFFFF;
          color: var(--color-navy);
          border-color: #FFFFFF;

          ::ng-deep svg {
            stroke: var(--color-navy) !important;
          }
        }
      }

      .btn-ghost-white {
        background: transparent;
        border: none;
        color: #CBD5E1;
        font-weight: 700;
        &:hover { color: #FFFFFF; text-decoration: underline; }
      }
    }

    .glass-panel {
      background: rgba(255, 255, 255, 0.95);
      border: 2px solid var(--color-primary);
      box-shadow: 0 15px 35px rgba(0, 0, 0, 0.25);
    }

    .hero-pin-card {
      width: 100%;
      max-width: 600px;
      border-radius: var(--radius-lg);
      padding: 10px 14px;
      margin-bottom: 20px;

      .pin-form-inline {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;

        .input-with-icon {
          flex: 1;
          min-width: 240px;
          position: relative;
          display: flex;
          align-items: center;

          .input-icon {
            position: absolute;
            left: 14px;
            pointer-events: none;
          }

          .pin-input-clean {
            width: 100%;
            height: 44px;
            padding: 0 14px 0 42px;
            background: #FFFFFF;
            border: 1px solid var(--color-border);
            border-radius: var(--radius-md);
            font-size: 13.5px;
            font-weight: 700;
            color: var(--color-text-primary);

            &:focus {
              outline: none;
              border-color: var(--color-navy);
            }
          }
        }
      }
    }

    .hero-trust-row {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
      font-size: 13px;
      color: #CBD5E1;

      .fun-tag {
        background: rgba(255, 255, 255, 0.12);
        padding: 4px 10px;
        border-radius: var(--radius-full);
        font-weight: 700;
        color: #FFFFFF;
      }

      .trust-sep {
        color: rgba(255, 255, 255, 0.3);
      }
    }

    @media (max-width: 768px) {
      .hero-video-section { min-height: 460px; padding: 50px 16px 60px 16px; }
      .hero-title { font-size: 34px; }
      .hero-subtitle { font-size: 15px; line-height: 24px; }
      .hero-cta-group { flex-direction: column; width: 100%; }
      .hero-pin-card .pin-form-inline { flex-direction: column; }
    }

    /* 2. METRICS */
    .metrics-section {
      background: #FFFFFF;
      border-bottom: 1px solid var(--color-border);
      padding: 36px 24px;
    }

    .metrics-container {
      max-width: 1100px;
      margin: 0 auto;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
    }

    .metric-card {
      display: flex;
      align-items: center;
      gap: 14px;

      .metric-icon-box {
        width: 46px;
        height: 46px;
        border-radius: var(--radius-md);
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .metric-data {
        .metric-value {
          font-size: 28px;
          font-weight: 900;
          color: var(--color-navy);
          line-height: 1;
          margin-bottom: 3px;
        }
        .metric-label {
          font-size: 12px;
          font-weight: 600;
          color: var(--color-text-secondary);
        }
      }
    }

    /* 3. HOW IT WORKS */
    .how-it-works-section {
      max-width: 1160px;
      margin: 70px auto 0 auto;
      padding: 0 24px;
    }

    .section-top-header {
      text-align: center;
      margin-bottom: 44px;
    }

    .steps-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 24px;

      .step-card {
        padding: 30px 24px;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        position: relative;

        .step-badge {
          position: absolute;
          top: 16px;
          right: 16px;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: var(--color-navy);
          color: #FFFFFF;
          font-size: 13px;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .step-icon-wrap {
          width: 58px;
          height: 58px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
        }

        .step-title {
          font-size: 18px;
          font-weight: 800;
          color: var(--color-navy);
          margin-bottom: 10px;
        }

        .step-desc {
          font-size: 13px;
          color: var(--color-text-secondary);
          line-height: 22px;
          margin: 0;
        }
      }
    }

    /* 4. WHY US / PILLARS */
    .why-us-section {
      max-width: 1160px;
      margin: 70px auto 0 auto;
      padding: 0 24px;
    }

    .pillars-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 24px;

      .pillar-card {
        padding: 28px;
        display: flex;
        flex-direction: column;

        .pillar-icon-box {
          width: 48px;
          height: 48px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 18px;
        }

        .h2 {
          font-size: 20px;
          font-weight: 800;
          color: var(--color-navy);
          margin-bottom: 8px;
        }

        .body-medium {
          color: var(--color-text-secondary);
          line-height: 22px;
          margin-bottom: 16px;
          font-size: 13px;
        }
      }
    }

    .pillar-feature-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 20px;

      .feat-item {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        color: var(--color-text-primary);
        font-weight: 500;
      }
    }

    .card-mini-widget {
      margin-top: auto;
      background: var(--color-background);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: 12px;

      .widget-row {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
      }

      .widget-progress {
        height: 6px;
        background: #E2E8F0;
        border-radius: var(--radius-full);
        overflow: hidden;
        margin-bottom: 6px;

        .progress-fill {
          height: 100%;
          background: var(--color-success);
        }
      }

      &.live-widget {
        .live-status-row {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: var(--color-orange);
          margin-bottom: 6px;

          .pulse-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: var(--color-orange);
            animation: pulseGlow 1.2s infinite;
          }
        }

        .podium-mini-preview {
          display: flex;
          gap: 8px;
          font-size: 11.5px;
          font-weight: 700;
          color: var(--color-navy);

          .podium-item {
            background: #FFFFFF;
            padding: 3px 8px;
            border-radius: var(--radius-xs);
            border: 1px solid var(--color-border);
          }
        }
      }
    }

    /* 5. TESTIMONIALS */
    .testimonials-section {
      max-width: 1160px;
      margin: 70px auto 0 auto;
      padding: 0 24px;
    }

    .testimonials-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 24px;

      .testi-card {
        padding: 26px;
        display: flex;
        flex-direction: column;

        .stars-row {
          color: #F59E0B;
          font-size: 16px;
          letter-spacing: 2px;
          margin-bottom: 12px;
        }

        .testi-quote {
          font-size: 13.5px;
          color: var(--color-text-primary);
          line-height: 22px;
          font-style: italic;
          margin-bottom: 20px;
          flex: 1;
        }

        .testi-author {
          display: flex;
          align-items: center;
          gap: 12px;

          .author-avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: var(--color-navy);
            color: #FFFFFF;
            font-size: 12px;
            font-weight: 800;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          strong {
            display: block;
            font-size: 13px;
            color: var(--color-navy);
          }

          span {
            font-size: 11.5px;
            color: var(--color-text-secondary);
          }
        }
      }
    }

    /* 6. FAQ ACCORDION */
    .faq-section {
      max-width: 860px;
      margin: 70px auto 0 auto;
      padding: 0 24px;
    }

    .faq-accordion {
      display: flex;
      flex-direction: column;
      gap: 12px;

      .faq-item {
        padding: 16px 20px;
        cursor: pointer;
        transition: all 0.15s ease;

        &:hover {
          border-color: var(--color-navy);
        }

        &.is-open {
          border-color: var(--color-navy);
          background: #F8FAFC;
        }

        .faq-question-row {
          display: flex;
          justify-content: space-between;
          align-items: center;

          .faq-q {
            font-size: 15px;
            font-weight: 800;
            color: var(--color-navy);
          }

          .faq-icon-toggle {
            font-size: 20px;
            font-weight: 700;
            color: var(--color-navy);
            width: 24px;
            text-align: center;
          }
        }

        .faq-answer {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid var(--color-border);
          font-size: 13.5px;
          color: var(--color-text-secondary);
          line-height: 24px;
        }
      }
    }

    /* 7. CTA BANNER */
    .cta-banner-section {
      max-width: 1160px;
      margin: 70px auto 0 auto;
      padding: 0 24px;
    }

    .cta-banner-card {
      background: linear-gradient(135deg, #021831 0%, #032447 100%);
      padding: 50px 30px;
      text-align: center;
      border-radius: var(--radius-xl);

      .cta-inner {
        max-width: 600px;
        margin: 0 auto;
      }

      .cta-action-row {
        display: flex;
        justify-content: center;
        gap: 14px;
        flex-wrap: wrap;
      }
    }
  `]
})
export class LandingComponent implements OnInit {
  private router = inject(Router);
  private quizService = inject(QuizService);
  private quizPlayerModalService = inject(QuizPlayerModalService);
  private cdr = inject(ChangeDetectorRef);

  stats = signal<PlatformStats | null>(null);
  pinCode = '';
  pinError = '';
  openFaqIndex: number | null = 0;

  ngOnInit(): void {
    this.loadRealStats();
  }

  async loadRealStats(): Promise<void> {
    try {
      const realStats = await this.quizService.getPublicStats();
      this.stats.set(realStats);
      this.cdr.markForCheck();
    } catch {
      // Keep default values
    }
  }

  faqs: FaqItem[] = [
    {
      question: "Les étudiants doivent-ils créer un compte pour participer ?",
      answer: "Non, absolument pas ! Les apprenants rejoignent instantanément la session en entrant simplement le code PIN à 6 chiffres et leur prénom depuis leur smartphone, tablette ou ordinateur."
    },
    {
      question: "Puis-je importer mes propres cours au format PDF ou Word ?",
      answer: "Oui ! Le studio IA analyse votre document, identifie les notions fondamentales et génère automatiquement un quiz structuré avec chronomètre et justifications pédagogiques en quelques secondes."
    },
    {
      question: "Quels sont les moyens de paiement acceptés pour les forfaits ?",
      answer: "Nous acceptons Wave Mobile Money, Orange Money, Free Money pour l'Afrique de l'Ouest, ainsi que les cartes bancaires internationales (Visa, Mastercard) via la passerelle sécurisée PayDunya."
    },
    {
      question: "Combien d'élèves peuvent participer en même temps à une session Live ?",
      answer: "L'arène multijoueur QuizzBoard peut accueillir jusqu'à 500+ participants en simultané sans aucun ralentissement, que ce soit en classe physique ou à distance via visio."
    }
  ];

  clearPinError() {
    this.pinError = '';
  }

  joinWithPin() {
    this.pinError = '';
    const pin = this.pinCode.trim();
    if (!pin) {
      this.pinError = 'Veuillez saisir un code PIN ou code de partage.';
      return;
    }
    const quiz = this.quizService.findQuizByCodeOrPin(pin);
    if (quiz) {
      this.quizPlayerModalService.open(quiz);
    } else {
      this.pinError = 'Code PIN ou code de partage introuvable. Aucun quiz actif correspondant.';
    }
  }

  toggleFaq(index: number) {
    this.openFaqIndex = (this.openFaqIndex === index) ? null : index;
  }
}
