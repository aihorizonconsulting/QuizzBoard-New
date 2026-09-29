package com.iahorizonplus.quizzboardbackend.config;

import com.iahorizonplus.quizzboardbackend.entity.User;
import com.iahorizonplus.quizzboardbackend.entity.UserRole;
import com.iahorizonplus.quizzboardbackend.repository.ParticipationRepository;
import com.iahorizonplus.quizzboardbackend.repository.PlatformSettingsRepository;
import com.iahorizonplus.quizzboardbackend.repository.QuizRepository;
import com.iahorizonplus.quizzboardbackend.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DataInitializerTest {

    @Mock private UserRepository userRepository;
    @Mock private PlatformSettingsRepository settingsRepository;
    @Mock private QuizRepository quizRepository;
    @Mock private ParticipationRepository participationRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @InjectMocks private DataInitializer initializer;

    @Test
    @DisplayName("Administrateur renommé : le compte par défaut (mot de passe public) n'est pas recréé au démarrage")
    void run_KeepsRenamedAdmin() {
        User renamed = User.builder().id("a1").email("contact@aihorizonplusconsulting.com").role(UserRole.ADMIN).build();
        when(settingsRepository.count()).thenReturn(1L);
        when(userRepository.findFirstByRole(UserRole.ADMIN)).thenReturn(Optional.of(renamed));
        when(quizRepository.count()).thenReturn(10L);

        initializer.run();

        verify(userRepository, never()).save(any(User.class));
        verify(passwordEncoder, never()).encode(any());
    }

    @Test
    @DisplayName("Installation neuve sans administrateur : le compte admin par défaut est créé")
    void run_CreatesDefaultAdminOnFreshInstall() {
        when(settingsRepository.count()).thenReturn(1L);
        when(userRepository.findFirstByRole(UserRole.ADMIN)).thenReturn(Optional.empty());
        when(passwordEncoder.encode(any())).thenReturn("hash");
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));
        when(quizRepository.count()).thenReturn(10L);

        initializer.run();

        ArgumentCaptor<User> saved = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(saved.capture());
        assertThat(saved.getValue().getRole()).isEqualTo(UserRole.ADMIN);
        assertThat(saved.getValue().getEmail()).isEqualTo("admin@quizzboard.com");
    }
}
