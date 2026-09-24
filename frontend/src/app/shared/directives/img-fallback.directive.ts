import { Directive, ElementRef, HostListener, Input, inject } from '@angular/core';

/**
 * Remplace la source d'une <img> par une image de secours quand elle ne se
 * charge pas (URL externe expirée, 404...).
 * Usage : <img [src]="url || fallback" [appImgFallback]="fallback">
 */
@Directive({
  selector: 'img[appImgFallback]',
  standalone: true
})
export class ImgFallbackDirective {
  @Input({ required: true }) appImgFallback = '';

  private el = inject<ElementRef<HTMLImageElement>>(ElementRef);

  @HostListener('error')
  onError(): void {
    const img = this.el.nativeElement;
    // Évite une boucle infinie si l'image de secours elle-même est introuvable
    if (this.appImgFallback && img.getAttribute('src') !== this.appImgFallback) {
      img.src = this.appImgFallback;
    }
  }
}
