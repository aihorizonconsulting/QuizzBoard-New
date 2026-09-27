package com.iahorizonplus.quizzboardbackend.service.impl;

import com.iahorizonplus.quizzboardbackend.entity.*;
import com.iahorizonplus.quizzboardbackend.exception.ResourceNotFoundException;
import com.iahorizonplus.quizzboardbackend.external.SmtpEmailService;
import com.iahorizonplus.quizzboardbackend.repository.ParticipationRepository;
import com.iahorizonplus.quizzboardbackend.repository.QuizRepository;
import com.iahorizonplus.quizzboardbackend.service.CertificateService;
import com.iahorizonplus.quizzboardbackend.service.ParticipationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class ParticipationServiceImpl implements ParticipationService {

    private final ParticipationRepository participationRepository;
    private final QuizRepository quizRepository;
    private final CertificateService certificateService;
    private final SmtpEmailService smtpEmailService;

    @Override
    @Transactional
    public Participation submitParticipation(Participation participation, List<ParticipantAnswer> answers) {
        Quiz quiz = quizRepository.findById(participation.getQuizId())
                .orElseGet(() -> quizRepository.findByShareCode(participation.getQuizId())
                        .orElseThrow(() -> new ResourceNotFoundException("Quiz non trouvé avec l'identifiant ou code: " + participation.getQuizId())));

        participation.setQuizId(quiz.getId());
        participation.setQuizTitle(quiz.getTitle());

        // Réponses : justesse et points recalculés à partir du quiz enregistré (jamais les valeurs du navigateur)
        List<Question> questions = quiz.getQuestions() != null ? quiz.getQuestions() : List.of();
        List<ParticipantAnswer> safeAnswers = answers != null ? answers : new ArrayList<>();
        if (!questions.isEmpty()) {
            Map<String, Question> questionsById = new HashMap<>();
            for (Question q : questions) {
                questionsById.put(q.getId(), q);
            }
            int totalPoints = 0;
            for (ParticipantAnswer ans : safeAnswers) {
                ans.setParticipation(participation);
                Question question = questionsById.get(ans.getQuestionId());
                boolean correct = question != null && isCorrectSelection(question, ans.getSelectedChoiceIds());
                ans.setCorrect(correct);
                ans.setPointsEarned(correct ? question.getPoints() : 0);
                totalPoints += ans.getPointsEarned();
            }
            int maxPoints = questions.stream().mapToInt(Question::getPoints).sum();
            participation.setScore(totalPoints);
            participation.setMaxScore(maxPoints > 0 ? maxPoints : 100);
            double pct = maxPoints > 0 ? Math.round(((double) totalPoints / maxPoints * 100.0) * 10.0) / 10.0 : 0.0;
            participation.setPercentage(pct);
            participation.setAnswers(safeAnswers);
        } else if (!safeAnswers.isEmpty()) {
            // Quiz sans questions en base (ancien contenu) : rien à vérifier, on conserve les points transmis
            int totalPoints = 0;
            for (ParticipantAnswer ans : safeAnswers) {
                ans.setParticipation(participation);
                totalPoints += ans.getPointsEarned();
            }
            int maxPoints = Math.max(totalPoints, 100);
            participation.setScore(totalPoints);
            participation.setMaxScore(maxPoints);
            participation.setPercentage(Math.round(((double) totalPoints / maxPoints * 100.0) * 10.0) / 10.0);
            participation.setAnswers(safeAnswers);
        }

        // Check certificate eligibility (>= 70%)
        if (participation.getPercentage() >= 70.0) {
            participation.setCertificateEligible(true);
        }

        Participation saved = participationRepository.save(participation);
        if (saved.getId() == null) {
            saved.setId(java.util.UUID.randomUUID().toString());
        }

        // Update Quiz Stats
        int count = quiz.getParticipationsCount() != null ? quiz.getParticipationsCount() : 0;
        double currentAvg = quiz.getAverageScorePercent() != null ? quiz.getAverageScorePercent() : 0.0;
        double newAvg = Math.round(((currentAvg * count + saved.getPercentage()) / (count + 1)) * 10.0) / 10.0;

        quiz.setParticipationsCount(count + 1);
        quiz.setAverageScorePercent(newAvg);
        quizRepository.save(quiz);

        // Auto-generate certificate if eligible
        String certCode = null;
        if (saved.isCertificateEligible()) {
            try {
                Certificate cert = certificateService.generateCertificate(saved.getId());
                saved.setCertificateId(cert.getId());
                certCode = cert.getVerificationCode();
            } catch (Exception e) {
                log.warn("Impossible de générer le certificat automatiquement: {}", e.getMessage());
            }
        }

        // Calcul précis du rang : par classe si le quiz est joué dans une classe, sinon classement général
        int rank = 1;
        int totalPlayers = 1;
        try {
            List<Participation> rankingList;
            if (saved.getClassId() != null && !saved.getClassId().isBlank()) {
                rankingList = participationRepository.findByQuizIdAndClassIdOrderByScoreDesc(quiz.getId(), saved.getClassId());
            } else {
                rankingList = participationRepository.findByQuizIdOrderByScoreDesc(quiz.getId());
            }
            totalPlayers = Math.max(1, rankingList.size());
            for (int i = 0; i < rankingList.size(); i++) {
                if (saved.getId() != null && saved.getId().equals(rankingList.get(i).getId())) {
                    rank = i + 1;
                    break;
                }
            }
        } catch (Exception e) {
            log.warn("Impossible de calculer le rang du participant: {}", e.getMessage());
        }

        // Envoi automatique d'email avec les résultats du quiz et le classement (classe ou général).
        // Pour un quiz Live, c'est la session qui envoie l'email avec le rang parmi ses joueurs.
        boolean isLiveParticipation = saved.getLiveSessionId() != null && !saved.getLiveSessionId().isBlank();
        if (!isLiveParticipation && saved.getParticipantEmail() != null && !saved.getParticipantEmail().isBlank()) {
            try {
                smtpEmailService.sendQuizCompletedEmail(
                        saved.getParticipantEmail(),
                        saved.getParticipantName() != null ? saved.getParticipantName() : "Apprenant",
                        saved.getQuizTitle() != null ? saved.getQuizTitle() : quiz.getTitle(),
                        saved.getPercentage(),
                        saved.getScore(),
                        saved.getMaxScore(),
                        rank,
                        totalPlayers,
                        saved.isCertificateEligible(),
                        certCode,
                        saved.getClassName()
                );
            } catch (Exception e) {
                log.warn("Échec du déclenchement de l'email de résultat de quiz: {}", e.getMessage());
            }
        }

        return saved;
    }

    /** Réponse juste : au moins un choix sélectionné et tous les choix sélectionnés sont corrects. */
    private boolean isCorrectSelection(Question question, List<String> selectedChoiceIds) {
        if (selectedChoiceIds == null || selectedChoiceIds.isEmpty()) {
            return false;
        }
        Set<String> correctIds = new HashSet<>();
        for (Choice choice : question.getChoices()) {
            if (choice.isCorrect()) correctIds.add(choice.getId());
        }
        return !correctIds.isEmpty() && correctIds.containsAll(selectedChoiceIds);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Participation> getParticipationsByQuiz(String quizId) {
        return participationRepository.findByQuizIdOrderByScoreDesc(quizId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Participation> getParticipationsByUser(String userId) {
        return participationRepository.findByUserIdOrderByCompletedAtDesc(userId);
    }

    @Override
    @Transactional(readOnly = true)
    public Participation getParticipationById(String id) {
        return participationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Participation non trouvée avec l'id: " + id));
    }

    @Override
    @Transactional
    public boolean sendParticipationEmail(String participationId, String email) {
        if (email == null || email.isBlank()) {
            return false;
        }
        if (!smtpEmailService.isDeliveryEnabled()) {
            log.warn("Envoi email participation ignoré : SMTP non configuré ou désactivé.");
            return false;
        }
        Participation participation = getParticipationById(participationId);
        participation.setParticipantEmail(email.trim());
        participationRepository.save(participation);

        Quiz quiz = quizRepository.findById(participation.getQuizId()).orElse(null);
        String quizTitle = quiz != null ? quiz.getTitle() : participation.getQuizTitle();

        // Calcul précis du rang
        int rank = 1;
        int totalPlayers = 1;
        try {
            List<Participation> rankingList;
            if (participation.getClassId() != null && !participation.getClassId().isBlank()) {
                rankingList = participationRepository.findByQuizIdAndClassIdOrderByScoreDesc(participation.getQuizId(), participation.getClassId());
            } else {
                rankingList = participationRepository.findByQuizIdOrderByScoreDesc(participation.getQuizId());
            }
            totalPlayers = Math.max(1, rankingList.size());
            for (int i = 0; i < rankingList.size(); i++) {
                if (participation.getId() != null && participation.getId().equals(rankingList.get(i).getId())) {
                    rank = i + 1;
                    break;
                }
            }
        } catch (Exception e) {
            log.warn("Erreur calcul rang pour envoi email participation : {}", e.getMessage());
        }

        String certCode = null;
        if (participation.getCertificateId() != null) {
            try {
                Certificate cert = certificateService.getCertificateById(participation.getCertificateId());
                if (cert != null) {
                    certCode = cert.getVerificationCode();
                }
            } catch (Exception ignored) {}
        }

        smtpEmailService.sendQuizCompletedEmail(
                email.trim(),
                participation.getParticipantName() != null ? participation.getParticipantName() : "Apprenant",
                quizTitle,
                participation.getPercentage(),
                participation.getScore(),
                participation.getMaxScore(),
                rank,
                totalPlayers,
                participation.isCertificateEligible(),
                certCode,
                participation.getClassName()
        );
        log.info("Email de résultat de quiz déclenché avec succès pour la participation {} vers {}", participationId, email);
        return true;
    }
}
