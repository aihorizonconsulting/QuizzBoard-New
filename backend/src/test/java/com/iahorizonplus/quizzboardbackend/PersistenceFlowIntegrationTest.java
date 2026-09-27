package com.iahorizonplus.quizzboardbackend;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.iahorizonplus.quizzboardbackend.entity.SubscriptionTier;
import com.iahorizonplus.quizzboardbackend.entity.User;
import com.iahorizonplus.quizzboardbackend.entity.UserRole;
import com.iahorizonplus.quizzboardbackend.repository.UserRepository;
import com.iahorizonplus.quizzboardbackend.security.JwtUtils;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Parcours réels (HTTP -> base H2) des fonctionnalités signalées : promotions, classes,
 * quiz assignés, inscription des apprenants, réponses enregistrées, connexion sans choix de rôle.
 * Les payloads reprennent ceux envoyés par le frontend (ids temporaires, champs en trop, dates seules).
 */
@SpringBootTest
@AutoConfigureMockMvc
class PersistenceFlowIntegrationTest {

    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper json;
    @Autowired private UserRepository userRepository;
    @Autowired private JwtUtils jwtUtils;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JdbcTemplate jdbc;

    private User newUser(UserRole role) {
        String email = role.name().toLowerCase() + "-" + UUID.randomUUID() + "@test.local";
        return userRepository.save(User.builder()
                .prenom("Test").nom(role.name()).email(email)
                .password(passwordEncoder.encode("Test1234!"))
                .role(role).subscriptionTier(SubscriptionTier.FREE).status("ACTIVE").build());
    }

    private String token(User user) {
        return "Bearer " + jwtUtils.generateToken(user.getEmail(), user.getRole().name());
    }

    private JsonNode send(ResultActions actions) throws Exception {
        String body = actions.andReturn().getResponse().getContentAsString();
        return json.readTree(body);
    }

    private ResultActions post(String url, Object body, User user) throws Exception {
        var req = org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post(url)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body));
        return mvc.perform(user != null ? req.header("Authorization", token(user)) : req);
    }

    private ResultActions putJson(String url, Object body, User user) throws Exception {
        return mvc.perform(put(url).header("Authorization", token(user))
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body)));
    }

    private ResultActions getAs(String url, User user) throws Exception {
        return mvc.perform(get(url).header("Authorization", token(user)));
    }

    private Map<String, Object> quizPayload(String title, int questionsCount) {
        List<Map<String, Object>> questions = new ArrayList<>();
        for (int i = 1; i <= questionsCount; i++) {
            questions.add(Map.of(
                    "id", "custom-q-" + i, "text", "Question " + i, "type", "SINGLE_CHOICE",
                    "timeLimitSeconds", 30, "points", 100, "order", i,
                    "choices", List.of(
                            Map.of("id", "c1", "text", "Bonne réponse", "isCorrect", true, "order", 1),
                            Map.of("id", "c2", "text", "Mauvaise réponse", "isCorrect", false, "order", 2))));
        }
        return Map.of("id", "quiz-" + System.nanoTime(), "title", title, "category", "Cloud & DevOps",
                "difficulty", "MEDIUM", "status", "PUBLISHED", "visibility", "PRIVATE",
                "shareCode", "QM-1234", "questionsCount", questionsCount, "questions", questions,
                "createdAt", LocalDate.now().toString());
    }

    @Test
    void login_ExistingAccount_NeverAsksForRole() throws Exception {
        User learner = newUser(UserRole.LEARNER);
        for (int i = 0; i < 2; i++) {
            JsonNode res = send(post("/auth/login", Map.of("email", learner.getEmail(), "password", "Test1234!"), null)
                    .andExpect(status().isOk()));
            assertThat(res.at("/data/requiresRoleSelection").asBoolean()).isFalse();
            assertThat(res.at("/data/token").asText()).isNotBlank();
        }
    }

    @Test
    void freeQuota_IgnoresQuizzesImportedFromLegacyPlatform() throws Exception {
        User creator = newUser(UserRole.CREATOR);
        for (int i = 0; i < 5; i++) {
            jdbc.update("insert into quizzes (id, title, category, difficulty, status, creator_id, share_code, visibility) values (?,?,?,?,?,?,?,?)",
                    "cmlegacy" + i + UUID.randomUUID().toString().substring(0, 8), "Ancien quiz " + i, "Général", "MEDIUM",
                    "PUBLISHED", creator.getId(), "LEGACY" + UUID.randomUUID(), "PUBLIC");
        }
        for (int i = 1; i <= 3; i++) {
            post("/quizzes", quizPayload("Nouveau quiz " + i, 20), creator).andExpect(status().isCreated());
        }
        JsonNode refused = send(post("/quizzes", quizPayload("Quiz de trop", 2), creator).andExpect(status().isBadRequest()));
        assertThat(refused.at("/message").asText()).contains("3 quiz maximum");

        JsonNode mine = send(getAs("/quizzes?my=true", creator).andExpect(status().isOk()));
        assertThat(mine.at("/data").size()).isEqualTo(8);
    }

    @Test
    void quiz_CreatedWithDuplicateShareCode_GetsUniqueCode_AndEditKeepsQuestionIds() throws Exception {
        User creator = newUser(UserRole.CREATOR);
        JsonNode first = send(post("/quizzes", quizPayload("Quiz A", 3), creator).andExpect(status().isCreated())).at("/data");
        JsonNode second = send(post("/quizzes", quizPayload("Quiz B", 3), creator).andExpect(status().isCreated())).at("/data");
        assertThat(second.at("/shareCode").asText()).isNotEqualTo(first.at("/shareCode").asText());

        String quizId = first.at("/id").asText();
        String q1Id = first.at("/questions/0/id").asText();
        Map<?, ?> edit = json.convertValue(first, Map.class);
        List<Map<String, Object>> questions = new ArrayList<>((List<Map<String, Object>>) edit.get("questions"));
        questions.get(0).put("text", "Question 1 modifiée");
        questions.remove(2);
        questions.add(Map.of("id", "custom-q-new", "text", "Question ajoutée", "type", "SINGLE_CHOICE", "points", 100,
                "choices", List.of(Map.of("id", "c1", "text", "Oui", "isCorrect", true))));
        ((Map<String, Object>) edit).put("questions", questions);
        putJson("/quizzes/" + quizId, edit, creator).andExpect(status().isOk());

        JsonNode reloaded = send(getAs("/quizzes/" + quizId, creator)).at("/data");
        assertThat(reloaded.at("/questions").size()).isEqualTo(3);
        assertThat(reloaded.at("/questions/0/id").asText()).isEqualTo(q1Id);
        assertThat(reloaded.at("/questions/0/text").asText()).isEqualTo("Question 1 modifiée");
        assertThat(reloaded.at("/questions/2/text").asText()).isEqualTo("Question ajoutée");
    }

    @Test
    void promotions_PersistWithBusinessRules() throws Exception {
        User creator = newUser(UserRole.CREATOR);
        Map<String, Object> base = Map.of("code", "P5", "label", "x", "year", "2026 - 2027", "startDate", "2026-09-01",
                "endDate", "2027-06-30", "classesCount", 0, "studentsCount", 0, "createdAt", LocalDate.now().toString());
        Map<String, Object> promoA = new java.util.HashMap<>(base);
        promoA.putAll(Map.of("id", "promo-1111", "name", "Promotion A", "status", "IN_PROGRESS", "isActive", true));
        JsonNode a = send(post("/promotions", promoA, creator).andExpect(status().isCreated())).at("/data");
        assertThat(a.at("/isActive").asBoolean()).isTrue();

        Map<String, Object> promoB = new java.util.HashMap<>(base);
        promoB.putAll(Map.of("id", "promo-2222", "name", "Promotion B", "status", "UPCOMING", "isActive", false));
        JsonNode b = send(post("/promotions", promoB, creator).andExpect(status().isCreated())).at("/data");

        // Démarrer B archive A (une seule promotion en cours) et rend B active
        Map<String, Object> startB = json.convertValue(b, Map.class);
        startB.put("status", "IN_PROGRESS");
        putJson("/promotions/" + b.at("/id").asText(), startB, creator).andExpect(status().isOk());

        JsonNode list = send(getAs("/promotions", creator)).at("/data");
        assertThat(list.size()).isEqualTo(2);
        for (JsonNode p : list) {
            if (p.at("/id").asText().equals(a.at("/id").asText())) {
                assertThat(p.at("/status").asText()).isEqualTo("ARCHIVED");
                assertThat(p.at("/isActive").asBoolean()).isFalse();
            } else {
                assertThat(p.at("/status").asText()).isEqualTo("IN_PROGRESS");
                assertThat(p.at("/isActive").asBoolean()).isTrue();
            }
        }

        // Une promotion archivée est en lecture seule
        Map<String, Object> reopenA = json.convertValue(a, Map.class);
        reopenA.put("status", "IN_PROGRESS");
        putJson("/promotions/" + a.at("/id").asText(), reopenA, creator).andExpect(status().isBadRequest());

        // Un autre formateur ne voit ni ne modifie ces promotions
        User other = newUser(UserRole.CREATOR);
        assertThat(send(getAs("/promotions", other)).at("/data").size()).isZero();
        mvc.perform(put("/promotions/" + b.at("/id").asText() + "/activate").header("Authorization", token(other)))
                .andExpect(status().isForbidden());
    }

    @Test
    void classes_QuizAssignment_StudentJoin_AndAnswersArePersisted() throws Exception {
        User creator = newUser(UserRole.CREATOR);
        JsonNode promo = send(post("/promotions", Map.of("name", "Promo Classe", "year", "2026 - 2027", "status", "IN_PROGRESS"), creator)
                .andExpect(status().isCreated())).at("/data");

        // Payload identique au frontend (id temporaire, champs calculés, date seule)
        String code = "CL-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        Map<String, Object> classPayload = new java.util.HashMap<>(Map.of("id", "classe-" + System.nanoTime(), "name", "Licence 3 Info",
                "level", "Licence 3", "code", code, "description", "", "promotionId", promo.at("/id").asText(),
                "creatorId", "u1", "creatorName", "Professeur", "color", "#032447", "studentsCount", 0));
        classPayload.putAll(Map.of("students", List.of(), "assignedQuizIds", List.of(), "createdAt", LocalDate.now().toString()));
        JsonNode classe = send(post("/classes", classPayload, creator).andExpect(status().isCreated())).at("/data");
        String classId = classe.at("/id").asText();
        assertThat(classe.at("/promotionLabel").asText()).isEqualTo("Promo Classe");
        assertThat(classe.at("/studentsCount").asInt()).isZero();

        // Code déjà pris -> refus explicite
        post("/classes", classPayload, creator).andExpect(status().isBadRequest());

        // Assignation d'un quiz privé : persistée des deux côtés
        JsonNode quiz = send(post("/quizzes", quizPayload("Quiz de classe", 2), creator).andExpect(status().isCreated())).at("/data");
        String quizId = quiz.at("/id").asText();
        mvc.perform(put("/classes/" + classId + "/quizzes/" + quizId).header("Authorization", token(creator))).andExpect(status().isOk());
        assertThat(send(getAs("/classes/" + classId, creator)).at("/data/assignedQuizIds/0").asText()).isEqualTo(quizId);
        assertThat(send(getAs("/quizzes/" + quizId, creator)).at("/data/assignedClassIds/0").asText()).isEqualTo(classId);

        // L'apprenant rejoint la classe par son code et voit le quiz assigné
        User learner = newUser(UserRole.LEARNER);
        post("/classes/join", Map.of("code", code.toLowerCase()), learner).andExpect(status().isOk());
        post("/classes/join", Map.of("code", code), learner).andExpect(status().isOk()); // idempotent
        JsonNode learnerClasses = send(getAs("/classes", learner)).at("/data");
        assertThat(learnerClasses.size()).isEqualTo(1);
        assertThat(learnerClasses.at("/0/studentsCount").asInt()).isEqualTo(1);
        JsonNode classQuizzes = send(getAs("/classes/" + classId + "/quizzes", learner).andExpect(status().isOk())).at("/data");
        assertThat(classQuizzes.at("/0/id").asText()).isEqualTo(quizId);

        // Un apprenant non inscrit n'y a pas accès
        getAs("/classes/" + classId + "/quizzes", newUser(UserRole.LEARNER)).andExpect(status().isForbidden());

        // Réponses : justesse et score calculés par le serveur, même si le navigateur envoie autre chose
        JsonNode q1 = classQuizzes.at("/0/questions/0");
        JsonNode q2 = classQuizzes.at("/0/questions/1");
        String goodChoice = q1.at("/choices/0/isCorrect").asBoolean() ? q1.at("/choices/0/id").asText() : q1.at("/choices/1/id").asText();
        String badChoice = q2.at("/choices/0/isCorrect").asBoolean() ? q2.at("/choices/1/id").asText() : q2.at("/choices/0/id").asText();
        Map<String, Object> participation = Map.of("quizId", quizId, "classId", classId, "className", "Licence 3 Info",
                "participantName", "Test LEARNER", "score", 999, "maxScore", 999, "percentage", 100, "timeTotalSeconds", 20,
                "status", "COMPLETED", "answers", List.of(
                        Map.of("questionId", q1.at("/id").asText(), "selectedChoiceIds", List.of(goodChoice), "isCorrect", false, "timeSpentSeconds", 5, "pointsEarned", 0),
                        Map.of("questionId", q2.at("/id").asText(), "selectedChoiceIds", List.of(badChoice), "isCorrect", true, "timeSpentSeconds", 5, "pointsEarned", 100)));
        JsonNode saved = send(post("/participations", participation, learner).andExpect(status().isCreated())).at("/data");
        assertThat(saved.at("/score").asInt()).isEqualTo(100);
        assertThat(saved.at("/maxScore").asInt()).isEqualTo(200);
        assertThat(saved.at("/percentage").asDouble()).isEqualTo(50.0);

        JsonNode history = send(getAs("/participations/my", learner)).at("/data");
        assertThat(history.size()).isEqualTo(1);
        assertThat(history.at("/0/answers").size()).isEqualTo(2);
        long correct = 0;
        for (JsonNode ans : history.at("/0/answers")) {
            if (ans.at("/isCorrect").asBoolean()) correct++;
        }
        assertThat(correct).isEqualTo(1);

        // Retrait du quiz puis suppression de la classe : plus de référence orpheline
        mvc.perform(delete("/classes/" + classId + "/quizzes/" + quizId).header("Authorization", token(creator))).andExpect(status().isOk());
        assertThat(send(getAs("/quizzes/" + quizId, creator)).at("/data/assignedClassIds").size()).isZero();
        mvc.perform(delete("/classes/" + classId).header("Authorization", token(creator))).andExpect(status().isOk());
        assertThat(send(getAs("/classes", learner)).at("/data").size()).isZero();
    }

    @Test
    void courses_ChapterChangesArePersisted() throws Exception {
        User creator = newUser(UserRole.CREATOR);
        Map<String, Object> course = Map.of("title", "Cours Docker", "description", "d", "category", "DevOps", "level", "BEGINNER",
                "status", "DRAFT", "estimatedHours", 4, "chapters", List.of(
                        Map.of("id", "ch-tmp-1", "title", "Chapitre 1", "summary", "s1", "content", "c1", "estimatedMinutes", 30, "hasQuiz", true),
                        Map.of("id", "ch-tmp-2", "title", "Chapitre 2", "summary", "s2", "content", "c2", "estimatedMinutes", 30, "hasQuiz", false)));
        JsonNode created = send(post("/courses", course, creator).andExpect(status().isCreated())).at("/data");
        String courseId = created.at("/id").asText();
        String ch1Id = created.at("/chapters/0/id").asText();

        // Les brouillons du formateur sont bien listés avec ?my=true
        JsonNode mine = send(getAs("/courses?my=true", creator)).at("/data");
        assertThat(mine.size()).isEqualTo(1);

        Map<String, Object> edit = json.convertValue(created, Map.class);
        List<Map<String, Object>> chapters = new ArrayList<>((List<Map<String, Object>>) edit.get("chapters"));
        chapters.get(0).put("title", "Chapitre 1 revu");
        chapters.remove(1);
        chapters.add(Map.of("id", "gen-ch-999", "title", "Chapitre ajouté", "estimatedMinutes", 20, "hasQuiz", true));
        edit.put("chapters", chapters);
        putJson("/courses/" + courseId, edit, creator).andExpect(status().isOk());

        JsonNode reloaded = send(getAs("/courses/" + courseId, creator)).at("/data");
        assertThat(reloaded.at("/chapters").size()).isEqualTo(2);
        assertThat(reloaded.at("/chapters/0/id").asText()).isEqualTo(ch1Id);
        assertThat(reloaded.at("/chapters/0/title").asText()).isEqualTo("Chapitre 1 revu");
        assertThat(reloaded.at("/chapters/1/title").asText()).isEqualTo("Chapitre ajouté");
    }

    @Test
    void communities_TopicsCommentsAndMembershipArePersisted() throws Exception {
        User creator = newUser(UserRole.CREATOR);
        JsonNode community = send(post("/communities", Map.of("name", "Club Cloud", "category", "Tech", "description", "d", "isPrivate", false), creator)
                .andExpect(status().isCreated())).at("/data");
        String communityId = community.at("/id").asText();
        String accessCode = community.at("/accessCode").asText();

        User learner = newUser(UserRole.LEARNER);
        post("/communities/join", Map.of("accessCode", accessCode), learner).andExpect(status().isOk());
        JsonNode topic = send(post("/communities/" + communityId + "/topics", Map.of("title", "Question", "content", "Comment déployer ?"), learner)
                .andExpect(status().isCreated())).at("/data");
        post("/communities/topics/" + topic.at("/id").asText() + "/comments", Map.of("content", "Avec Docker Compose"), creator)
                .andExpect(status().isCreated());

        JsonNode reloaded = send(getAs("/communities/" + communityId, learner)).at("/data");
        assertThat(reloaded.at("/isPrivate").asBoolean()).isFalse();
        assertThat(reloaded.at("/membersCount").asInt()).isEqualTo(2);
        assertThat(reloaded.at("/topicsCount").asInt()).isEqualTo(1);
        assertThat(reloaded.at("/topics/0/commentsCount").asInt()).isEqualTo(1);
        boolean learnerIsMember = false;
        for (JsonNode m : reloaded.at("/members")) {
            if (m.at("/userId").asText().equals(learner.getId())) learnerIsMember = true;
        }
        assertThat(learnerIsMember).isTrue();
    }

    @Test
    void subscription_PaidTierRequiresPayment_AndPasswordHashIsNeverExposed() throws Exception {
        User creator = newUser(UserRole.CREATOR);
        post("/subscriptions/subscribe", Map.of("tier", "STARTER"), creator).andExpect(status().isBadRequest());
        assertThat(userRepository.findById(creator.getId()).orElseThrow().getSubscriptionTier()).isEqualTo(SubscriptionTier.FREE);
        post("/subscriptions/subscribe", Map.of("tier", "FREE"), creator).andExpect(status().isOk());

        User admin = newUser(UserRole.ADMIN);
        String users = getAs("/admin/users", admin).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertThat(users).doesNotContain("\"password\"").doesNotContain("passwordResetToken");
    }

    @Test
    void classes_OtherCreatorCannotModifyOrDelete() throws Exception {
        User owner = newUser(UserRole.CREATOR);
        JsonNode classe = send(post("/classes", Map.of("name", "Classe privée", "code", "CL-" + UUID.randomUUID().toString().substring(0, 6), "level", "Master 1"), owner)
                .andExpect(status().isCreated())).at("/data");
        User intruder = newUser(UserRole.CREATOR);
        mvc.perform(delete("/classes/" + classe.at("/id").asText()).header("Authorization", token(intruder))).andExpect(status().isForbidden());
        post("/classes/" + classe.at("/id").asText() + "/students", Map.of("prenom", "A", "nom", "B", "email", "a@b.sn"), intruder)
                .andExpect(status().isForbidden());
        assertThat(send(getAs("/classes", intruder)).at("/data").size()).isZero();
        assertThat(send(getAs("/classes", owner)).at("/data").size()).isEqualTo(1);
    }
}
