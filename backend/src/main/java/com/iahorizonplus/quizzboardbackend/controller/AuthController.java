package com.iahorizonplus.quizzboardbackend.controller;

import com.iahorizonplus.quizzboardbackend.dto.request.*;
import com.iahorizonplus.quizzboardbackend.dto.response.*;
import com.iahorizonplus.quizzboardbackend.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
@Tag(name = "Authentification", description = "Endpoints d'inscription, connexion locale, Google OAuth2 et gestion du mot de passe oublié via SMTP.")
public class AuthController {

    private final AuthService authService;

    @PostMapping("/signup")
    @Operation(summary = "Inscription d'un nouvel utilisateur (Formateur ou Apprenant)")
    public ResponseEntity<ApiResponse<AuthResponse>> signup(@Valid @RequestBody SignupRequest request, HttpServletRequest httpRequest) {
        AuthResponse response = authService.signup(request);
        List<LinkDto> links = List.of(
                LinkDto.of("self", httpRequest.getRequestURI(), "POST"),
                LinkDto.of("me", "/api/v1/auth/me", "GET", "Consulter votre profil utilisateur"),
                LinkDto.of("login", "/api/v1/auth/login", "POST", "Se connecter avec vos identifiants"),
                LinkDto.of("refresh", "/api/v1/auth/refresh", "POST", "Rafraîchir votre jeton d'accès")
        );
        return new ResponseEntity<>(
                ApiResponse.created(response, "Compte utilisateur créé avec succès et jeton d'accès émis.", links, httpRequest.getRequestURI()),
                HttpStatus.CREATED
        );
    }

    @PostMapping("/login")
    @Operation(summary = "Connexion avec email et mot de passe")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request, HttpServletRequest httpRequest) {
        AuthResponse response = authService.login(request);
        List<LinkDto> links = List.of(
                LinkDto.of("self", httpRequest.getRequestURI(), "POST"),
                LinkDto.of("me", "/api/v1/auth/me", "GET", "Consulter votre profil"),
                LinkDto.of("refresh", "/api/v1/auth/refresh", "POST", "Rafraîchir le jeton"),
                LinkDto.of("quizzes", "/api/v1/quizzes", "GET", "Accéder au catalogue de quiz")
        );
        return ResponseEntity.ok(
                ApiResponse.ok(response, "Authentification réussie. Bienvenue sur QuizzBoard !", links, httpRequest.getRequestURI())
        );
    }

    @PostMapping("/google")
    @Operation(summary = "Authentification via Google Sign-In (ID Token)")
    public ResponseEntity<ApiResponse<AuthResponse>> googleAuth(@Valid @RequestBody GoogleAuthRequest request, HttpServletRequest httpRequest) {
        AuthResponse response = authService.loginWithGoogle(request);
        List<LinkDto> links = List.of(
                LinkDto.of("self", httpRequest.getRequestURI(), "POST"),
                LinkDto.of("me", "/api/v1/auth/me", "GET", "Consulter votre profil")
        );
        return ResponseEntity.ok(
                ApiResponse.ok(response, "Connexion Google validée avec succès.", links, httpRequest.getRequestURI())
        );
    }

    @PostMapping("/forgot-password")
    @Operation(summary = "Demande de réinitialisation de mot de passe (Envoi d'email SMTP)")
    public ResponseEntity<ApiResponse<MessageResponse>> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request, HttpServletRequest httpRequest) {
        MessageResponse response = authService.forgotPassword(request);
        List<LinkDto> links = List.of(
                LinkDto.of("self", httpRequest.getRequestURI(), "POST"),
                LinkDto.of("login", "/api/v1/auth/login", "POST", "Retourner à la page de connexion")
        );
        return ResponseEntity.ok(
                ApiResponse.ok(response, response.message(), links, httpRequest.getRequestURI())
        );
    }

    @PostMapping("/reset-password")
    @Operation(summary = "Réinitialisation du mot de passe avec le jeton reçu par email")
    public ResponseEntity<ApiResponse<MessageResponse>> resetPassword(@Valid @RequestBody ResetPasswordRequest request, HttpServletRequest httpRequest) {
        MessageResponse response = authService.resetPassword(request);
        List<LinkDto> links = List.of(
                LinkDto.of("self", httpRequest.getRequestURI(), "POST"),
                LinkDto.of("login", "/api/v1/auth/login", "POST", "Se connecter avec le nouveau mot de passe")
        );
        return ResponseEntity.ok(
                ApiResponse.ok(response, response.message(), links, httpRequest.getRequestURI())
        );
    }

    @GetMapping("/me")
    @Operation(summary = "Récupère le profil complet de l'utilisateur actuellement connecté",
               security = @SecurityRequirement(name = "BearerAuth"))
    public ResponseEntity<ApiResponse<UserDto>> getCurrentUser(@AuthenticationPrincipal UserDetails userDetails, HttpServletRequest httpRequest) {
        if (userDetails == null) {
            throw new com.iahorizonplus.quizzboardbackend.exception.UnauthorizedException(
                    "Authentification requise : jeton manquant ou expiré."
            );
        }
        UserDto userDto = authService.getCurrentUser(userDetails.getUsername());
        List<LinkDto> links = List.of(
                LinkDto.of("self", httpRequest.getRequestURI(), "GET"),
                LinkDto.of("quizzes", "/api/v1/quizzes", "GET", "Mes quiz"),
                LinkDto.of("promotions", "/api/v1/promotions", "GET", "Mes promotions"),
                LinkDto.of("classes", "/api/v1/classes", "GET", "Mes classes")
        );
        return ResponseEntity.ok(
                ApiResponse.ok(userDto, "Profil utilisateur récupéré avec succès.", links, httpRequest.getRequestURI())
        );
    }

    @PostMapping("/refresh")
    @Operation(summary = "Rafraîchissement du jeton d'accès via le Refresh Token")
    public ResponseEntity<ApiResponse<AuthResponse>> refreshToken(@RequestParam String refreshToken, HttpServletRequest httpRequest) {
        AuthResponse response = authService.refreshToken(refreshToken);
        List<LinkDto> links = List.of(
                LinkDto.of("self", httpRequest.getRequestURI(), "POST"),
                LinkDto.of("me", "/api/v1/auth/me", "GET")
        );
        return ResponseEntity.ok(
                ApiResponse.ok(response, "Nouveau jeton d'accès généré avec succès.", links, httpRequest.getRequestURI())
        );
    }
}
