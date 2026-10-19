import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RemedialPack } from '../models/remedial.model';
import { ToastService } from './toast.service';

/** Perfectionnement : parcours de remise à niveau de l'apprenant (contenu réservé à Apprenant Plus). */
@Injectable({
  providedIn: 'root'
})
export class RemedialService {
  private http = inject(HttpClient);
  private toast = inject(ToastService);

  private packs = signal<RemedialPack[]>([]);
  private loaded = signal(false);

  getPacks() { return this.packs.asReadonly(); }
  isLoaded() { return this.loaded.asReadonly(); }

  async loadMine(): Promise<void> {
    try {
      const res = await firstValueFrom(this.http.get<any>(`${environment.apiUrl}/remedial/my`));
      const list = res?.data ?? res;
      this.packs.set(Array.isArray(list) ? list : []);
    } catch (err) {
      this.toast.apiError(err, 'Vos parcours de perfectionnement n\'ont pas pu être chargés.');
    } finally {
      this.loaded.set(true);
    }
  }

  async getPack(id: string): Promise<RemedialPack | null> {
    try {
      const res = await firstValueFrom(this.http.get<any>(`${environment.apiUrl}/remedial/${id}`));
      const pack: RemedialPack = res?.data ?? res;
      this.replace(pack);
      return pack;
    } catch (err) {
      this.toast.apiError(err, 'Ce parcours n\'a pas pu être ouvert.');
      return null;
    }
  }

  async regenerate(id: string): Promise<void> {
    try {
      const res = await firstValueFrom(this.http.post<any>(`${environment.apiUrl}/remedial/${id}/generate`, {}));
      this.replace(res?.data ?? res);
      this.toast.success('Préparation du parcours relancée.');
    } catch (err) {
      this.toast.apiError(err, 'La préparation n\'a pas pu être relancée.');
    }
  }

  async recordPractice(id: string, percentage: number): Promise<RemedialPack | null> {
    try {
      const res = await firstValueFrom(this.http.post<any>(`${environment.apiUrl}/remedial/${id}/practice`, { percentage }));
      const pack: RemedialPack = res?.data ?? res;
      this.replace(pack);
      return pack;
    } catch (err) {
      this.toast.apiError(err, 'Le score d\'entraînement n\'a pas pu être enregistré.');
      return null;
    }
  }

  private replace(pack: RemedialPack | null | undefined): void {
    if (pack?.id) {
      this.packs.update(list => list.map(p => p.id === pack.id ? { ...p, ...pack } : p));
    }
  }
}
