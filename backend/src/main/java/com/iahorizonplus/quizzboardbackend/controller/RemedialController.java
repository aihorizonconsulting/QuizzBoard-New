package com.iahorizonplus.quizzboardbackend.controller;

import com.iahorizonplus.quizzboardbackend.dto.response.ApiResponse;
import com.iahorizonplus.quizzboardbackend.dto.response.LinkDto;
import com.iahorizonplus.quizzboardbackend.dto.response.RemedialPackResponse;
import com.iahorizonplus.quizzboardbackend.exception.UnauthorizedException;
import com.iahorizonplus.quizzboardbackend.security.UserPrincipal;
import com.iahorizonplus.quizzboardbackend.service.impl.RemedialService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/remedial")
@RequiredArgsConstructor
@Tag(name = "Perfectionnement", description = "Parcours de remise à niveau générés après un quiz réussi à moins de 70 % (contenu réservé à Apprenant Plus)")
public class RemedialController {

    private final RemedialService remedialService;

    @GetMapping("/my")
    @Operation(summary = "Lister mes parcours de perfectionnement")
    public ResponseEntity<ApiResponse<List<RemedialPackResponse>>> myPacks(@AuthenticationPrincipal UserPrincipal currentUser, HttpServletRequest request) {
        List<RemedialPackResponse> packs = remedialService.myPacks(requireUser(currentUser));
        return ResponseEntity.ok(ApiResponse.ok(packs, "Parcours de perfectionnement récupérés.", links(request), request.getRequestURI()));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Consulter un parcours (mini-cours et quiz d'entraînement) — Apprenant Plus")
    public ResponseEntity<ApiResponse<RemedialPackResponse>> getPack(@PathVariable String id, @AuthenticationPrincipal UserPrincipal currentUser, HttpServletRequest request) {
        RemedialPackResponse pack = remedialService.getPack(requireUser(currentUser), id);
        return ResponseEntity.ok(ApiResponse.ok(pack, "Parcours de perfectionnement récupéré.", links(request), request.getRequestURI()));
    }

    @PostMapping("/{id}/generate")
    @Operation(summary = "Relancer la préparation d'un parcours — Apprenant Plus")
    public ResponseEntity<ApiResponse<RemedialPackResponse>> regenerate(@PathVariable String id, @AuthenticationPrincipal UserPrincipal currentUser, HttpServletRequest request) {
        RemedialPackResponse pack = remedialService.regenerate(requireUser(currentUser), id);
        return ResponseEntity.ok(ApiResponse.ok(pack, "Préparation du parcours relancée.", links(request), request.getRequestURI()));
    }

    @PostMapping("/{id}/practice")
    @Operation(summary = "Enregistrer le score d'un quiz d'entraînement — Apprenant Plus")
    public ResponseEntity<ApiResponse<RemedialPackResponse>> recordPractice(@PathVariable String id, @RequestBody Map<String, Object> body,
                                                                            @AuthenticationPrincipal UserPrincipal currentUser, HttpServletRequest request) {
        Object raw = body != null ? body.get("percentage") : null;
        double percentage = raw instanceof Number n ? n.doubleValue() : 0;
        RemedialPackResponse pack = remedialService.recordPractice(requireUser(currentUser), id, percentage);
        return ResponseEntity.ok(ApiResponse.ok(pack, "Score d'entraînement enregistré.", links(request), request.getRequestURI()));
    }

    private static String requireUser(UserPrincipal currentUser) {
        if (currentUser == null) {
            throw new UnauthorizedException("Connectez-vous pour accéder à votre perfectionnement.");
        }
        return currentUser.getId();
    }

    private static List<LinkDto> links(HttpServletRequest request) {
        return List.of(LinkDto.of("self", request.getRequestURI(), request.getMethod()),
                LinkDto.of("collection", "/api/v1/remedial/my", "GET"));
    }
}
