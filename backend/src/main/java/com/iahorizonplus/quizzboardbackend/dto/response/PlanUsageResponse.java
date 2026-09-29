package com.iahorizonplus.quizzboardbackend.dto.response;

import com.iahorizonplus.quizzboardbackend.entity.SubscriptionTier;

import java.time.LocalDateTime;

/**
 * Consommation du forfait telle qu'appliquée par le serveur (une limite null signifie illimité).
 * Les quiz et communautés importés de l'ancien QuizzBoard sont indiqués à part : ils ne comptent pas.
 */
public record PlanUsageResponse(
        SubscriptionTier tier,
        LocalDateTime subscriptionExpiresAt,
        long quizzesCreated,
        long quizzesImported,
        Integer quizzesLimit,
        long communitiesCreated,
        Integer communitiesLimit,
        int aiGenerationsUsed,
        Integer aiGenerationsLimit,
        int liveParticipantsLimit
) {}
