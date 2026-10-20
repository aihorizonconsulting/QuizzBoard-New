import { Injectable, signal, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpEventType } from '@angular/common/http';
import { Observable, filter, firstValueFrom, map, tap } from 'rxjs';
import { Community, CommunityMember, ForumComment, ForumTopic, MeetingForm, Meeting, ModeratedTopic, ResourceFile } from '../models/community.model';
import { Quiz } from '../models/quiz.model';
import { environment } from '../../../environments/environment';
import { reloadOnAccountChange } from '../utils/account-change.util';

/** Avancement d'un dépôt de document : pourcentage envoyé, puis le document enregistré. */
export interface UploadProgress {
  progress: number;
  resource?: ResourceFile;
}

/**
 * Communautés : la liste (mes communautés + communautés publiques) est gardée en mémoire ;
 * le détail et toutes les actions passent par l'API (droits vérifiés par le serveur).
 */
@Injectable({
  providedIn: 'root'
})
export class CommunityService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/communities`;
  private communities = signal<Community[]>([]);
  isLoading = signal<boolean>(true);
  /** Incrémenté par chaque modification locale : une liste demandée avant est périmée (ex. elle contient une communauté supprimée). */
  private listVersion = 0;

  constructor() {
    this.loadCommunities();
    reloadOnAccountChange(() => this.loadCommunities());
  }

  loadCommunities(): void {
    const version = ++this.listVersion;
    this.isLoading.set(true);
    this.http.get<Community[]>(this.api).subscribe({
      next: (data) => {
        if (version !== this.listVersion) return;
        this.isLoading.set(false);
        this.communities.set(data || []);
      },
      error: () => {
        if (version !== this.listVersion) return;
        this.isLoading.set(false);
        this.communities.set([]);
      }
    });
  }

  /** Après une modification locale : ignore la liste en cours de chargement et la redemande. */
  private invalidateList(): void {
    const loading = this.isLoading();
    this.listVersion++;
    if (loading) this.loadCommunities();
  }

  getCommunities() {
    return this.communities.asReadonly();
  }

  getCommunityById(id: string): Community | undefined {
    return this.communities().find(c => c.id === id);
  }

  /** Met à jour la carte de la liste à partir d'un détail (compteurs, nom, rôle...). */
  private upsert(community: Community, invalidate = false): void {
    if (invalidate) this.invalidateList();
    const summary: Community = { ...community, members: null, topics: null, resources: null, meetings: null };
    this.communities.update(list => list.some(c => c.id === community.id)
      ? list.map(c => c.id === community.id ? summary : c)
      : [summary, ...list]);
  }

  async fetchDetail(id: string): Promise<Community> {
    const detail = await firstValueFrom(this.http.get<Community>(`${this.api}/${id}`));
    this.upsert(detail);
    return detail;
  }

  createCommunityApi(data: Partial<Community>): Observable<Community> {
    return this.http.post<Community>(this.api, data).pipe(tap(saved => saved?.id && this.upsert(saved, true)));
  }

  joinCommunityApi(accessCode: string): Observable<Community> {
    return this.http.post<Community>(`${this.api}/join`, { accessCode }).pipe(tap(comm => comm?.id && this.upsert(comm, true)));
  }

  async leave(id: string): Promise<void> {
    await firstValueFrom(this.http.post(`${this.api}/${id}/leave`, {}));
    this.loadCommunities();
  }

  async updateSettings(id: string, settings: Partial<Pick<Community, 'name' | 'description' | 'category' | 'isPrivate' | 'membersCanShare' | 'coverImage'>>): Promise<Community> {
    const saved = await firstValueFrom(this.http.put<Community>(`${this.api}/${id}`, settings));
    this.upsert(saved, true);
    return saved;
  }

  async regenerateCode(id: string): Promise<string> {
    const res = await firstValueFrom(this.http.post<{ accessCode: string }>(`${this.api}/${id}/access-code`, {}));
    this.invalidateList();
    this.communities.update(list => list.map(c => c.id === id ? { ...c, accessCode: res.accessCode } : c));
    return res.accessCode;
  }

  async deleteCommunity(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(`${this.api}/${id}`));
    this.invalidateList();
    this.communities.update(list => list.filter(c => c.id !== id));
  }

  // ---------------------------------------------------------------- Membres

  setMemberRole(id: string, userId: string, role: CommunityMember['role']): Promise<unknown> {
    return firstValueFrom(this.http.patch(`${this.api}/${id}/members/${userId}`, { role }));
  }

  removeMember(id: string, userId: string): Promise<unknown> {
    return firstValueFrom(this.http.delete(`${this.api}/${id}/members/${userId}`));
  }

  // ---------------------------------------------------------------- Forum

  createTopic(id: string, topic: { title: string; content: string }): Promise<ForumTopic> {
    return firstValueFrom(this.http.post<ForumTopic>(`${this.api}/${id}/topics`, topic));
  }

  addComment(topicId: string, content: string): Promise<ForumComment> {
    return firstValueFrom(this.http.post<ForumComment>(`${this.api}/topics/${topicId}/comments`, { content }));
  }

  moderateTopic(id: string, topicId: string, flags: { isPinned?: boolean; isLocked?: boolean; isReported?: boolean }): Promise<ForumTopic> {
    return firstValueFrom(this.http.patch<ForumTopic>(`${this.api}/${id}/topics/${topicId}`, flags));
  }

  deleteTopic(id: string, topicId: string): Promise<unknown> {
    return firstValueFrom(this.http.delete(`${this.api}/${id}/topics/${topicId}`));
  }

  reportTopic(topicId: string): Promise<unknown> {
    return firstValueFrom(this.http.post(`${this.api}/topics/${topicId}/report`, {}));
  }

  deleteComment(topicId: string, commentId: string): Promise<unknown> {
    return firstValueFrom(this.http.delete(`${this.api}/topics/${topicId}/comments/${commentId}`));
  }

  getModerationTopics(): Promise<ModeratedTopic[]> {
    return firstValueFrom(this.http.get<ModeratedTopic[]>(`${this.api}/moderation/topics`));
  }

  // ---------------------------------------------------------------- Documents

  uploadDocument(id: string, file: File, title: string, description: string): Observable<UploadProgress> {
    const form = new FormData();
    form.append('file', file);
    if (title.trim()) form.append('title', title.trim());
    if (description.trim()) form.append('description', description.trim());
    return this.http.post<ResourceFile>(`${this.api}/${id}/resources/upload`, form, { reportProgress: true, observe: 'events' }).pipe(
      filter(event => event.type === HttpEventType.UploadProgress || event.type === HttpEventType.Response),
      map(event => event.type === HttpEventType.UploadProgress
        ? { progress: event.total ? Math.round(100 * event.loaded / event.total) : 0 }
        : { progress: 100, resource: (event as any).body as ResourceFile })
    );
  }

  addLink(id: string, link: { title: string; url: string; description: string }): Promise<ResourceFile> {
    return firstValueFrom(this.http.post<ResourceFile>(`${this.api}/${id}/resources`, link));
  }

  deleteResource(id: string, resourceId: string): Promise<unknown> {
    return firstValueFrom(this.http.delete(`${this.api}/${id}/resources/${resourceId}`));
  }

  /** Le fichier (réservé aux membres : l'en-tête d'authentification est ajouté par l'intercepteur). */
  async downloadDocument(id: string, resourceId: string): Promise<Blob> {
    try {
      return await firstValueFrom(this.http.get(`${this.api}/${id}/resources/${resourceId}/download`, { responseType: 'blob' }));
    } catch (err) {
      throw await readBlobError(err);
    }
  }

  // ---------------------------------------------------------------- Réunions

  scheduleMeeting(id: string, form: MeetingForm): Promise<Meeting> {
    return firstValueFrom(this.http.post<Meeting>(`${this.api}/${id}/meetings`, form));
  }

  updateMeeting(id: string, meetingId: string, form: MeetingForm): Promise<Meeting> {
    return firstValueFrom(this.http.put<Meeting>(`${this.api}/${id}/meetings/${meetingId}`, form));
  }

  deleteMeeting(id: string, meetingId: string): Promise<unknown> {
    return firstValueFrom(this.http.delete(`${this.api}/${id}/meetings/${meetingId}`));
  }

  // ---------------------------------------------------------------- Quiz partagés

  getSharedQuizzes(id: string): Promise<Quiz[]> {
    return firstValueFrom(this.http.get<Quiz[]>(`${this.api}/${id}/quizzes`));
  }

  shareQuiz(id: string, quizId: string): Promise<string[]> {
    return firstValueFrom(this.http.post<string[]>(`${this.api}/${id}/quizzes`, { quizId }));
  }

  unshareQuiz(id: string, quizId: string): Promise<string[]> {
    return firstValueFrom(this.http.delete<string[]>(`${this.api}/${id}/quizzes/${quizId}`));
  }
}

/** Une erreur sur un téléchargement arrive sous forme de Blob : on la relit en JSON pour garder le message du serveur. */
async function readBlobError(err: unknown): Promise<unknown> {
  if (err instanceof HttpErrorResponse && err.error instanceof Blob) {
    try {
      const body = JSON.parse(await err.error.text());
      return new HttpErrorResponse({ error: body, status: err.status, statusText: err.statusText, url: err.url ?? undefined });
    } catch {
      return err;
    }
  }
  return err;
}
