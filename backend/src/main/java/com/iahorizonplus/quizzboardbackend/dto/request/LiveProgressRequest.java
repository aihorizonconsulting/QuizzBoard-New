package com.iahorizonplus.quizzboardbackend.dto.request;

/**
 * Progression réelle d'un joueur pendant un quiz Live, envoyée après chaque réponse
 * (instantané cumulatif : un envoi en double ou en retard est sans effet).
 */
public record LiveProgressRequest(
        String playerId,
        Integer answeredCount,
        Integer correctCount,
        Integer score,
        Integer maxScore,
        Integer streak,
        Integer totalTimeSeconds,
        Boolean finished
) {}
