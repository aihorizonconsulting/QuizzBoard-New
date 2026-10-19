package com.iahorizonplus.quizzboardbackend.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.iahorizonplus.quizzboardbackend.dto.response.RemedialPackResponse;
import com.iahorizonplus.quizzboardbackend.entity.*;
import com.iahorizonplus.quizzboardbackend.exception.PlanRequiredException;
import com.iahorizonplus.quizzboardbackend.exception.ResourceNotFoundException;
import com.iahorizonplus.quizzboardbackend.repository.RemedialPackRepository;
import com.iahorizonplus.quizzboardbackend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Perfectionnement : après un quiz réussi à moins de 70 %, un parcours de remise à niveau (mini-cours et
 * quiz d'entraînement) est préparé pour l'apprenant. Le parcours est créé pour tous les apprenants, mais
 * son contenu n'est généré et consultable qu'avec l'abonnement Apprenant Plus.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RemedialService {

    private final RemedialPackRepository packRepository;
    private final UserRepository userRepository;
    private final RemedialGenerationWorker worker;
    private final ObjectMapper objectMapper;

    /** Après un quiz terminé : crée ou met à jour le parcours de l'apprenant s'il a obtenu moins de 70 %. */
    @Transactional
    public void recordResult(Participation participation, Quiz quiz) {
        if (participation.getUserId() == null || quiz == null
                || !LearningStatsService.COMPLETED.equalsIgnoreCase(participation.getStatus())
                || participation.getPercentage() >= LearningStatsService.PASS_THRESHOLD) {
            return;
        }
        User user = userRepository.findById(participation.getUserId()).orElse(null);
        if (!PlanAccess.isLearner(user)) {
            return;
        }
        List<String> notions = missedNotions(participation, quiz);
        RemedialPack pack = packRepository.findFirstByUserIdAndQuizId(user.getId(), quiz.getId())
                .orElseGet(() -> RemedialPack.builder().userId(user.getId()).quizId(quiz.getId()).build());
        pack.setQuizTitle(quiz.getTitle());
        pack.setParticipationId(participation.getId());
        pack.setScorePercent(participation.getPercentage());
        pack.setMissedNotions(toJson(notions));
        pack.setMissedCount(notions.size());
        RemedialPack saved = packRepository.save(pack);
        log.info("Remise à niveau enregistrée pour {} (quiz « {} », {} %).", user.getEmail(), quiz.getTitle(), participation.getPercentage());

        if (PlanAccess.hasLearnerPlus(user) && !RemedialPack.READY.equals(saved.getStatus())) {
            generateAfterCommit(saved.getId());
        }
    }

    /** Parcours de l'apprenant (les parcours en attente sont préparés dès qu'il est abonné). */
    @Transactional
    public List<RemedialPackResponse> myPacks(String userId) {
        User user = requireUser(userId);
        boolean plus = PlanAccess.hasLearnerPlus(user);
        List<RemedialPack> packs = packRepository.findByUserIdOrderByUpdatedAtDesc(userId);
        if (plus) {
            packs.stream().filter(this::needsGeneration).forEach(p -> generateAfterCommit(p.getId()));
        }
        return packs.stream().map(p -> toResponse(p, plus)).toList();
    }

    @Transactional(readOnly = true)
    public RemedialPackResponse getPack(String userId, String packId) {
        User user = requireUser(userId);
        RemedialPack pack = ownedPack(userId, packId);
        requireLearnerPlus(user);
        return toResponse(pack, true);
    }

    /** Relance la préparation d'un parcours (après un échec de l'IA). */
    @Transactional
    public RemedialPackResponse regenerate(String userId, String packId) {
        User user = requireUser(userId);
        RemedialPack pack = ownedPack(userId, packId);
        requireLearnerPlus(user);
        if (!RemedialPack.READY.equals(pack.getStatus())) {
            pack.setStatus(RemedialPack.PENDING);
            pack.setFailureReason(null);
            pack = packRepository.save(pack);
            generateAfterCommit(pack.getId());
        }
        return toResponse(pack, true);
    }

    /** Résultat d'un quiz d'entraînement (meilleur score conservé). */
    @Transactional
    public RemedialPackResponse recordPractice(String userId, String packId, double percentage) {
        User user = requireUser(userId);
        RemedialPack pack = ownedPack(userId, packId);
        requireLearnerPlus(user);
        double score = Math.max(0, Math.min(100, percentage));
        pack.setPracticeAttempts(pack.getPracticeAttempts() + 1);
        pack.setBestPracticeScore(pack.getBestPracticeScore() == null ? score : Math.max(pack.getBestPracticeScore(), score));
        return toResponse(packRepository.save(pack), true);
    }

    private boolean needsGeneration(RemedialPack pack) {
        return RemedialPack.PENDING.equals(pack.getStatus())
                || (RemedialPack.GENERATING.equals(pack.getStatus()) && pack.getUpdatedAt() != null
                && pack.getUpdatedAt().isBefore(LocalDateTime.now().minusMinutes(RemedialGenerationWorker.STALE_GENERATION_MINUTES)));
    }

    /** La génération (appel à l'IA) démarre une fois le parcours enregistré en base. */
    private void generateAfterCommit(String packId) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    worker.generateAsync(packId);
                }
            });
        } else {
            worker.generateAsync(packId);
        }
    }

    /** Questions manquées (ou sans réponse) avec leur bonne réponse, pour cibler le parcours. */
    public static List<String> missedNotions(Participation participation, Quiz quiz) {
        List<Question> questions = quiz.getQuestions() != null ? quiz.getQuestions() : List.of();
        Map<String, ParticipantAnswer> answers = new HashMap<>();
        if (participation.getAnswers() != null) {
            for (ParticipantAnswer answer : participation.getAnswers()) {
                if (answer.getQuestionId() != null) answers.put(answer.getQuestionId(), answer);
            }
        }
        List<String> notions = new ArrayList<>();
        for (Question question : questions) {
            ParticipantAnswer answer = answers.get(question.getId());
            if (answer != null && answer.isCorrect()) continue;
            String good = question.getChoices() == null ? "" : question.getChoices().stream()
                    .filter(Choice::isCorrect).map(Choice::getText).collect(Collectors.joining(" ; "));
            notions.add(truncate(question.getText(), 250) + (good.isBlank() ? "" : " — Bonne réponse : " + truncate(good, 200)));
        }
        return notions;
    }

    private RemedialPackResponse toResponse(RemedialPack pack, boolean plus) {
        JsonNode content = null;
        if (plus && RemedialPack.READY.equals(pack.getStatus()) && pack.getContent() != null) {
            try {
                content = objectMapper.readTree(pack.getContent());
            } catch (Exception e) {
                log.warn("Contenu illisible pour le parcours {} : {}", pack.getId(), e.getMessage());
            }
        }
        return new RemedialPackResponse(pack.getId(), pack.getQuizId(), pack.getQuizTitle(), pack.getScorePercent(),
                pack.getMissedCount(), pack.getStatus(), !plus, plus ? pack.getFailureReason() : null,
                pack.getBestPracticeScore(), pack.getPracticeAttempts(), pack.getCreatedAt(), pack.getUpdatedAt(),
                pack.getReadyAt(), plus ? worker.notionsOf(pack) : List.of(), content);
    }

    private RemedialPack ownedPack(String userId, String packId) {
        return packRepository.findById(packId)
                .filter(p -> p.getUserId().equals(userId))
                .orElseThrow(() -> new ResourceNotFoundException("Parcours de perfectionnement introuvable."));
    }

    private User requireUser(String userId) {
        return userRepository.findById(userId).orElseThrow(() -> new ResourceNotFoundException("Utilisateur introuvable."));
    }

    private static void requireLearnerPlus(User user) {
        if (!PlanAccess.hasLearnerPlus(user)) {
            throw new PlanRequiredException(PlanAccess.LEARNER_PLUS_REQUIRED);
        }
    }

    private String toJson(List<String> values) {
        try {
            return objectMapper.writeValueAsString(values);
        } catch (Exception e) {
            return "[]";
        }
    }

    private static String truncate(String value, int max) {
        if (value == null) return "";
        String clean = value.trim();
        return clean.length() <= max ? clean : clean.substring(0, max) + "…";
    }
}
