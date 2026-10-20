package com.iahorizonplus.quizzboardbackend.controller;

import com.iahorizonplus.quizzboardbackend.dto.request.CommunityRequests;
import com.iahorizonplus.quizzboardbackend.dto.response.ApiResponse;
import com.iahorizonplus.quizzboardbackend.dto.response.CommunityResponse;
import com.iahorizonplus.quizzboardbackend.dto.response.LinkDto;
import com.iahorizonplus.quizzboardbackend.entity.*;
import com.iahorizonplus.quizzboardbackend.exception.UnauthorizedException;
import com.iahorizonplus.quizzboardbackend.security.UserPrincipal;
import com.iahorizonplus.quizzboardbackend.service.CommunityService;
import com.iahorizonplus.quizzboardbackend.service.impl.CommunityContentService;
import com.iahorizonplus.quizzboardbackend.service.impl.CommunityServiceImpl;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/communities")
@RequiredArgsConstructor
@Tag(name = "Communautés", description = "Espaces communautaires : forum, documents, réunions en visio, quiz partagés et gestion des membres (Richardson Niveau 3 HATEOAS)")
public class CommunityController {

    private final CommunityService communityService;
    private final CommunityContentService contentService;

    // ------------------------------------------------------------------ Communautés

    @GetMapping
    @Operation(summary = "Lister mes communautés et les communautés publiques")
    public ResponseEntity<ApiResponse<List<CommunityResponse>>> getAllCommunities(
            @AuthenticationPrincipal UserPrincipal currentUser, HttpServletRequest request) {
        List<CommunityResponse> list = communityService.getVisibleCommunities(userId(currentUser));
        List<LinkDto> links = List.of(
                LinkDto.of("self", request.getRequestURI(), "GET"),
                LinkDto.of("create", "/api/v1/communities", "POST", "Créer un espace communautaire"),
                LinkDto.of("join", "/api/v1/communities/join", "POST", "Rejoindre via code d'accès")
        );
        return ResponseEntity.ok(ApiResponse.ok(list, "Liste des communautés récupérée avec succès.", links, request.getRequestURI()));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Détail d'une communauté (membres) : discussions, documents, réunions, membres")
    public ResponseEntity<ApiResponse<CommunityResponse>> getCommunityById(
            @PathVariable String id, @AuthenticationPrincipal UserPrincipal currentUser, HttpServletRequest request) {
        CommunityResponse community = communityService.getCommunityDetail(id, userId(currentUser));
        return ok(community, "Détails de la communauté récupérés avec succès.", id, request);
    }

    @PostMapping
    @Operation(summary = "Créer une nouvelle communauté")
    public ResponseEntity<ApiResponse<CommunityResponse>> createCommunity(
            @RequestBody Community community, @AuthenticationPrincipal UserPrincipal currentUser, HttpServletRequest request) {
        String userId = userId(currentUser);
        Community created = communityService.createCommunity(community, userId, currentUser.getName());
        CommunityResponse detail = communityService.getCommunityDetail(created.getId(), userId);
        return new ResponseEntity<>(ApiResponse.created(detail, "Espace communautaire créé avec succès.",
                links(created.getId()), request.getRequestURI()), HttpStatus.CREATED);
    }

    @PostMapping("/join")
    @Operation(summary = "Rejoindre une communauté avec son code d'accès")
    public ResponseEntity<ApiResponse<CommunityResponse>> joinCommunity(
            @RequestBody Map<String, String> body, @AuthenticationPrincipal UserPrincipal currentUser, HttpServletRequest request) {
        String userId = userId(currentUser);
        Community community = communityService.joinCommunity(body.get("accessCode"), userId, currentUser.getName());
        return ok(communityService.getCommunityDetail(community.getId(), userId), "Vous avez rejoint la communauté avec succès.", community.getId(), request);
    }

    @PostMapping("/{id}/leave")
    @Operation(summary = "Quitter une communauté")
    public ResponseEntity<ApiResponse<Void>> leaveCommunity(
            @PathVariable String id, @AuthenticationPrincipal UserPrincipal currentUser, HttpServletRequest request) {
        communityService.leaveCommunity(id, userId(currentUser));
        return done("Vous avez quitté la communauté.", request);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Modifier les paramètres de la communauté (créateur)")
    public ResponseEntity<ApiResponse<CommunityResponse>> updateSettings(
            @PathVariable String id, @RequestBody CommunityRequests.Settings settings,
            @AuthenticationPrincipal UserPrincipal currentUser, HttpServletRequest request) {
        return ok(communityService.updateSettings(id, settings, userId(currentUser)), "Paramètres de la communauté enregistrés.", id, request);
    }

    @PostMapping("/{id}/access-code")
    @Operation(summary = "Générer un nouveau code d'accès (l'ancien ne fonctionne plus)")
    public ResponseEntity<ApiResponse<Map<String, String>>> regenerateAccessCode(
            @PathVariable String id, @AuthenticationPrincipal UserPrincipal currentUser, HttpServletRequest request) {
        String code = communityService.regenerateAccessCode(id, userId(currentUser));
        return ok(Map.of("accessCode", code), "Nouveau code d'accès généré.", id, request);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Supprimer la communauté et tout son contenu (créateur)")
    public ResponseEntity<ApiResponse<Void>> deleteCommunity(
            @PathVariable String id, @AuthenticationPrincipal UserPrincipal currentUser, HttpServletRequest request) {
        communityService.deleteCommunity(id, userId(currentUser));
        return done("Communauté supprimée.", request);
    }

    // ------------------------------------------------------------------ Membres

    @PatchMapping("/{id}/members/{memberUserId}")
    @Operation(summary = "Nommer un modérateur ou le repasser membre (créateur)")
    public ResponseEntity<ApiResponse<Void>> updateMemberRole(
            @PathVariable String id, @PathVariable String memberUserId, @RequestBody CommunityRequests.MemberRole body,
            @AuthenticationPrincipal UserPrincipal currentUser, HttpServletRequest request) {
        communityService.updateMemberRole(id, memberUserId, body.role(), userId(currentUser));
        return done("Rôle du membre mis à jour.", request);
    }

    @DeleteMapping("/{id}/members/{memberUserId}")
    @Operation(summary = "Retirer un membre de la communauté (animation)")
    public ResponseEntity<ApiResponse<Void>> removeMember(
            @PathVariable String id, @PathVariable String memberUserId,
            @AuthenticationPrincipal UserPrincipal currentUser, HttpServletRequest request) {
        communityService.removeMember(id, memberUserId, userId(currentUser));
        return done("Membre retiré de la communauté.", request);
    }

    // ------------------------------------------------------------------ Forum

    @PostMapping("/{id}/topics")
    @Operation(summary = "Créer un sujet de discussion dans le forum de la communauté")
    public ResponseEntity<ApiResponse<ForumTopic>> createTopic(
            @PathVariable String id, @RequestBody ForumTopic topic,
            @AuthenticationPrincipal UserPrincipal currentUser, HttpServletRequest request) {
        ForumTopic created = communityService.createTopic(id, topic, userId(currentUser), currentUser.getName());
        return new ResponseEntity<>(ApiResponse.created(created, "Sujet de discussion créé avec succès.", links(id), request.getRequestURI()), HttpStatus.CREATED);
    }

    @PatchMapping("/{id}/topics/{topicId}")
    @Operation(summary = "Épingler, verrouiller ou lever le signalement d'un sujet (animation)")
    public ResponseEntity<ApiResponse<ForumTopic>> moderateTopic(
            @PathVariable String id, @PathVariable String topicId, @RequestBody CommunityRequests.TopicModeration body,
            @AuthenticationPrincipal UserPrincipal currentUser, HttpServletRequest request) {
        return ok(communityService.moderateTopic(id, topicId, body, userId(currentUser)), "Sujet mis à jour.", id, request);
    }

    @DeleteMapping("/{id}/topics/{topicId}")
    @Operation(summary = "Supprimer un sujet (son auteur ou l'animation)")
    public ResponseEntity<ApiResponse<Void>> deleteTopic(
            @PathVariable String id, @PathVariable String topicId,
            @AuthenticationPrincipal UserPrincipal currentUser, HttpServletRequest request) {
        communityService.deleteTopic(id, topicId, userId(currentUser));
        return done("Sujet supprimé.", request);
    }

    @PostMapping("/topics/{topicId}/comments")
    @Operation(summary = "Ajouter un commentaire à un sujet de discussion")
    public ResponseEntity<ApiResponse<ForumComment>> addComment(
            @PathVariable String topicId, @RequestBody ForumComment comment,
            @AuthenticationPrincipal UserPrincipal currentUser, HttpServletRequest request) {
        ForumComment created = communityService.addComment(topicId, comment, userId(currentUser), currentUser.getName());
        return new ResponseEntity<>(ApiResponse.created(created, "Commentaire publié avec succès.",
                List.of(LinkDto.of("self", request.getRequestURI(), "POST")), request.getRequestURI()), HttpStatus.CREATED);
    }

    @DeleteMapping("/topics/{topicId}/comments/{commentId}")
    @Operation(summary = "Supprimer une réponse (son auteur ou l'animation)")
    public ResponseEntity<ApiResponse<Void>> deleteComment(
            @PathVariable String topicId, @PathVariable String commentId,
            @AuthenticationPrincipal UserPrincipal currentUser, HttpServletRequest request) {
        communityService.deleteComment(topicId, commentId, userId(currentUser));
        return done("Réponse supprimée.", request);
    }

    @PostMapping("/topics/{topicId}/report")
    @Operation(summary = "Signaler un sujet inapproprié à l'animation et aux administrateurs")
    public ResponseEntity<ApiResponse<Void>> reportTopic(
            @PathVariable String topicId, @AuthenticationPrincipal UserPrincipal currentUser, HttpServletRequest request) {
        communityService.reportTopic(topicId, userId(currentUser));
        return done("Sujet signalé. Merci, l'équipe d'animation va le vérifier.", request);
    }

    @GetMapping("/moderation/topics")
    @Operation(summary = "Tous les sujets de forum, signalés en premier (administrateurs)")
    public ResponseEntity<ApiResponse<List<CommunityResponse.ModeratedTopic>>> topicsForModeration(
            @AuthenticationPrincipal UserPrincipal currentUser, HttpServletRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(communityService.getTopicsForModeration(userId(currentUser)),
                "Sujets à modérer récupérés.", List.of(LinkDto.of("self", request.getRequestURI(), "GET")), request.getRequestURI()));
    }

    // ------------------------------------------------------------------ Documents

    @PostMapping(value = "/{id}/resources/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Déposer un document (PDF, Word, PowerPoint, Excel, ZIP, image... 20 Mo max)")
    public ResponseEntity<ApiResponse<CommunityResponse.Resource>> uploadDocument(
            @PathVariable String id,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "title", required = false) String title,
            @RequestParam(value = "description", required = false) String description,
            @AuthenticationPrincipal UserPrincipal currentUser, HttpServletRequest request) {
        ResourceFile saved = contentService.uploadDocument(id, file, title, description, userId(currentUser), currentUser.getName());
        return new ResponseEntity<>(ApiResponse.created(CommunityServiceImpl.toResource(saved), "Document partagé avec succès.", links(id), request.getRequestURI()), HttpStatus.CREATED);
    }

    @PostMapping("/{id}/resources")
    @Operation(summary = "Partager un lien (Drive, YouTube, site web...)")
    public ResponseEntity<ApiResponse<CommunityResponse.Resource>> addLink(
            @PathVariable String id, @RequestBody CommunityRequests.LinkResource body,
            @AuthenticationPrincipal UserPrincipal currentUser, HttpServletRequest request) {
        ResourceFile saved = contentService.addLink(id, body, userId(currentUser), currentUser.getName());
        return new ResponseEntity<>(ApiResponse.created(CommunityServiceImpl.toResource(saved), "Lien partagé avec succès.", links(id), request.getRequestURI()), HttpStatus.CREATED);
    }

    @DeleteMapping("/{id}/resources/{resourceId}")
    @Operation(summary = "Supprimer un document (son auteur ou l'animation)")
    public ResponseEntity<ApiResponse<Void>> deleteResource(
            @PathVariable String id, @PathVariable String resourceId,
            @AuthenticationPrincipal UserPrincipal currentUser, HttpServletRequest request) {
        contentService.deleteResource(id, resourceId, userId(currentUser));
        return done("Document supprimé.", request);
    }

    @GetMapping("/{id}/resources/{resourceId}/download")
    @Operation(summary = "Télécharger un document (membres de la communauté)")
    public ResponseEntity<Resource> downloadDocument(
            @PathVariable String id, @PathVariable String resourceId, @AuthenticationPrincipal UserPrincipal currentUser) {
        CommunityContentService.Download download = contentService.download(id, resourceId, userId(currentUser));
        // Pas de Content-Disposition : le site enregistre le fichier sous son nom d'origine, et cet en-tête fait
        // intercepter la réponse par les gestionnaires de téléchargement (IDM...), ce qui vide la requête du site.
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(download.contentType()))
                .header(HttpHeaders.CACHE_CONTROL, "private, no-store")
                .body(download.file());
    }

    // ------------------------------------------------------------------ Réunions

    @PostMapping("/{id}/meetings")
    @Operation(summary = "Programmer une réunion en visio (Meet, Zoom, Teams, Jitsi) et prévenir les membres")
    public ResponseEntity<ApiResponse<Meeting>> scheduleMeeting(
            @PathVariable String id, @RequestBody CommunityRequests.MeetingForm form,
            @AuthenticationPrincipal UserPrincipal currentUser, HttpServletRequest request) {
        Meeting created = contentService.scheduleMeeting(id, form, userId(currentUser), currentUser.getName());
        return new ResponseEntity<>(ApiResponse.created(created, "Réunion programmée avec succès.", links(id), request.getRequestURI()), HttpStatus.CREATED);
    }

    @PutMapping("/{id}/meetings/{meetingId}")
    @Operation(summary = "Modifier une réunion (animation)")
    public ResponseEntity<ApiResponse<Meeting>> updateMeeting(
            @PathVariable String id, @PathVariable String meetingId, @RequestBody CommunityRequests.MeetingForm form,
            @AuthenticationPrincipal UserPrincipal currentUser, HttpServletRequest request) {
        return ok(contentService.updateMeeting(id, meetingId, form, userId(currentUser)), "Réunion modifiée.", id, request);
    }

    @DeleteMapping("/{id}/meetings/{meetingId}")
    @Operation(summary = "Annuler une réunion (animation)")
    public ResponseEntity<ApiResponse<Void>> deleteMeeting(
            @PathVariable String id, @PathVariable String meetingId,
            @AuthenticationPrincipal UserPrincipal currentUser, HttpServletRequest request) {
        contentService.deleteMeeting(id, meetingId, userId(currentUser));
        return done("Réunion annulée.", request);
    }

    // ------------------------------------------------------------------ Quiz partagés

    @GetMapping("/{id}/quizzes")
    @Operation(summary = "Quiz partagés dans la communauté (membres)")
    public ResponseEntity<ApiResponse<List<Quiz>>> sharedQuizzes(
            @PathVariable String id, @AuthenticationPrincipal UserPrincipal currentUser, HttpServletRequest request) {
        return ok(contentService.sharedQuizzes(id, userId(currentUser)), "Quiz partagés récupérés.", id, request);
    }

    @PostMapping("/{id}/quizzes")
    @Operation(summary = "Partager un quiz dans la communauté (animation)")
    public ResponseEntity<ApiResponse<List<String>>> shareQuiz(
            @PathVariable String id, @RequestBody CommunityRequests.ShareQuiz body,
            @AuthenticationPrincipal UserPrincipal currentUser, HttpServletRequest request) {
        return ok(contentService.shareQuiz(id, body.quizId(), userId(currentUser), currentUser.getName()), "Quiz partagé dans la communauté.", id, request);
    }

    @DeleteMapping("/{id}/quizzes/{quizId}")
    @Operation(summary = "Retirer un quiz de la communauté (animation)")
    public ResponseEntity<ApiResponse<List<String>>> unshareQuiz(
            @PathVariable String id, @PathVariable String quizId,
            @AuthenticationPrincipal UserPrincipal currentUser, HttpServletRequest request) {
        return ok(contentService.unshareQuiz(id, quizId, userId(currentUser)), "Quiz retiré de la communauté.", id, request);
    }

    // ------------------------------------------------------------------ Outils

    private static String userId(UserPrincipal currentUser) {
        if (currentUser == null) {
            throw new UnauthorizedException("Connectez-vous pour accéder aux communautés.");
        }
        return currentUser.getId();
    }

    private static List<LinkDto> links(String communityId) {
        return List.of(
                LinkDto.of("community", "/api/v1/communities/" + communityId, "GET"),
                LinkDto.of("collection", "/api/v1/communities", "GET")
        );
    }

    private static <T> ResponseEntity<ApiResponse<T>> ok(T data, String message, String communityId, HttpServletRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(data, message, links(communityId), request.getRequestURI()));
    }

    private static ResponseEntity<ApiResponse<Void>> done(String message, HttpServletRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(null, message,
                List.of(LinkDto.of("collection", "/api/v1/communities", "GET")), request.getRequestURI()));
    }
}
