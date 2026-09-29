import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { SubscriptionPlan, Invoice } from '../models/plan.model';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';

export interface PaymentInitiateResponse {
  transactionId: string;
  reference: string;
  paymentMethod: string;
  amount: number;
  currency: string;
  checkoutUrl?: string;
  qrCodeUrl?: string;
  isSimulated?: boolean;
  message?: string;
}

const DEFAULT_PLANS: SubscriptionPlan[] = [
  {
    id: 'FREE',
    name: 'Formateur Free',
    badge: 'Découverte',
    priceFcfa: 0,
    priceUsd: 0,
    period: 'Mois',
    description: 'Idéal pour démarrer et tester les évaluations interactives avec vos élèves.',
    maxActiveQuizzes: 3,
    maxParticipantsPerLive: 25,
    maxCommunities: 1,
    aiGenerationsPerMonth: 5,
    features: [
      { text: 'Jusqu\'à 3 quiz interactifs actifs', included: true },
      { text: 'Sessions Live (jusqu\'à 25 apprenants)', included: true },
      { text: 'Génération IA basique (5/mois)', included: true },
      { text: 'Gestion de cohortes et classes', included: true },
      { text: 'Analytiques avancées & exports Excel', included: false },
      { text: 'Certificats personnalisés & QR Code', included: false }
    ],
    isPopular: false
  },
  {
    id: 'STARTER',
    name: 'Formateur Starter',
    badge: 'Recommandé',
    priceFcfa: 999,
    priceUsd: 2,
    period: 'Mois',
    description: 'Pour les enseignants et centres de formation exigeants cherchant une puissance illimitée.',
    maxActiveQuizzes: 9999,
    maxParticipantsPerLive: 300,
    maxCommunities: 10,
    aiGenerationsPerMonth: 100,
    features: [
      { text: 'Quiz et parcours pédagogiques illimités', included: true, highlight: true },
      { text: 'Sessions Live jusqu\'à 300 participants', included: true, highlight: true },
      { text: 'Génération IA : 100 par mois (Gemini & Groq)', included: true, highlight: true },
      { text: 'Certificats officiels infalsifiables avec QR Code', included: true },
      { text: 'Analytiques prédictives et exports détaillés', included: true },
      { text: 'Support prioritaire 24/7 par WhatsApp/Email', included: true }
    ],
    isPopular: true
  },
  {
    id: 'LEARNER_PLUS',
    name: 'Apprenant Plus',
    badge: 'Élève',
    priceFcfa: 200,
    priceUsd: 0.5,
    period: 'Mois',
    description: 'Accès mensuel aux corrections d’épreuves, forums et communautés d’examen.',
    maxActiveQuizzes: 0,
    maxParticipantsPerLive: 0,
    maxCommunities: 9999,
    aiGenerationsPerMonth: 0,
    features: [
      { text: 'Corrections BAC, BFEM et examens', included: true, highlight: true },
      { text: 'Forums et communautés d’entraide', included: true, highlight: true },
      { text: 'Accès renouvelable chaque mois', included: true },
      { text: 'Création de quiz professeur', included: false }
    ],
    isPopular: false
  }
];

/** Consommation du forfait calculée par le serveur (limite null = illimité). */
export interface PlanUsage {
  tier: 'FREE' | 'STARTER' | 'LEARNER_PLUS';
  subscriptionExpiresAt?: string | null;
  quizzesCreated: number;
  quizzesImported: number;
  quizzesLimit: number | null;
  communitiesCreated: number;
  communitiesLimit: number | null;
  aiGenerationsUsed: number;
  aiGenerationsLimit: number | null;
  liveParticipantsLimit: number;
}

@Injectable({
  providedIn: 'root'
})
export class SubscriptionService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  private plans = signal<SubscriptionPlan[]>(DEFAULT_PLANS);
  private invoices = signal<Invoice[]>([]);

  constructor() {
    this.loadInvoices();
  }

  getPlans() {
    return this.plans.asReadonly();
  }

  getInvoices() {
    return this.invoices.asReadonly();
  }

  async loadInvoices(): Promise<void> {
    // Les factures sont personnelles : rien à charger pour un visiteur non connecté (page Tarifs publique)
    if (!this.authService.getToken()) {
      this.invoices.set([]);
      return;
    }
    try {
      const response = await firstValueFrom(
        this.http.get<any>(`${environment.apiUrl}/payments/invoices`)
      );
      const serverInvoices = response?.data || response;
      if (serverInvoices && serverInvoices.length > 0) {
        const formatted: Invoice[] = serverInvoices.map((inv: any) => ({
          id: inv.id || inv.reference,
          reference: inv.reference || inv.id,
          date: inv.createdAt || new Date().toISOString(),
          planName: inv.planName,
          amountFcfa: inv.amountFcfa,
          amountUsd: inv.amountUsd,
          paymentMethod: inv.paymentMethod,
          status: inv.status,
          receiptUrl: inv.receiptUrl || '#'
        }));
        this.invoices.set(formatted);
      } else {
        this.invoices.set([]);
      }
    } catch {
      this.invoices.set([]);
    }
  }

  /** Quotas réellement appliqués par le serveur (les quiz importés de l'ancien QuizzBoard sont exclus). */
  async loadUsage(): Promise<PlanUsage | null> {
    try {
      const res = await firstValueFrom(this.http.get<any>(`${environment.apiUrl}/subscriptions/usage`));
      return (res?.data || res) as PlanUsage;
    } catch {
      return null;
    }
  }

  async subscribeToPlan(
    planId: 'FREE' | 'STARTER' | 'LEARNER_PLUS',
    method: 'PAYDUNYA' | 'WAVE' | 'ORANGE_MONEY' | 'STRIPE',
    phoneNumber?: string
  ): Promise<boolean> {
    if (planId === 'FREE') {
      await firstValueFrom(this.authService.updateSubscription('FREE'));
      return true;
    }

    try {
      // 1. Appeler l'endpoint backend d'initiation de paiement PayDunya / Wave / Orange Money
      const response = await firstValueFrom(
        this.http.post<any>(`${environment.apiUrl}/payments/initiate`, {
          paymentMethod: method,
          planId: planId,
          phoneNumber: phoneNumber
        })
      );
      const initRes: PaymentInitiateResponse = response?.data || response;

      // Si URL de redirection PayDunya ou autre passerelle fournie
      if (initRes.checkoutUrl) {
        window.location.href = initRes.checkoutUrl;
        return true;
      }

      return false;
    } catch (err) {
      console.warn('Erreur lors du paiement backend:', err);
      throw err;
    }
  }

  /**
   * Confirme un paiement PayDunya auprès du backend après redirection
   */
  async confirmPayDunyaPayment(token: string): Promise<any> {
    const response = await firstValueFrom(
      this.http.get<any>(`${environment.apiUrl}/payments/paydunya/confirm?token=${encodeURIComponent(token)}`)
    );

    const invoice = response?.data ?? response;
    if (invoice && (invoice.status === 'PAID' || invoice.id)) {
      // Le forfait est activé par le serveur à la confirmation : on recharge le profil réel
      await firstValueFrom(this.authService.loadCurrentUser()).catch(() => null);
      await this.loadInvoices();
      return invoice;
    }
    return invoice;
  }
}
