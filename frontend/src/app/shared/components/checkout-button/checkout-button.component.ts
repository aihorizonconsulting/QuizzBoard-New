import { Component, computed, inject, input } from '@angular/core';
import { PaidPlanId, SubscriptionService } from '../../../core/services/subscription.service';

/**
 * Bouton d'abonnement qui mène directement au guichet PayDunya du forfait (sans page Tarifs ni
 * fenêtre de confirmation). Le libellé est fourni par le contenu du bouton.
 *
 *   <app-checkout-button plan="LEARNER_PLUS">Découvrir Apprenant Plus</app-checkout-button>
 */
@Component({
  selector: 'app-checkout-button',
  standalone: true,
  template: `
    <button
      type="button"
      [class]="btnClass()"
      [class.is-loading]="isPending()"
      [disabled]="subService.pendingCheckout() !== null"
      [attr.aria-busy]="isPending()"
      (click)="start($event)">
      @if (isPending()) {
        <span class="btn-spinner spinner-sm" aria-hidden="true"></span>
        <span>Redirection vers PayDunya...</span>
      } @else {
        <ng-content></ng-content>
      }
    </button>
  `,
  styles: [`
    /* Le bouton se place dans la mise en page du parent comme s'il en était l'enfant direct */
    :host { display: contents; }
    .btn-full { width: 100%; justify-content: center; }
  `]
})
export class CheckoutButtonComponent {
  protected subService = inject(SubscriptionService);

  plan = input.required<PaidPlanId>();
  btnClass = input('btn btn-primary btn-sm');

  isPending = computed(() => this.subService.pendingCheckout() === this.plan());

  start(event: Event): void {
    // Le bouton peut se trouver dans une carte cliquable : un seul départ vers le paiement
    event.stopPropagation();
    this.subService.goToCheckout(this.plan());
  }
}
