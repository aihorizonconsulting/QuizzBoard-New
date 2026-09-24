package com.iahorizonplus.quizzboardbackend.dto.response;

import java.time.LocalDateTime;
import java.util.List;

public record LiveSessionResponse(
        String id,
        String pin,
        String quizId,
        String quizTitle,
        String hostId,
        String hostName,
        String status,
        int currentQuestionIndex,
        int totalQuestions,
        int timePerQuestionSeconds,
        int totalDurationSeconds,
        long elapsedSeconds,
        LocalDateTime startedAt,
        LocalDateTime expectedEndAt,
        LocalDateTime endedAt,
        boolean manuallyStopped,
        LocalDateTime createdAt,
        List<LivePlayerResponse> players
) {
    public record LivePlayerResponse(
            String id,
            String nickname,
            String email,
            String matricule,
            int score,
            int streak,
            boolean ready,
            int accuracyPercent,
            double avgResponseTimeSeconds,
            int answeredCount,
            boolean finished
    ) {}
}
