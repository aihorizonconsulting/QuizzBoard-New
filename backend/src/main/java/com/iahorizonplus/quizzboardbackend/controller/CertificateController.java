package com.iahorizonplus.quizzboardbackend.controller;

import com.iahorizonplus.quizzboardbackend.dto.response.ApiResponse;
import com.iahorizonplus.quizzboardbackend.dto.response.LinkDto;
import com.iahorizonplus.quizzboardbackend.entity.Certificate;
import com.iahorizonplus.quizzboardbackend.service.CertificateService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/certificates")
@RequiredArgsConstructor
@Tag(name = "Certificats", description = "Génération et vérification publique de certificats de réussite (Richardson Niveau 3 HATEOAS)")
public class CertificateController {

    private final CertificateService certificateService;

    @GetMapping("/verify/{verificationCode}")
    @Operation(summary = "Vérifier publiquement l'authenticité d'un certificat par son code unique (ex: QZ-8821-95)")
    public ResponseEntity<ApiResponse<Certificate>> verifyCertificate(@PathVariable String verificationCode, HttpServletRequest request) {
        Certificate cert = certificateService.verifyCertificate(verificationCode);
        List<LinkDto> links = List.of(
                LinkDto.of("self", request.getRequestURI(), "GET"),
                LinkDto.of("download", "/api/v1/certificates/" + cert.getId(), "GET")
        );
        return ResponseEntity.ok(
                ApiResponse.ok(cert, "Certificat vérifié et certifié authentique.", links, request.getRequestURI())
        );
    }

    @GetMapping("/{id}")
    @Operation(summary = "Obtenir un certificat par son ID")
    public ResponseEntity<ApiResponse<Certificate>> getCertificateById(@PathVariable String id, HttpServletRequest request) {
        Certificate cert = certificateService.getCertificateById(id);
        List<LinkDto> links = List.of(
                LinkDto.of("self", request.getRequestURI(), "GET"),
                LinkDto.of("verify", "/api/v1/certificates/verify/" + cert.getVerificationCode(), "GET")
        );
        return ResponseEntity.ok(
                ApiResponse.ok(cert, "Détails du certificat récupérés avec succès.", links, request.getRequestURI())
        );
    }

    @PostMapping("/generate/{participationId}")
    @Operation(summary = "Générer ou récupérer le certificat d'une participation éligible")
    public ResponseEntity<ApiResponse<Certificate>> generateCertificate(@PathVariable String participationId, HttpServletRequest request) {
        Certificate cert = certificateService.generateCertificate(participationId);
        List<LinkDto> links = List.of(
                LinkDto.of("self", "/api/v1/certificates/" + cert.getId(), "GET"),
                LinkDto.of("verify", "/api/v1/certificates/verify/" + cert.getVerificationCode(), "GET")
        );
        return ResponseEntity.ok(
                ApiResponse.ok(cert, "Certificat généré avec succès.", links, request.getRequestURI())
        );
    }
}
