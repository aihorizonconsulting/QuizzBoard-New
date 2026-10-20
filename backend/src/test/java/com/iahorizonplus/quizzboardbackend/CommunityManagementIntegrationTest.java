package com.iahorizonplus.quizzboardbackend;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.iahorizonplus.quizzboardbackend.entity.SubscriptionTier;
import com.iahorizonplus.quizzboardbackend.entity.User;
import com.iahorizonplus.quizzboardbackend.entity.UserRole;
import com.iahorizonplus.quizzboardbackend.external.SmtpEmailService;
import com.iahorizonplus.quizzboardbackend.repository.NotificationRepository;
import com.iahorizonplus.quizzboardbackend.repository.ResourceFileRepository;
import com.iahorizonplus.quizzboardbackend.repository.UserRepository;
import com.iahorizonplus.quizzboardbackend.security.JwtUtils;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Gestion d'une communauté de bout en bout (HTTP -> base H2 -> disque) : droits par rôle, dépôt et téléchargement
 * de documents, liens, réunions avec notification, modérateurs, modération du forum, quiz partagés, paramètres.
 */
@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = "app.storage.local-dir=target/test-uploads")
class CommunityManagementIntegrationTest {

    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper json;
    @Autowired private UserRepository userRepository;
    @Autowired private ResourceFileRepository resourceRepository;
    @Autowired private NotificationRepository notificationRepository;
    @Autowired private JwtUtils jwtUtils;
    @Autowired private PasswordEncoder passwordEncoder;

    /** Aucun email réel : on vérifie seulement que les membres sont prévenus. */
    @MockitoBean private SmtpEmailService emailService;

    private User newUser(UserRole role, SubscriptionTier tier) {
        return userRepository.save(User.builder()
                .prenom("Test").nom(role.name()).email(role.name().toLowerCase() + "-" + UUID.randomUUID() + "@test.local")
                .password(passwordEncoder.encode("Test1234!"))
                .role(role).subscriptionTier(tier).status("ACTIVE").build());
    }

    private String token(User user) {
        return "Bearer " + jwtUtils.generateToken(user.getEmail(), user.getRole().name());
    }

    private ResultActions as(MockHttpServletRequestBuilder request, User user) throws Exception {
        return mvc.perform(request.header("Authorization", token(user)));
    }

    private ResultActions withBody(MockHttpServletRequestBuilder request, Object body, User user) throws Exception {
        return as(request.contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body)), user);
    }

    private JsonNode data(ResultActions actions) throws Exception {
        return json.readTree(actions.andReturn().getResponse().getContentAsString()).at("/data");
    }

    private String message(ResultActions actions) throws Exception {
        return json.readTree(actions.andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8)).at("/message").asText();
    }

    private JsonNode detail(String communityId, User user) throws Exception {
        return data(as(get("/communities/" + communityId), user).andExpect(status().isOk()));
    }

    private ResultActions upload(String communityId, String fileName, byte[] content, User user) throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", fileName, "application/pdf", content);
        return as(multipart("/communities/" + communityId + "/resources/upload").file(file)
                .param("title", "Cours " + fileName).param("description", "Support du chapitre 1"), user);
    }

    private String createQuiz(User creator) throws Exception {
        Map<String, Object> question = Map.of("id", "q-1", "text", "2 + 2 ?", "type", "SINGLE_CHOICE", "timeLimitSeconds", 30,
                "points", 100, "order", 1, "choices", List.of(
                        Map.of("id", "c1", "text", "4", "isCorrect", true, "order", 1),
                        Map.of("id", "c2", "text", "5", "isCorrect", false, "order", 2)));
        Map<String, Object> payload = Map.of("title", "Calcul mental", "category", "Maths", "difficulty", "EASY",
                "status", "PUBLISHED", "visibility", "PRIVATE", "questionsCount", 1, "questions", List.of(question),
                "createdAt", LocalDate.now().toString());
        return data(withBody(post("/quizzes"), payload, creator).andExpect(status().isCreated())).at("/id").asText();
    }

    @Test
    void communityManagement_EndToEnd() throws Exception {
        User creator = newUser(UserRole.CREATOR, SubscriptionTier.STARTER);
        User learner = newUser(UserRole.LEARNER, SubscriptionTier.FREE);
        User learner2 = newUser(UserRole.LEARNER, SubscriptionTier.FREE);
        User admin = newUser(UserRole.ADMIN, SubscriptionTier.FREE);

        // --- Création (privée) : l'animateur a tous les droits
        JsonNode created = data(withBody(post("/communities"), Map.of("name", "Club Data Sénégal", "category", "Data & IA",
                "description", "Révisions et entraide", "isPrivate", true), creator).andExpect(status().isCreated()));
        String id = created.at("/id").asText();
        String code = created.at("/accessCode").asText();
        assertThat(code).matches("CLUB-[A-Z0-9]{4}");
        assertThat(created.at("/myRole").asText()).isEqualTo("CREATOR");
        assertThat(created.at("/canManage").asBoolean()).isTrue();
        assertThat(created.at("/isPrivate").asBoolean()).isTrue();

        // --- Communauté privée : invisible et inaccessible tant qu'on n'est pas membre
        JsonNode visible = data(as(get("/communities"), learner).andExpect(status().isOk()));
        assertThat(visible.findValuesAsText("id")).doesNotContain(id);
        ResultActions denied = as(get("/communities/" + id), learner).andExpect(status().isForbidden());
        assertThat(message(denied)).contains("Rejoignez cette communauté");

        // --- Adhésion par code : membre simple, sans droits d'animation
        JsonNode joined = data(withBody(post("/communities/join"), Map.of("accessCode", code.toLowerCase()), learner).andExpect(status().isOk()));
        assertThat(joined.at("/myRole").asText()).isEqualTo("STUDENT");
        assertThat(joined.at("/canManage").asBoolean()).isFalse();
        assertThat(joined.at("/canShare").asBoolean()).isFalse();
        withBody(post("/communities/join"), Map.of("accessCode", code), learner2).andExpect(status().isOk());

        // --- Documents : dépôt par l'animateur, refusé au membre, téléchargement réservé aux membres
        assertThat(message(upload(id, "notes.pdf", "membre".getBytes(), learner).andExpect(status().isForbidden())))
                .contains("Seuls l'animateur et les modérateurs");
        byte[] pdf = "%PDF-1.4 cours de SQL".getBytes(StandardCharsets.UTF_8);
        JsonNode doc = data(upload(id, "Chapitre 1 - Les jointures.pdf", pdf, creator).andExpect(status().isCreated()));
        assertThat(doc.at("/kind").asText()).isEqualTo("FILE");
        assertThat(doc.at("/fileType").asText()).isEqualTo("PDF");
        assertThat(doc.at("/title").asText()).isEqualTo("Cours Chapitre 1 - Les jointures.pdf");
        String docId = doc.at("/id").asText();

        MvcResult download = as(get("/communities/" + id + "/resources/" + docId + "/download"), learner)
                .andExpect(status().isOk()).andReturn();
        assertThat(download.getResponse().getContentAsByteArray()).isEqualTo(pdf);
        assertThat(download.getResponse().getContentType()).isEqualTo("application/pdf");
        assertThat(download.getResponse().getHeader("Content-Disposition")).isNull();
        assertThat(download.getResponse().getHeader("Cache-Control")).isEqualTo("private, no-store");
        as(get("/communities/" + id + "/resources/" + docId + "/download"), newUser(UserRole.LEARNER, SubscriptionTier.FREE))
                .andExpect(status().isForbidden());

        // Le fichier n'est pas servi par l'adresse publique des images
        String stored = resourceRepository.findById(docId).orElseThrow().getStoredFileName();
        Path storedPath = Path.of("target/test-uploads/documents", stored).toAbsolutePath();
        assertThat(Files.exists(storedPath)).isTrue();
        mvc.perform(get("/files/documents/" + stored)).andExpect(status().isNotFound());

        // Format refusé
        assertThat(message(as(multipart("/communities/" + id + "/resources/upload")
                .file(new MockMultipartFile("file", "virus.exe", "application/octet-stream", new byte[]{1, 2})), creator)
                .andExpect(status().isBadRequest()))).contains("Format non pris en charge");

        // Lien externe
        JsonNode link = data(withBody(post("/communities/" + id + "/resources"),
                Map.of("title", "Playlist YouTube", "url", "https://youtube.com/playlist?list=abc"), creator).andExpect(status().isCreated()));
        assertThat(link.at("/kind").asText()).isEqualTo("LINK");
        assertThat(link.at("/fileUrl").asText()).isEqualTo("https://youtube.com/playlist?list=abc");

        // Les membres sont prévenus des nouveaux documents
        assertThat(notificationRepository.findByUserIdOrderByCreatedAtDesc(learner.getId()))
                .anyMatch(n -> n.getTitle().contains("Nouveau document") && n.getActionLink().startsWith("/app/learner/communities?communaute=" + id));

        // --- Paramètres : le créateur autorise les membres à partager
        withBody(put("/communities/" + id), Map.of("membersCanShare", true), learner).andExpect(status().isForbidden());
        JsonNode settings = data(withBody(put("/communities/" + id), Map.of("membersCanShare", true, "description", "Nouvelle description"), creator)
                .andExpect(status().isOk()));
        assertThat(settings.at("/membersCanShare").asBoolean()).isTrue();
        JsonNode learnerDoc = data(upload(id, "fiche.pdf", "fiche".getBytes(), learner).andExpect(status().isCreated()));
        as(delete("/communities/" + id + "/resources/" + docId), learner).andExpect(status().isForbidden());
        as(delete("/communities/" + id + "/resources/" + learnerDoc.at("/id").asText()), learner).andExpect(status().isOk());

        JsonNode afterDocs = detail(id, learner);
        assertThat(afterDocs.at("/resources").size()).isEqualTo(2);
        assertThat(afterDocs.at("/resources").findValuesAsText("id")).contains(docId);
        assertThat(afterDocs.at("/resources/1/downloadCount").asInt() + afterDocs.at("/resources/0/downloadCount").asInt()).isEqualTo(1);

        // --- Réunions : réservées à l'animation, lien Jitsi généré, membres prévenus par notification et email
        LocalDateTime when = LocalDateTime.now().plusDays(2).withSecond(0).withNano(0);
        Map<String, Object> meetingForm = Map.of("title", "Révision avant l'examen", "platform", "JITSI",
                "scheduledAt", when.toString(), "durationMinutes", 90);
        withBody(post("/communities/" + id + "/meetings"), meetingForm, learner).andExpect(status().isForbidden());
        JsonNode meeting = data(withBody(post("/communities/" + id + "/meetings"), meetingForm, creator).andExpect(status().isCreated()));
        assertThat(meeting.at("/meetingUrl").asText()).startsWith("https://meet.jit.si/QuizzBoard-ClubDataSenegal-");
        assertThat(meeting.at("/durationMinutes").asInt()).isEqualTo(90);
        verify(emailService, timeout(3000)).sendCommunityMeetingEmail(eq(learner.getEmail()), anyString(), eq("Club Data Sénégal"),
                eq("Révision avant l'examen"), anyString(), eq(90), eq("Jitsi Meet"), startsWith("https://meet.jit.si/"), anyString(),
                contains("/app/learner/communities?communaute=" + id), eq(false));
        verify(emailService, never()).sendCommunityMeetingEmail(eq(creator.getEmail()), any(), any(), any(), any(), anyInt(), any(), any(), any(), any(), anyBoolean());
        assertThat(message(withBody(post("/communities/" + id + "/meetings"), Map.of("title", "Passée",
                "meetingUrl", "https://zoom.us/j/1", "scheduledAt", LocalDateTime.now().minusDays(1).toString()), creator)
                .andExpect(status().isBadRequest()))).contains("déjà passée");
        String meetingId = meeting.at("/id").asText();
        JsonNode moved = data(withBody(put("/communities/" + id + "/meetings/" + meetingId), Map.of("title", "Révision (décalée)",
                "meetingUrl", "https://meet.google.com/abc-defg-hij", "scheduledAt", when.plusHours(1).toString(), "durationMinutes", 60), creator)
                .andExpect(status().isOk()));
        assertThat(moved.at("/platform").asText()).isEqualTo("GOOGLE_MEET");

        // --- Rôles : un modérateur peut animer, mais pas gérer les rôles ni retirer un autre modérateur
        withBody(patch("/communities/" + id + "/members/" + learner.getId()), Map.of("role", "MODERATOR"), learner).andExpect(status().isForbidden());
        withBody(patch("/communities/" + id + "/members/" + learner.getId()), Map.of("role", "MODERATOR"), creator).andExpect(status().isOk());
        withBody(post("/communities/" + id + "/meetings"), Map.of("title", "Atelier", "meetingUrl", "https://zoom.us/j/123",
                "scheduledAt", when.toString(), "notifyMembers", false), learner).andExpect(status().isCreated());
        withBody(patch("/communities/" + id + "/members/" + learner2.getId()), Map.of("role", "MODERATOR"), learner).andExpect(status().isForbidden());
        as(delete("/communities/" + id + "/meetings/" + meetingId), learner).andExpect(status().isOk());

        // --- Forum : verrouillage, épingle, signalement, suppression
        JsonNode topic = data(withBody(post("/communities/" + id + "/topics"), Map.of("title", "Question jointures", "content", "LEFT ou INNER ?"), learner2)
                .andExpect(status().isCreated()));
        String topicId = topic.at("/id").asText();
        JsonNode comment = data(withBody(post("/communities/topics/" + topicId + "/comments"), Map.of("content", "INNER"), learner2).andExpect(status().isCreated()));
        withBody(patch("/communities/" + id + "/topics/" + topicId), Map.of("isLocked", true, "isPinned", true), learner2).andExpect(status().isForbidden());
        JsonNode locked = data(withBody(patch("/communities/" + id + "/topics/" + topicId), Map.of("isLocked", true, "isPinned", true), creator).andExpect(status().isOk()));
        assertThat(locked.at("/isLocked").asBoolean()).isTrue();
        assertThat(locked.at("/isPinned").asBoolean()).isTrue();
        assertThat(message(withBody(post("/communities/topics/" + topicId + "/comments"), Map.of("content", "Encore une"), learner)
                .andExpect(status().isBadRequest()))).contains("verrouillé");
        as(post("/communities/topics/" + topicId + "/report"), learner).andExpect(status().isOk());
        as(get("/communities/moderation/topics"), creator).andExpect(status().isForbidden());
        JsonNode moderation = data(as(get("/communities/moderation/topics"), admin).andExpect(status().isOk()));
        assertThat(moderation.get(0).at("/isReported").asBoolean()).isTrue();
        as(delete("/communities/topics/" + topicId + "/comments/" + comment.at("/id").asText()), learner2).andExpect(status().isOk());

        // --- Quiz partagés : visibles et jouables par les membres, suivi dans la liste des membres
        String quizId = createQuiz(creator);
        withBody(post("/communities/" + id + "/quizzes"), Map.of("quizId", quizId), learner2).andExpect(status().isForbidden());
        withBody(post("/communities/" + id + "/quizzes"), Map.of("quizId", quizId), creator).andExpect(status().isOk());
        JsonNode quizzes = data(as(get("/communities/" + id + "/quizzes"), learner2).andExpect(status().isOk()));
        assertThat(quizzes.get(0).at("/title").asText()).isEqualTo("Calcul mental");
        JsonNode q = quizzes.get(0).at("/questions/0");
        String good = q.at("/choices/0/isCorrect").asBoolean() ? q.at("/choices/0/id").asText() : q.at("/choices/1/id").asText();
        withBody(post("/participations"), Map.of("quizId", quizId, "participantName", "Test LEARNER", "status", "COMPLETED", "timeTotalSeconds", 3,
                "answers", List.of(Map.of("questionId", q.at("/id").asText(), "selectedChoiceIds", List.of(good), "timeSpentSeconds", 2))), learner2)
                .andExpect(status().isCreated());

        JsonNode members = detail(id, creator).at("/members");
        assertThat(members.get(0).at("/role").asText()).isEqualTo("CREATOR");
        JsonNode player = null;
        for (JsonNode m : members) if (m.at("/userId").asText().equals(learner2.getId())) player = m;
        assertThat(player).isNotNull();
        assertThat(player.at("/quizzesCompleted").asInt()).isEqualTo(1);
        assertThat(player.at("/totalXp").asInt()).isGreaterThan(50);
        assertThat(player.at("/email").asText()).isEqualTo(learner2.getEmail());
        // Un simple membre ne voit pas les emails des autres
        JsonNode seenByMember = detail(id, learner2).at("/members");
        for (JsonNode m : seenByMember) {
            if (!m.at("/userId").asText().equals(learner2.getId())) assertThat(m.at("/email").isNull()).isTrue();
        }

        // --- Membres : le modérateur retire un membre, qui perd l'accès
        as(delete("/communities/" + id + "/members/" + learner2.getId()), learner).andExpect(status().isOk());
        as(get("/communities/" + id), learner2).andExpect(status().isForbidden());

        // --- Code d'accès renouvelé : l'ancien ne marche plus
        String newCode = data(as(post("/communities/" + id + "/access-code"), creator).andExpect(status().isOk())).at("/accessCode").asText();
        assertThat(newCode).isNotEqualTo(code);
        withBody(post("/communities/join"), Map.of("accessCode", code), learner2).andExpect(status().isBadRequest());

        // --- Quitter, supprimer
        assertThat(message(as(post("/communities/" + id + "/leave"), creator).andExpect(status().isBadRequest()))).contains("vous ne pouvez pas la quitter");
        as(delete("/communities/" + id), learner).andExpect(status().isForbidden());
        as(delete("/communities/" + id), creator).andExpect(status().isOk());
        as(get("/communities/" + id), creator).andExpect(status().isNotFound());
        assertThat(Files.exists(storedPath)).isFalse();
    }

    @Test
    void publicCommunities_ListedForEveryone_DetailOnlyForMembers() throws Exception {
        User creator = newUser(UserRole.CREATOR, SubscriptionTier.STARTER);
        User visitor = newUser(UserRole.LEARNER, SubscriptionTier.FREE);
        JsonNode created = data(withBody(post("/communities"), Map.of("name", "Club Ouvert", "category", "Tech",
                "description", "d", "isPrivate", false), creator).andExpect(status().isCreated()));
        String id = created.at("/id").asText();

        JsonNode listed = null;
        for (JsonNode c : data(as(get("/communities"), visitor))) if (c.at("/id").asText().equals(id)) listed = c;
        assertThat(listed).isNotNull();
        assertThat(listed.at("/myRole").isNull()).isTrue();
        assertThat(listed.at("/accessCode").asText()).isEqualTo(created.at("/accessCode").asText());
        assertThat(listed.at("/members").isNull()).isTrue();
        as(get("/communities/" + id), visitor).andExpect(status().isForbidden());
        as(get("/communities/" + id + "/quizzes"), visitor).andExpect(status().isForbidden());
    }
}
