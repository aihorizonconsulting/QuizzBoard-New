import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { firstValueFrom, Observable } from 'rxjs';

export interface CreateInvitationPayload {
  type: 'CLASS' | 'COMMUNITY' | 'LIVE_QUIZ';
  resourceId: string;
  targetEmails: string[];
  role?: string;
  message?: string;
  expiryDays?: number;
}

export interface InvitationData {
  id: string;
  token: string;
  type: 'CLASS' | 'COMMUNITY' | 'LIVE_QUIZ';
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED' | 'CANCELLED';
  resourceId: string;
  resourceName: string;
  targetEmail: string;
  inviterName: string;
  inviterEmail: string;
  role?: string;
  message?: string;
  inviteUrl: string;
  expiresAt: string;
  createdAt: string;
}

export interface AcceptInvitationResult {
  invitationId: string;
  resourceType: 'CLASS' | 'COMMUNITY' | 'LIVE_QUIZ';
  resourceId: string;
  resourceName: string;
  redirectUrl: string;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class InvitationService {
  private http = inject(HttpClient);

  async createInvitations(payload: CreateInvitationPayload): Promise<InvitationData[]> {
    const res = await firstValueFrom(
      this.http.post<any>(`${environment.apiUrl}/invitations`, payload)
    );
    return res?.data ?? (Array.isArray(res) ? res : []);
  }

  async verifyInvitation(token: string): Promise<InvitationData> {
    const res = await firstValueFrom(
      this.http.get<any>(`${environment.apiUrl}/invitations/verify/${encodeURIComponent(token)}`)
    );
    return res?.data ?? res;
  }

  async acceptInvitation(token: string): Promise<AcceptInvitationResult> {
    const res = await firstValueFrom(
      this.http.post<any>(`${environment.apiUrl}/invitations/accept/${encodeURIComponent(token)}`, {})
    );
    return res?.data ?? res;
  }

  async getMyPendingInvitations(): Promise<InvitationData[]> {
    const res = await firstValueFrom(
      this.http.get<any>(`${environment.apiUrl}/invitations/my-pending`)
    );
    return res?.data ?? (Array.isArray(res) ? res : []);
  }

  async cancelInvitation(id: string): Promise<void> {
    await firstValueFrom(
      this.http.delete<any>(`${environment.apiUrl}/invitations/${id}`)
    );
  }
}
