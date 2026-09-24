import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Community, ForumTopic, ForumComment, ResourceFile, Meeting } from '../models/community.model';
import { environment } from '../../../environments/environment';
import { reloadOnAccountChange } from '../utils/account-change.util';

@Injectable({
  providedIn: 'root'
})
export class CommunityService {
  private http = inject(HttpClient);
  private communities = signal<Community[]>([]);
  isLoading = signal<boolean>(true);

  constructor() {
    this.loadCommunities();
    reloadOnAccountChange(() => this.loadCommunities());
  }

  loadCommunities(): void {
    this.isLoading.set(true);
    this.http.get<Community[]>(`${environment.apiUrl}/communities`).subscribe({
      next: (data) => {
        this.isLoading.set(false);
        this.communities.set(data || []);
      },
      error: () => {
        this.isLoading.set(false);
        this.communities.set([]);
      }
    });
  }

  getCommunities() {
    return this.communities.asReadonly();
  }

  getCommunityById(id: string): Community | undefined {
    return this.communities().find(c => c.id === id || c.accessCode.toLowerCase() === id.toLowerCase());
  }

  createCommunity(data: Partial<Community>): Community {
    const newCommunity: Community = {
      id: 'comm-' + Date.now(),
      name: data.name || 'Nouvelle Communauté',
      description: data.description || '',
      accessCode: (data.name?.substring(0, 4).toUpperCase() || 'COMM') + '-' + Math.floor(100 + Math.random() * 900),
      creatorId: data.creatorId || 'user-creator-1',
      creatorName: data.creatorName || 'Amadou Diallo',
      coverImage: data.coverImage || 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=800&q=80',
      isPrivate: data.isPrivate !== undefined ? data.isPrivate : true,
      membersCount: 1,
      quizzesCount: 0,
      topicsCount: 0,
      resourcesCount: 0,
      meetingsCount: 0,
      createdAt: new Date().toISOString().split('T')[0],
      members: [],
      topics: [],
      resources: [],
      meetings: []
    };

    this.communities.update(list => [newCommunity, ...list]);

    this.http.post<Community>(`${environment.apiUrl}/communities`, newCommunity).subscribe({
      next: (saved) => {
        if (saved && saved.id) {
          this.communities.update(list => list.map(c => c.id === newCommunity.id ? saved : c));
        }
      },
      error: () => {}
    });

    return newCommunity;
  }

  createCommunityApi(data: Partial<Community>): Observable<Community> {
    return this.http.post<Community>(`${environment.apiUrl}/communities`, data).pipe(
      tap((saved) => {
        if (saved && saved.id) {
          this.communities.update(list => [saved, ...list.filter(c => c.id !== saved.id)]);
        }
      })
    );
  }

  joinCommunityApi(accessCode: string): Observable<Community> {
    return this.http.post<Community>(`${environment.apiUrl}/communities/join`, { accessCode }).pipe(
      tap((comm) => {
        if (comm && comm.id) {
          this.communities.update(list => {
            const exists = list.some(c => c.id === comm.id);
            return exists ? list.map(c => c.id === comm.id ? comm : c) : [comm, ...list];
          });
        }
      })
    );
  }

  addTopic(communityId: string, topic: { title: string; content: string; authorName: string; authorId: string; authorAvatar?: string }): ForumTopic {
    const newTopic: ForumTopic = {
      id: 'topic-' + Date.now(),
      communityId,
      title: topic.title,
      content: topic.content,
      authorId: topic.authorId,
      authorName: topic.authorName,
      authorAvatar: topic.authorAvatar,
      isPinned: false,
      createdAt: new Date().toISOString(),
      commentsCount: 0,
      comments: []
    };

    this.communities.update(list => 
      list.map(c => {
        if (c.id === communityId) {
          const currentTopics = c.topics || [];
          return {
            ...c,
            topicsCount: c.topicsCount + 1,
            topics: [newTopic, ...currentTopics]
          };
        }
        return c;
      })
    );

    this.http.post<ForumTopic>(`${environment.apiUrl}/communities/${communityId}/topics`, newTopic).subscribe({
      error: () => {}
    });

    return newTopic;
  }

  addComment(communityId: string, topicId: string, comment: { content: string; authorName: string; authorId: string; authorAvatar?: string }): void {
    const newComment: ForumComment = {
      id: 'comment-' + Date.now(),
      authorId: comment.authorId,
      authorName: comment.authorName,
      authorAvatar: comment.authorAvatar,
      content: comment.content,
      createdAt: new Date().toISOString(),
      likesCount: 0
    };

    this.communities.update(list => 
      list.map(c => {
        if (c.id === communityId && c.topics) {
          return {
            ...c,
            topics: c.topics.map(t => {
              if (t.id === topicId) {
                return {
                  ...t,
                  commentsCount: t.commentsCount + 1,
                  comments: [...t.comments, newComment]
                };
              }
              return t;
            })
          };
        }
        return c;
      })
    );

    this.http.post<ForumComment>(`${environment.apiUrl}/communities/${communityId}/topics/${topicId}/comments`, newComment).subscribe({
      error: () => {}
    });
  }

  addResource(communityId: string, resource: { title: string; fileType: 'PDF' | 'DOC' | 'ZIP' | 'IMAGE'; fileSize: string; uploadedByName: string }): void {
    const newRes: ResourceFile = {
      id: 'res-' + Date.now(),
      communityId,
      title: resource.title,
      fileType: resource.fileType,
      fileSize: resource.fileSize,
      fileUrl: '#',
      uploadedByName: resource.uploadedByName,
      uploadedAt: new Date().toISOString().split('T')[0],
      downloadCount: 0
    };

    this.communities.update(list => 
      list.map(c => {
        if (c.id === communityId) {
          const currentRes = c.resources || [];
          return {
            ...c,
            resourcesCount: c.resourcesCount + 1,
            resources: [newRes, ...currentRes]
          };
        }
        return c;
      })
    );
  }

  addMeeting(communityId: string, meeting: { title: string; description: string; meetingUrl: string; platform: 'GOOGLE_MEET' | 'ZOOM' | 'JITSI'; scheduledAt: string; hostName: string }): void {
    const newMeeting: Meeting = {
      id: 'meet-' + Date.now(),
      communityId,
      title: meeting.title,
      description: meeting.description,
      meetingUrl: meeting.meetingUrl,
      platform: meeting.platform,
      scheduledAt: meeting.scheduledAt,
      durationMinutes: 60,
      hostName: meeting.hostName,
      isLive: false
    };

    this.communities.update(list => 
      list.map(c => {
        if (c.id === communityId) {
          const currentMeetings = c.meetings || [];
          return {
            ...c,
            meetingsCount: c.meetingsCount + 1,
            meetings: [newMeeting, ...currentMeetings]
          };
        }
        return c;
      })
    );
  }

  joinCommunity(communityId: string, memberData: { userId: string; name: string; email: string; avatarUrl?: string }): void {
    this.communities.update(list =>
      list.map(c => {
        if (c.id === communityId) {
          const already = (c.members || []).some(m => m.userId === memberData.userId);
          if (already) return c;
          const newMember = {
            userId: memberData.userId,
            name: memberData.name,
            email: memberData.email,
            avatarUrl: memberData.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80',
            role: 'STUDENT' as const,
            joinedAt: new Date().toISOString().split('T')[0],
            quizzesCompleted: 0,
            totalXp: 0
          };
          return {
            ...c,
            membersCount: c.membersCount + 1,
            members: [...(c.members || []), newMember]
          };
        }
        return c;
      })
    );
  }

  deleteTopic(communityId: string, topicId: string): void {
    this.communities.update(list =>
      list.map(c => {
        if (c.id === communityId) {
          return {
            ...c,
            topicsCount: Math.max(0, c.topicsCount - 1),
            topics: (c.topics || []).filter(t => t.id !== topicId)
          };
        }
        return c;
      })
    );
  }

  toggleTopicLock(communityId: string, topicId: string): void {
    this.communities.update(list =>
      list.map(c => {
        if (c.id === communityId) {
          return {
            ...c,
            topics: (c.topics || []).map(t => t.id === topicId ? { ...t, isLocked: !t.isLocked } : t)
          };
        }
        return c;
      })
    );
  }

  deleteCommunity(communityId: string): void {
    this.communities.update(list => list.filter(c => c.id !== communityId));
  }
}
