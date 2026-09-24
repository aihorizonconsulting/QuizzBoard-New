package com.iahorizonplus.quizzboardbackend.service.impl;

import com.iahorizonplus.quizzboardbackend.entity.*;
import com.iahorizonplus.quizzboardbackend.exception.ResourceNotFoundException;
import com.iahorizonplus.quizzboardbackend.repository.*;
import com.iahorizonplus.quizzboardbackend.service.AdminService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminServiceImpl implements AdminService {

    private final UserRepository userRepository;
    private final QuizRepository quizRepository;
    private final CourseRepository courseRepository;
    private final ParticipationRepository participationRepository;
    private final TransactionRepository transactionRepository;
    private final AuditLogRepository auditLogRepository;
    private final QuestionRepository questionRepository;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> getDashboardStats() {
        Map<String, Object> stats = new HashMap<>();

        long usersCount = userRepository.count();
        long quizzesCount = quizRepository.count();
        long coursesCount = courseRepository.count();
        long participationsCount = participationRepository.count();
        long questionsCount = questionRepository.count();

        List<TransactionRecord> paidTx = transactionRepository.findAll().stream()
                .filter(t -> t.getStatus() == PaymentStatus.PAID)
                .toList();

        double totalRevenueFcfa = paidTx.stream()
                .mapToDouble(t -> t.getAmountFcfa() != null ? t.getAmountFcfa() : 0.0)
                .sum();

        stats.put("totalUsers", usersCount);
        stats.put("totalQuizzes", quizzesCount);
        stats.put("totalCourses", coursesCount);
        stats.put("totalParticipations", participationsCount);
        stats.put("totalQuestions", questionsCount);
        stats.put("totalRevenueFcfa", totalRevenueFcfa);
        stats.put("paidTransactionsCount", paidTx.size());

        return stats;
    }

    @Override
    @Transactional(readOnly = true)
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    @Override
    @Transactional
    public User updateUserRole(String userId, UserRole role) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé: " + userId));
        UserRole oldRole = user.getRole();
        user.setRole(role);
        user.setRoleSelected(true); // rôle fixé par l'administrateur : plus de choix à la connexion
        User saved = userRepository.save(user);

        logAction("SYSTEM_ADMIN", "UPDATE_ROLE", user.getEmail(), "Rôle modifié de " + oldRole + " à " + role);
        return saved;
    }

    @Override
    @Transactional
    public User updateUserTier(String userId, SubscriptionTier tier) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé: " + userId));
        SubscriptionTier oldTier = user.getSubscriptionTier();
        user.setSubscriptionTier(tier);
        User saved = userRepository.save(user);

        logAction("SYSTEM_ADMIN", "UPDATE_TIER", user.getEmail(), "Forfait modifié de " + oldTier + " à " + tier);
        return saved;
    }

    @Override
    @Transactional
    public User toggleUserActive(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé: " + userId));
        user.setActive(!user.isActive());
        User saved = userRepository.save(user);

        logAction("SYSTEM_ADMIN", "TOGGLE_USER_ACTIVE", user.getEmail(), "Statut actif changé à " + user.isActive());
        return saved;
    }

    @Override
    @Transactional
    public User createUser(User user, String rawPassword) {
        // id temporaire éventuel envoyé par le frontend : l'id est toujours généré par la base
        user.setId(null);
        if (user.getEmail() == null || user.getEmail().isBlank()) {
            throw new com.iahorizonplus.quizzboardbackend.exception.BadRequestException("email", "L'adresse email est requise");
        }
        if (userRepository.existsByEmail(user.getEmail().trim().toLowerCase())) {
            throw new com.iahorizonplus.quizzboardbackend.exception.BadRequestException("email", "Cet email est déjà associé à un compte");
        }

        String pwd = (rawPassword != null && !rawPassword.isBlank()) ? rawPassword : "Password123!";
        user.setEmail(user.getEmail().trim().toLowerCase());
        user.setPassword(passwordEncoder.encode(pwd));
        if (user.getRole() == null) user.setRole(UserRole.CREATOR);
        user.setRoleSelected(true);
        if (user.getSubscriptionTier() == null) user.setSubscriptionTier(SubscriptionTier.FREE);
        user.setEmailVerified(true);
        user.setStatus("ACTIVE");

        User created = userRepository.save(user);
        logAction("SYSTEM_ADMIN", "CREATE_USER", created.getEmail(), "Création administrative d'utilisateur avec rôle " + created.getRole());
        return created;
    }

    @Override
    @Transactional
    public void deleteUser(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé: " + userId));
        String email = user.getEmail();
        userRepository.delete(user);
        logAction("SYSTEM_ADMIN", "DELETE_USER", email, "Suppression définitive du compte utilisateur");
    }

    @Override
    @Transactional(readOnly = true)
    public List<TransactionRecord> getAllTransactions() {
        return transactionRepository.findAllByOrderByCreatedAtDesc();
    }

    @Override
    @Transactional(readOnly = true)
    public List<AuditLog> getAuditLogs() {
        return auditLogRepository.findAllByOrderByTimestampDesc();
    }

    @Override
    @Transactional
    public void logAction(String actorName, String action, String target, String details) {
        String name = actorName != null ? actorName : "Système";
        AuditLog logItem = AuditLog.builder()
                .adminName(name)
                .actorName(name)
                .action(action)
                .target(target)
                .details(details)
                .build();
        auditLogRepository.save(logItem);
    }
}
