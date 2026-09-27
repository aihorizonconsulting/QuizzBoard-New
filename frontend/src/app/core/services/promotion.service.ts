import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Promotion, PromotionStatus, PromotionPermissions } from '../models/promotion.model';
import { environment } from '../../../environments/environment';
import { reloadOnAccountChange } from '../utils/account-change.util';
import { ToastService } from './toast.service';

/**
 * Promotions du formateur connecté. Le serveur est la seule source de vérité : chaque action attend
 * sa réponse (aucun identifiant temporaire), puis la liste est rechargée car le serveur applique les
 * règles métier (une seule promotion en cours, une seule active). En cas d'échec, l'erreur est affichée.
 */
@Injectable({
  providedIn: 'root'
})
export class PromotionService {
  private http = inject(HttpClient);
  private toast = inject(ToastService);
  private readonly STORAGE_KEY = 'quizzboard_active_promotion_id';
  private readonly baseUrl = `${environment.apiUrl}/promotions`;

  // State: All available promotions
  private promotionsState = signal<Promotion[]>([]);

  // Active Promotion ID (Single global working context, never 'ALL')
  activePromotionId = signal<string>(this.getInitialPromotionId());

  // Public Selectors
  promotions = this.promotionsState.asReadonly();

  // The single globally active promotion (Main working context)
  activePromotion = computed<Promotion | null>(() => {
    const list = this.promotionsState();
    if (!list || list.length === 0) return null;
    const found = list.find(p => p.id === this.activePromotionId());
    if (found) return found;
    return list.find(p => p.isActive) || list[0] || null;
  });

  // Backward-compatibility aliases
  currentPromotion = this.activePromotion;
  isAllPromotions = computed<boolean>(() => false);

  activePromotionLabel = computed<string>(() => {
    const active = this.activePromotion();
    return active ? (active.name || active.label) : 'Aucune promotion active';
  });

  // Indique si le contexte de travail actif est en lecture seule (Archivée)
  isGlobalReadOnly = computed<boolean>(() => this.activePromotion()?.status === 'ARCHIVED');

  // Loading state
  isLoading = signal<boolean>(true);

  // Droits et permissions du contexte de travail actif
  globalPermissions = computed<PromotionPermissions>(() => this.getPermissions(this.activePromotion()));

  constructor() {
    this.loadPromotions();
    reloadOnAccountChange(() => this.loadPromotions(), () => this.promotionsState.set([]));
  }

  async loadPromotions(): Promise<void> {
    this.isLoading.set(true);
    try {
      const data = await firstValueFrom(this.http.get<Promotion[]>(this.baseUrl));
      const list = (Array.isArray(data) ? data : []).map(p => this.normalize(p));
      this.promotionsState.set(list);
      // La promotion active enregistrée côté serveur fait foi ; à défaut on garde le choix local s'il existe encore
      const serverActive = list.find(p => p.isActive);
      const localId = this.activePromotionId();
      const next = serverActive || list.find(p => p.id === localId) || list[0];
      if (next) this.rememberActive(next.id);
    } catch {
      this.promotionsState.set([]);
    } finally {
      this.isLoading.set(false);
    }
  }

  private normalize(p: Promotion): Promotion {
    return {
      ...p,
      label: p.name,
      isActive: !!p.isActive,
      isCurrent: !!p.isActive,
      classesCount: p.classesCount ?? 0,
      studentsCount: p.studentsCount ?? 0,
      quizzesCount: p.quizzesCount ?? 0
    };
  }

  private getInitialPromotionId(): string {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved && saved !== 'ALL') {
        return saved;
      }
    }
    return '';
  }

  private rememberActive(promotionId: string): void {
    this.activePromotionId.set(promotionId);
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(this.STORAGE_KEY, promotionId);
    }
  }

  /**
   * Définit une promotion comme contexte de travail actif (enregistré sur le serveur).
   * L'interface bascule immédiatement ; en cas d'échec l'ancien contexte est restauré.
   */
  async setActivePromotion(promotionId: string): Promise<void> {
    if (!promotionId || promotionId === 'ALL') return;
    const previousId = this.activePromotionId();
    const previousList = this.promotionsState();
    this.rememberActive(promotionId);
    this.promotionsState.update(list => list.map(p => ({ ...p, isActive: p.id === promotionId, isCurrent: p.id === promotionId })));
    try {
      await firstValueFrom(this.http.put<Promotion>(`${this.baseUrl}/${promotionId}/activate`, {}));
    } catch (err) {
      this.promotionsState.set(previousList);
      if (previousId) this.rememberActive(previousId);
      this.toast.apiError(err, 'Impossible de changer de promotion active.');
    }
  }

  getPromotionById(id: string): Promotion | undefined {
    return this.promotionsState().find(p => p.id === id);
  }

  /** Crée la promotion sur le serveur et renvoie la promotion enregistrée (erreur affichée et relancée en cas d'échec). */
  async createPromotion(data: {
    name: string;
    year: string;
    startDate: string;
    endDate: string;
    status: PromotionStatus;
    description?: string;
    setAsActive?: boolean;
  }): Promise<Promotion> {
    const shouldBeActive = data.setAsActive ?? (data.status === 'IN_PROGRESS');
    try {
      const saved = await firstValueFrom(this.http.post<Promotion>(this.baseUrl, {
        name: data.name,
        year: data.year,
        startDate: data.startDate || null,
        endDate: data.endDate || null,
        status: data.status,
        description: data.description,
        isActive: shouldBeActive
      }));
      await this.loadPromotions();
      if (shouldBeActive) this.rememberActive(saved.id);
      this.toast.success(`Promotion « ${saved.name} » enregistrée.`);
      return this.getPromotionById(saved.id) || this.normalize(saved);
    } catch (err) {
      this.toast.apiError(err, 'La promotion n\'a pas pu être enregistrée.');
      throw err;
    }
  }

  async updatePromotion(id: string, updates: Partial<Promotion>): Promise<Promotion | null> {
    const current = this.getPromotionById(id);
    if (!current) return null;
    try {
      const saved = await firstValueFrom(this.http.put<Promotion>(`${this.baseUrl}/${id}`, { ...current, ...updates }));
      await this.loadPromotions();
      return this.getPromotionById(saved.id) || this.normalize(saved);
    } catch (err) {
      this.toast.apiError(err, 'La promotion n\'a pas pu être mise à jour.');
      return null;
    }
  }

  async deletePromotion(id: string): Promise<boolean> {
    try {
      await firstValueFrom(this.http.delete(`${this.baseUrl}/${id}`));
      await this.loadPromotions();
      return true;
    } catch (err) {
      this.toast.apiError(err, 'La promotion n\'a pas pu être supprimée.');
      return false;
    }
  }

  async archivePromotion(promotionId: string): Promise<void> {
    const wasActive = this.activePromotionId() === promotionId;
    const updated = await this.updatePromotion(promotionId, { status: 'ARCHIVED' });
    if (!updated) return;
    // Si la promotion archivée était le contexte actif, on bascule sur une promotion encore ouverte
    if (wasActive) {
      const remaining = this.promotionsState().find(p => p.id !== promotionId && p.status !== 'ARCHIVED');
      if (remaining) await this.setActivePromotion(remaining.id);
    }
  }

  /**
   * Retourne les permissions et droits d'action d'une promotion selon son statut métier
   */
  getPermissions(statusOrPromo: PromotionStatus | Promotion | null | undefined): PromotionPermissions {
    if (!statusOrPromo) {
      return {
        canPrepare: true,
        canMutate: true,
        canEvaluate: true,
        canLaunchLive: true,
        isReadOnly: false
      };
    }

    const status = typeof statusOrPromo === 'string' ? statusOrPromo : statusOrPromo?.status;

    if (status === 'ARCHIVED') {
      return {
        canPrepare: false,
        canMutate: false,
        canEvaluate: false,
        canLaunchLive: false,
        isReadOnly: true
      };
    }

    if (status === 'UPCOMING') {
      return {
        canPrepare: true,      // Préparation classes, inscriptions apprenants, parcours
        canMutate: true,       // Créer / modifier les éléments de préparation
        canEvaluate: false,    // Pas d'évaluations réelles avant le démarrage
        canLaunchLive: false,  // Pas de session Live avant le passage en cours
        isReadOnly: false
      };
    }

    // IN_PROGRESS
    return {
      canPrepare: true,
      canMutate: true,
      canEvaluate: true,
      canLaunchLive: true,
      isReadOnly: false
    };
  }

  /**
   * Retourne la seule et unique promotion actuellement En cours (si existante)
   */
  getInProgressPromotion(): Promotion | undefined {
    return this.promotionsState().find(p => p.status === 'IN_PROGRESS');
  }

  /**
   * Modifie le statut d'une promotion. Règles (appliquées par le serveur) :
   * 1. Une promotion ARCHIVÉE est verrouillée et ne peut plus changer de statut.
   * 2. Une SEULE promotion peut être "En cours" : démarrer une promotion archive l'ancienne
   *    et la rend active.
   */
  async changePromotionStatus(promotionId: string, newStatus: PromotionStatus): Promise<void> {
    const current = this.getPromotionById(promotionId);
    if (!current) return;

    if (current.status === 'ARCHIVED') {
      this.toast.error(`La promotion « ${current.name} » est archivée : son statut ne peut plus être modifié.`);
      return;
    }

    if (newStatus === 'ARCHIVED') {
      await this.archivePromotion(promotionId);
      return;
    }

    const updated = await this.updatePromotion(promotionId, { status: newStatus });
    if (updated && newStatus === 'IN_PROGRESS') {
      this.rememberActive(promotionId);
    }
  }
}
