package com.iahorizonplus.quizzboardbackend.controller;

import com.iahorizonplus.quizzboardbackend.dto.request.AiCourseGenerateRequest;
import com.iahorizonplus.quizzboardbackend.dto.request.AiQuizGenerateRequest;
import com.iahorizonplus.quizzboardbackend.dto.response.ApiResponse;
import com.iahorizonplus.quizzboardbackend.dto.response.LinkDto;
import com.iahorizonplus.quizzboardbackend.entity.Course;
import com.iahorizonplus.quizzboardbackend.entity.Question;
import com.iahorizonplus.quizzboardbackend.security.UserPrincipal;
import com.iahorizonplus.quizzboardbackend.service.AiService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/ai")
@RequiredArgsConstructor
@Tag(name = "Intelligence Artificielle", description = "Génération automatisée de quiz et de cours structurés par IA (Gemini / Groq) (Richardson Niveau 3)")
public class AiController {

    private final AiService aiService;

    @PostMapping("/generate-quiz")
    @PreAuthorize("hasRole('CREATOR') or hasRole('ADMIN')")
    @Operation(summary = "Générer des questions de quiz à partir d'un prompt thématique")
    public ResponseEntity<ApiResponse<List<Question>>> generateQuiz(
            @Valid @RequestBody AiQuizGenerateRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        String email = currentUser != null ? currentUser.getEmail() : null;
        List<Question> questions = aiService.generateQuizQuestions(request, email);
        List<LinkDto> links = List.of(
                new LinkDto("self", "/api/v1/ai/generate-quiz", "POST", "application/json"),
                new LinkDto("create-quiz", "/api/v1/quizzes", "POST", "application/json")
        );
        return ResponseEntity.ok(ApiResponse.ok(questions, "Questions de quiz générées avec succès par l'IA", links, "/api/v1/ai/generate-quiz"));
    }

    @PostMapping("/generate-course")
    @PreAuthorize("hasRole('CREATOR') or hasRole('ADMIN')")
    @Operation(summary = "Générer un cours complet structuré avec chapitres et syllabus par IA")
    public ResponseEntity<ApiResponse<Course>> generateCourse(
            @Valid @RequestBody AiCourseGenerateRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        if (currentUser == null) {
            throw new com.iahorizonplus.quizzboardbackend.exception.UnauthorizedException("Utilisateur non authentifié.");
        }
        Course course = aiService.generateCourse(currentUser.getEmail(), request);
        List<LinkDto> links = List.of(
                new LinkDto("self", "/api/v1/ai/generate-course", "POST", "application/json"),
                new LinkDto("view-course", "/api/v1/courses/" + course.getId(), "GET", "application/json"),
                new LinkDto("all-courses", "/api/v1/courses", "GET", "application/json")
        );
        return ResponseEntity.ok(ApiResponse.ok(course, "Cours généré avec succès par l'IA", links, "/api/v1/ai/generate-course"));
    }

    @GetMapping("/suggest-image")
    @Operation(summary = "Générer ou suggérer un lien d'image thématique IA pour un quiz ou un cours")
    public ResponseEntity<ApiResponse<java.util.Map<String, String>>> suggestImage(
            @RequestParam(required = false, defaultValue = "") String topic,
            @RequestParam(required = false, defaultValue = "") String category) {
        String imageUrl = aiService.generateThematicCoverImage(topic, category);
        return ResponseEntity.ok(ApiResponse.ok(
                java.util.Map.of("url", imageUrl),
                "Image thématique générée avec succès par l'IA",
                List.of(new LinkDto("image", imageUrl, "GET", "image/*")),
                "/api/v1/ai/suggest-image"
        ));
    }
}
