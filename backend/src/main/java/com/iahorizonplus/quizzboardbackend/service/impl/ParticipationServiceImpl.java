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

import java.util.List;

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
                .orElseThrow(() -> new ResourceNotFoundException("Quiz non trouvé"));

        participation.setQuizTitle(quiz.getTitle());

        // Attach answers
        if (answers != null && !answers.isEmpty()) {
            int totalPoints = 0;
            int maxPoints = 0;

            for (ParticipantAnswer ans : answers) {
                ans.setParticipation(participation);
                totalPoints += ans.getPointsEarned();
            }

            // Calculate max potential points from quiz questions
            if (quiz.getQuestions() != null && !quiz.getQuestions().isEmpty()) {
                maxPoints = quiz.getQuestions().stream().mapToInt(Question::getPoints).sum();
            } else {
                maxPoints = Math.max(totalPoints, 100);
            }

            participation.setScore(totalPoints);
            participation.setMaxScore(maxPoints > 0 ? maxPoints : 100);
            double pct = maxPoints > 0 ? Math.round(((double) totalPoints / maxPoints * 100.0) * 10.0) / 10.0 : 0.0;
            participation.setPercentage(pct);
            participation.setAnswers(answers);
        }

        // Check certificate eligibility (>= 70%)
        if (participation.getPercentage() >= 70.0) {
            participation.setCertificateEligible(true);
        }

        Participation saved = participationRepository.save(participation);

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
                if (rankingList.get(i).getId().equals(saved.getId())) {
                    rank = i + 1;
                    break;
                }
            }
        } catch (Exception e) {
            log.warn("Impossible de calculer le rang du participant: {}", e.getMessage());
        }

        // Envoi automatique d'email avec les résultats du quiz et le classement (classe ou général)
        if (saved.getParticipantEmail() != null && !saved.getParticipantEmail().isBlank()) {
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
}
