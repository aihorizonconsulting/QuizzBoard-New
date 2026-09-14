package com.iahorizonplus.quizzboardbackend.service.impl;

import com.iahorizonplus.quizzboardbackend.dto.request.*;
import com.iahorizonplus.quizzboardbackend.dto.response.AuthResponse;
import com.iahorizonplus.quizzboardbackend.dto.response.MessageResponse;
import com.iahorizonplus.quizzboardbackend.dto.response.UserDto;
import com.iahorizonplus.quizzboardbackend.entity.AuthProvider;
import com.iahorizonplus.quizzboardbackend.entity.SubscriptionTier;
import com.iahorizonplus.quizzboardbackend.entity.User;
import com.iahorizonplus.quizzboardbackend.entity.UserRole;
import com.iahorizonplus.quizzboardbackend.exception.BadRequestException;
import com.iahorizonplus.quizzboardbackend.exception.ResourceNotFoundException;
import com.iahorizonplus.quizzboardbackend.exception.UnauthorizedException;
import com.iahorizonplus.quizzboardbackend.external.SmtpEmailService;
import com.iahorizonplus.quizzboardbackend.mapper.UserMapper;
import com.iahorizonplus.quizzboardbackend.repository.UserRepository;
import com.iahorizonplus.quizzboardbackend.security.JwtUtils;
import com.iahorizonplus.quizzboardbackend.service.AuthService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtUtils jwtUtils;
    private final UserMapper userMapper;
    private final GoogleAuthService googleAuthService;
    private final SmtpEmailService smtpEmailService;

    @Override
    @Transactional
    public AuthResponse signup(SignupRequest request) {
        String cleanEmail = request.email().toLowerCase().trim();

        if (userRepository.existsByEmail(cleanEmail)) {
            throw new BadRequestException("email", "Un compte avec cette adresse email existe déjà. Veuillez vous connecter ou réinitialiser votre mot de passe.");
        }

        User user = User.builder()
                .prenom(request.prenom().trim())
                .nom(request.nom().trim())
                .email(cleanEmail)
                .password(passwordEncoder.encode(request.password()))
                .role(request.role())
                .subscriptionTier(SubscriptionTier.FREE)
                .authProvider(AuthProvider.LOCAL)
                .avatarUrl(null)
                .organization("Organisation Démo")
                .status("ACTIVE")
                .emailVerified(false)
                .emailVerificationToken(UUID.randomUUID().toString())
                .xpPoints(0)
                .level(1)
                .streakDays(1)
                .followersCount(0)
                .followingCount(0)
                .build();

        User savedUser = userRepository.save(user);

        // Envoi asynchrone de l'email de bienvenue
        smtpEmailService.sendWelcomeEmail(savedUser.getEmail(), savedUser.getPrenom() + " " + savedUser.getNom(), savedUser.getRole().name());

        String jwtToken = jwtUtils.generateToken(savedUser.getEmail(), savedUser.getRole().name());
        String refreshToken = jwtUtils.generateRefreshToken(savedUser.getEmail());

        return new AuthResponse(jwtToken, refreshToken, userMapper.toDto(savedUser));
    }

    @Override
    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        String cleanEmail = request.email() != null ? request.email().toLowerCase().trim() : "";

        if (cleanEmail.isEmpty()) {
            throw new BadRequestException("email", "L'adresse email est obligatoire.");
        }

        if (request.password() == null || request.password().isEmpty()) {
            throw new BadRequestException("password", "Le mot de passe est obligatoire.");
        }

        // 1. Vérification explicite de l'existence du compte en base de données
        User user = userRepository.findByEmail(cleanEmail)
                .orElseThrow(() -> new BadRequestException("email", "Aucun compte n'est enregistré avec l'adresse email '" + cleanEmail + "'. Veuillez vérifier votre saisie ou créer un compte."));

        // 2. Vérification du statut du compte
        if ("SUSPENDED".equalsIgnoreCase(user.getStatus())) {
            throw new UnauthorizedException("Ce compte utilisateur a été suspendu par un administrateur. Veuillez contacter le support QuizzBoard.");
        }

        // 3. Vérification explicite du mot de passe
        if (!passwordEncoder.matches(request.password(), user.getPassword())) {
            throw new BadRequestException("password", "Le mot de passe saisi est incorrect pour ce compte. Veuillez vérifier votre saisie ou réinitialiser votre mot de passe.");
        }

        String jwtToken = jwtUtils.generateToken(user.getEmail(), user.getRole().name());
        String refreshToken = jwtUtils.generateRefreshToken(user.getEmail());

        return new AuthResponse(jwtToken, refreshToken, userMapper.toDto(user));
    }

    @Override
    public AuthResponse loginWithGoogle(GoogleAuthRequest request) {
        return googleAuthService.authenticateWithGoogle(request);
    }

    @Override
    @Transactional
    public MessageResponse forgotPassword(ForgotPasswordRequest request) {
        String cleanEmail = request.email().toLowerCase().trim();

        userRepository.findByEmail(cleanEmail).ifPresent(user -> {
            String token = UUID.randomUUID().toString().replace("-", "");
            user.setPasswordResetToken(token);
            user.setPasswordResetTokenExpiry(LocalDateTime.now().plusMinutes(15));
            userRepository.save(user);

            smtpEmailService.sendPasswordResetEmail(user.getEmail(), user.getPrenom() + " " + user.getNom(), token);
        });

        // Réponse générique pour contrer l'énumération d'adresses email
        return new MessageResponse("Si cette adresse email est enregistrée, un lien de réinitialisation vous a été envoyé par email.");
    }

    @Override
    @Transactional
    public MessageResponse resetPassword(ResetPasswordRequest request) {
        User user = userRepository.findByPasswordResetToken(request.token())
                .orElseThrow(() -> new BadRequestException("Jeton de réinitialisation invalide ou inexistant."));

        if (user.getPasswordResetTokenExpiry() == null || user.getPasswordResetTokenExpiry().isBefore(LocalDateTime.now())) {
            throw new BadRequestException("Ce lien de réinitialisation a expiré (durée de validité : 15 minutes). Veuillez refaire une demande.");
        }

        user.setPassword(passwordEncoder.encode(request.newPassword()));
        user.setPasswordResetToken(null);
        user.setPasswordResetTokenExpiry(null);
        userRepository.save(user);

        smtpEmailService.sendPasswordChangedEmail(user.getEmail(), user.getPrenom() + " " + user.getNom());

        return new MessageResponse("Votre mot de passe a été mis à jour avec succès. Vous pouvez désormais vous connecter.");
    }

    @Override
    @Transactional(readOnly = true)
    public UserDto getCurrentUser(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur introuvable."));
        return userMapper.toDto(user);
    }

    @Override
    public AuthResponse refreshToken(String refreshToken) {
        if (!jwtUtils.validateToken(refreshToken)) {
            throw new UnauthorizedException("Jeton de rafraîchissement invalide ou expiré.");
        }

        String email = jwtUtils.getEmailFromToken(refreshToken);
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur introuvable."));

        String newAccessToken = jwtUtils.generateToken(user.getEmail(), user.getRole().name());
        return new AuthResponse(newAccessToken, refreshToken, userMapper.toDto(user));
    }
}
