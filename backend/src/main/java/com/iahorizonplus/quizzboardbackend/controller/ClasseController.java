package com.iahorizonplus.quizzboardbackend.controller;

import com.iahorizonplus.quizzboardbackend.dto.response.ApiResponse;
import com.iahorizonplus.quizzboardbackend.dto.response.LinkDto;
import com.iahorizonplus.quizzboardbackend.entity.Classe;
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

@RestController
@RequestMapping("/classes")
@RequiredArgsConstructor
@Tag(name = "Classes", description = "Gestion des classes pédagogiques et des étudiants (Richardson Niveau 3 HATEOAS)")
public class ClasseController {

    private final ClasseService classeService;

    @GetMapping
    @Operation(summary = "Lister les classes du créateur connecté")
    public ResponseEntity<ApiResponse<List<Classe>>> getMyClasses(
            @AuthenticationPrincipal UserPrincipal currentUser,
            HttpServletRequest request) {
        String email = currentUser != null ? currentUser.getEmail() : null;
        List<Classe> classes = classeService.getClasses(email, null);
        List<LinkDto> links = List.of(
                LinkDto.of("self", request.getRequestURI(), "GET"),
                LinkDto.of("create", "/api/v1/classes", "POST", "Créer une nouvelle classe")
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
        String email = currentUser != null ? currentUser.getEmail() : null;
        Classe created = classeService.createClasse(email, classe);
        List<LinkDto> links = getClasseLinks(created.getId());
        return new ResponseEntity<>(
                ApiResponse.created(created, "Classe créée avec succès.", links, request.getRequestURI()),
                HttpStatus.CREATED
        );
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('CREATOR') or hasRole('ADMIN')")
    @Operation(summary = "Mettre à jour une classe existante")
    public ResponseEntity<ApiResponse<Classe>> updateClasse(
            @PathVariable String id,
            @Valid @RequestBody Classe classe,
            HttpServletRequest request) {
        Classe updated = classeService.updateClasse(id, classe);
        List<LinkDto> links = getClasseLinks(id);
        return ResponseEntity.ok(
                ApiResponse.ok(updated, "Classe mise à jour avec succès.", links, request.getRequestURI())
        );
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('CREATOR') or hasRole('ADMIN')")
    @Operation(summary = "Supprimer une classe")
    public ResponseEntity<ApiResponse<Void>> deleteClasse(@PathVariable String id, HttpServletRequest request) {
        classeService.deleteClasse(id);
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
            HttpServletRequest request) {
        Student created = classeService.addStudentToClasse(id, student);
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
            HttpServletRequest request) {
        classeService.removeStudentFromClasse(id, studentId);
        List<LinkDto> links = List.of(
                LinkDto.of("students", "/api/v1/classes/" + id + "/students", "GET")
        );
        return ResponseEntity.ok(
                ApiResponse.ok(null, "Étudiant retiré de la classe avec succès.", links, request.getRequestURI())
        );
    }

    private List<LinkDto> getClasseLinks(String classeId) {
        return List.of(
                LinkDto.of("self", "/api/v1/classes/" + classeId, "GET"),
                LinkDto.of("update", "/api/v1/classes/" + classeId, "PUT"),
                LinkDto.of("delete", "/api/v1/classes/" + classeId, "DELETE"),
                LinkDto.of("students", "/api/v1/classes/" + classeId + "/students", "GET", "Étudiants de la classe"),
                LinkDto.of("collection", "/api/v1/classes", "GET")
        );
    }
}
