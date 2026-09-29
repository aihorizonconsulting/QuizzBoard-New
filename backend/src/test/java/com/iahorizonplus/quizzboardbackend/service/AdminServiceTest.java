package com.iahorizonplus.quizzboardbackend.service;

import com.iahorizonplus.quizzboardbackend.service.impl.LearningStatsService;
import com.iahorizonplus.quizzboardbackend.entity.*;
import com.iahorizonplus.quizzboardbackend.exception.BadRequestException;
import com.iahorizonplus.quizzboardbackend.exception.ResourceNotFoundException;
import com.iahorizonplus.quizzboardbackend.repository.*;
import com.iahorizonplus.quizzboardbackend.service.impl.AdminServiceImpl;
import com.iahorizonplus.quizzboardbackend.service.impl.PlatformHealthService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.time.YearMonth;
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

    @Mock
    private LearningStatsService learningStatsService;

    @Mock
    private LiveSessionRecordRepository liveSessionRecordRepository;

    @Mock
    private PlatformHealthService platformHealthService;

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
    @DisplayName("Supervision : indicateurs calculés à partir des données (comptes, forfaits, revenus, IA, Live)")
    void testGetDashboardStats() {
        LocalDateTime now = LocalDateTime.now();
        User paidCreator = User.builder().role(UserRole.CREATOR).subscriptionTier(SubscriptionTier.STARTER)
                .subscriptionExpiresAt(now.plusDays(10)).createdAt(now).aiGenerationsPeriod(YearMonth.now().toString()).aiGenerationsCount(4).build();
        User expiredCreator = User.builder().role(UserRole.CREATOR).subscriptionTier(SubscriptionTier.STARTER)
                .subscriptionExpiresAt(now.minusDays(1)).createdAt(now.minusMonths(3)).aiGenerationsPeriod("2020-01").aiGenerationsCount(9).build();
        User learner = User.builder().role(UserRole.LEARNER).subscriptionTier(SubscriptionTier.FREE).createdAt(now).build();
        User admin = User.builder().role(UserRole.ADMIN).subscriptionTier(SubscriptionTier.STARTER).build();
        when(userRepository.findAll()).thenReturn(List.of(paidCreator, expiredCreator, learner, admin));
        when(quizRepository.count()).thenReturn(8L);
        when(courseRepository.count()).thenReturn(4L);
        when(participationRepository.count()).thenReturn(52L);
        when(questionRepository.count()).thenReturn(40L);
        when(participationRepository.findByStatus("COMPLETED")).thenReturn(List.of(
                Participation.builder().status("COMPLETED").completedAt(now).build(),
                Participation.builder().status("COMPLETED").completedAt(now.minusMonths(2)).build()));
        when(transactionRepository.findAll()).thenReturn(List.of(
                TransactionRecord.builder().amountFcfa(999.0).status(PaymentStatus.PAID).paymentMethod(PaymentMethod.PAYDUNYA).createdAt(now).build(),
                TransactionRecord.builder().amountFcfa(999.0).status(PaymentStatus.PAID).paymentMethod(PaymentMethod.PAYDUNYA).createdAt(now.minusMonths(1)).build(),
                TransactionRecord.builder().amountFcfa(999.0).status(PaymentStatus.PENDING).paymentMethod(PaymentMethod.PAYDUNYA).createdAt(now).build()));
        LiveSessionRecord active = new LiveSessionRecord();
        active.setStatus("IN_PROGRESS");
        active.setPlayersCount(12);
        active.setCreatedAt(now);
        active.setUpdatedAt(now);
        LiveSessionRecord forgotten = new LiveSessionRecord();
        forgotten.setStatus("LOBBY");
        forgotten.setPlayersCount(3);
        forgotten.setCreatedAt(now.minusDays(5));
        forgotten.setUpdatedAt(now.minusDays(5));
        when(liveSessionRecordRepository.findAll()).thenReturn(List.of(active, forgotten));
        when(platformHealthService.checkServices()).thenReturn(List.of(Map.of("id", "database", "status", "UP")));

        Map<String, Object> stats = adminService.getDashboardStats();

        assertThat(stats.get("totalUsers")).isEqualTo(4L);
        assertThat(stats.get("creatorsCount")).isEqualTo(2L);
        assertThat(stats.get("paidCreatorsCount")).isEqualTo(1L); // l'abonnement expiré ne compte pas
        assertThat(stats.get("freeCreatorsCount")).isEqualTo(1L);
        assertThat(stats.get("newUsersThisMonth")).isEqualTo(2L);
        assertThat(stats.get("totalQuizzes")).isEqualTo(8L);
        assertThat(stats.get("completedParticipationsThisMonth")).isEqualTo(1L);
        assertThat(stats.get("totalRevenueFcfa")).isEqualTo(1998.0); // paiement en attente exclu
        assertThat(stats.get("revenueThisMonthFcfa")).isEqualTo(999.0);
        assertThat(stats.get("paidTransactionsCount")).isEqualTo(2);
        assertThat((List<?>) stats.get("monthlyRevenue")).hasSize(6);
        assertThat(stats.get("aiGenerationsThisMonth")).isEqualTo(4L);
        assertThat(stats.get("activeLiveSessions")).isEqualTo(1L); // la session oubliée depuis 5 jours n'est pas « en cours »
        assertThat(stats.get("activeLivePlayers")).isEqualTo(12L);
        assertThat((List<?>) stats.get("services")).hasSize(1);
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
        // Ancien abonné dont le paiement a expiré : le forfait accordé par l'admin ne doit pas être annulé aussitôt
        sampleUser.setSubscriptionExpiresAt(java.time.LocalDateTime.now().minusDays(3));
        when(userRepository.findById("user-123")).thenReturn(Optional.of(sampleUser));
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));

        User updated = adminService.updateUserTier("user-123", SubscriptionTier.STARTER);

        assertThat(updated.getSubscriptionTier()).isEqualTo(SubscriptionTier.STARTER);
        assertThat(updated.getSubscriptionExpiresAt()).isNull();
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
