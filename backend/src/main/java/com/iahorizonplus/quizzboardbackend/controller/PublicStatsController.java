package com.iahorizonplus.quizzboardbackend.controller;

import com.iahorizonplus.quizzboardbackend.dto.response.ApiResponse;
import com.iahorizonplus.quizzboardbackend.dto.response.LinkDto;
import com.iahorizonplus.quizzboardbackend.dto.response.PlatformStatsResponse;
import com.iahorizonplus.quizzboardbackend.service.PublicStatsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
@Tag(name = "Statistiques Publiques", description = "Statistiques globales en temps réel de la plateforme QuizzBoard pour la page d'accueil (Richardson Niveau 3)")
public class PublicStatsController {

    private final PublicStatsService publicStatsService;
    private final com.iahorizonplus.quizzboardbackend.external.SmtpEmailService smtpEmailService;

    @GetMapping({"/public/stats", "/platform/stats"})
    @Operation(summary = "Obtenir les métriques réelles de la plateforme (Quiz, Participants, Sessions, Engagement)")
    public ResponseEntity<ApiResponse<PlatformStatsResponse>> getPlatformStats(HttpServletRequest request) {
        PlatformStatsResponse stats = publicStatsService.getPlatformStats();
        List<LinkDto> links = List.of(
                LinkDto.of("self", request.getRequestURI(), "GET"),
                LinkDto.of("quizzes", "/api/v1/quizzes", "GET", "Catalogue des quiz publics"),
                LinkDto.of("courses", "/api/v1/courses", "GET", "Catalogue des cours publics"),
                LinkDto.of("explore", "/api/v1/quizzes?visibility=PUBLIC", "GET", "Explorer les évaluations interactives")
        );
        return ResponseEntity.ok(
                ApiResponse.ok(stats, "Statistiques réelles de la plateforme récupérées avec succès", links, request.getRequestURI())
        );
    }

    @GetMapping("/public/test-smtp")
    @Operation(summary = "Tester en direct la connexion et l'envoi d'email SMTP")
    public ResponseEntity<ApiResponse<java.util.Map<String, Object>>> testSmtp(
            @org.springframework.web.bind.annotation.RequestParam(required = false, defaultValue = "aihorizonconsulting@gmail.com") String to,
            HttpServletRequest request) {
        java.util.Map<String, Object> result = smtpEmailService.testSmtpConnection(to);
        boolean success = Boolean.TRUE.equals(result.get("success"));
        if (success) {
            return ResponseEntity.ok(
                    ApiResponse.ok(result, "Connexion SMTP établie et email de test envoyé avec succès !", List.of(), request.getRequestURI())
            );
        } else {
            return ResponseEntity.badRequest().body(
                    ApiResponse.<java.util.Map<String, Object>>builder()
                            .status(400)
                            .success(false)
                            .message("Échec de la communication SMTP : " + result.get("errorMessage"))
                            .data(result)
                            .path(request.getRequestURI())
                            .timestamp(java.time.LocalDateTime.now())
                            .build()
            );
        }
    }

    @GetMapping("/public/test-quiz-email")
    @Operation(summary = "Tester en direct l'envoi de l'email de résultat de quiz")
    public ResponseEntity<ApiResponse<java.util.Map<String, Object>>> testQuizEmail(
            @org.springframework.web.bind.annotation.RequestParam(required = false, defaultValue = "aihorizonconsulting@gmail.com") String to,
            HttpServletRequest request) {
        java.util.Map<String, Object> result = smtpEmailService.testQuizCompletedEmailDirect(to);
        boolean success = Boolean.TRUE.equals(result.get("success"));
        if (success) {
            return ResponseEntity.ok(
                    ApiResponse.ok(result, "Email de résultat de quiz envoyé avec succès !", List.of(), request.getRequestURI())
            );
        } else {
            return ResponseEntity.badRequest().body(
                    ApiResponse.<java.util.Map<String, Object>>builder()
                            .status(400)
                            .success(false)
                            .message("Échec de l'envoi d'email de quiz : " + result.get("errorMessage"))
                            .data(result)
                            .path(request.getRequestURI())
                            .timestamp(java.time.LocalDateTime.now())
                            .build()
            );
        }
    }
}

