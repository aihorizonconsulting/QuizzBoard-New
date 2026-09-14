package com.iahorizonplus.quizzboardbackend.controller;

import com.iahorizonplus.quizzboardbackend.dto.response.ApiResponse;
import com.iahorizonplus.quizzboardbackend.dto.response.LinkDto;
import com.iahorizonplus.quizzboardbackend.entity.Promotion;
import com.iahorizonplus.quizzboardbackend.security.UserPrincipal;
import com.iahorizonplus.quizzboardbackend.service.PromotionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/promotions")
@RequiredArgsConstructor
@Tag(name = "Promotions", description = "Gestion des promotions académiques et cohortes (Richardson Niveau 3 HATEOAS)")
public class PromotionController {

    private final PromotionService promotionService;

    @GetMapping
    @Operation(summary = "Obtenir toutes les promotions du créateur connecté")
    public ResponseEntity<ApiResponse<List<Promotion>>> getMyPromotions(
            @AuthenticationPrincipal UserPrincipal currentUser,
            HttpServletRequest request) {
        String email = currentUser != null ? currentUser.getEmail() : "anonymous";
        List<Promotion> promotions = promotionService.getPromotions(email);
        List<LinkDto> links = List.of(
                LinkDto.of("self", request.getRequestURI(), "GET"),
                LinkDto.of("create", "/api/v1/promotions", "POST", "Créer une nouvelle promotion")
        );
        return ResponseEntity.ok(
                ApiResponse.ok(promotions, "Liste des promotions récupérée avec succès.", links, request.getRequestURI())
        );
    }

    @GetMapping("/{id}")
    @Operation(summary = "Obtenir une promotion par son identifiant")
    public ResponseEntity<ApiResponse<Promotion>> getPromotionById(@PathVariable String id, HttpServletRequest request) {
        Promotion promotion = promotionService.getPromotionById(id);
        List<LinkDto> links = getPromotionLinks(promotion.getId());
        return ResponseEntity.ok(
                ApiResponse.ok(promotion, "Détails de la promotion récupérés avec succès.", links, request.getRequestURI())
        );
    }

    @PostMapping
    @PreAuthorize("hasRole('CREATOR') or hasRole('ADMIN')")
    @Operation(summary = "Créer une nouvelle promotion")
    public ResponseEntity<ApiResponse<Promotion>> createPromotion(
            @Valid @RequestBody Promotion promotion,
            @AuthenticationPrincipal UserPrincipal currentUser,
            HttpServletRequest request) {
        String email = currentUser != null ? currentUser.getEmail() : "default-creator";
        Promotion created = promotionService.createPromotion(email, promotion);
        List<LinkDto> links = getPromotionLinks(created.getId());
        return new ResponseEntity<>(
                ApiResponse.created(created, "Promotion créée avec succès.", links, request.getRequestURI()),
                HttpStatus.CREATED
        );
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('CREATOR') or hasRole('ADMIN')")
    @Operation(summary = "Mettre à jour une promotion existante")
    public ResponseEntity<ApiResponse<Promotion>> updatePromotion(
            @PathVariable String id,
            @Valid @RequestBody Promotion promotion,
            @AuthenticationPrincipal UserPrincipal currentUser,
            HttpServletRequest request) {
        String email = currentUser != null ? currentUser.getEmail() : "default-creator";
        Promotion updated = promotionService.updatePromotion(id, promotion, email);
        List<LinkDto> links = getPromotionLinks(id);
        return ResponseEntity.ok(
                ApiResponse.ok(updated, "Promotion mise à jour avec succès.", links, request.getRequestURI())
        );
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('CREATOR') or hasRole('ADMIN')")
    @Operation(summary = "Supprimer une promotion")
    public ResponseEntity<ApiResponse<Void>> deletePromotion(@PathVariable String id, HttpServletRequest request) {
        promotionService.deletePromotion(id);
        List<LinkDto> links = List.of(
                LinkDto.of("collection", "/api/v1/promotions", "GET")
        );
        return ResponseEntity.ok(
                ApiResponse.ok(null, "Promotion supprimée avec succès.", links, request.getRequestURI())
        );
    }

    private List<LinkDto> getPromotionLinks(String promoId) {
        return List.of(
                LinkDto.of("self", "/api/v1/promotions/" + promoId, "GET"),
                LinkDto.of("update", "/api/v1/promotions/" + promoId, "PUT"),
                LinkDto.of("delete", "/api/v1/promotions/" + promoId, "DELETE"),
                LinkDto.of("classes", "/api/v1/classes?promotionId=" + promoId, "GET", "Classes de cette promotion"),
                LinkDto.of("collection", "/api/v1/promotions", "GET")
        );
    }
}
