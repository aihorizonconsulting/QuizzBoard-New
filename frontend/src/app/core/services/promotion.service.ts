import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Promotion, PromotionStatus, PromotionPermissions } from '../models/promotion.model';
import { environment } from '../../../environments/environment';
import { reloadOnAccountChange } from '../utils/account-change.util';

@Injectable({
  providedIn: 'root'
})
export class PromotionService {
  private http = inject(HttpClient);
  private readonly STORAGE_KEY = 'quizzboard_active_promotion_id';

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
    const id = this.activePromotionId();
    const found = list.find(p => p.id === id);
    if (found) return found;

    // Fallback to the one marked isActive, or the first one in the list
    const markedActive = list.find(p => p.isActive);
    return markedActive || list[0] || null;
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
  globalPermissions = computed<PromotionPermissions>(() => {
    const active = this.activePromotion();
    if (!active) {
      return {
        canPrepare: true,
        canMutate: true,
        canEvaluate: true,
        canLaunchLive: true,
        isReadOnly: false
      };
    }
    return this.getPermissions(active);
  });

  constructor() {
    this.loadPromotions();
    reloadOnAccountChange(() => this.loadPromotions(), () => this.promotionsState.set([]));
  }

  loadPromotions(): void {
    this.isLoading.set(true);
    this.http.get<Promotion[]>(`${environment.apiUrl}/promotions`).subscribe({
      next: (data) => {
        this.isLoading.set(false);
        this.promotionsState.set(data || []);
        if (data && data.length > 0) {
          const currentId = this.activePromotionId();
          if (!currentId || !data.some(p => p.id === currentId)) {
            const active = data.find(p => p.isActive) || data[0];
            if (active) this.setActivePromotion(active.id);
          }
        }
      },
      error: () => {
        this.isLoading.set(false);
        this.promotionsState.set([]);
      }
    });
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

  /**
   * Sets a promotion as the single active working context.
   * Automatically deactivates any previously active promotion.
   */
  setActivePromotion(promotionId: string): void {
    if (!promotionId || promotionId === 'ALL') return;

    this.promotionsState.update(list =>
      list.map(p => ({
        ...p,
        isActive: p.id === promotionId,
        isCurrent: p.id === promotionId
      }))
    );

    this.activePromotionId.set(promotionId);

    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(this.STORAGE_KEY, promotionId);
    }
  }

  getPromotionById(id: string): Promotion | undefined {
    return this.promotionsState().find(p => p.id === id);
  }

  createPromotion(data: {
    name: string;
    year: string;
    startDate: string;
    endDate: string;
    status: PromotionStatus;
    description?: string;
    setAsActive?: boolean;
  }): Promotion {
    const slug = data.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const newId = 'promo-' + Date.now().toString().slice(-4);
    const shouldBeActive = data.setAsActive ?? (data.status === 'IN_PROGRESS');

    const newPromotion: Promotion = {
      id: newId,
      code: 'P' + (this.promotionsState().length + 5),
      name: data.name,
      label: data.name,
      year: data.year,
      startDate: data.startDate,
      endDate: data.endDate,
      status: data.status,
      isActive: shouldBeActive,
      isCurrent: shouldBeActive,
      classesCount: 0,
      classesList: [],
      studentsCount: 0,
      quizzesCount: 0,
      description: data.description,
      createdAt: new Date().toISOString().split('T')[0]
    };

    this.promotionsState.update(list => {
      let updated = list;
      if (data.status === 'IN_PROGRESS') {
        // Règle d'or : une seule promotion En cours à la fois.
        // L'ancienne promotion En cours est automatiquement archivée.
        updated = list.map(p => {
          if (p.status === 'IN_PROGRESS') {
            return { ...p, status: 'ARCHIVED' as PromotionStatus, isActive: false, isCurrent: false };
          }
          return { ...p, isActive: false, isCurrent: false };
        });
      } else if (shouldBeActive) {
        updated = list.map(p => ({ ...p, isActive: false, isCurrent: false }));
      }
      return [newPromotion, ...updated];
    });

    if (shouldBeActive) {
      this.setActivePromotion(newPromotion.id);
    }

    // Persister sur le backend Spring Boot
    this.http.post<Promotion>(`${environment.apiUrl}/promotions`, newPromotion).subscribe({
      next: (saved) => {
        if (saved && saved.id) {
          this.promotionsState.update(list => list.map(p => p.id === newId ? saved : p));
        }
      },
      error: () => {}
    });

    return newPromotion;
  }

  updatePromotion(id: string, updates: Partial<Promotion>): void {
    this.promotionsState.update(list =>
      list.map(p => {
        if (p.id === id) {
          return { ...p, ...updates };
        }
        return p;
      })
    );

    const updated = this.promotionsState().find(p => p.id === id);
    if (updated) {
      this.http.put<Promotion>(`${environment.apiUrl}/promotions/${id}`, updated).subscribe({
        error: () => {}
      });
    }
  }

  deletePromotion(id: string): void {
    this.promotionsState.update(list => list.filter(p => p.id !== id));
    this.http.delete(`${environment.apiUrl}/promotions/${id}`).subscribe({
      error: () => {}
    });
  }

  archivePromotion(promotionId: string): void {
    const currentActiveId = this.activePromotionId();
    const wasActive = currentActiveId === promotionId;

    this.promotionsState.update(list =>
      list.map(p => {
        if (p.id === promotionId) {
          return {
            ...p,
            status: 'ARCHIVED' as PromotionStatus,
            isActive: false,
            isCurrent: false
          };
        }
        return p;
      })
    );

    const archived = this.promotionsState().find(p => p.id === promotionId);
    if (archived) {
      this.http.put<Promotion>(`${environment.apiUrl}/promotions/${promotionId}`, archived).subscribe();
    }

    // If we archived the active promotion, switch active to another non-archived promotion
    if (wasActive) {
      const remaining = this.promotionsState().find(p => p.id !== promotionId && p.status !== 'ARCHIVED');
      if (remaining) {
        this.setActivePromotion(remaining.id);
      }
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
   * Modifie le statut d'une promotion avec contrôles stricts :
   * 1. Une promotion ARCHIVÉE est verrouillée et ne peut plus changer de statut.
   * 2. Une SEULE promotion peut être "En cours" à la fois. Tout passage en cours
   *    archive automatiquement l'ancienne promotion en cours et devient le contexte actif.
   */
  changePromotionStatus(promotionId: string, newStatus: PromotionStatus): void {
    const current = this.promotionsState().find(p => p.id === promotionId);
    if (!current) return;

    // Règle métier 1 : une promotion archivée est définitivement verrouillée
    if (current.status === 'ARCHIVED') {
      console.warn(`[PromotionService] La promotion ${current.name} est ARCHIVÉE. Son statut ne peut plus être modifié.`);
      return;
    }

    if (newStatus === 'ARCHIVED') {
      this.archivePromotion(promotionId);
      return;
    }

    if (newStatus === 'IN_PROGRESS') {
      // Règle métier 2 : UNE SEULE promotion En cours à la fois.
      // L'ancienne promotion en cours est automatiquement archivée.
      this.promotionsState.update(list =>
        list.map(p => {
          if (p.id === promotionId) {
            return { ...p, status: 'IN_PROGRESS', isActive: true, isCurrent: true };
          }
          if (p.status === 'IN_PROGRESS') {
            return { ...p, status: 'ARCHIVED' as PromotionStatus, isActive: false, isCurrent: false };
          }
          return p;
        })
      );
      this.setActivePromotion(promotionId);
      return;
    }

    this.promotionsState.update(list =>
      list.map(p => {
        if (p.id === promotionId) {
          return { ...p, status: newStatus };
        }
        return p;
      })
    );
  }
}
