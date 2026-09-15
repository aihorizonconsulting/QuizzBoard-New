package com.iahorizonplus.quizzboardbackend.controller;

import com.iahorizonplus.quizzboardbackend.dto.response.ApiResponse;
import com.iahorizonplus.quizzboardbackend.dto.response.LinkDto;
import com.iahorizonplus.quizzboardbackend.entity.Participation;
import com.iahorizonplus.quizzboardbackend.entity.Quiz;
import com.iahorizonplus.quizzboardbackend.repository.ParticipationRepository;
import com.iahorizonplus.quizzboardbackend.security.UserPrincipal;
import com.iahorizonplus.quizzboardbackend.service.QuizService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/quizzes")
@RequiredArgsConstructor
@Tag(name = "Quiz", description = "Gestion des quiz interactifs et évaluations (Richardson Niveau 3 HATEOAS)")
public class QuizController {

    private final QuizService quizService;
    private final ParticipationRepository participationRepository;

    @GetMapping
    @Operation(summary = "Lister les quiz publics ou ceux du créateur connecté")
    public ResponseEntity<ApiResponse<List<Quiz>>> getQuizzes(
            @RequestParam(required = false, defaultValue = "false") boolean my,
            @AuthenticationPrincipal UserPrincipal currentUser,
            HttpServletRequest request) {
        List<Quiz> quizzes = (my && currentUser != null)
                ? quizService.getQuizzesByCreator(currentUser.getId())
                : quizService.getAllPublicQuizzes();

        List<LinkDto> links = List.of(
                LinkDto.of("self", request.getRequestURI(), "GET"),
                LinkDto.of("create", "/api/v1/quizzes", "POST", "Créer un nouveau quiz"),
                LinkDto.of("ai-generate", "/api/v1/ai/generate-quiz", "POST", "Générer un quiz par IA")
        );

        return ResponseEntity.ok(
                ApiResponse.ok(quizzes, "Liste des quiz récupérée avec succès.", links, request.getRequestURI())
        );
    }

    @GetMapping("/{id}")
    @Operation(summary = "Obtenir un quiz par son identifiant unique")
    public ResponseEntity<ApiResponse<Quiz>> getQuizById(@PathVariable String id, HttpServletRequest request) {
        Quiz quiz = quizService.getQuizById(id);
        List<LinkDto> links = getQuizLinks(quiz.getId());
        return ResponseEntity.ok(
                ApiResponse.ok(quiz, "Détails du quiz récupérés avec succès.", links, request.getRequestURI())
        );
    }

    @GetMapping("/code/{codeOrPin}")
    @Operation(summary = "Rechercher et rejoindre un quiz via son code de partage ou code PIN")
    public ResponseEntity<ApiResponse<Quiz>> getQuizByCode(@PathVariable String codeOrPin, HttpServletRequest request) {
        Quiz quiz = quizService.getQuizByShareCodeOrPin(codeOrPin);
        List<LinkDto> links = getQuizLinks(quiz.getId());
        return ResponseEntity.ok(
                ApiResponse.ok(quiz, "Quiz identifié avec succès via le code fourni.", links, request.getRequestURI())
        );
    }

    @PostMapping
    @PreAuthorize("hasRole('CREATOR') or hasRole('ADMIN')")
    @Operation(summary = "Créer un nouveau quiz (vérifie les quotas FREE / STARTER)")
    public ResponseEntity<ApiResponse<Quiz>> createQuiz(
            @Valid @RequestBody Quiz quiz,
            @AuthenticationPrincipal UserPrincipal currentUser,
            HttpServletRequest request) {
        // Assainir les IDs générés côté client pour permettre à Hibernate UUID de générer des identifiants valides
        quiz.setId(null);
        if (quiz.getQuestions() != null) {
            for (com.iahorizonplus.quizzboardbackend.entity.Question q : quiz.getQuestions()) {
                q.setId(null);
                q.setQuiz(quiz);
                if (q.getChoices() != null) {
                    for (com.iahorizonplus.quizzboardbackend.entity.Choice c : q.getChoices()) {
                        c.setId(null);
                        c.setQuestion(q);
                    }
                }
            }
        }

        String creatorId = currentUser != null ? currentUser.getId() : "anonymous";
        String creatorName = currentUser != null ? currentUser.getName() : "Anonyme";
        Quiz created = quizService.createQuiz(quiz, creatorId, creatorName);
        List<LinkDto> links = getQuizLinks(created.getId());
        return new ResponseEntity<>(
                ApiResponse.created(created, "Quiz créé avec succès.", links, request.getRequestURI()),
                HttpStatus.CREATED
        );
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('CREATOR') or hasRole('ADMIN')")
    @Operation(summary = "Mettre à jour un quiz existant")
    public ResponseEntity<ApiResponse<Quiz>> updateQuiz(
            @PathVariable String id,
            @Valid @RequestBody Quiz quiz,
            @AuthenticationPrincipal UserPrincipal currentUser,
            HttpServletRequest request) {
        String creatorId = currentUser != null ? currentUser.getId() : "anonymous";
        Quiz updated = quizService.updateQuiz(id, quiz, creatorId);
        List<LinkDto> links = getQuizLinks(id);
        return ResponseEntity.ok(
                ApiResponse.ok(updated, "Quiz mis à jour avec succès.", links, request.getRequestURI())
        );
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('CREATOR') or hasRole('ADMIN')")
    @Operation(summary = "Supprimer un quiz")
    public ResponseEntity<ApiResponse<Void>> deleteQuiz(
            @PathVariable String id,
            @AuthenticationPrincipal UserPrincipal currentUser,
            HttpServletRequest request) {
        String creatorId = currentUser != null ? currentUser.getId() : "anonymous";
        quizService.deleteQuiz(id, creatorId);
        List<LinkDto> links = List.of(
                LinkDto.of("collection", "/api/v1/quizzes", "GET")
        );
        return ResponseEntity.ok(
                ApiResponse.ok(null, "Quiz supprimé avec succès.", links, request.getRequestURI())
        );
    }

    @PutMapping("/{id}/visibility")
    @PreAuthorize("hasRole('CREATOR') or hasRole('ADMIN')")
    @Operation(summary = "Bascule la visibilité d'un quiz (PUBLIC <-> PRIVATE)")
    public ResponseEntity<ApiResponse<Quiz>> toggleVisibility(
            @PathVariable String id,
            @AuthenticationPrincipal UserPrincipal currentUser,
            HttpServletRequest request) {
        String creatorId = currentUser != null ? currentUser.getId() : "anonymous";
        Quiz updated = quizService.toggleVisibility(id, creatorId);
        List<LinkDto> links = getQuizLinks(id);
        return ResponseEntity.ok(
                ApiResponse.ok(updated, "Visibilité du quiz mise à jour avec succès.", links, request.getRequestURI())
        );
    }

    @PutMapping("/{id}/assign-classes")
    @PreAuthorize("hasRole('CREATOR') or hasRole('ADMIN')")
    @Operation(summary = "Assigner des classes à un quiz")
    public ResponseEntity<ApiResponse<Quiz>> assignClasses(
            @PathVariable String id,
            @RequestBody List<String> classIds,
            HttpServletRequest request) {
        Quiz updated = quizService.assignClasses(id, classIds);
        List<LinkDto> links = getQuizLinks(id);
        return ResponseEntity.ok(
                ApiResponse.ok(updated, "Classes assignées au quiz avec succès.", links, request.getRequestURI())
        );
    }

    private List<LinkDto> getQuizLinks(String quizId) {
        return List.of(
                LinkDto.of("self", "/api/v1/quizzes/" + quizId, "GET"),
                LinkDto.of("update", "/api/v1/quizzes/" + quizId, "PUT"),
                LinkDto.of("delete", "/api/v1/quizzes/" + quizId, "DELETE"),
                LinkDto.of("participate", "/api/v1/participations", "POST", "Participer et soumettre une réponse"),
                LinkDto.of("collection", "/api/v1/quizzes", "GET", "Retour au catalogue de quiz")
        );
    }

    @GetMapping("/creator-stats")
    @PreAuthorize("hasRole('CREATOR') or hasRole('ADMIN')")
    @Operation(summary = "Obtenir les statistiques réelles du dashboard formateur : participations, taux de réussite, activité 7 jours")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getCreatorStats(
            @AuthenticationPrincipal UserPrincipal currentUser) {
        if (currentUser == null) {
            return ResponseEntity.ok(ApiResponse.ok(Map.of(), "Utilisateur non authentifié", List.of(), "/api/v1/quizzes/creator-stats"));
        }

        List<Quiz> myQuizzes = quizService.getQuizzesByCreator(currentUser.getId());
        List<String> quizIds = myQuizzes.stream().map(Quiz::getId).toList();

        Map<String, Object> stats = new HashMap<>();

        if (quizIds.isEmpty()) {
            stats.put("totalParticipants", 0);
            stats.put("averageSuccessRate", 0.0);
            stats.put("completedQuizzes", 0);
            stats.put("quizzesCount", 0);
            stats.put("weeklyActivity", List.of(0, 0, 0, 0, 0, 0, 0));
            return ResponseEntity.ok(ApiResponse.ok(stats, "Aucune donnée disponible", List.of(), "/api/v1/quizzes/creator-stats"));
        }

        // Total des participations
        long totalParticipants = participationRepository.countByQuizIdIn(quizIds);
        List<Participation> allParts = participationRepository.findByQuizIdIn(quizIds);

        // Taux de réussite moyen
        double avgRate = 0.0;
        if (!allParts.isEmpty()) {
            double sumPct = allParts.stream()
                .mapToDouble(Participation::getPercentage)
                .sum();
            avgRate = Math.round((sumPct / allParts.size()) * 10.0) / 10.0;
        }

        // Quiz avec au moins 1 participation
        long completedQuizzes = myQuizzes.stream()
            .filter(q -> q.getParticipationsCount() != null && q.getParticipationsCount() > 0)
            .count();

        // Activité des 7 derniers jours (lun-dim)
        LocalDate today = LocalDate.now();
        LocalDate startOfWeek = today.with(DayOfWeek.MONDAY);
        int[] weeklyActivity = new int[7]; // index 0 = lundi
        for (Participation p : allParts) {
            if (p.getCompletedAt() != null) {
                LocalDate partDate = p.getCompletedAt().toLocalDate();
                if (!partDate.isBefore(startOfWeek) && !partDate.isAfter(today)) {
                    int dayIndex = partDate.getDayOfWeek().getValue() - 1; // lundi=0
                    weeklyActivity[dayIndex]++;
                }
            }
        }

        List<Integer> weeklyList = List.of(
            weeklyActivity[0], weeklyActivity[1], weeklyActivity[2],
            weeklyActivity[3], weeklyActivity[4], weeklyActivity[5], weeklyActivity[6]
        );

        stats.put("totalParticipants", totalParticipants);
        stats.put("averageSuccessRate", avgRate);
        stats.put("completedQuizzes", completedQuizzes);
        stats.put("quizzesCount", myQuizzes.size());
        stats.put("weeklyActivity", weeklyList);

        List<LinkDto> links = List.of(
                LinkDto.of("self", "/api/v1/quizzes/creator-stats", "GET"),
                LinkDto.of("my-quizzes", "/api/v1/quizzes?my=true", "GET")
        );
        return ResponseEntity.ok(ApiResponse.ok(stats, "Statistiques formateur calculées avec succès", links, "/api/v1/quizzes/creator-stats"));
    }
}

