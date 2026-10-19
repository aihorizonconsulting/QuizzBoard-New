package com.iahorizonplus.quizzboardbackend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.iahorizonplus.quizzboardbackend.entity.*;
import com.iahorizonplus.quizzboardbackend.repository.RemedialPackRepository;
import com.iahorizonplus.quizzboardbackend.repository.UserRepository;
import com.iahorizonplus.quizzboardbackend.service.impl.RemedialGenerationWorker;
import com.iahorizonplus.quizzboardbackend.service.impl.RemedialService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RemedialServiceTest {

    @Mock private RemedialPackRepository packRepository;
    @Mock private UserRepository userRepository;
    @Mock private RemedialGenerationWorker worker;
    @Spy private ObjectMapper objectMapper = new ObjectMapper();
    @InjectMocks private RemedialService service;

    private static Quiz quiz() {
        Question q1 = Question.builder().id("q1").text("Qu'est-ce qu'un INNER JOIN ?").build();
        q1.setChoices(new ArrayList<>(List.of(Choice.builder().id("a").text("Les lignes communes").isCorrect(true).build(),
                Choice.builder().id("b").text("Toutes les lignes").isCorrect(false).build())));
        Question q2 = Question.builder().id("q2").text("Que fait GROUP BY ?").build();
        q2.setChoices(new ArrayList<>(List.of(Choice.builder().id("c").text("Regroupe les lignes").isCorrect(true).build())));
        return Quiz.builder().id("quiz-1").title("SQL").questions(new ArrayList<>(List.of(q1, q2))).build();
    }

    private static Participation failed(String userId, double pct, boolean firstCorrect) {
        ParticipantAnswer a1 = ParticipantAnswer.builder().questionId("q1").build();
        a1.setCorrect(firstCorrect);
        return Participation.builder().id("p1").userId(userId).quizId("quiz-1").status("COMPLETED").percentage(pct)
                .answers(new ArrayList<>(List.of(a1))).build();
    }

    @Test
    @DisplayName("Notions manquées : questions fausses ou sans réponse, avec la bonne réponse")
    void missedNotions_ListsWrongAndUnansweredQuestions() {
        List<String> notions = service.missedNotions(failed("u1", 0, false), quiz());
        assertThat(notions).hasSize(2);
        assertThat(notions.get(0)).contains("INNER JOIN", "Bonne réponse : Les lignes communes");
        assertThat(service.missedNotions(failed("u1", 50, true), quiz())).hasSize(1).first().asString().contains("GROUP BY");
    }

    @Test
    @DisplayName("Apprenant FREE sous 70 % : parcours enregistré mais pas de génération IA")
    void recordResult_FreeLearner_SavesPackWithoutGeneration() {
        User learner = User.builder().id("u1").email("a@b.sn").role(UserRole.LEARNER).subscriptionTier(SubscriptionTier.FREE).build();
        when(userRepository.findById("u1")).thenReturn(Optional.of(learner));
        when(packRepository.findFirstByUserIdAndQuizId("u1", "quiz-1")).thenReturn(Optional.empty());
        when(packRepository.save(any(RemedialPack.class))).thenAnswer(i -> { RemedialPack p = i.getArgument(0); p.setId("pack-1"); return p; });

        service.recordResult(failed("u1", 0, false), quiz());

        verify(packRepository).save(argThat(p -> p.getMissedCount() == 2 && "SQL".equals(p.getQuizTitle())));
        verify(worker, never()).generateAsync(anyString());
    }

    @Test
    @DisplayName("Apprenant Plus sous 70 % : génération lancée ; quiz réussi ou formateur : rien")
    void recordResult_LearnerPlusGenerates_PassedOrCreatorIgnored() {
        User learner = User.builder().id("u1").email("a@b.sn").role(UserRole.LEARNER).subscriptionTier(SubscriptionTier.LEARNER_PLUS).build();
        when(userRepository.findById("u1")).thenReturn(Optional.of(learner));
        when(packRepository.findFirstByUserIdAndQuizId("u1", "quiz-1")).thenReturn(Optional.empty());
        when(packRepository.save(any(RemedialPack.class))).thenAnswer(i -> { RemedialPack p = i.getArgument(0); p.setId("pack-1"); return p; });

        service.recordResult(failed("u1", 0, false), quiz());
        verify(worker).generateAsync("pack-1");

        service.recordResult(failed("u1", 85, true), quiz()); // réussi : pas de nouveau parcours
        User creator = User.builder().id("u2").role(UserRole.CREATOR).subscriptionTier(SubscriptionTier.FREE).build();
        when(userRepository.findById("u2")).thenReturn(Optional.of(creator));
        service.recordResult(failed("u2", 0, false), quiz());
        verify(packRepository, times(1)).save(any(RemedialPack.class));
    }
}
