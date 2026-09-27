import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ToastService } from './toast.service';
import { User, UserRole, SubscriptionTier } from '../models/user.model';
import { AuditLog, SystemMetrics, PlatformSettings, TransactionRecord } from '../models/admin.model';
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

  // 4. MÉTRIQUES SYSTÈMES & QUOTAS
  private metrics = signal<SystemMetrics>({
    totalUsers: 0,
    creatorsCount: 0,
    learnersCount: 0,
    mrrFcfa: 0,
    mrrUsd: 0,
    totalQuizzes: 0,
    totalCourses: 0,
    aiCallsMonth: 0,
    activeLiveArenas: 0,
    connectedLiveStudents: 0,
    databaseHealthPercent: 100.0,
    geminiLatencyMs: 250,
    groqLatencyMs: 120
  });

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
    // Stats
    this.http.get<any>(`${environment.apiUrl}/admin/stats`).subscribe({
      next: (response) => {
        const stats = this.unwrap(response);
        if (stats) {
          this.metrics.update(m => ({
            ...m,
            totalUsers: stats.totalUsers ?? m.totalUsers,
            mrrFcfa: stats.totalRevenueFcfa ?? m.mrrFcfa,
            totalQuizzes: stats.totalQuizzes ?? m.totalQuizzes,
            totalCourses: stats.totalCourses ?? m.totalCourses,
            totalQuestions: stats.totalQuestions ?? m.totalQuestions
          }));
        }
      },
      error: () => {}
    });

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

    // Logs d'audit
    this.http.get<AuditLog[] | { data: AuditLog[] }>(`${environment.apiUrl}/admin/audit-logs`).subscribe({
      next: (response) => {
        const logs = this.unwrap<AuditLog[]>(response);
        this.auditLogs.set(Array.isArray(logs) ? logs : []);
      },
      error: () => {
        this.auditLogs.set([]);
      }
    });

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

  // GETTERS (READONLY SIGNALS)
  public getUsers() { return this.users.asReadonly(); }
  public getTransactions() { return this.transactions.asReadonly(); }
  public getAuditLogs() { return this.auditLogs.asReadonly(); }
  public getMetrics() { return this.metrics.asReadonly(); }
  public getSettings() { return this.settings.asReadonly(); }

  // ACTIONS UTILISATEURS
  // Chaque action met à jour la liste d'après la réponse du serveur ; un échec est affiché (jamais silencieux).

  private replaceUser(saved: User | null | undefined): void {
    if (saved && saved.id) {
      this.users.update(list => list.map(u => u.id === saved.id ? { ...u, ...saved } : u));
    }
  }

  toggleUserStatus(userId: string): void {
    const user = this.users().find(u => u.id === userId);
    this.http.put<User>(`${environment.apiUrl}/admin/users/${userId}/toggle-active`, {}).subscribe({
      next: (saved) => {
        this.replaceUser(this.unwrap(saved));
        if (user) {
          const suspended = this.unwrap(saved)?.status === 'SUSPENDED';
          this.logAction(suspended ? 'Suspension de compte' : 'Réactivation de compte', `${user.prenom} ${user.nom} (${user.email})`, suspended ? 'WARNING' : 'INFO');
        }
      },
      error: (err) => this.toast.apiError(err, 'Le statut du compte n\'a pas pu être modifié.')
    });
  }

  updateUserTier(userId: string, tier: SubscriptionTier): void {
    const user = this.users().find(u => u.id === userId);
    this.http.put<User>(`${environment.apiUrl}/admin/users/${userId}/tier?tier=${tier}`, {}).subscribe({
      next: (saved) => {
        this.replaceUser(this.unwrap(saved));
        if (user) this.logAction(`Modification Forfait vers ${tier}`, `${user.prenom} ${user.nom} (${user.email})`, 'INFO');
        this.toast.success(`Forfait ${tier} appliqué.`);
      },
      error: (err) => this.toast.apiError(err, 'Le forfait n\'a pas pu être modifié.')
    });
  }

  updateUserRole(userId: string, role: UserRole): void {
    const user = this.users().find(u => u.id === userId);
    this.http.put<User>(`${environment.apiUrl}/admin/users/${userId}/role?role=${role}`, {}).subscribe({
      next: (saved) => {
        this.replaceUser(this.unwrap(saved));
        if (user) this.logAction(`Modification Rôle vers ${role}`, `${user.prenom} ${user.nom} (${user.email})`, role === 'ADMIN' ? 'CRITICAL' : 'INFO');
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
      this.logAction('Création de compte administratif', `${created.prenom} ${created.nom} (${created.email}) - Rôle: ${created.role}`, 'INFO');
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
        this.logAction('Suppression définitive du compte', `${user.prenom} ${user.nom} (${user.email})`, 'CRITICAL');
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
        this.logAction('Mise à jour des paramètres plateforme', 'Configuration système enregistrée', 'WARNING');
        this.toast.success('Paramètres enregistrés.');
      },
      error: (err) => {
        this.settings.set(previous);
        this.toast.apiError(err, 'Les paramètres n\'ont pas pu être enregistrés.');
      }
    });
  }

  // LOGGING INTERNE
  private logAction(action: string, target: string, severity: 'INFO' | 'WARNING' | 'CRITICAL') {
    const newLog: AuditLog = {
      id: 'log-' + Date.now(),
      timestamp: 'À l\'instant',
      adminName: 'Admin HQ',
      action,
      target,
      ipAddress: '196.207.240.12 (Dakar, SN)',
      severity
    };
    this.auditLogs.update(logs => [newLog, ...logs]);
  }

  private unwrap<T>(response: T | { data: T }): T {
    if (response && typeof response === 'object' && 'data' in response) {
      return (response as { data: T }).data;
    }
    return response as T;
  }
}
