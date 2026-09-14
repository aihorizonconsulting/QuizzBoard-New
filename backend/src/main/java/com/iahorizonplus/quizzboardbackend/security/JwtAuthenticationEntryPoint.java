package com.iahorizonplus.quizzboardbackend.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.iahorizonplus.quizzboardbackend.dto.response.ApiResponse;
import com.iahorizonplus.quizzboardbackend.dto.response.FieldErrorDetail;
import com.iahorizonplus.quizzboardbackend.dto.response.LinkDto;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class JwtAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private final ObjectMapper objectMapper;

    @Override
    public void commence(HttpServletRequest request,
                         HttpServletResponse response,
                         AuthenticationException authException) throws IOException {
        log.error("Tentative d'accès non autorisé : {}", authException.getMessage());

        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);

        ApiResponse<Void> errorResponse = ApiResponse.<Void>builder()
                .status(HttpStatus.UNAUTHORIZED.value())
                .success(false)
                .message("Session expirée ou authentification requise. Veuillez vous connecter pour continuer.")
                .errors(List.of(new FieldErrorDetail("auth", null, "Jeton d'accès absent ou invalide.")))
                .links(List.of(
                        LinkDto.of("login", "/api/v1/auth/login", "POST", "Se connecter"),
                        LinkDto.of("signup", "/api/v1/auth/signup", "POST", "Créer un compte")
                ))
                .path(request.getRequestURI())
                .timestamp(LocalDateTime.now())
                .build();

        response.getOutputStream().println(objectMapper.writeValueAsString(errorResponse));
    }
}
