package com.iahorizonplus.quizzboardbackend.service;

import com.iahorizonplus.quizzboardbackend.entity.*;
import com.iahorizonplus.quizzboardbackend.exception.ResourceNotFoundException;
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
        when(quizRepository.findByCreatorIdOrderByCreatedAtDesc("creator-free")).thenReturn(List.of());
        when(quizRepository.save(any(Quiz.class))).thenAnswer(inv -> inv.getArgument(0));

        Quiz created = quizService.createQuiz(sampleQuiz, "creator-free", "Fatou Sow");

        assertThat(created).isNotNull();
        assertThat(created.getCreatorId()).isEqualTo("creator-free");
        assertThat(created.getShareCode()).startsWith("QM-");
        assertThat(created.getQuestions()).hasSize(1);
        assertThat(created.getQuestions().getFirst().getQuiz()).isEqualTo(created);
        assertThat(created.getQuestions().getFirst().getChoices().getFirst().getQuestion())
                .isEqualTo(created.getQuestions().getFirst());

        verify(quizRepository).save(sampleQuiz);
    }

    @Test
    @DisplayName("Contrôle de Quota FREE : Rejet si l'utilisateur possède déjà 3 quiz")
    void createQuiz_FreeUserQuotaReached_ThrowsIllegalStateException() {
        when(userRepository.findById("creator-free")).thenReturn(Optional.of(freeCreator));
        List<Quiz> existingThreeQuizzes = List.of(new Quiz(), new Quiz(), new Quiz());
        when(quizRepository.findByCreatorIdOrderByCreatedAtDesc("creator-free")).thenReturn(existingThreeQuizzes);

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
    @DisplayName("Recherche par code de partage : normalisation et validation")
    void getQuizByShareCodeOrPin_Success() {
        when(quizRepository.findByShareCode("QZ-1234")).thenReturn(Optional.of(sampleQuiz));

        Quiz found = quizService.getQuizByShareCodeOrPin("  qz-1234  ");

        assertThat(found).isEqualTo(sampleQuiz);
    }
}
