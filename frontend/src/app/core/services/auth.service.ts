import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of, throwError, map } from 'rxjs';
import { User, UserRole, SubscriptionTier } from '../models/user.model';
import { environment } from '../../../environments/environment';

export interface AuthResponse {
  token?: string;
  refreshToken?: string;
  tokenType?: string;
  user?: User;
  requiresRoleSelection?: boolean;
}

export interface SignupRequest {
  prenom: string;
  nom: string;
  email: string;
  password: string;
  role: UserRole;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private readonly TOKEN_KEY = 'quizzboard_token';
  private readonly STORAGE_KEY = 'quizzboard_current_user';
  
  // Reactive Signal for current user
  currentUser = signal<User | null>(this.getInitialUser());

  // Computed signals
  isAuthenticated = computed(() => this.currentUser() !== null);
  isCreator = computed(() => this.currentUser()?.role === 'CREATOR');
  isLearner = computed(() => this.currentUser()?.role === 'LEARNER');
  isAdmin = computed(() => this.currentUser()?.role === 'ADMIN');
  subscriptionTier = computed(() => this.currentUser()?.subscriptionTier || 'FREE');
  dashboardUrl = computed(() => {
    const role = this.currentUser()?.role;
    if (role === 'LEARNER') return '/app/learner/dashboard';
    if (role === 'ADMIN') return '/admin/dashboard';
    return '/app/dashboard';
  });

  constructor() {
    // Si un jeton existe déjà, rafraîchir les données utilisateur depuis le backend
    if (this.getToken()) {
      this.loadCurrentUser().subscribe({
        error: () => {
          // Si le jeton est expiré ou invalide, nettoyer
          this.logout();
        }
      });
    }
  }

  getToken(): string | null {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem(this.TOKEN_KEY);
    }
    return null;
  }

  private getInitialUser(): User | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (stored) {
          return JSON.parse(stored);
        }
      }
    } catch {
      // Ignorer l'erreur de parsing
    }
    return null;
  }

  /**
   * Connexion avec email et mot de passe via l'API Spring Boot
   */
  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, {
      email: email.trim().toLowerCase(),
      password
    }).pipe(
      tap(response => {
        if (response.token && response.user) {
          this.setSession(response.token, response.user);
        }
      })
    );
  }

  /**
   * Inscription d'un nouvel utilisateur (Formateur ou Apprenant)
   */
  signup(request: SignupRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/signup`, request).pipe(
      tap(response => {
        if (response.token && response.user) {
          this.setSession(response.token, response.user);
        }
      })
    );
  }

  /**
   * Connexion via Google OAuth2 (avec rôle optionnel pour première inscription)
   */
  loginWithGoogle(idToken: string, role?: UserRole): Observable<AuthResponse> {
    const payload: { idToken: string; role?: UserRole } = { idToken };
    if (role) {
      payload.role = role;
    }
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/google`, payload).pipe(
      tap(response => {
        if (!response.requiresRoleSelection && response.token && response.user) {
          this.setSession(response.token, response.user);
        }
      })
    );
  }

  /**
   * Récupère le profil complet depuis /auth/me
   */
  loadCurrentUser(): Observable<User> {
    return this.http.get<User>(`${environment.apiUrl}/auth/me`).pipe(
      tap(user => {
        this.setCurrentUser(user);
      })
    );
  }

  /**
   * Initialise la session avec le jeton JWT et le profil utilisateur
   */
  setSession(token?: string, user?: User | null): void {
    if (!token || !user) return;
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(this.TOKEN_KEY, token);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(user));
    }
    this.currentUser.set(user);
  }

  setCurrentUser(user: User | null): void {
    this.currentUser.set(user);
    if (typeof window !== 'undefined' && window.localStorage) {
      if (user) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(this.STORAGE_KEY);
      }
    }
  }

  /**
   * Déconnexion complète
   */
  logout(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.STORAGE_KEY);
    }
    this.currentUser.set(null);
  }


  /**
   * Mise à niveau de l'abonnement vers STARTER ou FREE
   */
  updateSubscription(tier: SubscriptionTier): Observable<any> {
    const current = this.currentUser();
    return this.http.post(`${environment.apiUrl}/subscriptions/subscribe`, {
      tier,
      billingCycle: 'MONTHLY'
    }).pipe(
      tap(() => {
        if (current) {
          const updated: User = { ...current, subscriptionTier: tier };
          this.setCurrentUser(updated);
        }
      }),
      catchError(err => {
        // Optimistic update en fallback
        if (current) {
          const updated: User = { ...current, subscriptionTier: tier };
          this.setCurrentUser(updated);
        }
        return of(null);
      })
    );
  }

  /**
   * Demande d'envoi du lien de réinitialisation de mot de passe par email
   */
  forgotPassword(email: string): Observable<{ message: string }> {
    return this.http.post<any>(`${environment.apiUrl}/auth/forgot-password`, {
      email: email.trim().toLowerCase()
    }).pipe(
      map(res => res.data || res)
    );
  }

  /**
   * Validation du nouveau mot de passe avec le jeton reçu par email
   */
  resetPassword(token: string, newPassword: string): Observable<{ message: string }> {
    return this.http.post<any>(`${environment.apiUrl}/auth/reset-password`, {
      token,
      newPassword
    }).pipe(
      map(res => res.data || res)
    );
  }
}
