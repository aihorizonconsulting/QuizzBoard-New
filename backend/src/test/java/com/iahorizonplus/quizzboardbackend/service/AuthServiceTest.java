package com.iahorizonplus.quizzboardbackend.service;

import com.iahorizonplus.quizzboardbackend.dto.request.LoginRequest;
import com.iahorizonplus.quizzboardbackend.dto.request.SignupRequest;
import com.iahorizonplus.quizzboardbackend.dto.response.AuthResponse;
import com.iahorizonplus.quizzboardbackend.dto.response.UserDto;
import com.iahorizonplus.quizzboardbackend.entity.SubscriptionTier;
import com.iahorizonplus.quizzboardbackend.entity.User;
import com.iahorizonplus.quizzboardbackend.entity.UserRole;
import com.iahorizonplus.quizzboardbackend.exception.BadRequestException;
import com.iahorizonplus.quizzboardbackend.external.SmtpEmailService;
import com.iahorizonplus.quizzboardbackend.mapper.UserMapper;
import com.iahorizonplus.quizzboardbackend.repository.UserRepository;
import com.iahorizonplus.quizzboardbackend.security.JwtUtils;
import com.iahorizonplus.quizzboardbackend.service.impl.AuthServiceImpl;
import com.iahorizonplus.quizzboardbackend.service.impl.GoogleAuthService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtUtils jwtUtils;

    @Mock
    private UserMapper userMapper;

    @Mock
    private GoogleAuthService googleAuthService;

    @Mock
    private SmtpEmailService smtpEmailService;

    @InjectMocks
    private AuthServiceImpl authService;

    private User sampleUser;
    private UserDto sampleUserDto;

    @BeforeEach
    void setUp() {
        sampleUser = User.builder()
                .id("usr-123")
                .prenom("Amadou")
                .nom("Diallo")
                .email("amadou@quizzboard.com")
                .password("encodedPassword")
                .role(UserRole.CREATOR)
                .subscriptionTier(SubscriptionTier.FREE)
                .status("ACTIVE")
                .build();

        sampleUserDto = mock(UserDto.class);
        lenient().when(sampleUserDto.email()).thenReturn("amadou@quizzboard.com");
        lenient().when(sampleUserDto.nom()).thenReturn("Diallo");
    }

    @Test
    @DisplayName("Signup: Inscription réussie avec création de compte et génération de tokens JWT")
    void signup_Success() {
        SignupRequest request = new SignupRequest(
                "Amadou", "Diallo", "amadou@quizzboard.com", "Password123!",
                UserRole.CREATOR
        );

        when(userRepository.existsByEmail("amadou@quizzboard.com")).thenReturn(false);
        when(passwordEncoder.encode("Password123!")).thenReturn("encodedPassword");
        when(userRepository.save(any(User.class))).thenReturn(sampleUser);
        when(userMapper.toDto(any(User.class))).thenReturn(sampleUserDto);
        when(jwtUtils.generateToken(eq("amadou@quizzboard.com"), anyString())).thenReturn("access-token-xyz");
        when(jwtUtils.generateRefreshToken("amadou@quizzboard.com")).thenReturn("refresh-token-xyz");

        AuthResponse response = authService.signup(request);

        assertThat(response).isNotNull();
        assertThat(response.token()).isEqualTo("access-token-xyz");
        assertThat(response.refreshToken()).isEqualTo("refresh-token-xyz");
        assertThat(response.user().email()).isEqualTo("amadou@quizzboard.com");

        verify(userRepository).save(any(User.class));
        verify(smtpEmailService).sendWelcomeEmail(eq("amadou@quizzboard.com"), eq("Amadou Diallo"), eq("CREATOR"));
    }

    @Test
    @DisplayName("Signup: Rejet avec exception si l'adresse email existe déjà")
    void signup_EmailAlreadyExists_ThrowsBadRequestException() {
        SignupRequest request = new SignupRequest(
                "Amadou", "Diallo", "amadou@quizzboard.com", "Password123!",
                UserRole.CREATOR
        );

        when(userRepository.existsByEmail("amadou@quizzboard.com")).thenReturn(true);

        assertThatThrownBy(() -> authService.signup(request))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("existe déjà");

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("Login: Connexion réussie avec mot de passe valide")
    void login_Success() {
        LoginRequest request = new LoginRequest("amadou@quizzboard.com", "Password123!");

        when(userRepository.findByEmail("amadou@quizzboard.com")).thenReturn(Optional.of(sampleUser));
        when(passwordEncoder.matches("Password123!", "encodedPassword")).thenReturn(true);
        when(userMapper.toDto(sampleUser)).thenReturn(sampleUserDto);
        when(jwtUtils.generateToken(eq("amadou@quizzboard.com"), anyString())).thenReturn("jwt-token-valide");
        when(jwtUtils.generateRefreshToken("amadou@quizzboard.com")).thenReturn("jwt-refresh-valide");

        AuthResponse response = authService.login(request);

        assertThat(response).isNotNull();
        assertThat(response.token()).isEqualTo("jwt-token-valide");
        assertThat(response.user().nom()).isEqualTo("Diallo");
    }

    @Test
    @DisplayName("Login: Échec si mauvais mot de passe avec rejet BadRequestException")
    void login_InvalidCredentials_ThrowsBadRequestException() {
        LoginRequest request = new LoginRequest("amadou@quizzboard.com", "WrongPassword");

        when(userRepository.findByEmail("amadou@quizzboard.com")).thenReturn(Optional.of(sampleUser));
        when(passwordEncoder.matches("WrongPassword", "encodedPassword")).thenReturn(false);

        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("mot de passe saisi est incorrect");
    }
}
