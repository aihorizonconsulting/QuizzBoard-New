package com.iahorizonplus.quizzboardbackend.dto.response;

public record PlatformStatsResponse(
        long totalQuizzes,
        long totalParticipants,
        long totalLiveSessions,
        double engagementRate,
        String quizzesFormatted,
        String participantsFormatted,
        String liveSessionsFormatted,
        String engagementRateFormatted
) {}
