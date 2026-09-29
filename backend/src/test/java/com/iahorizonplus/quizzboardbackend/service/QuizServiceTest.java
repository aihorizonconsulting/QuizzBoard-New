package com.iahorizonplus.quizzboardbackend.service;

import com.iahorizonplus.quizzboardbackend.repository.PlatformSettingsRepository;
import com.iahorizonplus.quizzboardbackend.entity.*;
import com.iahorizonplus.quizzboardbackend.exception.ResourceNotFoundException;
import com.iahorizonplus.quizzboardbackend.repository.ClasseRepository;
import com.iahorizonplus.quizzboardbackend.repository.QuizRepository;
import com.iahorizonplus.quizzboardbackend.repository.UserRepository;
import com.iahorizonplus.quizzboardbackend.service.impl.QuizServiceImpl;
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
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class QuizServiceTest {

    @Mock
    private QuizRepository quizRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ClasseRepository classeRepository;

    @Mock
    private PlatformSettingsRepository settingsRepository;

    @InjectMocks
    private QuizServiceImpl quizService;

    private User freeCreator;
    private User starterCreator;
    private Quiz sampleQuiz;

    @BeforeEach
    void setUp() {
        freeCreator = User.builder()
                .id("creator-free")
                .prenom("Fatou")
                .nom("Sow")
                .subscriptionTier(SubscriptionTier.FREE)
                .build();

        starterCreator = User.builder()
                .id("creator-starter")
                .prenom("Moussa")
                .nom("Diop")
                .subscriptionTier(SubscriptionTier.STARTER)
                .build();

        Question question = Question.builder()
                .text("Quelle est la capitale du Sénégal ?")
                .points(100)
                .type(QuestionType.SINGLE_CHOICE)
                .choices(new ArrayList<>(List.of(
                        Choice.builder().text("Dakar").isCorrect(true).order(1).build(),
                        Choice.builder().text("Thiès").isCorrect(false).order(2).build()
                )))
                .build();

        sampleQuiz = Quiz.builder()
                .title("Quiz Géographie")
                .description("Test de connaissances générales")
                .category("Géographie")
                .difficulty("MEDIUM")
                .status(QuizStatus.PUBLISHED)
                .questions(new ArrayList<>(List.of(question)))
                .build();
    }

    @Test
    @DisplayName("Création d'un Quiz : Association bidirectionnelle des questions/choix et génération de code")
    void createQuiz_Success() {
        when(userRepository.findById("creator-free")).thenReturn(Optional.of(freeCreator));
        when(quizRepository.countCreatedOnPlatformByCreatorId("creator-free")).thenReturn(0L);
        when(quizRepository.save(any(Quiz.class))).thenAnswer(inv -> inv.getArgument(0));

        Quiz created = quizService.createQuiz(sampleQuiz, "creator-free", "Fatou Sow");

        assertThat(created).isNotNull();
        assertThat(created.getCreatorId()).isEqualTo("creator-free");
        assertThat(created.getShareCode()).startsWith("QM-");
        assertThat(created.getQuestions()).hasSize(1);
        assertThat(created.getQuestions().get(0).getQuiz()).isEqualTo(created);
        assertThat(created.getQuestions().get(0).getChoices().get(0).getQuestion())
                .isEqualTo(created.getQuestions().get(0));

        verify(quizRepository).save(sampleQuiz);
    }

    @Test
    @DisplayName("Contrôle de Quota FREE : Rejet si l'utilisateur possède déjà 3 quiz")
    void createQuiz_FreeUserQuotaReached_ThrowsIllegalStateException() {
        when(userRepository.findById("creator-free")).thenReturn(Optional.of(freeCreator));

        when(quizRepository.countCreatedOnPlatformByCreatorId("creator-free")).thenReturn(3L);

        assertThatThrownBy(() -> quizService.createQuiz(sampleQuiz, "creator-free", "Fatou Sow"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("3 quiz maximum");

        verify(quizRepository, never()).save(any(Quiz.class));
    }

    @Test
    @DisplayName("Forfait STARTER : Possibilité de créer plus de 3 quiz sans restriction")
    void createQuiz_StarterUserExceedsThreeQuizzes_Success() {
        when(userRepository.findById("creator-starter")).thenReturn(Optional.of(starterCreator));
        when(quizRepository.save(any(Quiz.class))).thenAnswer(inv -> inv.getArgument(0));

        Quiz created = quizService.createQuiz(sampleQuiz, "creator-starter", "Moussa Diop");

        assertThat(created).isNotNull();
        verify(quizRepository).save(any(Quiz.class));
    }

    @Test
    @DisplayName("Modification d'un Quiz : les questions existantes gardent leur id, les nouvelles sont créées")
    void updateQuiz_KeepsExistingQuestionIds() {
        Question existingQuestion = sampleQuiz.getQuestions().get(0);
        existingQuestion.setId("q-existant");
        existingQuestion.setQuiz(sampleQuiz);
        existingQuestion.getChoices().get(0).setId("c-dakar");
        sampleQuiz.setId("quiz-1");
        sampleQuiz.setCreatorId("creator-free");
        when(quizRepository.findById("quiz-1")).thenReturn(Optional.of(sampleQuiz));
        when(quizRepository.save(any(Quiz.class))).thenAnswer(inv -> inv.getArgument(0));

        Question edited = Question.builder().id("q-existant").text("Capitale du Sénégal ?").points(100)
                .choices(new ArrayList<>(List.of(
                        Choice.builder().id("c-dakar").text("Dakar").isCorrect(true).build(),
                        Choice.builder().id("c2").text("Saint-Louis").isCorrect(false).build())))
                .build();
        Question added = Question.builder().id("custom-q-123").text("Nouvelle question").points(100)
                .choices(new ArrayList<>(List.of(Choice.builder().id("c1").text("Oui").isCorrect(true).build())))
                .build();
        Quiz payload = Quiz.builder().questions(new ArrayList<>(List.of(edited, added))).build();

        Quiz updated = quizService.updateQuiz("quiz-1", payload, "creator-free");

        assertThat(updated.getQuestions()).hasSize(2);
        assertThat(updated.getQuestions().get(0)).isSameAs(existingQuestion);
        assertThat(updated.getQuestions().get(0).getText()).isEqualTo("Capitale du Sénégal ?");
        assertThat(updated.getQuestions().get(0).getChoices().get(0).getId()).isEqualTo("c-dakar");
        assertThat(updated.getQuestions().get(0).getChoices().get(1).getText()).isEqualTo("Saint-Louis");
        assertThat(updated.getQuestions().get(1).getId()).isNull();
        assertThat(updated.getQuestions().get(1).getQuiz()).isSameAs(updated);
        assertThat(updated.getTitle()).isEqualTo("Quiz Géographie");
    }

    @Test
    @DisplayName("Modification d'un Quiz : refusée à un formateur qui n'en est pas l'auteur")
    void updateQuiz_OtherCreator_ThrowsSecurityException() {
        sampleQuiz.setId("quiz-1");
        sampleQuiz.setCreatorId("creator-free");
        when(quizRepository.findById("quiz-1")).thenReturn(Optional.of(sampleQuiz));
        when(userRepository.findById("creator-starter")).thenReturn(Optional.of(starterCreator));

        assertThatThrownBy(() -> quizService.updateQuiz("quiz-1", new Quiz(), "creator-starter"))
                .isInstanceOf(SecurityException.class);
        verify(quizRepository, never()).save(any(Quiz.class));
    }

    @Test
    @DisplayName("Recherche par code de partage : normalisation et validation")
    void getQuizByShareCodeOrPin_Success() {
        when(quizRepository.findByShareCode("QZ-1234")).thenReturn(Optional.of(sampleQuiz));

        Quiz found = quizService.getQuizByShareCodeOrPin("  qz-1234  ");

        assertThat(found).isEqualTo(sampleQuiz);
    }
}
