package com.iahorizonplus.quizzboardbackend.controller;

import com.iahorizonplus.quizzboardbackend.dto.response.ApiResponse;
import com.iahorizonplus.quizzboardbackend.dto.response.LinkDto;
import com.iahorizonplus.quizzboardbackend.entity.PlatformSettings;
import com.iahorizonplus.quizzboardbackend.entity.SubscriptionTier;
import com.iahorizonplus.quizzboardbackend.security.UserPrincipal;
import com.iahorizonplus.quizzboardbackend.service.SubscriptionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/subscriptions")
@RequiredArgsConstructor
@Tag(name = "Abonnements", description = "Gestion des forfaits FREE / STARTER et paramètres de la plateforme (Richardson Niveau 3)")
public class SubscriptionController {

    private final SubscriptionService subscriptionService;

    @GetMapping("/current")
    @Operation(summary = "Obtenir le forfait actuel de l'utilisateur connecté")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getCurrentSubscription(@AuthenticationPrincipal UserPrincipal currentUser) {
        if (currentUser == null) {
            Map<String, Object> data = Map.of("tier", SubscriptionTier.FREE.name());
            List<LinkDto> links = List.of(
                    new LinkDto("self", "/api/v1/subscriptions/current", "GET", "application/json"),
                    new LinkDto("settings", "/api/v1/subscriptions/settings", "GET", "application/json"),
                    new LinkDto("upgrade", "/api/v1/payments/initiate", "POST", "application/json")
            );
            return ResponseEntity.ok(ApiResponse.ok(data, "Forfait utilisateur récupéré", links, "/api/v1/subscriptions/current"));
        }
        SubscriptionTier tier = subscriptionService.getCurrentTier(currentUser.getId());
        Map<String, Object> data = Map.of("tier", tier.name());
        List<LinkDto> links = List.of(
                new LinkDto("self", "/api/v1/subscriptions/current", "GET", "application/json"),
                new LinkDto("settings", "/api/v1/subscriptions/settings", "GET", "application/json"),
                new LinkDto("upgrade", "/api/v1/payments/initiate", "POST", "application/json")
        );
        return ResponseEntity.ok(ApiResponse.ok(data, "Forfait utilisateur récupéré", links, "/api/v1/subscriptions/current"));
    }

    @GetMapping("/settings")
    @Operation(summary = "Obtenir les tarifs et paramètres globaux des forfaits")
    public ResponseEntity<ApiResponse<PlatformSettings>> getPlatformSettings() {
        PlatformSettings settings = subscriptionService.getPlatformSettings();
        List<LinkDto> links = List.of(
                new LinkDto("self", "/api/v1/subscriptions/settings", "GET", "application/json"),
                new LinkDto("current-user", "/api/v1/subscriptions/current", "GET", "application/json")
        );
        return ResponseEntity.ok(ApiResponse.ok(settings, "Paramètres de la plateforme récupérés", links, "/api/v1/subscriptions/settings"));
    }

    @PutMapping("/settings")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Mettre à jour les tarifs et quotas de la plateforme")
    public ResponseEntity<ApiResponse<PlatformSettings>> updatePlatformSettings(@RequestBody PlatformSettings settings) {
        PlatformSettings updated = subscriptionService.updatePlatformSettings(settings);
        List<LinkDto> links = List.of(
                new LinkDto("self", "/api/v1/subscriptions/settings", "PUT", "application/json"),
                new LinkDto("settings", "/api/v1/subscriptions/settings", "GET", "application/json")
        );
        return ResponseEntity.ok(ApiResponse.ok(updated, "Paramètres de la plateforme mis à jour", links, "/api/v1/subscriptions/settings"));
    }
}
