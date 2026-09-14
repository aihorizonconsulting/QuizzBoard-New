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

    // Send to backend in background
    this.http.post<any>(`${environment.apiUrl}/participations`, newParticipation).subscribe({
      next: (saved) => {
        if (saved && saved.certificateId) {
          this.http.get<Certificate>(`${environment.apiUrl}/certificates/${saved.certificateId}`).subscribe({
            next: (cert) => {
              this.certificates.update(list => [cert, ...list.filter(c => c.id !== cert.id)]);
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
