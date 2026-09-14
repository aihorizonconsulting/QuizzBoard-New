package com.iahorizonplus.quizzboardbackend.service;

import com.iahorizonplus.quizzboardbackend.dto.request.AiCourseGenerateRequest;
import com.iahorizonplus.quizzboardbackend.dto.request.AiQuizGenerateRequest;
import com.iahorizonplus.quizzboardbackend.entity.Course;
import com.iahorizonplus.quizzboardbackend.entity.Question;

import java.util.List;

public interface AiService {

    List<Question> generateQuizQuestions(AiQuizGenerateRequest request, String creatorEmail);

    Course generateCourse(String creatorEmail, AiCourseGenerateRequest request);

    String generateThematicCoverImage(String topic, String category);
}
