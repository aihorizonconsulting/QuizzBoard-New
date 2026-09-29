package com.iahorizonplus.quizzboardbackend.service.impl;

import com.iahorizonplus.quizzboardbackend.entity.*;
import com.iahorizonplus.quizzboardbackend.exception.ResourceNotFoundException;
import com.iahorizonplus.quizzboardbackend.repository.*;
import com.iahorizonplus.quizzboardbackend.security.UserPrincipal;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import com.iahorizonplus.quizzboardbackend.service.AdminService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.*;
import java.util.stream.Collectors;

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
    private final LearningStatsService learningStatsService;
    private final LiveSessionRecordRepository liveSessionRecordRepository;
    private final PlatformHealthService platformHealthService;

    /** Une session Live sans activité depuis 3 heures n'est plus comptée comme en cours. */
    private static final long LIVE_ACTIVITY_HOURS = 3;

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> getDashboardStats() {
        Map<String, Object> stats = new HashMap<>();
        LocalDateTime now = LocalDateTime.now();
        YearMonth thisMonth = YearMonth.now();

        // Comptes : rôles, forfaits payants en cours, inscriptions du mois
        List<User> users = userRepository.findAll();
        long creators = users.stream().filter(u -> u.getRole() == UserRole.CREATOR).count();
        long paidCreators = users.stream().filter(u -> u.getRole() == UserRole.CREATOR && hasActivePaidPlan(u, now)).count();
        long paidLearners = users.stream().filter(u -> u.getRole() == UserRole.LEARNER && hasActivePaidPlan(u, now)).count();
        stats.put("totalUsers", (long) users.size());
        stats.put("creatorsCount", creators);
        stats.put("learnersCount", users.stream().filter(u -> u.getRole() == UserRole.LEARNER).count());
        stats.put("adminsCount", users.stream().filter(u -> u.getRole() == UserRole.ADMIN).count());
        stats.put("paidCreatorsCount", paidCreators);
        stats.put("paidLearnersCount", paidLearners);
        stats.put("freeCreatorsCount", creators - paidCreators);
        stats.put("newUsersThisMonth", users.stream().filter(u -> inMonth(u.getCreatedAt(), thisMonth)).count());
        stats.put("newUsersLastMonth", users.stream().filter(u -> inMonth(u.getCreatedAt(), thisMonth.minusMonths(1))).count());

        // Contenus et activité
        stats.put("totalQuizzes", quizRepository.count());
        stats.put("totalCourses", courseRepository.count());
        stats.put("totalQuestions", questionRepository.count());
        stats.put("totalParticipations", participationRepository.count());
        List<Participation> completed = participationRepository.findByStatus(LearningStatsService.COMPLETED);
        stats.put("completedParticipations", (long) completed.size());
        stats.put("completedParticipationsThisMonth", completed.stream().filter(p -> inMonth(p.getCompletedAt(), thisMonth)).count());

        // Revenus : paiements confirmés uniquement
        List<TransactionRecord> paidTx = transactionRepository.findAll().stream()
                .filter(t -> t.getStatus() == PaymentStatus.PAID)
                .toList();
        stats.put("totalRevenueFcfa", sumFcfa(paidTx));
        stats.put("paidTransactionsCount", paidTx.size());
        stats.put("revenueThisMonthFcfa", sumFcfa(paidTx.stream().filter(t -> inMonth(t.getCreatedAt(), thisMonth)).toList()));
        stats.put("revenueLastMonthFcfa", sumFcfa(paidTx.stream().filter(t -> inMonth(t.getCreatedAt(), thisMonth.minusMonths(1))).toList()));
        List<Map<String, Object>> monthlyRevenue = new ArrayList<>();
        for (int i = 5; i >= 0; i--) {
            YearMonth month = thisMonth.minusMonths(i);
            List<TransactionRecord> ofMonth = paidTx.stream().filter(t -> inMonth(t.getCreatedAt(), month)).toList();
            monthlyRevenue.add(Map.of("month", month.toString(), "amountFcfa", sumFcfa(ofMonth), "payments", ofMonth.size()));
        }
        stats.put("monthlyRevenue", monthlyRevenue);
        List<Map<String, Object>> byMethod = new ArrayList<>();
        paidTx.stream().collect(Collectors.groupingBy(t -> t.getPaymentMethod() != null ? t.getPaymentMethod().name() : "AUTRE"))
                .forEach((method, list) -> byMethod.add(Map.of("method", method, "payments", list.size(), "amountFcfa", sumFcfa(list))));
        byMethod.sort(Comparator.comparing(m -> -((Number) m.get("amountFcfa")).doubleValue()));
        stats.put("revenueByMethod", byMethod);

        // IA : générations du mois (quiz et cours), compteur par utilisateur
        String period = thisMonth.toString();
        stats.put("aiGenerationsThisMonth", users.stream()
                .filter(u -> period.equals(u.getAiGenerationsPeriod()) && u.getAiGenerationsCount() != null)
                .mapToLong(User::getAiGenerationsCount).sum());

        // Sessions Live : en cours (activité récente) et joueurs présents
        LocalDateTime activeSince = now.minusHours(LIVE_ACTIVITY_HOURS);
        List<LiveSessionRecord> lives = liveSessionRecordRepository.findAll();
        List<LiveSessionRecord> activeLives = lives.stream()
                .filter(l -> !"FINISHED".equals(l.getStatus()))
                .filter(l -> { LocalDateTime last = l.getUpdatedAt() != null ? l.getUpdatedAt() : l.getCreatedAt(); return last != null && last.isAfter(activeSince); })
                .toList();
        stats.put("activeLiveSessions", (long) activeLives.size());
        stats.put("activeLivePlayers", activeLives.stream().mapToLong(LiveSessionRecord::getPlayersCount).sum());
        stats.put("liveSessionsThisMonth", lives.stream().filter(l -> inMonth(l.getCreatedAt(), thisMonth)).count());

        // État réel des services
        stats.put("services", platformHealthService.checkServices());
        stats.put("checkedAt", now.toString());
        return stats;
    }

    private static boolean hasActivePaidPlan(User user, LocalDateTime now) {
        return user.getSubscriptionTier() != null && user.getSubscriptionTier() != SubscriptionTier.FREE
                && (user.getSubscriptionExpiresAt() == null || user.getSubscriptionExpiresAt().isAfter(now));
    }

    private static boolean inMonth(LocalDateTime date, YearMonth month) {
        return date != null && YearMonth.from(date).equals(month);
    }

    private static double sumFcfa(List<TransactionRecord> transactions) {
        return transactions.stream().mapToDouble(t -> t.getAmountFcfa() != null ? t.getAmountFcfa() : 0.0).sum();
    }

    @Override
    @Transactional
    public List<User> getAllUsers() {
        List<User> users = userRepository.findAll();
        learningStatsService.refreshUsersStats(users);
        return users;
    }

    @Override
    @Transactional
    public User updateUserRole(String userId, UserRole role) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé: " + userId));
        UserRole oldRole = user.getRole();
        user.setRole(role);
        User saved = userRepository.save(user);

        audit("Rôle modifié : " + oldRole + " → " + role, user.getEmail(), "Rôle modifié de " + oldRole + " à " + role,
                role == UserRole.ADMIN ? "CRITICAL" : "INFO");
        return saved;
    }

    @Override
    @Transactional
    public User updateUserTier(String userId, SubscriptionTier tier) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé: " + userId));
        SubscriptionTier oldTier = user.getSubscriptionTier();
        user.setSubscriptionTier(tier);
        // Forfait attribué par un administrateur : sans date de fin (une ancienne échéance de paiement
        // dépassée l'aurait sinon ramené aussitôt au forfait FREE)
        user.setSubscriptionExpiresAt(null);
        User saved = userRepository.save(user);

        audit("Forfait modifié : " + oldTier + " → " + tier, user.getEmail(), "Forfait attribué par l'administration, sans date de fin", "INFO");
        return saved;
    }

    @Override
    @Transactional
    public User toggleUserActive(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé: " + userId));
        user.setActive(!user.isActive());
        User saved = userRepository.save(user);

        audit(user.isActive() ? "Compte réactivé" : "Compte suspendu", user.getEmail(), "Statut actif changé à " + user.isActive(),
                user.isActive() ? "INFO" : "WARNING");
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
        if (user.getSubscriptionTier() == null) user.setSubscriptionTier(SubscriptionTier.FREE);
        user.setEmailVerified(true);
        user.setStatus("ACTIVE");

        User created = userRepository.save(user);
        audit("Compte créé par l'administration", created.getEmail(), "Rôle " + created.getRole(), "INFO");
        return created;
    }

    @Override
    @Transactional
    public void deleteUser(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé: " + userId));
        String email = user.getEmail();
        userRepository.delete(user);
        audit("Compte supprimé définitivement", email, "Suppression définitive du compte utilisateur", "CRITICAL");
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
        save(actorName != null ? actorName : "Système", action, target, details, "INFO");
    }

    @Override
    @Transactional
    public void audit(String action, String target, String details, String severity) {
        save(currentActor(), action, target, details, severity);
    }

    private void save(String actor, String action, String target, String details, String severity) {
        AuditLog logItem = AuditLog.builder()
                .adminName(actor)
                .actorName(actor)
                .action(action)
                .target(target)
                .details(details)
                .ipAddress(currentIp())
                .severity(severity)
                .build();
        auditLogRepository.save(logItem);
    }

    /** Email de l'administrateur à l'origine de l'action (requête authentifiée). */
    private static String currentActor() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserPrincipal principal) {
            return principal.getUsername();
        }
        return "Système";
    }

    /** Adresse IP du client (derrière le proxy : première adresse de X-Forwarded-For). */
    private static String currentIp() {
        RequestAttributes attributes = RequestContextHolder.getRequestAttributes();
        if (!(attributes instanceof ServletRequestAttributes servlet)) {
            return null;
        }
        HttpServletRequest request = servlet.getRequest();
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        String realIp = request.getHeader("X-Real-IP");
        return realIp != null && !realIp.isBlank() ? realIp : request.getRemoteAddr();
    }
}
