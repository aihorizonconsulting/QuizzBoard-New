package com.iahorizonplus.quizzboardbackend.controller;

import com.iahorizonplus.quizzboardbackend.dto.response.ApiResponse;
import com.iahorizonplus.quizzboardbackend.dto.response.LinkDto;
import com.iahorizonplus.quizzboardbackend.entity.*;
import com.iahorizonplus.quizzboardbackend.security.UserPrincipal;
import com.iahorizonplus.quizzboardbackend.service.CommunityService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/communities")
@RequiredArgsConstructor
@Tag(name = "Communautés", description = "Gestion des espaces communautaires, forums, visioconférences et ressources (Richardson Niveau 3 HATEOAS)")
public class CommunityController {

    private final CommunityService communityService;

    @GetMapping
    @Operation(summary = "Lister toutes les communautés disponibles")
    public ResponseEntity<ApiResponse<List<Community>>> getAllCommunities(HttpServletRequest request) {
        List<Community> list = communityService.getAllCommunities();
        List<LinkDto> links = List.of(
                LinkDto.of("self", request.getRequestURI(), "GET"),
                LinkDto.of("create", "/api/v1/communities", "POST", "Créer un espace communautaire"),
                LinkDto.of("join", "/api/v1/communities/join", "POST", "Rejoindre via code PIN")
        );
        return ResponseEntity.ok(
                ApiResponse.ok(list, "Liste des communautés récupérée avec succès.", links, request.getRequestURI())
        );
    }

    @GetMapping("/{id}")
    @Operation(summary = "Obtenir les détails d'une communauté avec ses topics, ressources et meetings")
    public ResponseEntity<ApiResponse<Community>> getCommunityById(@PathVariable String id, HttpServletRequest request) {
        Community community = communityService.getCommunityById(id);
        List<LinkDto> links = List.of(
                LinkDto.of("self", "/api/v1/communities/" + id, "GET"),
                LinkDto.of("create-topic", "/api/v1/communities/" + id + "/topics", "POST"),
                LinkDto.of("schedule-meeting", "/api/v1/communities/" + id + "/meetings", "POST"),
                LinkDto.of("add-resource", "/api/v1/communities/" + id + "/resources", "POST"),
                LinkDto.of("leave", "/api/v1/communities/" + id + "/leave", "POST"),
                LinkDto.of("collection", "/api/v1/communities", "GET")
        );
        return ResponseEntity.ok(
                ApiResponse.ok(community, "Détails de la communauté récupérés avec succès.", links, request.getRequestURI())
        );
    }

    @PostMapping
    @Operation(summary = "Créer une nouvelle communauté")
    public ResponseEntity<ApiResponse<Community>> createCommunity(
            @Valid @RequestBody Community community,
            @AuthenticationPrincipal UserPrincipal currentUser,
            HttpServletRequest request) {
        String creatorId = currentUser != null ? currentUser.getId() : "default-creator";
        String creatorName = currentUser != null ? currentUser.getName() : "Anonyme";
        Community created = communityService.createCommunity(community, creatorId, creatorName);
        List<LinkDto> links = List.of(
                LinkDto.of("self", "/api/v1/communities/" + created.getId(), "GET"),
                LinkDto.of("collection", "/api/v1/communities", "GET")
        );
        return new ResponseEntity<>(
                ApiResponse.created(created, "Espace communautaire créé avec succès.", links, request.getRequestURI()),
                HttpStatus.CREATED
        );
    }

    @PostMapping("/join")
    @Operation(summary = "Rejoindre une communauté avec un code d'accès")
    public ResponseEntity<ApiResponse<Community>> joinCommunity(
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserPrincipal currentUser,
            HttpServletRequest request) {
        String code = body.get("accessCode");
        String userId = currentUser != null ? currentUser.getId() : "anonymous";
        String userName = currentUser != null ? currentUser.getName() : "Anonyme";
        Community community = communityService.joinCommunity(code, userId, userName);
        List<LinkDto> links = List.of(
                LinkDto.of("self", "/api/v1/communities/" + community.getId(), "GET")
        );
        return ResponseEntity.ok(
                ApiResponse.ok(community, "Vous avez rejoint la communauté avec succès.", links, request.getRequestURI())
        );
    }

    @PostMapping("/{id}/leave")
    @Operation(summary = "Quitter une communauté")
    public ResponseEntity<ApiResponse<Void>> leaveCommunity(
            @PathVariable String id,
            @AuthenticationPrincipal UserPrincipal currentUser,
            HttpServletRequest request) {
        String userId = currentUser != null ? currentUser.getId() : "anonymous";
        communityService.leaveCommunity(id, userId);
        List<LinkDto> links = List.of(
                LinkDto.of("collection", "/api/v1/communities", "GET")
        );
        return ResponseEntity.ok(
                ApiResponse.ok(null, "Vous avez quitté la communauté.", links, request.getRequestURI())
        );
    }

    @PostMapping("/{id}/topics")
    @Operation(summary = "Créer un sujet de discussion dans le forum de la communauté")
    public ResponseEntity<ApiResponse<ForumTopic>> createTopic(
            @PathVariable String id,
            @Valid @RequestBody ForumTopic topic,
            @AuthenticationPrincipal UserPrincipal currentUser,
            HttpServletRequest request) {
        String authorId = currentUser != null ? currentUser.getId() : "anonymous";
        String authorName = currentUser != null ? currentUser.getName() : "Anonyme";
        ForumTopic created = communityService.createTopic(id, topic, authorId, authorName);
        List<LinkDto> links = List.of(
                LinkDto.of("community", "/api/v1/communities/" + id, "GET")
        );
        return new ResponseEntity<>(
                ApiResponse.created(created, "Sujet de discussion créé avec succès.", links, request.getRequestURI()),
                HttpStatus.CREATED
        );
    }

    @PostMapping("/topics/{topicId}/comments")
    @Operation(summary = "Ajouter un commentaire à un sujet de discussion")
    public ResponseEntity<ApiResponse<ForumComment>> addComment(
            @PathVariable String topicId,
            @Valid @RequestBody ForumComment comment,
            @AuthenticationPrincipal UserPrincipal currentUser,
            HttpServletRequest request) {
        String authorId = currentUser != null ? currentUser.getId() : "anonymous";
        String authorName = currentUser != null ? currentUser.getName() : "Anonyme";
        ForumComment created = communityService.addComment(topicId, comment, authorId, authorName);
        List<LinkDto> links = List.of(
                LinkDto.of("topic", "/api/v1/communities/topics/" + topicId, "GET")
        );
        return new ResponseEntity<>(
                ApiResponse.created(created, "Commentaire publié avec succès.", links, request.getRequestURI()),
                HttpStatus.CREATED
        );
    }

    @PostMapping("/{id}/meetings")
    @Operation(summary = "Programmer une session de visioconférence (Meet, Zoom, Teams)")
    public ResponseEntity<ApiResponse<Meeting>> scheduleMeeting(
            @PathVariable String id,
            @Valid @RequestBody Meeting meeting,
            HttpServletRequest request) {
        Meeting created = communityService.scheduleMeeting(id, meeting);
        List<LinkDto> links = List.of(
                LinkDto.of("community", "/api/v1/communities/" + id, "GET")
        );
        return new ResponseEntity<>(
                ApiResponse.created(created, "Session de visioconférence programmée avec succès.", links, request.getRequestURI()),
                HttpStatus.CREATED
        );
    }

    @PostMapping("/{id}/resources")
    @Operation(summary = "Partager une ressource pédagogique (PDF, doc, lien) dans la communauté")
    public ResponseEntity<ApiResponse<ResourceFile>> addResource(
            @PathVariable String id,
            @Valid @RequestBody ResourceFile resource,
            HttpServletRequest request) {
        ResourceFile created = communityService.addResource(id, resource);
        List<LinkDto> links = List.of(
                LinkDto.of("community", "/api/v1/communities/" + id, "GET")
        );
        return new ResponseEntity<>(
                ApiResponse.created(created, "Ressource partagée avec succès.", links, request.getRequestURI()),
                HttpStatus.CREATED
        );
    }
}
