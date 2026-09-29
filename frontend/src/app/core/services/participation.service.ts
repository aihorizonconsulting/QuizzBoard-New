import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Participation, Certificate } from '../models/participation.model';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';
import { environment } from '../../../environments/environment';
import { reloadOnAccountChange } from '../utils/account-change.util';

interface PendingParticipation {
  payload: Record<string, unknown>;
  token: string | null;
  queuedAt: string;
}

/**
 * Historique des participations de l'utilisateur connecté et envoi des résultats de quiz.
 * Le score est calculé par le serveur. Si l'envoi échoue pour une raison réseau/serveur, la
 * participation est gardée sur l'appareil puis renvoyée automatiquement (aucune réponse perdue).
 */
@Injectable({
  providedIn: 'root'
})
export class ParticipationService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private toast = inject(ToastService);
  private readonly PENDING_KEY = 'quizzboard_pending_participations';
  private participations = signal<Participation[]>([]);
  private certificates = signal<Certificate[]>([]);
  private flushing = false;

  constructor() {
    this.loadBackendData();
    reloadOnAccountChange(() => this.loadBackendData(), () => {
      this.participations.set([]);
      this.certificates.set([]);
    });
    this.flushPending();
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.flushPending());
    }
  }

  loadBackendData(): void {
    if (!this.authService.isAuthenticated()) {
      this.participations.set([]);
      this.certificates.set([]);
      return;
    }
    this.loadCertificates();
    this.http.get<any>(`${environment.apiUrl}/participations/my`).subscribe({
      next: (res) => {
        const data = res?.data || res;
        this.participations.set(Array.isArray(data) ? data : []);
      },
      error: () => {
        this.participations.set([]);
      }
    });
  }

  /** Certificats de l'utilisateur, relus sur le serveur (ils ne vivaient avant que le temps de la session). */
  loadCertificates(): void {
    this.http.get<any>(`${environment.apiUrl}/certificates/my`).subscribe({
      next: (res) => {
        const data = res?.data || res;
        this.certificates.set(Array.isArray(data) ? data : []);
      },
      error: () => this.certificates.set([])
    });
  }

  getParticipations() {
    return this.participations.asReadonly();
  }

  getCertificates() {
    return this.certificates.asReadonly();
  }

  private toPayload(participation: Partial<Participation>): Record<string, unknown> {
    return {
      quizId: participation.quizId,
      quizTitle: participation.quizTitle,
      classId: participation.classId,
      className: participation.className,
      liveSessionId: participation.liveSessionId,
      participantName: participation.participantName,
      participantEmail: participation.participantEmail,
      score: participation.score,
      maxScore: participation.maxScore,
      percentage: participation.percentage,
      timeTotalSeconds: participation.timeTotalSeconds,
      status: participation.status || 'COMPLETED',
      answers: (participation.answers || []).map(a => ({
        questionId: a.questionId,
        selectedChoiceIds: a.selectedChoiceIds,
        isCorrect: a.isCorrect,
        timeSpentSeconds: a.timeSpentSeconds,
        pointsEarned: a.pointsEarned
      }))
    };
  }

  /**
   * Enregistre une participation. Renvoie la participation enregistrée par le serveur (score officiel),
   * ou, si le serveur est momentanément injoignable, une copie locale (id "part-...") mise en attente d'envoi.
   */
  async saveParticipationAsync(participation: Partial<Participation>): Promise<Participation> {
    const payload = this.toPayload(participation);
    try {
      const response = await firstValueFrom(this.http.post<any>(`${environment.apiUrl}/participations`, payload));
      const saved: Participation = response?.data || response;
      this.participations.update(list => [saved, ...list.filter(p => p.id !== saved.id)]);
      if (this.authService.isAuthenticated()) {
        // XP, niveau et série sont recalculés par le serveur : on recharge le profil et les certificats
        this.authService.loadCurrentUser().subscribe({ error: () => {} });
        if (saved.certificateId) this.loadCertificates();
      }
      return saved;
    } catch (err: any) {
      const retryable = !err?.status || err.status === 0 || err.status >= 500;
      if (retryable) {
        this.enqueue(payload);
        this.toast.info('Connexion instable : vos réponses sont conservées sur cet appareil et seront envoyées automatiquement.');
      } else {
        this.toast.apiError(err, 'Vos réponses n\'ont pas pu être enregistrées.');
      }
      return {
        ...participation,
        id: 'part-' + Date.now(),
        certificateEligible: (participation.percentage || 0) >= 70,
        completedAt: new Date().toISOString()
      } as Participation;
    }
  }

  private readPending(): PendingParticipation[] {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem(this.PENDING_KEY) : null;
      const list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  }

  private writePending(list: PendingParticipation[]): void {
    try {
      if (list.length) localStorage.setItem(this.PENDING_KEY, JSON.stringify(list));
      else localStorage.removeItem(this.PENDING_KEY);
    } catch {
      // stockage indisponible (navigation privée) : rien de plus à faire
    }
  }

  private enqueue(payload: Record<string, unknown>): void {
    this.writePending([...this.readPending(), { payload, token: this.authService.getToken(), queuedAt: new Date().toISOString() }]);
  }

  /** Renvoie les participations mises en attente (au démarrage et au retour de la connexion). */
  async flushPending(): Promise<void> {
    if (this.flushing || typeof window === 'undefined') return;
    const pending = this.readPending();
    if (!pending.length) return;
    this.flushing = true;
    const remaining: PendingParticipation[] = [];
    let sent = 0;
    for (const item of pending) {
      try {
        // Le jeton d'origine rattache la participation au bon compte même après déconnexion
        const headers: Record<string, string> = item.token ? { Authorization: `Bearer ${item.token}` } : {};
        await firstValueFrom(this.http.post<any>(`${environment.apiUrl}/participations`, item.payload, { headers }));
        sent++;
      } catch (err: any) {
        const retryable = !err?.status || err.status === 0 || err.status >= 500;
        if (retryable) remaining.push(item);
      }
    }
    this.writePending(remaining);
    this.flushing = false;
    if (sent > 0) {
      this.toast.success(`${sent} résultat(s) de quiz en attente ont été enregistrés.`);
      this.loadBackendData();
      if (this.authService.isAuthenticated()) this.authService.loadCurrentUser().subscribe({ error: () => {} });
    }
  }

  async sendResultEmail(participationId: string, email: string): Promise<boolean> {
    try {
      const res = await firstValueFrom(
        this.http.post<any>(`${environment.apiUrl}/participations/${participationId}/send-email?email=${encodeURIComponent(email)}`, {})
      );
      return res?.success !== false;
    } catch (err) {
      console.warn('Erreur envoi direct email participation:', err);
      return false;
    }
  }

  getCertificateById(id: string): Certificate | undefined {
    return this.certificates().find(c => c.id === id || c.participationId === id);
  }

  toggleCertificateStatus(id: string): void {
    this.certificates.update(list =>
      list.map(c => {
        if (c.id === id) {
          const next = c.status === 'REVOKED' ? 'VALID' : 'REVOKED';
          return { ...c, status: next };
        }
        return c;
      })
    );
  }
}
