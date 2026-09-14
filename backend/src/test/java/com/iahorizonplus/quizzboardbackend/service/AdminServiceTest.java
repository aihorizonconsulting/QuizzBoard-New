package com.iahorizonplus.quizzboardbackend.service;

import com.iahorizonplus.quizzboardbackend.entity.*;
import com.iahorizonplus.quizzboardbackend.exception.BadRequestException;
import com.iahorizonplus.quizzboardbackend.exception.ResourceNotFoundException;
import com.iahorizonplus.quizzboardbackend.repository.*;
import com.iahorizonplus.quizzboardbackend.service.impl.AdminServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private QuizRepository quizRepository;

    @Mock
    private CourseRepository courseRepository;

    @Mock
    private ParticipationRepository participationRepository;

    @Mock
    private TransactionRepository transactionRepository;

    @Mock
    private AuditLogRepository auditLogRepository;

    @Mock
    private QuestionRepository questionRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private AdminServiceImpl adminService;

    private User sampleUser;

    @BeforeEach
    void setUp() {
        sampleUser = User.builder()
                .id("user-123")
                .prenom("Mamadou")
                .nom("Sow")
                .email("mamadou.sow@quizzboard.com")
                .role(UserRole.CREATOR)
                .subscriptionTier(SubscriptionTier.FREE)
                .status("ACTIVE")
                .build();
    }

    @Test
    @DisplayName("Dashboard stats réelles calculées correctement")
    void testGetDashboardStats() {
        when(userRepository.count()).thenReturn(15L);
        when(quizRepository.count()).thenReturn(8L);
        when(courseRepository.count()).thenReturn(4L);
        when(participationRepository.count()).thenReturn(52L);
        when(questionRepository.count()).thenReturn(40L);

        TransactionRecord tx = TransactionRecord.builder()
                .id("tx-1")
                .amountFcfa(9900.0)
                .status(PaymentStatus.PAID)
                .build();
        when(transactionRepository.findAll()).thenReturn(List.of(tx));

        Map<String, Object> stats = adminService.getDashboardStats();

        assertThat(stats.get("totalUsers")).isEqualTo(15L);
        assertThat(stats.get("totalQuizzes")).isEqualTo(8L);
        assertThat(stats.get("totalRevenueFcfa")).isEqualTo(9900.0);
        assertThat(stats.get("paidTransactionsCount")).isEqualTo(1);
    }

    @Test
    @DisplayName("Modification de rôle utilisateur avec journalisation d'audit")
    void testUpdateUserRole() {
        when(userRepository.findById("user-123")).thenReturn(Optional.of(sampleUser));
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));

        User updated = adminService.updateUserRole("user-123", UserRole.ADMIN);

        assertThat(updated.getRole()).isEqualTo(UserRole.ADMIN);
        verify(auditLogRepository, times(1)).save(any(AuditLog.class));
    }

    @Test
    @DisplayName("Modification du forfait utilisateur vers STARTER")
    void testUpdateUserTier() {
        when(userRepository.findById("user-123")).thenReturn(Optional.of(sampleUser));
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));

        User updated = adminService.updateUserTier("user-123", SubscriptionTier.STARTER);

        assertThat(updated.getSubscriptionTier()).isEqualTo(SubscriptionTier.STARTER);
        verify(auditLogRepository, times(1)).save(any(AuditLog.class));
    }

    @Test
    @DisplayName("Bascule du statut actif / inactif d'un compte")
    void testToggleUserActive() {
        when(userRepository.findById("user-123")).thenReturn(Optional.of(sampleUser));
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));

        User updated = adminService.toggleUserActive("user-123");

        assertThat(updated.isActive()).isFalse();
        assertThat(updated.getStatus()).isEqualTo("SUSPENDED");
    }

    @Test
    @DisplayName("Création d'utilisateur par l'administrateur avec mot de passe haché")
    void testCreateUser() {
        User newUser = User.builder()
                .prenom("Aissatou")
                .nom("Ba")
                .email("aissatou.ba@quizzboard.com")
                .role(UserRole.CREATOR)
                .build();

        when(userRepository.existsByEmail("aissatou.ba@quizzboard.com")).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("hashed-pwd");
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));

        User created = adminService.createUser(newUser, "SecurePass2026!");

        assertThat(created.getEmail()).isEqualTo("aissatou.ba@quizzboard.com");
        assertThat(created.getPassword()).isEqualTo("hashed-pwd");
        assertThat(created.isEmailVerified()).isTrue();
        verify(auditLogRepository, times(1)).save(any(AuditLog.class));
    }

    @Test
    @DisplayName("Création d'utilisateur rejetée si email déjà utilisé")
    void testCreateUserDuplicateEmail() {
        User newUser = User.builder()
                .email("mamadou.sow@quizzboard.com")
                .build();

        when(userRepository.existsByEmail("mamadou.sow@quizzboard.com")).thenReturn(true);

        assertThatThrownBy(() -> adminService.createUser(newUser, "pwd"))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    @DisplayName("Suppression définitive d'un compte utilisateur")
    void testDeleteUser() {
        when(userRepository.findById("user-123")).thenReturn(Optional.of(sampleUser));

        adminService.deleteUser("user-123");

        verify(userRepository, times(1)).delete(sampleUser);
        verify(auditLogRepository, times(1)).save(any(AuditLog.class));
    }

    @Test
    @DisplayName("Erreur ResourceNotFoundException si l'utilisateur à supprimer n'existe pas")
    void testDeleteUserNotFound() {
        when(userRepository.findById("unknown")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> adminService.deleteUser("unknown"))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}
