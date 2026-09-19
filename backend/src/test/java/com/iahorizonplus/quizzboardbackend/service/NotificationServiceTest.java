package com.iahorizonplus.quizzboardbackend.service;

import com.iahorizonplus.quizzboardbackend.entity.Notification;
import com.iahorizonplus.quizzboardbackend.repository.NotificationRepository;
import com.iahorizonplus.quizzboardbackend.service.impl.NotificationServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock
    private NotificationRepository notificationRepository;

    @InjectMocks
    private NotificationServiceImpl notificationService;

    private Notification notification1;
    private Notification notification2;

    @BeforeEach
    void setUp() {
        notification1 = Notification.builder()
                .id("notif-1")
                .userId("usr-1")
                .title("Nouveau Quiz")
                .message("Un nouveau quiz a été publié")
                .isRead(false)
                .build();

        notification2 = Notification.builder()
                .id("notif-2")
                .userId("usr-1")
                .title("Certificat Disponible")
                .message("Votre certificat est prêt")
                .isRead(true)
                .build();
    }

    @Test
    @DisplayName("Récupération des notifications utilisateur ordonnées par date")
    void getUserNotifications_Success() {
        when(notificationRepository.findByUserIdOrderByCreatedAtDesc("usr-1"))
                .thenReturn(List.of(notification1, notification2));

        List<Notification> result = notificationService.getUserNotifications("usr-1");

        assertThat(result).hasSize(2);
        assertThat(result.get(0).getTitle()).isEqualTo("Nouveau Quiz");
    }

    @Test
    @DisplayName("Comptage des notifications non lues")
    void getUnreadCount_Success() {
        when(notificationRepository.countByUserIdAndIsReadFalse("usr-1")).thenReturn(3L);

        long count = notificationService.getUnreadCount("usr-1");

        assertThat(count).isEqualTo(3L);
        verify(notificationRepository).countByUserIdAndIsReadFalse("usr-1");
    }

    @Test
    @DisplayName("Envoi d'une notification")
    void sendNotification_Success() {
        when(notificationRepository.save(any(Notification.class))).thenReturn(notification1);

        Notification saved = notificationService.sendNotification(notification1);

        assertThat(saved).isNotNull();
        assertThat(saved.getTitle()).isEqualTo("Nouveau Quiz");
        verify(notificationRepository).save(notification1);
    }

    @Test
    @DisplayName("Marquage d'une notification comme lue")
    void markAsRead_Success() {
        when(notificationRepository.findById("notif-1")).thenReturn(Optional.of(notification1));

        notificationService.markAsRead("notif-1", "usr-1");

        assertThat(notification1.isRead()).isTrue();
        verify(notificationRepository).save(notification1);
    }

    @Test
    @DisplayName("Marquage de toutes les notifications comme lues")
    void markAllAsRead_Success() {
        when(notificationRepository.findByUserIdOrderByCreatedAtDesc("usr-1"))
                .thenReturn(List.of(notification1, notification2));

        notificationService.markAllAsRead("usr-1");

        assertThat(notification1.isRead()).isTrue();
        assertThat(notification2.isRead()).isTrue();
        verify(notificationRepository).saveAll(anyList());
    }

    @Test
    @DisplayName("Suppression d'une notification")
    void deleteNotification_Success() {
        when(notificationRepository.findById("notif-1")).thenReturn(Optional.of(notification1));

        notificationService.deleteNotification("notif-1", "usr-1");

        verify(notificationRepository).delete(notification1);
    }
}
