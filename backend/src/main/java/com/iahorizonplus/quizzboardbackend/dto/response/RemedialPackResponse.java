package com.iahorizonplus.quizzboardbackend.dto.response;

import com.fasterxml.jackson.databind.JsonNode;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Parcours de perfectionnement vu par l'apprenant. Sans abonnement Apprenant Plus (locked = true),
 * ni les notions détaillées ni le contenu généré ne sont transmis.
 */
public record RemedialPackResponse(
        String id,
        String quizId,
        String quizTitle,
        double scorePercent,
        int missedCount,
        String status,
        boolean locked,
        String failureReason,
        Double bestPracticeScore,
        int practiceAttempts,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        LocalDateTime readyAt,
        List<String> missedNotions,
        JsonNode content
) {
}
