import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Participation, Certificate } from '../models/participation.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ParticipationService {
  private http = inject(HttpClient);
  private participations = signal<Participation[]>([]);
  private certificates = signal<Certificate[]>([]);

  constructor() {
    this.loadBackendData();
  }

  loadBackendData(): void {
    this.http.get<Participation[]>(`${environment.apiUrl}/participations/my`).subscribe({
      next: (data) => {
        this.participations.set(data || []);
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
    const isEligible = participation.percentage >= 70;
    const certId = isEligible ? 'cert-' + Date.now() : undefined;

    const newParticipation: Participation = {
      ...participation,
      id,
      certificateEligible: isEligible,
      certificateId: certId,
      completedAt: new Date().toISOString()
    };

    if (isEligible && certId) {
      const newCert: Certificate = {
        id: certId,
        participationId: id,
        quizTitle: participation.quizTitle,
        recipientName: participation.participantName,
        scorePercent: participation.percentage,
        issuedAt: new Date().toISOString().split('T')[0],
        issuerName: 'Quizzboard Academy',
        verificationCode: 'QZ-' + Math.floor(1000 + Math.random() * 9000) + '-' + Math.round(participation.percentage)
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
