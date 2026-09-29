import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ToastService, apiErrorMessage } from './toast.service';
import { User, UserRole, SubscriptionTier } from '../models/user.model';
import { AuditLog, AdminDashboardStats, PlatformSettings, TransactionRecord } from '../models/admin.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private http = inject(HttpClient);
  private toast = inject(ToastService);

  // 1. UTILISATEURS (alimentés dynamiquement par le backend)
  private users = signal<User[]>([]);

  // 2. TRANSACTIONS FINANCIÈRES (alimentées dynamiquement par le backend)
  private transactions = signal<TransactionRecord[]>([]);

  // 3. JOURNAUX D'AUDIT DE SÉCURITÉ (alimentés dynamiquement par le backend)
  private auditLogs = signal<AuditLog[]>([]);

  // 4. SUPERVISION : indicateurs calculés par le serveur (null tant qu'ils ne sont pas chargés)
  private dashboard = signal<AdminDashboardStats | null>(null);
  private dashboardLoading = signal(false);
  private dashboardError = signal<string | null>(null);

  // 5. PARAMÈTRES GLOBAUX DE LA PLATEFORME
  private settings = signal<PlatformSettings>({
    freeMaxQuizzes: 3,
    freeMaxLiveParticipants: 25,
    freeAiCreditsMonth: 5,
    starterPriceFcfa: 999,
    starterPriceUsd: 2,
    isMaintenanceMode: false,
    maintenanceMessage: 'QuizzBoard subit une opération de maintenance programmée. Nous serons de retour dans quelques minutes.',
    waveActive: true,
    omActive: true,
    stripeActive: true,
    allowPublicRegistrations: true,
    requireEmailVerification: true
  });

  constructor() {
    this.loadAdminData();
  }

  loadAdminData(): void {
    this.loadDashboard();

    // Utilisateurs
    this.http.get<User[] | { data: User[] }>(`${environment.apiUrl}/admin/users`).subscribe({
      next: (response) => {
        const data = this.unwrap<User[]>(response);
        this.users.set(Array.isArray(data) ? data : []);
      },
      error: () => {
        this.users.set([]);
      }
    });

    // Transactions
    this.http.get<TransactionRecord[] | { data: TransactionRecord[] }>(`${environment.apiUrl}/admin/transactions`).subscribe({
      next: (response) => {
        const txs = this.unwrap<TransactionRecord[]>(response);
        this.transactions.set(Array.isArray(txs) ? txs : []);
      },
      error: () => {
        this.transactions.set([]);
      }
    });

    this.loadAuditLogs();

    // Paramètres Plateforme
    this.http.get<PlatformSettings>(`${environment.apiUrl}/subscriptions/settings`).subscribe({
      next: (response) => {
        const settings = this.unwrap<PlatformSettings>(response);
        if (settings) {
          this.settings.set(settings);
        }
      },
      error: () => {}
    });
  }

  /** Indicateurs de supervision (recalculés par le serveur à chaque appel, services vérifiés en direct). */
  loadDashboard(): void {
    this.dashboardLoading.set(true);
    this.http.get<any>(`${environment.apiUrl}/admin/stats`).subscribe({
      next: (response) => {
        this.dashboard.set(this.unwrap<AdminDashboardStats>(response));
        this.dashboardError.set(null);
        this.dashboardLoading.set(false);
      },
      error: (err) => {
        this.dashboardError.set(apiErrorMessage(err, 'Les indicateurs n\'ont pas pu être chargés.'));
        this.dashboardLoading.set(false);
      }
    });
  }

  /** Journal d'audit tel qu'enregistré par le serveur (auteur, adresse IP, date). */
  loadAuditLogs(): void {
    this.http.get<AuditLog[] | { data: AuditLog[] }>(`${environment.apiUrl}/admin/audit-logs`).subscribe({
      next: (response) => {
        const logs = this.unwrap<AuditLog[]>(response);
        this.auditLogs.set(Array.isArray(logs) ? logs : []);
      },
      error: () => {
        this.auditLogs.set([]);
      }
    });
  }

  /** Après une action : le journal (écrit par le serveur) et les indicateurs sont relus. */
  private afterAction(): void {
    this.loadAuditLogs();
    this.loadDashboard();
  }

  // GETTERS (READONLY SIGNALS)
  public getUsers() { return this.users.asReadonly(); }
  public getTransactions() { return this.transactions.asReadonly(); }
  public getAuditLogs() { return this.auditLogs.asReadonly(); }
  public getDashboard() { return this.dashboard.asReadonly(); }
  public isDashboardLoading() { return this.dashboardLoading.asReadonly(); }
  public getDashboardError() { return this.dashboardError.asReadonly(); }
  public getSettings() { return this.settings.asReadonly(); }

  // ACTIONS UTILISATEURS
  // Chaque action met à jour la liste d'après la réponse du serveur ; un échec est affiché (jamais silencieux).

  private replaceUser(saved: User | null | undefined): void {
    if (saved && saved.id) {
      this.users.update(list => list.map(u => u.id === saved.id ? { ...u, ...saved } : u));
    }
  }

  toggleUserStatus(userId: string): void {
    this.http.put<User>(`${environment.apiUrl}/admin/users/${userId}/toggle-active`, {}).subscribe({
      next: (saved) => {
        this.replaceUser(this.unwrap(saved));
        this.afterAction();
      },
      error: (err) => this.toast.apiError(err, 'Le statut du compte n\'a pas pu être modifié.')
    });
  }

  updateUserTier(userId: string, tier: SubscriptionTier): void {
    this.http.put<User>(`${environment.apiUrl}/admin/users/${userId}/tier?tier=${tier}`, {}).subscribe({
      next: (saved) => {
        this.replaceUser(this.unwrap(saved));
        this.afterAction();
        this.toast.success(`Forfait ${tier} appliqué.`);
      },
      error: (err) => this.toast.apiError(err, 'Le forfait n\'a pas pu être modifié.')
    });
  }

  updateUserRole(userId: string, role: UserRole): void {
    this.http.put<User>(`${environment.apiUrl}/admin/users/${userId}/role?role=${role}`, {}).subscribe({
      next: (saved) => {
        this.replaceUser(this.unwrap(saved));
        this.afterAction();
        this.toast.success('Rôle mis à jour.');
      },
      error: (err) => this.toast.apiError(err, 'Le rôle n\'a pas pu être modifié.')
    });
  }

  /** Crée le compte sur le serveur ; renvoie le compte enregistré (erreur affichée et relancée en cas d'échec). */
  async createUser(userData: Partial<User>): Promise<User> {
    const payload = {
      prenom: userData.prenom || 'Nouveau',
      nom: userData.nom || 'Utilisateur',
      email: userData.email,
      role: userData.role || 'CREATOR',
      subscriptionTier: userData.subscriptionTier || 'FREE',
      organization: userData.organization || 'Indépendant',
      avatarUrl: userData.avatarUrl,
      phoneNumber: userData.phoneNumber
    };
    try {
      const res = await firstValueFrom(this.http.post<User>(`${environment.apiUrl}/admin/users`, payload));
      const created = this.unwrap<User>(res);
      this.users.update(list => [created, ...list.filter(u => u.id !== created.id)]);
      this.afterAction();
      this.toast.success(`Compte ${created.email} créé.`);
      return created;
    } catch (err) {
      this.toast.apiError(err, 'Le compte n\'a pas pu être créé.');
      throw err;
    }
  }

  deleteUser(userId: string): void {
    const user = this.users().find(u => u.id === userId);
    if (!user) return;
    this.http.delete(`${environment.apiUrl}/admin/users/${userId}`).subscribe({
      next: () => {
        this.users.update(list => list.filter(u => u.id !== userId));
        this.afterAction();
      },
      error: (err) => this.toast.apiError(err, 'Le compte n\'a pas pu être supprimé.')
    });
  }

  // ACTIONS PARAMÈTRES
  updateSettings(updates: Partial<PlatformSettings>): void {
    const previous = this.settings();
    const next = { ...previous, ...updates };
    this.settings.set(next);
    this.http.put<PlatformSettings>(`${environment.apiUrl}/subscriptions/settings`, next).subscribe({
      next: () => {
        this.afterAction();
        this.toast.success('Paramètres enregistrés.');
      },
      error: (err) => {
        this.settings.set(previous);
        this.toast.apiError(err, 'Les paramètres n\'ont pas pu être enregistrés.');
      }
    });
  }

  private unwrap<T>(response: T | { data: T }): T {
    if (response && typeof response === 'object' && 'data' in response) {
      return (response as { data: T }).data;
    }
    return response as T;
  }
}
