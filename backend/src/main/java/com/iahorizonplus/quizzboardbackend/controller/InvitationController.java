package com.iahorizonplus.quizzboardbackend.controller;

import com.iahorizonplus.quizzboardbackend.dto.request.CreateInvitationRequest;
import com.iahorizonplus.quizzboardbackend.dto.response.AcceptInvitationResponse;
import com.iahorizonplus.quizzboardbackend.dto.response.ApiResponse;
import com.iahorizonplus.quizzboardbackend.dto.response.InvitationResponse;
import com.iahorizonplus.quizzboardbackend.dto.response.LinkDto;
import com.iahorizonplus.quizzboardbackend.security.UserPrincipal;
import com.iahorizonplus.quizzboardbackend.service.InvitationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/invitations")
@RequiredArgsConstructor
@Tag(name = "Invitations", description = "Gestion des invitations par email pour Classes, Communautés et Quiz Live")
public class InvitationController {

    private final InvitationService invitationService;

    @PostMapping
    @Operation(summary = "Créer et envoyer des invitations par email pour une ressource")
    public ResponseEntity<ApiResponse<List<InvitationResponse>>> createInvitations(
            @Valid @RequestBody CreateInvitationRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        List<InvitationResponse> responses = invitationService.createInvitations(currentUser, request);
        List<LinkDto> links = List.of(
                new LinkDto("self", "/api/v1/invitations", "POST", "application/json"),
                new LinkDto("pending", "/api/v1/invitations/my-pending", "GET", "application/json")
        );
        return new ResponseEntity<>(ApiResponse.created(responses, "Invitations envoyées avec succès", links, "/api/v1/invitations"), HttpStatus.CREATED);
    }

    @GetMapping({"/verify/{token}", "/token/{token}"})
    @Operation(summary = "Vérifier la validité d'une invitation via son token unique (Public)")
    public ResponseEntity<ApiResponse<InvitationResponse>> verifyInvitation(@PathVariable String token) {
        InvitationResponse response = invitationService.verifyInvitation(token);
        List<LinkDto> links = List.of(
                new LinkDto("self", "/api/v1/invitations/token/" + token, "GET", "application/json"),
                new LinkDto("accept", "/api/v1/invitations/token/" + token + "/accept", "POST", "application/json"),
                new LinkDto("decline", "/api/v1/invitations/token/" + token + "/decline", "POST", "application/json")
        );
        return ResponseEntity.ok(ApiResponse.ok(response, "Invitation valide", links, "/api/v1/invitations/token/" + token));
    }

    @PostMapping({"/accept/{token}", "/token/{token}/accept"})
    @Operation(summary = "Accepter une invitation et rejoindre la ressource")
    public ResponseEntity<ApiResponse<AcceptInvitationResponse>> acceptInvitation(
            @PathVariable String token,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        AcceptInvitationResponse response = invitationService.acceptInvitation(token, currentUser);
        List<LinkDto> links = List.of(
                new LinkDto("self", "/api/v1/invitations/token/" + token + "/accept", "POST", "application/json"),
                new LinkDto("redirect", response.redirectUrl(), "GET", "text/html")
        );
        return ResponseEntity.ok(ApiResponse.ok(response, response.message(), links, "/api/v1/invitations/token/" + token + "/accept"));
    }

    @PostMapping("/token/{token}/decline")
    @Operation(summary = "Refuser une invitation")
    public ResponseEntity<ApiResponse<Void>> declineInvitation(
            @PathVariable String token,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        invitationService.declineInvitation(token, currentUser);
        List<LinkDto> links = List.of(
                new LinkDto("self", "/api/v1/invitations/token/" + token + "/decline", "POST", "application/json")
        );
        return ResponseEntity.ok(ApiResponse.ok(null, "Invitation refusée avec succès", links, "/api/v1/invitations/token/" + token + "/decline"));
    }

    @GetMapping("/my-pending")
    @Operation(summary = "Lister les invitations en attente pour l'utilisateur connecté")
    public ResponseEntity<ApiResponse<List<InvitationResponse>>> getMyPendingInvitations(
            @AuthenticationPrincipal UserPrincipal currentUser) {
        List<InvitationResponse> responses = invitationService.getMyPendingInvitations(currentUser);
        List<LinkDto> links = List.of(
                new LinkDto("self", "/api/v1/invitations/my-pending", "GET", "application/json")
        );
        return ResponseEntity.ok(ApiResponse.ok(responses, "Invitations en attente récupérées", links, "/api/v1/invitations/my-pending"));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Annuler une invitation")
    public ResponseEntity<ApiResponse<Void>> cancelInvitation(
            @PathVariable String id,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        invitationService.cancelInvitation(id, currentUser);
        List<LinkDto> links = List.of(
                new LinkDto("self", "/api/v1/invitations/" + id, "DELETE", "application/json")
        );
        return ResponseEntity.ok(ApiResponse.ok(null, "Invitation annulée avec succès", links, "/api/v1/invitations/" + id));
    }
}
