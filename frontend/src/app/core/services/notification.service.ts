import { Injectable, computed, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AppNotification } from '../models/notification.model';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';
import { reloadOnAccountChange } from '../utils/account-change.util';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  private adminState = signal<AppNotification[]>([]);
  private creatorState = signal<AppNotification[]>([]);
  private learnerState = signal<AppNotification[]>([]);

  constructor() {
    this.loadNotifications();
    reloadOnAccountChange(() => this.loadNotifications(), () => {
      this.adminState.set([]);
      this.creatorState.set([]);
      this.learnerState.set([]);
    });
  }

  loadNotifications(): void {
    this.http.get<any[]>(`${environment.apiUrl}/notifications`).subscribe({
      next: (data) => {
        const mapped: AppNotification[] = (data || []).map((n, i) => ({
          id: n.id || `notif-${i}`,
          type: n.type || 'SYSTEM',
          title: n.title || 'Notification',
          message: n.message || '',
          timeAgo: 'Récemment',
          isRead: !!n.read,
          createdAt: n.createdAt || new Date().toISOString()
        }));
        const role = this.authService.currentUser()?.role;
        if (role === 'ADMIN') this.adminState.set(mapped);
        else if (role === 'LEARNER') this.learnerState.set(mapped);
        else this.creatorState.set(mapped);
      },
      error: () => {
        const role = this.authService.currentUser()?.role;
        if (role === 'ADMIN') this.adminState.set([]);
        else if (role === 'LEARNER') this.learnerState.set([]);
        else this.creatorState.set([]);
      }
    });
  }

  public notifications = computed(() => {
    const role = this.authService.currentUser()?.role;
    if (role === 'ADMIN') return this.adminState();
    if (role === 'LEARNER') return this.learnerState();
    return this.creatorState();
  });

  public unreadCount = computed(() => {
    return this.notifications().filter(n => !n.isRead).length;
  });

  markAsRead(id: string): void {
    const updater = (list: AppNotification[]) =>
      list.map(n => n.id === id ? { ...n, isRead: true } : n);

    const role = this.authService.currentUser()?.role;
    if (role === 'ADMIN') this.adminState.update(updater);
    else if (role === 'LEARNER') this.learnerState.update(updater);
    else this.creatorState.update(updater);

    this.http.put(`${environment.apiUrl}/notifications/${id}/read`, {}).subscribe({
      error: () => {}
    });
  }

  markAllAsRead(): void {
    const updater = (list: AppNotification[]) =>
      list.map(n => ({ ...n, isRead: true }));

    const role = this.authService.currentUser()?.role;
    if (role === 'ADMIN') this.adminState.update(updater);
    else if (role === 'LEARNER') this.learnerState.update(updater);
    else this.creatorState.update(updater);

    this.http.put(`${environment.apiUrl}/notifications/read-all`, {}).subscribe({
      error: () => {}
    });
  }

  deleteNotification(id: string): void {
    const updater = (list: AppNotification[]) =>
      list.filter(n => n.id !== id);

    const role = this.authService.currentUser()?.role;
    if (role === 'ADMIN') this.adminState.update(updater);
    else if (role === 'LEARNER') this.learnerState.update(updater);
    else this.creatorState.update(updater);

    this.http.delete(`${environment.apiUrl}/notifications/${id}`).subscribe({
      error: () => {}
    });
  }

  clearAll(): void {
    const role = this.authService.currentUser()?.role;
    if (role === 'ADMIN') this.adminState.set([]);
    else if (role === 'LEARNER') this.learnerState.set([]);
    else this.creatorState.set([]);
  }

  addNotification(notification: Omit<AppNotification, 'id' | 'createdAt' | 'isRead'>): void {
    const newNotif: AppNotification = {
      ...notification,
      id: 'notif-' + Date.now(),
      isRead: false,
      createdAt: new Date().toISOString()
    };
    const role = this.authService.currentUser()?.role;
    if (role === 'ADMIN') this.adminState.update(list => [newNotif, ...list]);
    else if (role === 'LEARNER') this.learnerState.update(list => [newNotif, ...list]);
    else this.creatorState.update(list => [newNotif, ...list]);
  }
}
