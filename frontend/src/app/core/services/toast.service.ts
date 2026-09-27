import { Injectable, signal } from '@angular/core';
import { getGeneralErrorMessage } from '../utils/form-error.util';

export type ToastKind = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

/**
 * Messages éphémères affichés en haut à droite. Toute opération enregistrée sur le serveur qui échoue
 * doit être signalée ici : un échec silencieux laisse croire que la donnée est sauvegardée.
 */
@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private nextId = 1;
  readonly toasts = signal<Toast[]>([]);

  success(message: string): void {
    this.show('success', message, 3500);
  }

  info(message: string): void {
    this.show('info', message, 4500);
  }

  error(message: string): void {
    this.show('error', message, 8000);
  }

  /** Affiche l'erreur renvoyée par l'API (message métier du backend) ou le message par défaut. */
  apiError(err: unknown, fallback: string): void {
    this.error(apiErrorMessage(err, fallback));
  }

  dismiss(id: number): void {
    this.toasts.update(list => list.filter(t => t.id !== id));
  }

  private show(kind: ToastKind, message: string, durationMs: number): void {
    const id = this.nextId++;
    this.toasts.update(list => [...list.slice(-3), { id, kind, message }]);
    setTimeout(() => this.dismiss(id), durationMs);
  }
}

/** Message lisible pour une erreur HTTP : message du backend, serveur injoignable, ou message par défaut. */
export function apiErrorMessage(err: any, fallback: string): string {
  if (err?.status === 0) {
    return 'Serveur injoignable : vérifiez votre connexion internet puis réessayez.';
  }
  if (err?.status === 401) {
    return 'Votre session a expiré : reconnectez-vous puis réessayez.';
  }
  return getGeneralErrorMessage(err, fallback);
}
