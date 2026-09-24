package com.iahorizonplus.quizzboardbackend.service.impl;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.iahorizonplus.quizzboardbackend.dto.request.GoogleAuthRequest;
import com.iahorizonplus.quizzboardbackend.dto.response.AuthResponse;
import com.iahorizonplus.quizzboardbackend.entity.AuthProvider;
import com.iahorizonplus.quizzboardbackend.entity.SubscriptionTier;
import com.iahorizonplus.quizzboardbackend.entity.User;
import com.iahorizonplus.quizzboardbackend.entity.UserRole;
import com.iahorizonplus.quizzboardbackend.exception.BadRequestException;
import com.iahorizonplus.quizzboardbackend.mapper.UserMapper;
import com.iahorizonplus.quizzboardbackend.repository.UserRepository;
import com.iahorizonplus.quizzboardbackend.security.JwtUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class GoogleAuthService {

    private final UserRepository userRepository;
    private final JwtUtils jwtUtils;
    private final UserMapper userMapper;

    @Value("${app.google.client-id:google-client-id-placeholder}")
    private String googleClientId;

    private static final String FRONTEND_GOOGLE_CLIENT_ID = "385748483146-1r3b7ab8tmhetu1t4pshvelc35lalabg.apps.googleusercontent.com";

    @Transactional
    public AuthResponse authenticateWithGoogle(GoogleAuthRequest request) {
        GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(
                new NetHttpTransport(),
                GsonFactory.getDefaultInstance()
        )
        .setAudience(allowedClientIds())
        .build();

        GoogleIdToken idToken;
        try {
            idToken = verifier.verify(request.idToken());
        } catch (Exception e) {
            log.error("Erreur lors de la vérification du token Google : {}", e.getMessage());
            throw new BadRequestException("Jeton d'authentification Google invalide ou corrompu.");
        }

        if (idToken == null) {
            throw new BadRequestException("Jeton Google invalide ou expiré.");
        }

        GoogleIdToken.Payload payload = idToken.getPayload();
        String email = payload.getEmail();
        String googleSub = payload.getSubject();
        String prenom = (String) payload.get("given_name");
        String nom = (String) payload.get("family_name");
        String pictureUrl = (String) payload.get("picture");

        Optional<User> existingUserOpt = userRepository.findByEmail(email);

        // 1. Utilisateur existant : connexion directe (rôle déjà établi)
        if (existingUserOpt.isPresent()) {
            User existingUser = existingUserOpt.get();

            // Compte importé de l'ancien QuizzBoard : le rôle doit être choisi avant d'obtenir un jeton
            if (existingUser.needsRoleSelection()) {
                if (request.role() == null) {
                    return AuthResponse.roleRequired(userMapper.toDto(existingUser));
                }
                existingUser.setRole(SelfAssignedRole.require(request.role()));
                existingUser.setRoleSelected(true);
            }

            existingUser.setGoogleSub(googleSub);
            if (existingUser.getAvatarUrl() == null || existingUser.getAvatarUrl().isEmpty()) {
                existingUser.setAvatarUrl(pictureUrl);
            }
            User savedUser = userRepository.save(existingUser);
            String jwtToken = jwtUtils.generateToken(savedUser.getEmail(), savedUser.getRole().name());
            String refreshToken = jwtUtils.generateRefreshToken(savedUser.getEmail());
            return new AuthResponse(jwtToken, refreshToken, userMapper.toDto(savedUser));
        }

        // 2. Nouvel utilisateur mais aucun rôle spécifié : demander la sélection du rôle au frontend
        if (request.role() == null) {
            User transientUser = User.builder()
                    .prenom(prenom != null && !prenom.isBlank() ? prenom : "Utilisateur")
                    .nom(nom != null && !nom.isBlank() ? nom : "Google")
                    .email(email)
                    .role(null)
                    .subscriptionTier(SubscriptionTier.FREE)
                    .authProvider(AuthProvider.GOOGLE)
                    .avatarUrl(pictureUrl != null ? pictureUrl : "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80")
                    .emailVerified(true)
                    .status("ACTIVE")
                    .build();
            return AuthResponse.roleRequired(userMapper.toDto(transientUser));
        }

        // 3. Nouvel utilisateur avec rôle sélectionné (CREATOR ou LEARNER)
        User newUser = User.builder()
                .prenom(prenom != null && !prenom.isBlank() ? prenom : "Utilisateur")
                .nom(nom != null && !nom.isBlank() ? nom : "Google")
                .email(email)
                .role(SelfAssignedRole.require(request.role()))
                .subscriptionTier(SubscriptionTier.FREE)
                .authProvider(AuthProvider.GOOGLE)
                .googleSub(googleSub)
                .avatarUrl(pictureUrl != null ? pictureUrl : "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80")
                .emailVerified(true)
                .status("ACTIVE")
                .xpPoints(0)
                .level(1)
                .streakDays(1)
                .followersCount(0)
                .followingCount(0)
                .build();
        User saved = userRepository.save(newUser);

        String jwtToken = jwtUtils.generateToken(saved.getEmail(), saved.getRole().name());
        String refreshToken = jwtUtils.generateRefreshToken(saved.getEmail());

        return new AuthResponse(jwtToken, refreshToken, userMapper.toDto(saved));
    }

    private List<String> allowedClientIds() {
        List<String> clientIds = new ArrayList<>();
        if (googleClientId != null && !googleClientId.isBlank() && !googleClientId.contains("placeholder")) {
            String[] configuredIds = googleClientId.split(",");
            for (String configuredId : configuredIds) {
                String cleanId = configuredId.trim();
                if (!cleanId.isBlank()) {
                    clientIds.add(cleanId);
                }
            }
        }
        if (!clientIds.contains(FRONTEND_GOOGLE_CLIENT_ID)) {
            clientIds.add(FRONTEND_GOOGLE_CLIENT_ID);
        }
        return Collections.unmodifiableList(clientIds);
    }
}
