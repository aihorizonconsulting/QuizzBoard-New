package com.iahorizonplus.quizzboardbackend.service;

import com.iahorizonplus.quizzboardbackend.entity.*;
import com.iahorizonplus.quizzboardbackend.exception.ResourceNotFoundException;
import com.iahorizonplus.quizzboardbackend.external.SmtpEmailService;
import com.iahorizonplus.quizzboardbackend.repository.ParticipationRepository;
import com.iahorizonplus.quizzboardbackend.repository.QuizRepository;
import com.iahorizonplus.quizzboardbackend.service.impl.ParticipationServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ParticipationServiceTest {

    @Mock
    private ParticipationRepository participationRepository;

    @Mock
    private QuizRepository quizRepository;

    @Mock
    private CertificateService certificateService;

    @Mock
    private SmtpEmailService smtpEmailService;

    @InjectMocks
    private ParticipationServiceImpl participationService;

    private Quiz sampleQuiz;

    @BeforeEach
    void setUp() {
        Question q1 = Question.builder().id("q1").points(50).build();
        Question q2 = Question.builder().id("q2").points(50).build();

        sampleQuiz = Quiz.builder()
                .id("quiz-100")
                .title("Evaluation Spring Boot")
                .participationsCount(0)
                .averageScorePercent(0.0)
                .questions(new ArrayList<>(List.of(q1, q2)))
                .build();
    }

    @Test
    @DisplayName("Soumission Participation avec Réussite (>= 70%) : Calcul exact des points, certificat et notification par email")
    void submitParticipation_Success_CertificateEligible() {
        Participation participation = Participation.builder()
                .id("part-1")
                .quizId("quiz-100")
                .userId("user-1")
                .participantName("Khadija Ba")
                .participantEmail("khadija@quizzboard.com")
                .build();

        ParticipantAnswer ans1 = ParticipantAnswer.builder().pointsEarned(50).isCorrect(true).build();
        ParticipantAnswer ans2 = ParticipantAnswer.builder().pointsEarned(30).isCorrect(true).build();
        List<ParticipantAnswer> answers = List.of(ans1, ans2);

        Certificate certificate = Certificate.builder()
                .id("cert-1")
                .verificationCode("QB-CERT-9988")
                .build();

        when(quizRepository.findById("quiz-100")).thenReturn(Optional.of(sampleQuiz));
        when(participationRepository.save(any(Participation.class))).thenAnswer(inv -> inv.getArgument(0));
        when(certificateService.generateCertificate("part-1")).thenReturn(certificate);

        Participation result = participationService.submitParticipation(participation, answers);

        assertThat(result).isNotNull();
        assertThat(result.getScore()).isEqualTo(80);
        assertThat(result.getMaxScore()).isEqualTo(100);
        assertThat(result.getPercentage()).isEqualTo(80.0);
        assertThat(result.isCertificateEligible()).isTrue();
        assertThat(result.getCertificateId()).isEqualTo("cert-1");

        // Vérification de la mise à jour des statistiques du quiz
        assertThat(sampleQuiz.getParticipationsCount()).isEqualTo(1);
        assertThat(sampleQuiz.getAverageScorePercent()).isEqualTo(80.0);
        verify(quizRepository).save(sampleQuiz);

        // Vérification de l'envoi d'email avec rang (mode public / className null)
        verify(smtpEmailService).sendQuizCompletedEmail(
                eq("khadija@quizzboard.com"),
                eq("Khadija Ba"),
                eq("Evaluation Spring Boot"),
                eq(80.0),
                eq(80),
                eq(100),
                eq(1),
                eq(1),
                eq(true),
                eq("QB-CERT-9988"),
                isNull()
        );
    }

    @Test
    @DisplayName("Soumission Participation avec Échec (< 70%) : Pas de certificat généré")
    void submitParticipation_Failed_NoCertificate() {
        Participation participation = Participation.builder()
                .id("part-2")
                .quizId("quiz-100")
                .userId("user-2")
                .participantName("Ousmane Kane")
                .participantEmail("ousmane@quizzboard.com")
                .build();

        ParticipantAnswer ans = ParticipantAnswer.builder().pointsEarned(40).isCorrect(true).build();
        List<ParticipantAnswer> answers = List.of(ans);

        when(quizRepository.findById("quiz-100")).thenReturn(Optional.of(sampleQuiz));
        when(participationRepository.save(any(Participation.class))).thenAnswer(inv -> inv.getArgument(0));

        Participation result = participationService.submitParticipation(participation, answers);

        assertThat(result.getPercentage()).isEqualTo(40.0);
        assertThat(result.isCertificateEligible()).isFalse();
        assertThat(result.getCertificateId()).isNull();

        verify(certificateService, never()).generateCertificate(any());
        verify(smtpEmailService).sendQuizCompletedEmail(
                eq("ousmane@quizzboard.com"),
                eq("Ousmane Kane"),
                eq("Evaluation Spring Boot"),
                eq(40.0),
                eq(40),
                eq(100),
                eq(1),
                eq(1),
                eq(false),
                isNull(),
                isNull()
        );
    }

    @Test
    @DisplayName("Quiz introuvable lors de la soumission : Rejet avec ResourceNotFoundException")
    void submitParticipation_QuizNotFound_ThrowsException() {
        Participation participation = Participation.builder().quizId("unknown").build();
        when(quizRepository.findById("unknown")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> participationService.submitParticipation(participation, List.of()))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("Soumission Participation dans une classe : Calcul du rang au sein de la classe")
    void submitParticipation_WithClassId_CalculatesRankWithinClass() {
        Participation p1 = Participation.builder().id("p1").score(100).build();
        Participation p2 = Participation.builder()
                .id("p2")
                .quizId("quiz-100")
                .classId("class-science-1")
                .className("Terminale Scientifique")
                .participantName("Moussa Diop")
                .participantEmail("moussa@quizzboard.com")
                .score(85)
                .build();

        when(quizRepository.findById("quiz-100")).thenReturn(Optional.of(sampleQuiz));
        when(participationRepository.save(any(Participation.class))).thenAnswer(inv -> inv.getArgument(0));
        when(participationRepository.findByQuizIdAndClassIdOrderByScoreDesc("quiz-100", "class-science-1"))
                .thenReturn(List.of(p1, p2));

        Participation result = participationService.submitParticipation(p2, List.of());

        assertThat(result).isNotNull();
        // Vérification de l'appel email avec rang 2 sur 2 et nom de classe
        verify(smtpEmailService).sendQuizCompletedEmail(
                eq("moussa@quizzboard.com"),
                eq("Moussa Diop"),
                eq("Evaluation Spring Boot"),
                anyDouble(),
                anyInt(),
                anyInt(),
                eq(2),
                eq(2),
                anyBoolean(),
                any(),
                eq("Terminale Scientifique")
        );
    }

    @Test
    @DisplayName("Envoi direct d'email pour une participation existante : mise à jour de l'email et envoi SMTP")
    void sendParticipationEmail_Success() {
        Participation p = Participation.builder()
                .id("part-public-1")
                .quizId("quiz-100")
                .participantName("Joueur Public")
                .score(90)
                .maxScore(100)
                .percentage(90.0)
                .build();

        when(participationRepository.findById("part-public-1")).thenReturn(Optional.of(p));
        when(quizRepository.findById("quiz-100")).thenReturn(Optional.of(sampleQuiz));
        when(participationRepository.save(any(Participation.class))).thenAnswer(inv -> inv.getArgument(0));
        when(participationRepository.findByQuizIdOrderByScoreDesc("quiz-100")).thenReturn(List.of(p));

        boolean sent = participationService.sendParticipationEmail("part-public-1", "public.player@example.com");

        assertThat(sent).isTrue();
        assertThat(p.getParticipantEmail()).isEqualTo("public.player@example.com");
        verify(smtpEmailService).sendQuizCompletedEmail(
                eq("public.player@example.com"),
                eq("Joueur Public"),
                eq("Evaluation Spring Boot"),
                eq(90.0),
                eq(90),
                eq(100),
                eq(1),
                eq(1),
                eq(false),
                isNull(),
                isNull()
        );
    }
}

