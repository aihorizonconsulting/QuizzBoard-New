package com.iahorizonplus.quizzboardbackend.exception;

import com.iahorizonplus.quizzboardbackend.dto.response.ApiResponse;
import com.iahorizonplus.quizzboardbackend.dto.response.FieldErrorDetail;
import com.iahorizonplus.quizzboardbackend.dto.response.LinkDto;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import lombok.extern.slf4j.Slf4j;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleResourceNotFound(ResourceNotFoundException ex, HttpServletRequest request) {
        List<LinkDto> links = List.of(
                LinkDto.of("self", request.getRequestURI(), request.getMethod()),
                LinkDto.of("api-docs", "/api/v1/swagger-ui/index.html", "GET")
        );

        ApiResponse<Void> response = ApiResponse.<Void>builder()
                .status(HttpStatus.NOT_FOUND.value())
                .success(false)
                .message(ex.getMessage() != null ? ex.getMessage() : "La ressource demandée est introuvable.")
                .links(links)
                .path(request.getRequestURI())
                .timestamp(LocalDateTime.now())
                .build();

        return new ResponseEntity<>(response, HttpStatus.NOT_FOUND);
    }

    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<ApiResponse<Void>> handleBadRequest(BadRequestException ex, HttpServletRequest request) {
        log.warn("400 Bad Request sur {} : champ='{}', message='{}'", request.getRequestURI(), ex.getField(), ex.getMessage());

        List<LinkDto> links = List.of(
                LinkDto.of("self", request.getRequestURI(), request.getMethod())
        );

        List<FieldErrorDetail> errors = ex.getField() != null
                ? List.of(new FieldErrorDetail(ex.getField(), null, ex.getMessage()))
                : List.of();

        ApiResponse<Void> response = ApiResponse.<Void>builder()
                .status(HttpStatus.BAD_REQUEST.value())
                .success(false)
                .message(ex.getMessage())
                .errors(errors.isEmpty() ? null : errors)
                .links(links)
                .path(request.getRequestURI())
                .timestamp(LocalDateTime.now())
                .build();

        return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(UnauthorizedException.class)
    public ResponseEntity<ApiResponse<Void>> handleUnauthorized(UnauthorizedException ex, HttpServletRequest request) {
        List<LinkDto> links = List.of(
                LinkDto.of("login", "/api/v1/auth/login", "POST"),
                LinkDto.of("signup", "/api/v1/auth/signup", "POST")
        );

        ApiResponse<Void> response = ApiResponse.<Void>builder()
                .status(HttpStatus.UNAUTHORIZED.value())
                .success(false)
                .message(ex.getMessage() != null ? ex.getMessage() : "Authentification requise pour accéder à cette ressource.")
                .links(links)
                .path(request.getRequestURI())
                .timestamp(LocalDateTime.now())
                .build();

        return new ResponseEntity<>(response, HttpStatus.UNAUTHORIZED);
    }

    @ExceptionHandler({BadCredentialsException.class, AuthenticationException.class})
    public ResponseEntity<ApiResponse<Void>> handleBadCredentials(AuthenticationException ex, HttpServletRequest request) {
        List<FieldErrorDetail> errors = List.of(
                new FieldErrorDetail(
                        "email",
                        null,
                        "Adresse email ou mot de passe incorrect."
                ),
                new FieldErrorDetail(
                        "password",
                        null,
                        "Veuillez vérifier votre mot de passe."
                )
        );

        List<LinkDto> links = List.of(
                LinkDto.of("signup", "/api/v1/auth/signup", "POST", "Créer un nouveau compte Formateur ou Apprenant"),
                LinkDto.of("forgot-password", "/api/v1/auth/forgot-password", "POST", "Réinitialiser votre mot de passe oublié")
        );

        ApiResponse<Void> response = ApiResponse.<Void>builder()
                .status(HttpStatus.UNAUTHORIZED.value())
                .success(false)
                .message("Identifiants incorrects : l'adresse email ou le mot de passe renseigné est invalide.")
                .errors(errors)
                .links(links)
                .path(request.getRequestURI())
                .timestamp(LocalDateTime.now())
                .build();

        return new ResponseEntity<>(response, HttpStatus.UNAUTHORIZED);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiResponse<Void>> handleAccessDenied(AccessDeniedException ex, HttpServletRequest request) {
        List<LinkDto> links = List.of(
                LinkDto.of("self", request.getRequestURI(), request.getMethod())
        );

        ApiResponse<Void> response = ApiResponse.<Void>builder()
                .status(HttpStatus.FORBIDDEN.value())
                .success(false)
                .message("Accès refusé : vous ne possédez pas les autorisations nécessaires pour exécuter cette opération.")
                .links(links)
                .path(request.getRequestURI())
                .timestamp(LocalDateTime.now())
                .build();

        return new ResponseEntity<>(response, HttpStatus.FORBIDDEN);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidationErrors(MethodArgumentNotValidException ex, HttpServletRequest request) {
        List<FieldErrorDetail> fieldErrors = new ArrayList<>();
        for (FieldError fe : ex.getBindingResult().getFieldErrors()) {
            fieldErrors.add(new FieldErrorDetail(
                    fe.getField(),
                    fe.getRejectedValue(),
                    fe.getDefaultMessage()
            ));
        }

        String faultyFields = fieldErrors.stream()
                .map(f -> f.field() + " (" + f.message() + ")")
                .collect(Collectors.joining(", "));

        log.warn("400 Validation Error sur {} : {}", request.getRequestURI(), faultyFields);

        List<LinkDto> links = List.of(
                LinkDto.of("self", request.getRequestURI(), request.getMethod())
        );

        ApiResponse<Void> response = ApiResponse.<Void>builder()
                .status(HttpStatus.BAD_REQUEST.value())
                .success(false)
                .message("Erreur de validation sur " + fieldErrors.size() + " champ(s) : " + faultyFields)
                .errors(fieldErrors)
                .links(links)
                .path(request.getRequestURI())
                .timestamp(LocalDateTime.now())
                .build();

        return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(org.springframework.http.converter.HttpMessageNotReadableException.class)
    public ResponseEntity<ApiResponse<Void>> handleHttpMessageNotReadable(org.springframework.http.converter.HttpMessageNotReadableException ex, HttpServletRequest request) {
        log.warn("400 Payload illisible ou format JSON invalide sur {} : {}", request.getRequestURI(), ex.getMessage());

        List<LinkDto> links = List.of(
                LinkDto.of("self", request.getRequestURI(), request.getMethod())
        );

        ApiResponse<Void> response = ApiResponse.<Void>builder()
                .status(HttpStatus.BAD_REQUEST.value())
                .success(false)
                .message("Format de données JSON invalide ou illisible : " + (ex.getMostSpecificCause() != null ? ex.getMostSpecificCause().getMessage() : ex.getMessage()))
                .links(links)
                .path(request.getRequestURI())
                .timestamp(LocalDateTime.now())
                .build();

        return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ApiResponse<Void>> handleIllegalState(IllegalStateException ex, HttpServletRequest request) {
        log.warn("400 Rejet métier / Quota sur {} : {}", request.getRequestURI(), ex.getMessage());

        List<LinkDto> links = List.of(
                LinkDto.of("self", request.getRequestURI(), request.getMethod()),
                LinkDto.of("pricing", "/api/v1/subscriptions/settings", "GET", "Consulter les forfaits et quotas")
        );

        ApiResponse<Void> response = ApiResponse.<Void>builder()
                .status(HttpStatus.BAD_REQUEST.value())
                .success(false)
                .message(ex.getMessage() != null ? ex.getMessage() : "Opération non autorisée dans l'état actuel.")
                .links(links)
                .path(request.getRequestURI())
                .timestamp(LocalDateTime.now())
                .build();

        return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiResponse<Void>> handleIllegalArgument(IllegalArgumentException ex, HttpServletRequest request) {
        log.warn("400 Paramètre invalide sur {} : {}", request.getRequestURI(), ex.getMessage());

        List<LinkDto> links = List.of(
                LinkDto.of("self", request.getRequestURI(), request.getMethod())
        );

        ApiResponse<Void> response = ApiResponse.<Void>builder()
                .status(HttpStatus.BAD_REQUEST.value())
                .success(false)
                .message(ex.getMessage() != null ? ex.getMessage() : "Paramètre ou requête invalide.")
                .links(links)
                .path(request.getRequestURI())
                .timestamp(LocalDateTime.now())
                .build();

        return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(SecurityException.class)
    public ResponseEntity<ApiResponse<Void>> handleSecurityException(SecurityException ex, HttpServletRequest request) {
        log.warn("403 Violation de sécurité sur {} : {}", request.getRequestURI(), ex.getMessage());

        List<LinkDto> links = List.of(
                LinkDto.of("self", request.getRequestURI(), request.getMethod())
        );

        ApiResponse<Void> response = ApiResponse.<Void>builder()
                .status(HttpStatus.FORBIDDEN.value())
                .success(false)
                .message(ex.getMessage() != null ? ex.getMessage() : "Action non autorisée : permissions insuffisantes.")
                .links(links)
                .path(request.getRequestURI())
                .timestamp(LocalDateTime.now())
                .build();

        return new ResponseEntity<>(response, HttpStatus.FORBIDDEN);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleGlobalException(Exception ex, HttpServletRequest request) {
        log.error("500 Erreur serveur sur {} : {}", request.getRequestURI(), ex.getMessage(), ex);

        List<LinkDto> links = List.of(
                LinkDto.of("api-docs", "/api/v1/swagger-ui/index.html", "GET")
        );

        ApiResponse<Void> response = ApiResponse.<Void>builder()
                .status(HttpStatus.INTERNAL_SERVER_ERROR.value())
                .success(false)
                .message(ex.getMessage() != null ? ex.getMessage() : "Une erreur inattendue est survenue sur le serveur.")
                .links(links)
                .path(request.getRequestURI())
                .timestamp(LocalDateTime.now())
                .build();

        return new ResponseEntity<>(response, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
