package com.iahorizonplus.quizzboardbackend.controller;

import com.iahorizonplus.quizzboardbackend.dto.response.ApiResponse;
import com.iahorizonplus.quizzboardbackend.dto.response.LinkDto;
import com.iahorizonplus.quizzboardbackend.entity.Course;
import com.iahorizonplus.quizzboardbackend.entity.CourseChapter;
import com.iahorizonplus.quizzboardbackend.security.UserPrincipal;
import com.iahorizonplus.quizzboardbackend.service.CourseService;
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
@RequestMapping("/courses")
@RequiredArgsConstructor
@Tag(name = "Cours", description = "Gestion des cours, syllabus et chapitres (Richardson Niveau 3 HATEOAS)")
public class CourseController {

    private final CourseService courseService;

    @GetMapping
    @Operation(summary = "Lister les cours publiés ou ceux du créateur connecté")
    public ResponseEntity<ApiResponse<List<Course>>> getCourses(
            @RequestParam(required = false, defaultValue = "false") boolean my,
            @AuthenticationPrincipal UserPrincipal currentUser,
            HttpServletRequest request) {
        List<Course> courses = (my && currentUser != null)
                ? courseService.getCoursesByCreator(currentUser.getId())
                : courseService.getAllPublishedCourses();

        List<LinkDto> links = List.of(
                LinkDto.of("self", request.getRequestURI(), "GET"),
                LinkDto.of("create", "/api/v1/courses", "POST", "Créer un nouveau cours"),
                LinkDto.of("ai-generate", "/api/v1/ai/generate-course", "POST", "Générer un cours avec l'IA")
        );
        return ResponseEntity.ok(
                ApiResponse.ok(courses, "Liste des cours récupérée avec succès.", links, request.getRequestURI())
        );
    }

    @GetMapping("/{id}")
    @Operation(summary = "Obtenir les détails d'un cours avec ses chapitres")
    public ResponseEntity<ApiResponse<Course>> getCourseById(@PathVariable String id, HttpServletRequest request) {
        Course course = courseService.getCourseById(id);
        List<LinkDto> links = getCourseLinks(course.getId());
        return ResponseEntity.ok(
                ApiResponse.ok(course, "Détails du cours récupérés avec succès.", links, request.getRequestURI())
        );
    }

    @PostMapping
    @PreAuthorize("hasRole('CREATOR') or hasRole('ADMIN')")
    @Operation(summary = "Créer un nouveau cours structuré")
    public ResponseEntity<ApiResponse<Course>> createCourse(
            @Valid @RequestBody Course course,
            @AuthenticationPrincipal UserPrincipal currentUser,
            HttpServletRequest request) {
        String creatorId = currentUser != null ? currentUser.getId() : "anonymous";
        String creatorName = currentUser != null ? currentUser.getName() : "Anonyme";
        Course created = courseService.createCourse(course, creatorId, creatorName);
        List<LinkDto> links = getCourseLinks(created.getId());
        return new ResponseEntity<>(
                ApiResponse.created(created, "Cours créé avec succès.", links, request.getRequestURI()),
                HttpStatus.CREATED
        );
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('CREATOR') or hasRole('ADMIN')")
    @Operation(summary = "Mettre à jour un cours existant")
    public ResponseEntity<ApiResponse<Course>> updateCourse(
            @PathVariable String id,
            @Valid @RequestBody Course course,
            @AuthenticationPrincipal UserPrincipal currentUser,
            HttpServletRequest request) {
        String creatorId = currentUser != null ? currentUser.getId() : "anonymous";
        Course updated = courseService.updateCourse(id, course, creatorId);
        List<LinkDto> links = getCourseLinks(id);
        return ResponseEntity.ok(
                ApiResponse.ok(updated, "Cours mis à jour avec succès.", links, request.getRequestURI())
        );
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('CREATOR') or hasRole('ADMIN')")
    @Operation(summary = "Supprimer un cours")
    public ResponseEntity<ApiResponse<Void>> deleteCourse(
            @PathVariable String id,
            @AuthenticationPrincipal UserPrincipal currentUser,
            HttpServletRequest request) {
        String creatorId = currentUser != null ? currentUser.getId() : "anonymous";
        courseService.deleteCourse(id, creatorId);
        List<LinkDto> links = List.of(
                LinkDto.of("collection", "/api/v1/courses", "GET")
        );
        return ResponseEntity.ok(
                ApiResponse.ok(null, "Cours supprimé avec succès.", links, request.getRequestURI())
        );
    }

    @PostMapping("/{id}/chapters")
    @PreAuthorize("hasRole('CREATOR') or hasRole('ADMIN')")
    @Operation(summary = "Ajouter un chapitre à un cours")
    public ResponseEntity<ApiResponse<CourseChapter>> addChapter(
            @PathVariable String id,
            @Valid @RequestBody CourseChapter chapter,
            @AuthenticationPrincipal UserPrincipal currentUser,
            HttpServletRequest request) {
        String creatorId = currentUser != null ? currentUser.getId() : "anonymous";
        CourseChapter created = courseService.addChapter(id, chapter, creatorId);
        List<LinkDto> links = List.of(
                LinkDto.of("course", "/api/v1/courses/" + id, "GET")
        );
        return new ResponseEntity<>(
                ApiResponse.created(created, "Chapitre ajouté avec succès.", links, request.getRequestURI()),
                HttpStatus.CREATED
        );
    }

    private List<LinkDto> getCourseLinks(String courseId) {
        return List.of(
                LinkDto.of("self", "/api/v1/courses/" + courseId, "GET"),
                LinkDto.of("update", "/api/v1/courses/" + courseId, "PUT"),
                LinkDto.of("delete", "/api/v1/courses/" + courseId, "DELETE"),
                LinkDto.of("add-chapter", "/api/v1/courses/" + courseId + "/chapters", "POST"),
                LinkDto.of("collection", "/api/v1/courses", "GET")
        );
    }
}
