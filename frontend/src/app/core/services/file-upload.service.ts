import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface FileUploadResponse {
  success?: boolean;
  url: string;
  folder: string;
  originalFilename?: string;
  size?: number;
}

@Injectable({
  providedIn: 'root'
})
export class FileUploadService {
  private http = inject(HttpClient);

  /**
   * Téléverse un fichier image vers le backend (stocké sur Cloudinary ou en local selon la configuration)
   *
   * @param file   le fichier File sélectionné par l'utilisateur
   * @param folder la catégorie (quizzes, classes, profiles, courses, general)
   * @returns Observable avec l'objet de réponse contenant l'URL publique/Cloudinary
   */
  uploadImage(
    file: File,
    folder: 'quizzes' | 'classes' | 'profiles' | 'courses' | 'general' = 'general'
  ): Observable<FileUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    return this.http.post<any>(`${environment.apiUrl}/files/upload`, formData).pipe(
      map(res => (res?.data ? res.data : res) as FileUploadResponse)
    );
  }

  /**
   * Téléverse un fichier et retourne directement la promesse de l'URL Cloudinary/locale
   */
  async uploadFileAndGetUrl(
    file: File,
    folder: 'quizzes' | 'classes' | 'profiles' | 'courses' | 'general' = 'general'
  ): Promise<string> {
    const res = await firstValueFrom(this.uploadImage(file, folder));
    return res?.url || (res as any)?.data?.url || '';
  }
}
