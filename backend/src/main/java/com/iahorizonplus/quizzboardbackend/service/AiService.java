package com.iahorizonplus.quizzboardbackend.service;

import com.iahorizonplus.quizzboardbackend.dto.request.AiCourseGenerateRequest;
import com.iahorizonplus.quizzboardbackend.dto.request.AiQuizGenerateRequest;
import com.iahorizonplus.quizzboardbackend.entity.Course;
import com.iahorizonplus.quizzboardbackend.entity.Question;

import com.fasterxml.jackson.databind.node.ObjectNode;

import java.util.List;

public interface AiService {

    List<Question> generateQuizQuestions(AiQuizGenerateRequest request, String creatorEmail);

    Course generateCourse(String creatorEmail, AiCourseGenerateRequest request);

    String generateThematicCoverImage(String topic, String category);

    /**
     * Parcours de remise à niveau après un quiz raté : {"chapters": [...], "questions": [...]}.
     * Renvoie null si l'IA n'est pas disponible (jamais de contenu générique de secours).
     */
    ObjectNode generateRemedialContent(String quizTitle, double scorePercent, List<String> missedNotions);
}
