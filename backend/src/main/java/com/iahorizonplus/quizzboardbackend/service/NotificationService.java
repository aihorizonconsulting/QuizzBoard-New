package com.iahorizonplus.quizzboardbackend.service;

import com.iahorizonplus.quizzboardbackend.entity.Notification;

import java.util.List;

public interface NotificationService {
    List<Notification> getUserNotifications(String userId);
    long getUnreadCount(String userId);
    Notification sendNotification(Notification notification);
    void markAsRead(String notificationId, String userId);
    void markAllAsRead(String userId);
    void deleteNotification(String notificationId, String userId);
}
