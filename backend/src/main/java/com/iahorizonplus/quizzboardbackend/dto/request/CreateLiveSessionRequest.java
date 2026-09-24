package com.iahorizonplus.quizzboardbackend.dto.request;

public record CreateLiveSessionRequest(
        String quizId,
        String quizTitle,
        Integer totalQuestions,
        Integer timePerQuestionSeconds
) {}
