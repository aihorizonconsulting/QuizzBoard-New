package com.iahorizonplus.quizzboardbackend.dto.request;

import com.iahorizonplus.quizzboardbackend.entity.CourseLevel;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public record AiCourseGenerateRequest(
    @NotBlank(message = "Le sujet du cours est obligatoire")
    String topic,

    @Min(1)
    int chaptersCount,

    boolean withChapterQuizzes,
    boolean withFinalQuiz,
    CourseLevel level,
    String category,
    String targetClassId,
    String targetClassName,
    boolean hasCertificate,
    Integer certificateMinimumScore
) {}
