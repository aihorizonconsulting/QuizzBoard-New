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
}
