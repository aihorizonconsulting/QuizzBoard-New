package com.iahorizonplus.quizzboardbackend.controller;

import com.iahorizonplus.quizzboardbackend.dto.response.ApiResponse;
import com.iahorizonplus.quizzboardbackend.dto.response.LinkDto;
import com.iahorizonplus.quizzboardbackend.entity.Notification;
import com.iahorizonplus.quizzboardbackend.security.UserPrincipal;
import com.iahorizonplus.quizzboardbackend.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/notifications")
@RequiredArgsConstructor
@Tag(name = "Notifications", description = "Gestion des alertes et notifications utilisateur (Richardson Niveau 3)")
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    @Operation(summary = "Obtenir les notifications de l'utilisateur connecté")
    public ResponseEntity<ApiResponse<List<Notification>>> getMyNotifications(@AuthenticationPrincipal UserPrincipal currentUser) {
        String userId = currentUser != null ? currentUser.getId() : "anonymous";
        List<Notification> notifications = notificationService.getUserNotifications(userId);
        List<LinkDto> links = List.of(
                new LinkDto("self", "/api/v1/notifications", "GET", "application/json"),
                new LinkDto("read-all", "/api/v1/notifications/read-all", "PUT", "application/json")
        );
        return ResponseEntity.ok(ApiResponse.ok(notifications, "Notifications de l'utilisateur", links, "/api/v1/notifications"));
    }

    @PutMapping("/{id}/read")
    @Operation(summary = "Marquer une notification comme lue")
    public ResponseEntity<ApiResponse<Void>> markAsRead(
            @PathVariable String id,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        String userId = currentUser != null ? currentUser.getId() : "anonymous";
        notificationService.markAsRead(id, userId);
        List<LinkDto> links = List.of(
                new LinkDto("self", "/api/v1/notifications/" + id + "/read", "PUT", "application/json"),
                new LinkDto("all", "/api/v1/notifications", "GET", "application/json")
        );
        return ResponseEntity.ok(ApiResponse.<Void>ok(null, "Notification marquée comme lue", links, "/api/v1/notifications/" + id + "/read"));
    }

    @PutMapping("/read-all")
    @Operation(summary = "Marquer toutes les notifications comme lues")
    public ResponseEntity<ApiResponse<Void>> markAllAsRead(@AuthenticationPrincipal UserPrincipal currentUser) {
        String userId = currentUser != null ? currentUser.getId() : "anonymous";
        notificationService.markAllAsRead(userId);
        List<LinkDto> links = List.of(
                new LinkDto("self", "/api/v1/notifications/read-all", "PUT", "application/json"),
                new LinkDto("all", "/api/v1/notifications", "GET", "application/json")
        );
        return ResponseEntity.ok(ApiResponse.<Void>ok(null, "Toutes les notifications ont été marquées comme lues", links, "/api/v1/notifications/read-all"));
    }

    @GetMapping("/unread-count")
    @Operation(summary = "Obtenir le nombre de notifications non lues")
    public ResponseEntity<ApiResponse<Long>> getUnreadCount(@AuthenticationPrincipal UserPrincipal currentUser) {
        String userId = currentUser != null ? currentUser.getId() : "anonymous";
        long count = notificationService.getUnreadCount(userId);
        List<LinkDto> links = List.of(
                new LinkDto("self", "/api/v1/notifications/unread-count", "GET", "application/json"),
                new LinkDto("all", "/api/v1/notifications", "GET", "application/json")
        );
        return ResponseEntity.ok(ApiResponse.ok(count, "Nombre de notifications non lues", links, "/api/v1/notifications/unread-count"));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Supprimer une notification")
    public ResponseEntity<ApiResponse<Void>> deleteNotification(
            @PathVariable String id,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        String userId = currentUser != null ? currentUser.getId() : "anonymous";
        notificationService.deleteNotification(id, userId);
        List<LinkDto> links = List.of(
                new LinkDto("self", "/api/v1/notifications/" + id, "DELETE", "application/json"),
                new LinkDto("all", "/api/v1/notifications", "GET", "application/json")
        );
        return ResponseEntity.ok(ApiResponse.<Void>ok(null, "Notification supprimée avec succès", links, "/api/v1/notifications/" + id));
    }
}
