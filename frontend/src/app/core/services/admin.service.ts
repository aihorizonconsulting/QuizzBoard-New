import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { User, UserRole, SubscriptionTier } from '../models/user.model';
import { AuditLog, SystemMetrics, PlatformSettings, TransactionRecord } from '../models/admin.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private http = inject(HttpClient);

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
    starterPriceFcfa: 9900,
    starterPriceUsd: 15,
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
      next: (stats) => {
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
    this.http.get<User[]>(`${environment.apiUrl}/admin/users`).subscribe({
      next: (data) => {
        this.users.set(data || []);
      },
      error: () => {
        this.users.set([]);
      }
    });

    // Transactions
    this.http.get<TransactionRecord[]>(`${environment.apiUrl}/admin/transactions`).subscribe({
      next: (txs) => {
        this.transactions.set(txs || []);
      },
      error: () => {
        this.transactions.set([]);
      }
    });

    // Logs d'audit
    this.http.get<AuditLog[]>(`${environment.apiUrl}/admin/audit-logs`).subscribe({
      next: (logs) => {
        this.auditLogs.set(logs || []);
      },
      error: () => {
        this.auditLogs.set([]);
      }
    });

    // Paramètres Plateforme
    this.http.get<PlatformSettings>(`${environment.apiUrl}/subscriptions/settings`).subscribe({
      next: (settings) => {
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
  toggleUserStatus(userId: string): void {
    this.users.update(list =>
      list.map(u => {
        if (u.id === userId) {
          const newStatus = u.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
          this.logAction(
            newStatus === 'SUSPENDED' ? 'Suspension de compte' : 'Réactivation de compte',
            `${u.prenom} ${u.nom} (${u.email})`,
            newStatus === 'SUSPENDED' ? 'WARNING' : 'INFO'
          );
          return { ...u, status: newStatus };
        }
        return u;
      })
    );

    this.http.put(`${environment.apiUrl}/admin/users/${userId}/toggle-active`, {}).subscribe({
      error: () => {}
    });
  }

  updateUserTier(userId: string, tier: SubscriptionTier): void {
    this.users.update(list =>
      list.map(u => {
        if (u.id === userId) {
          this.logAction(
            `Modification Forfait vers ${tier}`,
            `${u.prenom} ${u.nom} (${u.email})`,
            'INFO'
          );
          return { ...u, subscriptionTier: tier };
        }
        return u;
      })
    );

    this.http.put(`${environment.apiUrl}/admin/users/${userId}/tier?tier=${tier}`, {}).subscribe({
      error: () => {}
    });
  }

  updateUserRole(userId: string, role: UserRole): void {
    this.users.update(list =>
      list.map(u => {
        if (u.id === userId) {
          this.logAction(
            `Modification Rôle vers ${role}`,
            `${u.prenom} ${u.nom} (${u.email})`,
            role === 'ADMIN' ? 'CRITICAL' : 'INFO'
          );
          return { ...u, role: role };
        }
        return u;
      })
    );

    this.http.put(`${environment.apiUrl}/admin/users/${userId}/role?role=${role}`, {}).subscribe({
      error: () => {}
    });
  }

  createUser(userData: Partial<User>): User {
    const newUser: User = {
      id: 'user-' + Date.now(),
      prenom: userData.prenom || 'Nouveau',
      nom: userData.nom || 'Utilisateur',
      email: userData.email || `user.${Date.now()}@quizzboard.com`,
      role: userData.role || 'CREATOR',
      subscriptionTier: userData.subscriptionTier || 'FREE',
      organization: userData.organization || 'Indépendant',
      avatarUrl: userData.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      xpPoints: 0,
      level: 1,
      streakDays: 1,
      followersCount: 0,
      followingCount: 0,
      createdAt: new Date().toISOString().split('T')[0],
      status: 'ACTIVE',
      phoneNumber: userData.phoneNumber || '+221 77 000 00 00'
    };

    this.users.update(list => [newUser, ...list]);
    this.logAction('Création de compte administratif', `${newUser.prenom} ${newUser.nom} (${newUser.email}) - Rôle: ${newUser.role}`, 'INFO');

    this.http.post<User>(`${environment.apiUrl}/admin/users`, newUser).subscribe({
      next: (created) => {
        if (created && created.id) {
          this.users.update(list => list.map(u => u.id === newUser.id ? created : u));
        }
      },
      error: () => {}
    });

    return newUser;
  }

  deleteUser(userId: string): void {
    const user = this.users().find(u => u.id === userId);
    if (user) {
      this.logAction('Suppression définitive du compte', `${user.prenom} ${user.nom} (${user.email})`, 'CRITICAL');
      this.users.update(list => list.filter(u => u.id !== userId));

      this.http.delete(`${environment.apiUrl}/admin/users/${userId}`).subscribe({
        error: () => {}
      });
    }
  }

  // ACTIONS PARAMÈTRES
  updateSettings(updates: Partial<PlatformSettings>): void {
    const next = { ...this.settings(), ...updates };
    this.settings.set(next);
    this.logAction('Mise à jour des paramètres plateforme', 'Configuration système enregistrée', 'WARNING');

    this.http.put<PlatformSettings>(`${environment.apiUrl}/subscriptions/settings`, next).subscribe({
      error: () => {}
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
}
