/**
 * Utilitaire pour extraire et mapper les erreurs de validation par champ
 * retournées par le backend Spring Boot (Richardson Niveau 3 ApiResponse).
 */
export function extractFieldErrors(err: any): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!err) return errors;

  // 1. Array de fieldErrors attachée par l'intercepteur transparent
  if (err.fieldErrors && Array.isArray(err.fieldErrors)) {
    for (const fe of err.fieldErrors) {
      if (fe && fe.field && fe.message) {
        errors[fe.field] = fe.message;
      }
    }
  }

  // 2. Depuis le corps error.error.errors
  const body = err.error;
  if (body && typeof body === 'object') {
    if (Array.isArray(body.errors)) {
      for (const fe of body.errors) {
        if (fe && fe.field && fe.message) {
          errors[fe.field] = fe.message;
        }
      }
    }
  }

  return errors;
}

/**
 * Retourne le message d'erreur généralisé en provenance du backend
 */
export function getGeneralErrorMessage(err: any, fallback: string = 'Une erreur est survenue.'): string {
  if (!err) return fallback;
  if (err.userFriendlyMessage) return err.userFriendlyMessage;
  if (err.error?.message) return err.error.message;
  if (typeof err.error === 'string') return err.error;
  if (err.message && typeof err.message === 'string' && !err.message.includes('Http failure')) {
    return err.message;
  }
  return fallback;
}
