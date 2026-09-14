package com.iahorizonplus.quizzboardbackend.service;

import com.iahorizonplus.quizzboardbackend.dto.request.AiQuizGenerateRequest;
import com.iahorizonplus.quizzboardbackend.entity.*;
import com.iahorizonplus.quizzboardbackend.exception.BadRequestException;
import com.iahorizonplus.quizzboardbackend.repository.*;
import com.iahorizonplus.quizzboardbackend.service.impl.AiServiceImpl;
import com.iahorizonplus.quizzboardbackend.service.impl.CommunityServiceImpl;
import com.iahorizonplus.quizzboardbackend.service.impl.QuizServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class QuotaEnforcementTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private QuizRepository quizRepository;

    @Mock
    private CommunityRepository communityRepository;

    @Mock
    private CommunityMemberRepository memberRepository;

    @Mock
    private CourseRepository courseRepository;

    @InjectMocks
    private QuizServiceImpl quizService;

    @InjectMocks
    private CommunityServiceImpl communityService;

    @InjectMocks
    private AiServiceImpl aiService;

    private User freeUser;
    private User starterUser;

    @BeforeEach
    void setUp() {
        freeUser = User.builder()
                .id("usr-free")
                .email("free@quizzboard.com")
                .prenom("Aissatou")
                .nom("Diallo")
                .subscriptionTier(SubscriptionTier.FREE)
                .build();

        starterUser = User.builder()
                .id("usr-starter")
                .email("starter@quizzboard.com")
                .prenom("Cheikh")
                .nom("Ndiaye")
                .subscriptionTier(SubscriptionTier.STARTER)
                .build();
    }

    @Test
    @DisplayName("Quota Quiz FREE : Rejet immédiat si un utilisateur FREE tente de créer un 4ème quiz")
    void quizQuota_FreeTierExceeded_ThrowsIllegalStateException() {
        when(userRepository.findById("usr-free")).thenReturn(Optional.of(freeUser));
        when(quizRepository.findByCreatorIdOrderByCreatedAtDesc("usr-free"))
                .thenReturn(List.of(new Quiz(), new Quiz(), new Quiz()));

        Quiz newQuiz = Quiz.builder().title("Quiz 4").build();

        assertThatThrownBy(() -> quizService.createQuiz(newQuiz, "usr-free", "Aissatou Diallo"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Limite du forfait FREE atteinte (3 quiz maximum)");

        verify(quizRepository, never()).save(any(Quiz.class));
    }

    @Test
    @DisplayName("Quota Communauté FREE : Rejet si un utilisateur FREE tente de créer une 2ème communauté")
    void communityQuota_FreeTierExceeded_ThrowsBadRequestException() {
        when(userRepository.findById("usr-free")).thenReturn(Optional.of(freeUser));
        when(communityRepository.countByCreatorId("usr-free")).thenReturn(1L);

        Community community = Community.builder().name("Communauté Dev").category("Tech").build();

        assertThatThrownBy(() -> communityService.createCommunity(community, "usr-free", "Aissatou Diallo"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Limite du forfait DÉCOUVERTE atteinte (1 communauté maximum)");

        verify(communityRepository, never()).save(any(Community.class));
    }

    @Test
    @DisplayName("Quota Communauté STARTER : Rejet si un utilisateur STARTER tente de créer une 11ème communauté")
    void communityQuota_StarterTierExceeded_ThrowsBadRequestException() {
        when(userRepository.findById("usr-starter")).thenReturn(Optional.of(starterUser));
        when(communityRepository.countByCreatorId("usr-starter")).thenReturn(10L);

        Community community = Community.builder().name("Communauté 11").category("Science").build();

        assertThatThrownBy(() -> communityService.createCommunity(community, "usr-starter", "Cheikh Ndiaye"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Limite du forfait STARTER atteinte (10 communautés maximum)");

        verify(communityRepository, never()).save(any(Community.class));
    }

    @Test
    @DisplayName("Quota IA FREE : Rejet si un utilisateur FREE dépasse 5 requêtes IA mensuelles")
    void aiQuota_FreeTierExceeded_ThrowsBadRequestException() {
        when(userRepository.findByEmail("free@quizzboard.com")).thenReturn(Optional.of(freeUser));
        when(courseRepository.countByCreatorIdAndCreatedAtAfter(eq("usr-free"), any())).thenReturn(5L);

        AiQuizGenerateRequest request = new AiQuizGenerateRequest("Intelligence Artificielle", 5, "MEDIUM");

        assertThatThrownBy(() -> aiService.generateQuizQuestions(request, "free@quizzboard.com"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Quota mensuel IA épuisé pour le forfait DÉCOUVERTE (5 générations/mois)");
    }

    @Test
    @DisplayName("Quota IA STARTER : Rejet si un utilisateur STARTER dépasse 100 requêtes IA mensuelles")
    void aiQuota_StarterTierExceeded_ThrowsBadRequestException() {
        when(userRepository.findByEmail("starter@quizzboard.com")).thenReturn(Optional.of(starterUser));
        when(courseRepository.countByCreatorIdAndCreatedAtAfter(eq("usr-starter"), any())).thenReturn(100L);

        AiQuizGenerateRequest request = new AiQuizGenerateRequest("Cloud Computing", 10, "HARD");

        assertThatThrownBy(() -> aiService.generateQuizQuestions(request, "starter@quizzboard.com"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Quota mensuel IA épuisé pour le forfait STARTER (100 générations/mois)");
    }
}
