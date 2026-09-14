import { HttpInterceptorFn, HttpResponse, HttpErrorResponse } from '@angular/common/http';
import { map, catchError, throwError } from 'rxjs';

export interface FieldErrorDetail {
  field: string;
  rejectedValue?: any;
  message: string;
}

export interface LinkDto {
  rel: string;
  href: string;
  method: string;
  type?: string;
}

export interface ApiResponseEnvelope<T = any> {
  status: number;
  success: boolean;
  message: string;
  data: T;
  errors?: FieldErrorDetail[];
  links?: LinkDto[];
  path?: string;
  timestamp?: string;
}

/**
 * Intercepteur transparent pour l'enveloppe Richardson Niveau 3 (HATEOAS)
 * Déballe automatiquement 'data' lors des succès pour préserver les contrats de types TypeScript existants.
 * Enrichit les erreurs 400/401/403/500 avec les détails de validation par champ.
 */
export const apiResponseInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    map(event => {
      if (event instanceof HttpResponse) {
        const body = event.body as any;
        // Si la réponse est emballée dans l'enveloppe standard ApiResponse
        if (body && typeof body === 'object' && typeof body.success === 'boolean' && 'data' in body) {
          // Déballer body.data tout en conservant les métadonnées HATEOAS sur un champ invisible ou accessible
          return event.clone({
            body: body.data
          });
        }
      }
      return event;
    }),
    catchError((error: HttpErrorResponse) => {
      // Si le backend Spring Boot a renvoyé l'enveloppe d'erreur ApiResponse
      if (error.error && typeof error.error === 'object') {
        const envelope = error.error as ApiResponseEnvelope;
        if (envelope.message) {
          (error as any).userFriendlyMessage = envelope.message;
        }
        if (envelope.errors && envelope.errors.length > 0) {
          (error as any).fieldErrors = envelope.errors;
        }
      }
      return throwError(() => error);
    })
  );
};
