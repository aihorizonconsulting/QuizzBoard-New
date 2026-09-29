package com.iahorizonplus.quizzboardbackend.service.impl;

import com.iahorizonplus.quizzboardbackend.entity.Classe;
import com.iahorizonplus.quizzboardbackend.entity.Participation;
import com.iahorizonplus.quizzboardbackend.entity.Quiz;
import com.iahorizonplus.quizzboardbackend.entity.Student;
import com.iahorizonplus.quizzboardbackend.entity.User;
import com.iahorizonplus.quizzboardbackend.repository.ParticipationRepository;
import com.iahorizonplus.quizzboardbackend.repository.QuizRepository;
import com.iahorizonplus.quizzboardbackend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Statistiques d'apprentissage calculées à partir des participations TERMINÉES uniquement
 * (les tentatives abandonnées, importées de l'ancien QuizzBoard avec 0 %, sont exclues) :
 * XP / niveau / série des utilisateurs, participations et moyenne des quiz, résultats des élèves d'une classe.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class LearningStatsService {

    public static final String COMPLETED = "COMPLETED";
    public static final double PASS_THRESHOLD = 70.0;
    /** XP gagnée par quiz terminé : points obtenus + bonus de participation (comme annoncé en fin de quiz). */
    static final int XP_BONUS_PER_QUIZ = 50;
    static final int XP_PER_LEVEL = 1000;

    private final ParticipationRepository participationRepository;
    private final UserRepository userRepository;
    private final QuizRepository quizRepository;

    /** Met à jour XP, niveau et série de jours consécutifs de l'utilisateur. */
    @Transactional
    public void refreshUserStats(User user) {
        if (user == null || user.getId() == null) return;
        applyStats(user, completedParticipationsOf(user));
    }

    /**
     * Quiz terminés d'un utilisateur : ceux liés à son compte et ceux joués avec son email sans être connecté
     * (nombreux dans les données de l'ancien QuizzBoard).
     */
    @Transactional(readOnly = true)
    public List<Participation> completedParticipationsOf(User user) {
        return participationRepository.findOwnedByStatus(user.getId(), normalizeEmail(user.getEmail()), COMPLETED);
    }

    /** Historique d'un utilisateur : ses quiz terminés, du plus récent au plus ancien. */
    @Transactional(readOnly = true)
    public List<Participation> completedParticipationsOfUserId(String userId) {
        List<Participation> done = new ArrayList<>(userRepository.findById(userId)
                .map(this::completedParticipationsOf)
                .orElseGet(() -> participationRepository.findByUserIdAndStatus(userId, COMPLETED)));
        done.sort(Comparator.comparing(Participation::getCompletedAt, Comparator.nullsLast(Comparator.reverseOrder())));
        return done;
    }

    static String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase();
    }

    @Transactional
    public void refreshUserStatsById(String userId) {
        userRepository.findById(userId).ifPresent(this::refreshUserStats);
    }

    /** Même calcul pour une liste d'utilisateurs (liste de l'administration), en une seule requête. */
    @Transactional
    public void refreshUsersStats(List<User> users) {
        List<Participation> done = participationRepository.findByStatus(COMPLETED);
        Map<String, List<Participation>> byUser = done.stream()
                .filter(p -> p.getUserId() != null)
                .collect(Collectors.groupingBy(Participation::getUserId));
        Map<String, List<Participation>> withoutAccountByEmail = done.stream()
                .filter(p -> p.getUserId() == null && p.getParticipantEmail() != null)
                .collect(Collectors.groupingBy(p -> normalizeEmail(p.getParticipantEmail())));
        for (User user : users) {
            List<Participation> mine = new ArrayList<>(byUser.getOrDefault(user.getId(), List.of()));
            mine.addAll(withoutAccountByEmail.getOrDefault(normalizeEmail(user.getEmail()), List.of()));
            applyStats(user, mine);
        }
    }

    private void applyStats(User user, List<Participation> done) {
        int xp = done.stream().mapToInt(p -> Math.max(0, p.getScore()) + XP_BONUS_PER_QUIZ).sum();
        int level = 1 + xp / XP_PER_LEVEL;
        Set<LocalDate> days = done.stream()
                .map(Participation::getCompletedAt)
                .filter(Objects::nonNull)
                .map(LocalDateTime::toLocalDate)
                .collect(Collectors.toSet());
        int streak = streakDays(days, LocalDate.now());
        if (!Objects.equals(user.getXpPoints(), xp) || !Objects.equals(user.getLevel(), level) || !Objects.equals(user.getStreakDays(), streak)) {
            user.setXpPoints(xp);
            user.setLevel(level);
            user.setStreakDays(streak);
            userRepository.save(user);
        }
    }

    /** Jours consécutifs avec au moins un quiz terminé, jusqu'à aujourd'hui (ou hier si rien encore aujourd'hui). */
    static int streakDays(Set<LocalDate> days, LocalDate today) {
        LocalDate day = days.contains(today) ? today : today.minusDays(1);
        int streak = 0;
        while (days.contains(day)) {
            streak++;
            day = day.minusDays(1);
        }
        return streak;
    }

    /** Recalcule le nombre de participations terminées et la moyenne d'un quiz. */
    @Transactional
    public void refreshQuizStats(Quiz quiz) {
        List<Participation> done = participationRepository.findByQuizIdAndStatusOrderByScoreDesc(quiz.getId(), COMPLETED);
        quiz.setParticipationsCount(done.size());
        quiz.setAverageScorePercent(round1(done.stream().mapToDouble(Participation::getPercentage).average().orElse(0.0)));
        quizRepository.save(quiz);
    }

    /** Aligne les compteurs de tous les quiz (ceux importés de l'ancien QuizzBoard étaient restés à 0). */
    @Transactional
    public int refreshAllQuizStats() {
        Map<String, List<Participation>> byQuiz = participationRepository.findByStatus(COMPLETED).stream()
                .collect(Collectors.groupingBy(Participation::getQuizId));
        int updated = 0;
        for (Quiz quiz : quizRepository.findAll()) {
            List<Participation> done = byQuiz.getOrDefault(quiz.getId(), List.of());
            int count = done.size();
            double avg = round1(done.stream().mapToDouble(Participation::getPercentage).average().orElse(0.0));
            if (!Objects.equals(quiz.getParticipationsCount(), count) || !Objects.equals(quiz.getAverageScorePercent(), avg)) {
                quiz.setParticipationsCount(count);
                quiz.setAverageScorePercent(avg);
                updated++;
            }
        }
        return updated;
    }

    /**
     * Résultats des élèves sur les quiz assignés à leur classe : meilleur score par quiz, moyenne et nombre
     * de quiz joués. Un élève est reconnu par son email (participation) ou par son compte.
     */
    @Transactional(readOnly = true)
    public void fillStudentResults(List<Classe> classes) {
        Set<String> quizIds = classes.stream().flatMap(c -> c.getAssignedQuizIds().stream()).collect(Collectors.toSet());
        if (quizIds.isEmpty()) {
            classes.forEach(c -> c.getStudents().forEach(s -> setResults(s, List.of())));
            return;
        }
        List<Participation> done = participationRepository.findByQuizIdIn(new ArrayList<>(quizIds)).stream()
                .filter(p -> COMPLETED.equalsIgnoreCase(p.getStatus()))
                .toList();
        Set<String> userIds = done.stream().map(Participation::getUserId).filter(Objects::nonNull).collect(Collectors.toSet());
        Map<String, String> emailByUserId = userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, u -> u.getEmail().toLowerCase(), (a, b) -> a));
        Map<String, List<Participation>> byEmail = new HashMap<>();
        for (Participation p : done) {
            String email = p.getUserId() != null && emailByUserId.containsKey(p.getUserId())
                    ? emailByUserId.get(p.getUserId())
                    : (p.getParticipantEmail() != null ? p.getParticipantEmail().trim().toLowerCase() : null);
            if (email != null) byEmail.computeIfAbsent(email, k -> new ArrayList<>()).add(p);
        }
        for (Classe classe : classes) {
            Set<String> classQuizIds = new HashSet<>(classe.getAssignedQuizIds());
            for (Student student : classe.getStudents()) {
                List<Participation> mine = byEmail.getOrDefault(student.getEmail() == null ? "" : student.getEmail().toLowerCase(), List.of())
                        .stream().filter(p -> classQuizIds.contains(p.getQuizId())).toList();
                setResults(student, mine);
            }
        }
    }

    private void setResults(Student student, List<Participation> participations) {
        Map<String, Double> bestByQuiz = new HashMap<>();
        for (Participation p : participations) {
            bestByQuiz.merge(p.getQuizId(), p.getPercentage(), Math::max);
        }
        student.setQuizzesCompletedCount(bestByQuiz.size());
        student.setAverageScorePercent(round1(bestByQuiz.values().stream().mapToDouble(Double::doubleValue).average().orElse(0.0)));
    }

    static double round1(double value) {
        return Math.round(value * 10.0) / 10.0;
    }
}
