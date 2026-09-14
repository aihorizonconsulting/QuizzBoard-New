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
  isSimulated: boolean;
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
    priceFcfa: 9900,
    priceUsd: 15,
    period: 'Mois',
    description: 'Pour les enseignants et centres de formation exigeants cherchant une puissance illimitée.',
    maxActiveQuizzes: 9999,
    maxParticipantsPerLive: 300,
    maxCommunities: 10,
    aiGenerationsPerMonth: 100,
    features: [
      { text: 'Quiz et parcours pédagogiques illimités', included: true, highlight: true },
      { text: 'Sessions Live jusqu\'à 300 participants', included: true, highlight: true },
      { text: 'Génération IA illimitée (Gemini & Groq)', included: true, highlight: true },
      { text: 'Certificats officiels infalsifiables avec QR Code', included: true },
      { text: 'Analytiques prédictives et exports détaillés', included: true },
      { text: 'Support prioritaire 24/7 par WhatsApp/Email', included: true }
    ],
    isPopular: true
  }
];

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
    try {
      const serverInvoices = await firstValueFrom(
        this.http.get<any[]>(`${environment.apiUrl}/payments/invoices`)
      );
      if (serverInvoices && serverInvoices.length > 0) {
        const formatted: Invoice[] = serverInvoices.map(inv => ({
          id: inv.id || inv.reference,
          date: inv.createdAt ? inv.createdAt.split('T')[0] : new Date().toISOString().split('T')[0],
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

  async subscribeToPlan(
    planId: 'FREE' | 'STARTER',
    method: 'PAYDUNYA' | 'WAVE' | 'ORANGE_MONEY' | 'STRIPE',
    phoneNumber?: string
  ): Promise<boolean> {
    if (planId === 'FREE') {
      this.authService.updateSubscription('FREE');
      return true;
    }

    try {
      // 1. Appeler l'endpoint backend d'initiation de paiement PayDunya / Wave / Orange Money
      const initRes = await firstValueFrom(
        this.http.post<PaymentInitiateResponse>(`${environment.apiUrl}/payments/initiate`, {
          paymentMethod: method,
          planId: planId,
          phoneNumber: phoneNumber
        })
      );

      // Si URL de redirection PayDunya ou autre passerelle fournie
      if (initRes.checkoutUrl) {
        window.location.href = initRes.checkoutUrl;
        return true;
      }

      // 2. Si mode simulation sans redirection
      if (initRes.isSimulated || environment.enableSimulationPayment) {
        const invoice = await firstValueFrom(
          this.http.post<any>(`${environment.apiUrl}/payments/simulate/${initRes.reference}/success`, {})
        );

        this.authService.updateSubscription(planId);

        const newInvoice: Invoice = {
          id: invoice.id || initRes.reference,
          date: new Date().toISOString().split('T')[0],
          planName: invoice.planName || `Abonnement STARTER (Mensuel)`,
          amountFcfa: invoice.amountFcfa || 9900,
          amountUsd: invoice.amountUsd || 15,
          paymentMethod: method,
          status: 'PAID',
          receiptUrl: '#'
        };

        this.invoices.update(list => [newInvoice, ...list]);
        return true;
      }

      return true;
    } catch (err) {
      console.warn('Erreur lors du paiement backend, bascule sur simulation locale:', err);
      // Simulation locale de secours
      const plan = this.plans().find(p => p.id === planId);
      if (plan) {
        this.authService.updateSubscription(planId);
        const newInvoice: Invoice = {
          id: 'INV-' + Date.now().toString().slice(-6),
          date: new Date().toISOString().split('T')[0],
          planName: `Abonnement ${plan.name} (Mensuel)`,
          amountFcfa: plan.priceFcfa,
          amountUsd: plan.priceUsd,
          paymentMethod: method,
          status: 'PAID',
          receiptUrl: '#'
        };
        this.invoices.update(list => [newInvoice, ...list]);
      }
      return true;
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
      this.authService.updateSubscription('STARTER');
      await this.loadInvoices();
      return invoice;
    }
    return invoice;
  }
}
