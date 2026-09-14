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

import java.util.Collections;

@Service
@RequiredArgsConstructor
@Slf4j
public class GoogleAuthService {

    private final UserRepository userRepository;
    private final JwtUtils jwtUtils;
    private final UserMapper userMapper;

    @Value("${app.google.client-id:google-client-id-placeholder}")
    private String googleClientId;

    @Transactional
    public AuthResponse authenticateWithGoogle(GoogleAuthRequest request) {
        GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(
                new NetHttpTransport(),
                GsonFactory.getDefaultInstance()
        )
        .setAudience(Collections.singletonList(googleClientId))
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

        User user = userRepository.findByEmail(email).map(existingUser -> {
            existingUser.setGoogleSub(googleSub);
            if (existingUser.getAvatarUrl() == null || existingUser.getAvatarUrl().isEmpty()) {
                existingUser.setAvatarUrl(pictureUrl);
            }
            return userRepository.save(existingUser);
        }).orElseGet(() -> {
            UserRole assignedRole = request.role() != null ? request.role() : UserRole.CREATOR;
            User newUser = User.builder()
                    .prenom(prenom != null && !prenom.isBlank() ? prenom : "Utilisateur")
                    .nom(nom != null && !nom.isBlank() ? nom : "Google")
                    .email(email)
                    .role(assignedRole)
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
            return userRepository.save(newUser);
        });

        String jwtToken = jwtUtils.generateToken(user.getEmail(), user.getRole().name());
        String refreshToken = jwtUtils.generateRefreshToken(user.getEmail());

        return new AuthResponse(jwtToken, refreshToken, userMapper.toDto(user));
    }
}
