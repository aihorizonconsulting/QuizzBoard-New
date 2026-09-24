import { effect, inject, untracked } from '@angular/core';
import { AuthService } from '../services/auth.service';

/**
 * Relance `reload` quand le compte connecté change (connexion, déconnexion, autre compte).
 * Les services racine chargent leurs données une seule fois à leur création : sans cela,
 * une reconnexion sans rechargement de page affiche des listes périmées (ou celles du compte précédent).
 * `onLogout` remplace `reload` à la déconnexion (ex. vider une liste privée plutôt que d'appeler l'API sans session).
 * À appeler dans le constructeur du service, après le chargement initial.
 */
export function reloadOnAccountChange(reload: () => void, onLogout: () => void = reload): void {
  const authService = inject(AuthService);
  let loadedForUserId: string | null = authService.currentUser()?.id ?? null;
  effect(() => {
    const userId = authService.currentUser()?.id ?? null;
    if (userId === loadedForUserId) return;
    loadedForUserId = userId;
    untracked(userId ? reload : onLogout);
  });
}
