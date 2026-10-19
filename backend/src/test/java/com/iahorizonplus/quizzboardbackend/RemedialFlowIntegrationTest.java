package com.iahorizonplus.quizzboardbackend;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.iahorizonplus.quizzboardbackend.entity.SubscriptionTier;
import com.iahorizonplus.quizzboardbackend.entity.User;
import com.iahorizonplus.quizzboardbackend.entity.UserRole;
import com.iahorizonplus.quizzboardbackend.repository.UserRepository;
import com.iahorizonplus.quizzboardbackend.security.JwtUtils;
import com.iahorizonplus.quizzboardbackend.service.AiService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Perfectionnement et contenus réservés à l'abonnement Apprenant Plus (parcours HTTP -> base H2) :
 * parcours créé après un quiz raté, verrouillé sans abonnement, généré et consultable avec Apprenant Plus ;
 * certificats verrouillés sans abonnement ; création de communauté par un apprenant.
 */
@SpringBootTest
@AutoConfigureMockMvc
class RemedialFlowIntegrationTest {

    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper json;
    @Autowired private UserRepository userRepository;
    @Autowired private JwtUtils jwtUtils;
    @Autowired private PasswordEncoder passwordEncoder;

    @MockitoBean private AiService aiService;

    private User newUser(UserRole role) {
        return userRepository.save(User.builder()
                .prenom("Test").nom(role.name()).email(role.name().toLowerCase() + "-" + UUID.randomUUID() + "@test.local")
                .password(passwordEncoder.encode("Test1234!"))
                .role(role).subscriptionTier(SubscriptionTier.FREE).status("ACTIVE").build());
    }

    private void subscribeLearnerPlus(User user) {
        User fresh = userRepository.findById(user.getId()).orElseThrow();
        fresh.setSubscriptionTier(SubscriptionTier.LEARNER_PLUS);
        fresh.setSubscriptionExpiresAt(LocalDateTime.now().plusMonths(1));
        userRepository.save(fresh);
    }

    private String token(User user) {
        return "Bearer " + jwtUtils.generateToken(user.getEmail(), user.getRole().name());
    }

    private JsonNode send(ResultActions actions) throws Exception {
        return json.readTree(actions.andReturn().getResponse().getContentAsString());
    }

    private ResultActions postAs(String url, Object body, User user) throws Exception {
        return mvc.perform(post(url).header("Authorization", token(user))
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body)));
    }

    private ResultActions getAs(String url, User user) throws Exception {
        return mvc.perform(get(url).header("Authorization", token(user)));
    }

    private String createQuiz(User creator, int questionsCount) throws Exception {
        List<Map<String, Object>> questions = new ArrayList<>();
        for (int i = 1; i <= questionsCount; i++) {
            questions.add(Map.of("id", "q-" + i, "text", "Question " + i, "type", "SINGLE_CHOICE",
                    "timeLimitSeconds", 30, "points", 100, "order", i,
                    "choices", List.of(
                            Map.of("id", "c1", "text", "Bonne réponse " + i, "isCorrect", true, "order", 1),
                            Map.of("id", "c2", "text", "Mauvaise réponse " + i, "isCorrect", false, "order", 2))));
        }
        Map<String, Object> payload = Map.of("title", "Les jointures SQL", "category", "Data", "difficulty", "MEDIUM",
                "status", "PUBLISHED", "visibility", "PUBLIC", "questionsCount", questionsCount, "questions", questions,
                "createdAt", LocalDate.now().toString());
        return send(postAs("/quizzes", payload, creator).andExpect(status().isCreated())).at("/data/id").asText();
    }

    /** Joue le quiz : les « goodAnswers » premières questions justes, les suivantes fausses. */
    private JsonNode play(String quizId, User learner, int goodAnswers) throws Exception {
        JsonNode quiz = send(getAs("/quizzes/" + quizId, learner)).at("/data");
        List<Map<String, Object>> answers = new ArrayList<>();
        int index = 0;
        for (JsonNode q : quiz.at("/questions")) {
            boolean wantGood = index++ < goodAnswers;
            String choiceId = null;
            for (JsonNode c : q.at("/choices")) {
                if (c.at("/isCorrect").asBoolean() == wantGood) choiceId = c.at("/id").asText();
            }
            answers.add(Map.of("questionId", q.at("/id").asText(), "selectedChoiceIds", List.of(choiceId), "timeSpentSeconds", 2));
        }
        return send(postAs("/participations", Map.of("quizId", quizId, "participantName", "Test LEARNER", "status", "COMPLETED",
                "timeTotalSeconds", 6, "answers", answers), learner).andExpect(status().isCreated())).at("/data");
    }

    private ObjectNode generatedContent() {
        ObjectNode content = json.createObjectNode();
        content.putArray("chapters").addObject().put("order", 1).put("title", "Revoir les jointures")
                .put("summary", "INNER JOIN et LEFT JOIN").put("content", "Un **INNER JOIN** ne garde que les lignes communes.").put("estimatedMinutes", 5);
        ObjectNode question = content.putArray("questions").addObject();
        question.put("id", "rq-1").put("text", "Que renvoie un LEFT JOIN ?").put("type", "SINGLE_CHOICE")
                .put("timeLimitSeconds", 30).put("points", 100).put("order", 1).put("explanation", "Toutes les lignes de gauche.");
        question.putArray("choices").addObject().put("id", "rc-1").put("text", "Toutes les lignes de la table de gauche").put("isCorrect", true).put("order", 1);
        return content;
    }

    private JsonNode waitForStatus(User learner, String expected) throws Exception {
        JsonNode pack = null;
        for (int i = 0; i < 60; i++) {
            pack = send(getAs("/remedial/my", learner)).at("/data/0");
            if (expected.equals(pack.at("/status").asText())) return pack;
            Thread.sleep(100);
        }
        return pack;
    }

    @Test
    void failedQuiz_LockedWithoutLearnerPlus_GeneratedAndUsableWithLearnerPlus() throws Exception {
        when(aiService.generateRemedialContent(anyString(), anyDouble(), anyList())).thenReturn(generatedContent());
        String quizId = createQuiz(newUser(UserRole.CREATOR), 3);
        User learner = newUser(UserRole.LEARNER);

        JsonNode participation = play(quizId, learner, 1);
        assertThat(participation.at("/percentage").asDouble()).isLessThan(70.0);

        // Sans abonnement : le parcours existe, verrouillé, sans contenu ni appel à l'IA
        JsonNode packs = send(getAs("/remedial/my", learner).andExpect(status().isOk())).at("/data");
        assertThat(packs.size()).isEqualTo(1);
        JsonNode pack = packs.get(0);
        assertThat(pack.at("/locked").asBoolean()).isTrue();
        assertThat(pack.at("/missedCount").asInt()).isEqualTo(2);
        assertThat(pack.at("/missedNotions").size()).isZero();
        assertThat(pack.at("/content").isNull() || pack.at("/content").isMissingNode()).isTrue();
        verify(aiService, never()).generateRemedialContent(anyString(), anyDouble(), anyList());
        JsonNode refused = send(getAs("/remedial/" + pack.at("/id").asText(), learner).andExpect(status().isForbidden()));
        assertThat(refused.at("/message").asText()).contains("Apprenant Plus");

        // Avec Apprenant Plus : le parcours est préparé puis consultable
        subscribeLearnerPlus(learner);
        pack = waitForStatus(learner, "READY");
        assertThat(pack.at("/status").asText()).isEqualTo("READY");
        assertThat(pack.at("/locked").asBoolean()).isFalse();
        JsonNode full = send(getAs("/remedial/" + pack.at("/id").asText(), learner).andExpect(status().isOk())).at("/data");
        assertThat(full.at("/content/chapters").size()).isEqualTo(1);
        assertThat(full.at("/content/questions/0/choices/0/isCorrect").asBoolean()).isTrue();
        assertThat(full.at("/missedNotions").toString()).contains("Question 2", "Bonne réponse 2").doesNotContain("Question 1 ");
        verify(aiService).generateRemedialContent(eq("Les jointures SQL"), anyDouble(), argThat(list -> list.size() == 2));

        JsonNode practiced = send(postAs("/remedial/" + pack.at("/id").asText() + "/practice", Map.of("percentage", 80), learner)
                .andExpect(status().isOk())).at("/data");
        assertThat(practiced.at("/bestPracticeScore").asDouble()).isEqualTo(80.0);
        assertThat(practiced.at("/practiceAttempts").asInt()).isEqualTo(1);

        // Un parcours n'est visible que par son propriétaire
        getAs("/remedial/" + pack.at("/id").asText(), newUser(UserRole.LEARNER)).andExpect(status().isNotFound());
    }

    @Test
    void passedQuizOrCreator_NoRemedialPack() throws Exception {
        User creator = newUser(UserRole.CREATOR);
        String quizId = createQuiz(creator, 3);
        User learner = newUser(UserRole.LEARNER);
        play(quizId, learner, 3);
        assertThat(send(getAs("/remedial/my", learner)).at("/data").size()).isZero();

        User otherCreator = newUser(UserRole.CREATOR);
        play(quizId, otherCreator, 0);
        assertThat(send(getAs("/remedial/my", otherCreator)).at("/data").size()).isZero();
    }

    @Test
    void certificates_LockedWithoutLearnerPlus() throws Exception {
        String quizId = createQuiz(newUser(UserRole.CREATOR), 2);
        User learner = newUser(UserRole.LEARNER);
        String certificateId = play(quizId, learner, 2).at("/certificateId").asText();
        assertThat(certificateId).isNotBlank();

        JsonNode locked = send(getAs("/certificates/my", learner).andExpect(status().isOk())).at("/data/0");
        assertThat(locked.at("/locked").asBoolean()).isTrue();
        assertThat(locked.at("/quizTitle").asText()).isEqualTo("Les jointures SQL");
        assertThat(locked.at("/verificationCode").isNull()).isTrue();
        JsonNode refused = send(getAs("/certificates/" + certificateId, learner).andExpect(status().isForbidden()));
        assertThat(refused.at("/message").asText()).contains("Apprenant Plus");

        subscribeLearnerPlus(learner);
        JsonNode unlocked = send(getAs("/certificates/my", learner)).at("/data/0");
        assertThat(unlocked.at("/locked").asBoolean()).isFalse();
        assertThat(unlocked.at("/verificationCode").asText()).startsWith("QZ-");
        getAs("/certificates/" + certificateId, learner).andExpect(status().isOk());
    }

    @Test
    void learner_CanCreateOneCommunityOnFreePlan() throws Exception {
        User learner = newUser(UserRole.LEARNER);
        Map<String, Object> community = Map.of("name", "Révisions BAC " + UUID.randomUUID(), "description", "Entraide", "category", "Data & IA", "isPrivate", false);
        JsonNode created = send(postAs("/communities", community, learner).andExpect(status().isCreated())).at("/data");
        assertThat(created.at("/creatorId").asText()).isEqualTo(learner.getId());

        JsonNode refused = send(postAs("/communities", Map.of("name", "Deuxième", "description", "x", "category", "Data & IA"), learner)
                .andExpect(status().isBadRequest()));
        assertThat(refused.toString()).contains("Apprenant Plus");

        subscribeLearnerPlus(learner);
        postAs("/communities", Map.of("name", "Deuxième", "description", "x", "category", "Data & IA"), learner).andExpect(status().isCreated());
    }
}
