import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Participation, Certificate } from '../models/participation.model';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';
import { reloadOnAccountChange } from '../utils/account-change.util';

@Injectable({
  providedIn: 'root'
})
export class ParticipationService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private participations = signal<Participation[]>([]);
  private certificates = signal<Certificate[]>([]);

  constructor() {
    this.loadBackendData();
    reloadOnAccountChange(() => this.loadBackendData());
  }

  loadBackendData(): void {
    if (!this.authService.isAuthenticated()) {
      this.participations.set([]);
      return;
    }
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

  getParticipations() {
    return this.participations.asReadonly();
  }

  getCertificates() {
    return this.certificates.asReadonly();
  }

  saveParticipation(participation: Omit<Participation, 'id' | 'completedAt' | 'certificateEligible' | 'certificateId'>): Participation {
    const id = 'part-' + Date.now();
    const isEligible = (participation.percentage || 0) >= 70;
    const certId = isEligible ? 'cert-' + Date.now() : undefined;

    const newParticipation: Participation = {
      ...participation,
      id,
      certificateEligible: isEligible,
      certificateId: certId,
      completedAt: new Date().toISOString()
    } as Participation;

    if (isEligible && certId) {
      const newCert: Certificate = {
        id: certId,
        participationId: id,
        quizTitle: participation.quizTitle || 'Quiz',
        recipientName: participation.participantName || 'Participant',
        scorePercent: participation.percentage || 0,
        issuedAt: new Date().toISOString().split('T')[0],
        issuerName: 'Quizzboard Academy',
        verificationCode: 'QZ-' + Math.floor(1000 + Math.random() * 9000) + '-' + Math.round(participation.percentage || 0)
      };
      this.certificates.update(list => [newCert, ...list]);
    }

    this.participations.update(list => [newParticipation, ...list]);

    // Send clean payload to backend (omitting fake client IDs and ISO dates that conflict with JPA)
    const payload = {
      quizId: participation.quizId,
      quizTitle: participation.quizTitle,
      classId: participation.classId,
      className: participation.className,
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

    this.http.post<any>(`${environment.apiUrl}/participations`, payload).subscribe({
      next: (response) => {
        const saved = response?.data || response;
        if (saved && saved.id) {
          newParticipation.id = saved.id;
          newParticipation.certificateId = saved.certificateId;
          this.participations.update(list => list.map(p => p.id === id ? { ...p, id: saved.id, certificateId: saved.certificateId } : p));
        }
        if (saved && saved.certificateId) {
          this.http.get<any>(`${environment.apiUrl}/certificates/${saved.certificateId}`).subscribe({
            next: (certRes) => {
              const cert = certRes?.data || certRes;
              if (cert && cert.id) {
                this.certificates.update(list => [cert, ...list.filter(c => c.id !== cert.id)]);
              }
            }
          });
        }
      },
      error: (err) => console.warn('Sauvegarde participation backend (fallback local actif):', err)
    });

    return newParticipation;
  }

  async saveParticipationAsync(participation: Partial<Participation>): Promise<Participation> {
    const id = 'part-' + Date.now();
    const isEligible = (participation.percentage || 0) >= 70;
    const certId = isEligible ? 'cert-' + Date.now() : undefined;

    const newParticipation: Participation = {
      ...participation,
      id,
      certificateEligible: isEligible,
      certificateId: certId,
      completedAt: new Date().toISOString()
    } as Participation;

    if (isEligible && certId) {
      const newCert: Certificate = {
        id: certId,
        participationId: id,
        quizTitle: participation.quizTitle || 'Quiz',
        recipientName: participation.participantName || 'Participant',
        scorePercent: participation.percentage || 0,
        issuedAt: new Date().toISOString().split('T')[0],
        issuerName: 'Quizzboard Academy',
        verificationCode: 'QZ-' + Math.floor(1000 + Math.random() * 9000) + '-' + Math.round(participation.percentage || 0)
      };
      this.certificates.update(list => [newCert, ...list]);
    }

    this.participations.update(list => [newParticipation, ...list]);

    const payload = {
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

    try {
      const response = await firstValueFrom(
        this.http.post<any>(`${environment.apiUrl}/participations`, payload)
      );
      const saved = response?.data || response;
      if (saved && saved.id) {
        newParticipation.id = saved.id;
        newParticipation.certificateId = saved.certificateId;
        this.participations.update(list => list.map(p => p.id === id ? { ...p, id: saved.id, certificateId: saved.certificateId } : p));
      }
    } catch (err) {
      console.warn('Sauvegarde participation backend (fallback local actif):', err);
    }

    return newParticipation;
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
