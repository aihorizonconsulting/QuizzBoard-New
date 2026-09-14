package com.iahorizonplus.quizzboardbackend.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public record AiQuizGenerateRequest(
    @NotBlank(message = "Le sujet ou prompt est obligatoire")
    String prompt,

    @Min(1)
    int count,

    String difficulty // EASY, MEDIUM, HARD
) {}
