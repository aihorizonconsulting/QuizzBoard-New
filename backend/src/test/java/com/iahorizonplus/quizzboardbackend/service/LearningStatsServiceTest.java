package com.iahorizonplus.quizzboardbackend.service;

import com.iahorizonplus.quizzboardbackend.entity.*;
import com.iahorizonplus.quizzboardbackend.repository.ParticipationRepository;
import com.iahorizonplus.quizzboardbackend.repository.QuizRepository;
import com.iahorizonplus.quizzboardbackend.repository.UserRepository;
import com.iahorizonplus.quizzboardbackend.service.impl.LearningStatsService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LearningStatsServiceTest {

    @Mock private ParticipationRepository participationRepository;
    @Mock private UserRepository userRepository;
    @Mock private QuizRepository quizRepository;
    @InjectMocks private LearningStatsService service;

    private static Participation done(String quizId, int score, double pct, LocalDateTime at) {
        return Participation.builder().quizId(quizId).score(score).percentage(pct).status("COMPLETED").completedAt(at).build();
    }

    @Test
    @DisplayName("XP, niveau et série : points obtenus + 50 par quiz terminé, jours consécutifs jusqu'à aujourd'hui")
    void refreshUserStats_ComputesXpLevelAndStreak() {
        User learner = User.builder().id("u1").email("awa@test.sn").xpPoints(0).level(1).streakDays(1).build();
        LocalDateTime now = LocalDateTime.now();
        when(participationRepository.findOwnedByStatus("u1", "awa@test.sn", "COMPLETED")).thenReturn(List.of(
                done("q1", 2000, 100.0, now),
                done("q2", 300, 60.0, now.minusDays(1)),
                done("q3", 100, 50.0, now.minusDays(3))));

        service.refreshUserStats(learner);

        assertThat(learner.getXpPoints()).isEqualTo(2000 + 300 + 100 + 3 * 50);
        assertThat(learner.getLevel()).isEqualTo(3);
        assertThat(learner.getStreakDays()).isEqualTo(2); // aujourd'hui + hier (avant-hier manquant)
        verify(userRepository).save(learner);
    }

    @Test
    @DisplayName("Série : un quiz hier seulement compte encore, rien depuis 2 jours = série à 0")
    void refreshUserStats_StreakResetsWhenInactive() {
        User learner = User.builder().id("u2").xpPoints(0).level(1).streakDays(1).build();
        when(participationRepository.findOwnedByStatus("u2", "", "COMPLETED"))
                .thenReturn(List.of(done("q1", 100, 100.0, LocalDateTime.now().minusDays(2))));

        service.refreshUserStats(learner);

        assertThat(learner.getStreakDays()).isZero();
        assertThat(learner.getXpPoints()).isEqualTo(150);
    }

    @Test
    @DisplayName("Résultats des élèves : meilleur score par quiz de la classe, tentatives abandonnées exclues, reconnaissance par email ou par compte")
    void fillStudentResults_UsesBestCompletedScorePerAssignedQuiz() {
        Student awa = Student.builder().email("Awa@Test.sn").build();
        Student moussa = Student.builder().email("moussa@test.sn").build();
        Classe classe = Classe.builder().assignedQuizIds(new ArrayList<>(List.of("q1", "q2"))).students(new ArrayList<>(List.of(awa, moussa))).build();
        LocalDateTime now = LocalDateTime.now();
        Participation awaQ1First = done("q1", 50, 50.0, now);
        awaQ1First.setParticipantEmail("awa@test.sn");
        Participation awaQ1Best = done("q1", 90, 90.0, now);
        awaQ1Best.setParticipantEmail("awa@test.sn");
        Participation awaQ2 = done("q2", 70, 70.0, now);
        awaQ2.setUserId("user-awa"); // reconnue par son compte
        Participation abandoned = Participation.builder().quizId("q2").percentage(0.0).status("IN_PROGRESS").participantEmail("moussa@test.sn").build();
        Participation otherQuiz = done("q9", 100, 100.0, now);
        otherQuiz.setParticipantEmail("moussa@test.sn");
        when(participationRepository.findByQuizIdIn(anyList())).thenReturn(List.of(awaQ1First, awaQ1Best, awaQ2, abandoned, otherQuiz));
        when(userRepository.findAllById(any())).thenReturn(List.of(User.builder().id("user-awa").email("awa@test.sn").build()));

        service.fillStudentResults(List.of(classe));

        assertThat(awa.getQuizzesCompletedCount()).isEqualTo(2);
        assertThat(awa.getAverageScorePercent()).isEqualTo(80.0); // (90 + 70) / 2
        assertThat(moussa.getQuizzesCompletedCount()).isZero();
        assertThat(moussa.getAverageScorePercent()).isZero();
    }

    @Test
    @DisplayName("Liste admin : les quiz joués avec l'email du compte sans être connecté comptent dans l'XP")
    void refreshUsersStats_CountsResultsPlayedWithAccountEmail() {
        User learner = User.builder().id("u3").email("JF@test.sn").xpPoints(0).level(1).streakDays(0).build();
        Participation linked = done("q1", 200, 100.0, LocalDateTime.now().minusDays(10));
        linked.setUserId("u3");
        Participation playedAsGuest = done("q2", 100, 50.0, LocalDateTime.now().minusDays(10));
        playedAsGuest.setParticipantEmail(" jf@test.sn ");
        Participation someoneElse = done("q3", 900, 90.0, LocalDateTime.now());
        someoneElse.setParticipantEmail("autre@test.sn");
        when(participationRepository.findByStatus("COMPLETED")).thenReturn(List.of(linked, playedAsGuest, someoneElse));

        service.refreshUsersStats(List.of(learner));

        assertThat(learner.getXpPoints()).isEqualTo(200 + 100 + 2 * 50);
    }

    @Test
    @DisplayName("Compteurs des quiz : participations terminées et moyenne réalignées (quiz importés restés à 0)")
    void refreshAllQuizStats_AlignsImportedQuizzes() {
        Quiz imported = Quiz.builder().id("q1").participationsCount(0).averageScorePercent(0.0).build();
        when(participationRepository.findByStatus("COMPLETED")).thenReturn(List.of(
                done("q1", 60, 60.0, LocalDateTime.now()), done("q1", 80, 80.0, LocalDateTime.now())));
        when(quizRepository.findAll()).thenReturn(List.of(imported));

        int updated = service.refreshAllQuizStats();

        assertThat(updated).isEqualTo(1);
        assertThat(imported.getParticipationsCount()).isEqualTo(2);
        assertThat(imported.getAverageScorePercent()).isEqualTo(70.0);
    }
}
