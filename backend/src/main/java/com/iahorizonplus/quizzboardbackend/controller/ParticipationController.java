package com.iahorizonplus.quizzboardbackend.controller;

import com.iahorizonplus.quizzboardbackend.dto.response.ApiResponse;
import com.iahorizonplus.quizzboardbackend.dto.response.LinkDto;
import com.iahorizonplus.quizzboardbackend.entity.Participation;
import com.iahorizonplus.quizzboardbackend.security.UserPrincipal;
import com.iahorizonplus.quizzboardbackend.service.ParticipationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/participations")
@RequiredArgsConstructor
@Tag(name = "Participations", description = "Soumission de réponses, calcul de score et historique d'évaluation (Richardson Niveau 3 HATEOAS)")
public class ParticipationController {

    private final ParticipationService participationService;

    @PostMapping
    @Operation(summary = "Soumettre une participation à un quiz et obtenir le score et certificat éventuel")
    public ResponseEntity<ApiResponse<Participation>> submitParticipation(
            @Valid @RequestBody Participation participation,
            @AuthenticationPrincipal UserPrincipal currentUser,
            HttpServletRequest request) {
        if (currentUser != null) {
            participation.setUserId(currentUser.getId());
            if (participation.getParticipantName() == null || participation.getParticipantName().isBlank()) {
                participation.setParticipantName(currentUser.getName());
            }
            if (participation.getParticipantEmail() == null || participation.getParticipantEmail().isBlank()) {
                participation.setParticipantEmail(currentUser.getEmail());
            }
        }
        Participation saved = participationService.submitParticipation(participation, participation.getAnswers());
        List<LinkDto> links = new ArrayList<>();
        links.add(LinkDto.of("self", "/api/v1/participations/" + saved.getId(), "GET"));
        if (saved.getCertificateId() != null) {
            links.add(LinkDto.of("certificate", "/api/v1/certificates/" + saved.getCertificateId(), "GET", "Télécharger votre certificat officiel"));
        }
        links.add(LinkDto.of("quiz", "/api/v1/quizzes/" + saved.getQuizId(), "GET"));
        links.add(LinkDto.of("my-history", "/api/v1/participations/my", "GET"));

        return new ResponseEntity<>(
                ApiResponse.created(saved, "Participation enregistrée et score calculé avec succès.", links, request.getRequestURI()),
                HttpStatus.CREATED
        );
    }

    @GetMapping("/{id}")
    @Operation(summary = "Obtenir les résultats d'une participation par son ID")
    public ResponseEntity<ApiResponse<Participation>> getParticipationById(@PathVariable String id, HttpServletRequest request) {
        Participation p = participationService.getParticipationById(id);
        List<LinkDto> links = List.of(
                LinkDto.of("self", request.getRequestURI(), "GET"),
                LinkDto.of("quiz", "/api/v1/quizzes/" + p.getQuizId(), "GET")
        );
        return ResponseEntity.ok(
                ApiResponse.ok(p, "Résultat de la participation récupéré avec succès.", links, request.getRequestURI())
        );
    }

    @GetMapping("/quiz/{quizId}")
    @Operation(summary = "Obtenir le classement et la liste des participations pour un quiz")
    public ResponseEntity<ApiResponse<List<Participation>>> getParticipationsByQuiz(@PathVariable String quizId, HttpServletRequest request) {
        List<Participation> list = participationService.getParticipationsByQuiz(quizId);
        List<LinkDto> links = List.of(
                LinkDto.of("self", request.getRequestURI(), "GET"),
                LinkDto.of("quiz", "/api/v1/quizzes/" + quizId, "GET")
        );
        return ResponseEntity.ok(
                ApiResponse.ok(list, "Classement des participations récupéré avec succès.", links, request.getRequestURI())
        );
    }

    @GetMapping("/my")
    @Operation(summary = "Lister l'historique de mes participations")
    public ResponseEntity<ApiResponse<List<Participation>>> getMyParticipations(
            @AuthenticationPrincipal UserPrincipal currentUser,
            HttpServletRequest request) {
        String userId = currentUser != null ? currentUser.getId() : "anonymous";
        List<Participation> list = participationService.getParticipationsByUser(userId);
        List<LinkDto> links = List.of(
                LinkDto.of("self", request.getRequestURI(), "GET")
        );
        return ResponseEntity.ok(
                ApiResponse.ok(list, "Historique de vos participations récupéré avec succès.", links, request.getRequestURI())
        );
    }
}
