import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/user.model';

/**
 * Garde d'authentification obligatoire :
 * Vérifie la présence d'une session ou d'un token JWT.
 * Redirige vers /connexion avec mémorisation de l'URL cible (returnUrl).
 */
export const authGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated() || authService.getToken()) {
    return true;
  }

  return router.createUrlTree(['/connexion'], {
    queryParams: { returnUrl: state.url }
  });
};

/**
 * Garde pour les pages publiques d'authentification (/connexion, /inscription) :
 * Si l'utilisateur est déjà connecté, il est automatiquement redirigé vers son tableau de bord.
 */
export const noAuthGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated() || authService.getToken()) {
    return router.createUrlTree([authService.dashboardUrl()]);
  }

  return true;
};

/**
 * Garde réservé aux SuperAdministrateurs de la plateforme QuizzBoard.
 */
export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated() && !authService.getToken()) {
    return router.createUrlTree(['/connexion'], {
      queryParams: { returnUrl: '/admin/dashboard' }
    });
  }

  if (authService.isAdmin()) {
    return true;
  }

  // Redirection vers le dashboard formateur ou apprenant approprié
  return router.createUrlTree([authService.dashboardUrl()]);
};

/**
 * Garde spécifique à l'Espace Formateur / Créateur (accessible aux CREATOR et ADMIN).
 */
export const creatorGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated() && !authService.getToken()) {
    return router.createUrlTree(['/connexion'], {
      queryParams: { returnUrl: '/app/dashboard' }
    });
  }

  if (authService.isCreator() || authService.isAdmin()) {
    return true;
  }

  // Si c'est un apprenant qui tente d'accéder à l'espace formateur
  return router.createUrlTree(['/app/learner/dashboard']);
};

/**
 * Garde spécifique à l'Espace Apprenant (accessible aux LEARNER et ADMIN).
 */
export const learnerGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated() && !authService.getToken()) {
    return router.createUrlTree(['/connexion'], {
      queryParams: { returnUrl: '/app/learner/dashboard' }
    });
  }

  if (authService.isLearner() || authService.isAdmin()) {
    return true;
  }

  // Si c'est un formateur qui tente d'accéder à l'espace apprenant
  return router.createUrlTree(['/app/dashboard']);
};
