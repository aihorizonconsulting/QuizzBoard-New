package com.iahorizonplus.quizzboardbackend.controller;

import com.iahorizonplus.quizzboardbackend.dto.response.ApiResponse;
import com.iahorizonplus.quizzboardbackend.dto.response.LinkDto;
import com.iahorizonplus.quizzboardbackend.entity.Classe;
import com.iahorizonplus.quizzboardbackend.entity.Quiz;
import com.iahorizonplus.quizzboardbackend.entity.Student;
import com.iahorizonplus.quizzboardbackend.security.UserPrincipal;
import com.iahorizonplus.quizzboardbackend.service.ClasseService;
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

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/classes")
@RequiredArgsConstructor
@Tag(name = "Classes", description = "Gestion des classes pédagogiques et des étudiants (Richardson Niveau 3 HATEOAS)")
public class ClasseController {

    private final ClasseService classeService;

    @GetMapping
    @Operation(summary = "Lister les classes du formateur connecté, ou celles où l'apprenant connecté est inscrit")
    public ResponseEntity<ApiResponse<List<Classe>>> getMyClasses(
            @RequestParam(required = false) String promotionId,
            @AuthenticationPrincipal UserPrincipal currentUser,
            HttpServletRequest request) {
        List<Classe> classes = classeService.getClasses(email(currentUser), promotionId);
        List<LinkDto> links = List.of(
                LinkDto.of("self", request.getRequestURI(), "GET"),
                LinkDto.of("create", "/api/v1/classes", "POST", "Créer une nouvelle classe"),
                LinkDto.of("join", "/api/v1/classes/join", "POST", "Rejoindre une classe avec son code")
        );
        return ResponseEntity.ok(
                ApiResponse.ok(classes, "Liste des classes récupérée avec succès.", links, request.getRequestURI())
        );
    }

    @GetMapping("/{id}")
    @Operation(summary = "Obtenir les détails d'une classe par identifiant")
    public ResponseEntity<ApiResponse<Classe>> getClasseById(@PathVariable String id, HttpServletRequest request) {
        Classe classe = classeService.getClasseById(id);
        List<LinkDto> links = getClasseLinks(classe.getId());
        return ResponseEntity.ok(
                ApiResponse.ok(classe, "Détails de la classe récupérés avec succès.", links, request.getRequestURI())
        );
    }

    @PostMapping
    @PreAuthorize("hasRole('CREATOR') or hasRole('ADMIN')")
    @Operation(summary = "Créer une nouvelle classe")
    public ResponseEntity<ApiResponse<Classe>> createClasse(
            @Valid @RequestBody Classe classe,
            @AuthenticationPrincipal UserPrincipal currentUser,
            HttpServletRequest request) {
        Classe created = classeService.createClasse(email(currentUser), classe);
        List<LinkDto> links = getClasseLinks(created.getId());
        return new ResponseEntity<>(
                ApiResponse.created(created, "Classe créée avec succès.", links, request.getRequestURI()),
                HttpStatus.CREATED
        );
    }

    @PostMapping("/join")
    @Operation(summary = "Rejoindre une classe avec son code (apprenant connecté)")
    public ResponseEntity<ApiResponse<Classe>> joinClasse(
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserPrincipal currentUser,
            HttpServletRequest request) {
        Classe classe = classeService.joinClasseByCode(body != null ? body.get("code") : null, email(currentUser));
        return ResponseEntity.ok(
                ApiResponse.ok(classe, "Vous avez rejoint la classe « " + classe.getName() + " ».", getClasseLinks(classe.getId()), request.getRequestURI())
        );
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('CREATOR') or hasRole('ADMIN')")
    @Operation(summary = "Mettre à jour une classe existante")
    public ResponseEntity<ApiResponse<Classe>> updateClasse(
            @PathVariable String id,
            @Valid @RequestBody Classe classe,
            @AuthenticationPrincipal UserPrincipal currentUser,
            HttpServletRequest request) {
        Classe updated = classeService.updateClasse(id, classe, email(currentUser));
        List<LinkDto> links = getClasseLinks(id);
        return ResponseEntity.ok(
                ApiResponse.ok(updated, "Classe mise à jour avec succès.", links, request.getRequestURI())
        );
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('CREATOR') or hasRole('ADMIN')")
    @Operation(summary = "Supprimer une classe")
    public ResponseEntity<ApiResponse<Void>> deleteClasse(
            @PathVariable String id,
            @AuthenticationPrincipal UserPrincipal currentUser,
            HttpServletRequest request) {
        classeService.deleteClasse(id, email(currentUser));
        List<LinkDto> links = List.of(
                LinkDto.of("collection", "/api/v1/classes", "GET")
        );
        return ResponseEntity.ok(
                ApiResponse.ok(null, "Classe supprimée avec succès.", links, request.getRequestURI())
        );
    }

    @GetMapping("/{id}/students")
    @Operation(summary = "Lister les étudiants inscrits dans une classe")
    public ResponseEntity<ApiResponse<List<Student>>> getStudentsInClasse(@PathVariable String id, HttpServletRequest request) {
        List<Student> students = classeService.getStudentsInClasse(id);
        List<LinkDto> links = List.of(
                LinkDto.of("self", request.getRequestURI(), "GET"),
                LinkDto.of("classe", "/api/v1/classes/" + id, "GET"),
                LinkDto.of("add-student", "/api/v1/classes/" + id + "/students", "POST")
        );
        return ResponseEntity.ok(
                ApiResponse.ok(students, "Liste des étudiants récupérée avec succès.", links, request.getRequestURI())
        );
    }

    @PostMapping("/{id}/students")
    @PreAuthorize("hasRole('CREATOR') or hasRole('ADMIN')")
    @Operation(summary = "Ajouter un étudiant à une classe")
    public ResponseEntity<ApiResponse<Student>> addStudent(
            @PathVariable String id,
            @Valid @RequestBody Student student,
            @AuthenticationPrincipal UserPrincipal currentUser,
            HttpServletRequest request) {
        Student created = classeService.addStudentToClasse(id, student, email(currentUser));
        List<LinkDto> links = List.of(
                LinkDto.of("self", "/api/v1/classes/" + id + "/students/" + created.getId(), "GET"),
                LinkDto.of("classe", "/api/v1/classes/" + id, "GET"),
                LinkDto.of("delete", "/api/v1/classes/" + id + "/students/" + created.getId(), "DELETE")
        );
        return new ResponseEntity<>(
                ApiResponse.created(created, "Étudiant ajouté à la classe avec succès.", links, request.getRequestURI()),
                HttpStatus.CREATED
        );
    }

    @DeleteMapping("/{id}/students/{studentId}")
    @PreAuthorize("hasRole('CREATOR') or hasRole('ADMIN')")
    @Operation(summary = "Retirer un étudiant d'une classe")
    public ResponseEntity<ApiResponse<Void>> removeStudent(
            @PathVariable String id,
            @PathVariable String studentId,
            @AuthenticationPrincipal UserPrincipal currentUser,
            HttpServletRequest request) {
        classeService.removeStudentFromClasse(id, studentId, email(currentUser));
        List<LinkDto> links = List.of(
                LinkDto.of("students", "/api/v1/classes/" + id + "/students", "GET")
        );
        return ResponseEntity.ok(
                ApiResponse.ok(null, "Étudiant retiré de la classe avec succès.", links, request.getRequestURI())
        );
    }

    @GetMapping("/{id}/quizzes")
    @Operation(summary = "Lister les quiz assignés à une classe (formateur ou élève inscrit)")
    public ResponseEntity<ApiResponse<List<Quiz>>> getClasseQuizzes(
            @PathVariable String id,
            @AuthenticationPrincipal UserPrincipal currentUser,
            HttpServletRequest request) {
        List<Quiz> quizzes = classeService.getQuizzesOfClasse(id, email(currentUser));
        return ResponseEntity.ok(
                ApiResponse.ok(quizzes, "Quiz de la classe récupérés avec succès.", getClasseLinks(id), request.getRequestURI())
        );
    }

    @PutMapping("/{id}/quizzes/{quizId}")
    @PreAuthorize("hasRole('CREATOR') or hasRole('ADMIN')")
    @Operation(summary = "Assigner un quiz à une classe")
    public ResponseEntity<ApiResponse<Classe>> assignQuiz(
            @PathVariable String id,
            @PathVariable String quizId,
            @AuthenticationPrincipal UserPrincipal currentUser,
            HttpServletRequest request) {
        Classe classe = classeService.assignQuizToClass(id, quizId, email(currentUser));
        return ResponseEntity.ok(
                ApiResponse.ok(classe, "Quiz assigné à la classe avec succès.", getClasseLinks(id), request.getRequestURI())
        );
    }

    @DeleteMapping("/{id}/quizzes/{quizId}")
    @PreAuthorize("hasRole('CREATOR') or hasRole('ADMIN')")
    @Operation(summary = "Retirer un quiz d'une classe")
    public ResponseEntity<ApiResponse<Classe>> unassignQuiz(
            @PathVariable String id,
            @PathVariable String quizId,
            @AuthenticationPrincipal UserPrincipal currentUser,
            HttpServletRequest request) {
        Classe classe = classeService.unassignQuizFromClass(id, quizId, email(currentUser));
        return ResponseEntity.ok(
                ApiResponse.ok(classe, "Quiz retiré de la classe avec succès.", getClasseLinks(id), request.getRequestURI())
        );
    }

    private static String email(UserPrincipal currentUser) {
        return currentUser != null ? currentUser.getEmail() : null;
    }

    private List<LinkDto> getClasseLinks(String classeId) {
        return List.of(
                LinkDto.of("self", "/api/v1/classes/" + classeId, "GET"),
                LinkDto.of("update", "/api/v1/classes/" + classeId, "PUT"),
                LinkDto.of("delete", "/api/v1/classes/" + classeId, "DELETE"),
                LinkDto.of("students", "/api/v1/classes/" + classeId + "/students", "GET", "Étudiants de la classe"),
                LinkDto.of("quizzes", "/api/v1/classes/" + classeId + "/quizzes", "GET", "Quiz assignés à la classe"),
                LinkDto.of("collection", "/api/v1/classes", "GET")
        );
    }
}
