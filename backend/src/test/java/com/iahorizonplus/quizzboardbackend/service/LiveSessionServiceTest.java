package com.iahorizonplus.quizzboardbackend.service;

import com.iahorizonplus.quizzboardbackend.dto.request.CreateLiveSessionRequest;
import com.iahorizonplus.quizzboardbackend.dto.request.JoinLiveSessionRequest;
import com.iahorizonplus.quizzboardbackend.dto.request.LiveProgressRequest;
import com.iahorizonplus.quizzboardbackend.dto.request.UpdateLiveSettingsRequest;
import com.iahorizonplus.quizzboardbackend.dto.response.LiveSessionResponse;
import com.iahorizonplus.quizzboardbackend.dto.response.LiveSessionResponse.LivePlayerResponse;
import com.iahorizonplus.quizzboardbackend.entity.LiveSessionRecord;
import com.iahorizonplus.quizzboardbackend.entity.User;
import com.iahorizonplus.quizzboardbackend.entity.UserRole;
import com.iahorizonplus.quizzboardbackend.exception.BadRequestException;
import com.iahorizonplus.quizzboardbackend.external.SmtpEmailService;
import com.iahorizonplus.quizzboardbackend.repository.LiveSessionRecordRepository;
import com.iahorizonplus.quizzboardbackend.security.UserPrincipal;
import com.iahorizonplus.quizzboardbackend.service.impl.LiveSessionServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LiveSessionServiceTest {

    @Mock
    private StringRedisTemplate redisTemplate;

    @Mock
    private ValueOperations<String, String> valueOperations;

    @Mock
    private SmtpEmailService smtpEmailService;

    @Mock
    private LiveSessionRecordRepository recordRepository;

    // Faux Redis et fausse table : chaque lecture renvoie une nouvelle copie, comme en production
    private final Map<String, String> redisStore = new ConcurrentHashMap<>();
    private final Map<String, LiveSessionRecord> dbStore = new ConcurrentHashMap<>();

    private LiveSessionServiceImpl liveService;
    private String sessionId;

    @BeforeEach
    void setUp() {
        lenient().when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        lenient().doAnswer(inv -> redisStore.put(inv.getArgument(0), inv.getArgument(1)))
                .when(valueOperations).set(anyString(), anyString(), any(Duration.class));
        lenient().when(valueOperations.get(anyString())).thenAnswer(inv -> redisStore.get(inv.<String>getArgument(0)));
        lenient().when(redisTemplate.keys(anyString())).thenAnswer(inv -> redisStore.keySet());
        lenient().when(recordRepository.save(any(LiveSessionRecord.class))).thenAnswer(inv -> {
            LiveSessionRecord record = inv.getArgument(0);
            dbStore.put(record.getId(), record);
            return record;
        });
        lenient().when(recordRepository.findById(anyString())).thenAnswer(inv -> Optional.ofNullable(dbStore.get(inv.<String>getArgument(0))));
        lenient().when(recordRepository.findTop100ByHostIdOrderByCreatedAtDesc(anyString())).thenAnswer(inv ->
                dbStore.values().stream().filter(r -> r.getHostId().equals(inv.getArgument(0))).toList());
        liveService = newService();

        sessionId = liveService.createSession(new CreateLiveSessionRequest("quiz-1", "Quiz SQL", 2, 20), null).id();
        liveService.joinSession(sessionId, new JoinLiveSessionRequest("Awa", "awa@example.com", null));
        liveService.joinSession(sessionId, new JoinLiveSessionRequest("Moussa", "moussa@example.com", null));
        liveService.joinSession(sessionId, new JoinLiveSessionRequest("Absent", "absent@example.com", null));
    }

    private LiveSessionServiceImpl newService() {
        return new LiveSessionServiceImpl(redisTemplate, smtpEmailService, recordRepository);
    }

    private String playerId(String nickname) {
        return liveService.getSession(sessionId).players().stream()
                .filter(p -> p.nickname().equals(nickname)).findFirst().orElseThrow().id();
    }

    private LivePlayerResponse player(LiveSessionResponse session, String nickname) {
        return session.players().stream().filter(p -> p.nickname().equals(nickname)).findFirst().orElseThrow();
    }

    private LiveSessionResponse progress(String nickname, int answered, int correct, int score, int time, boolean finished) {
        return liveService.recordProgress(sessionId,
                new LiveProgressRequest(playerId(nickname), answered, correct, score, 200, correct, time, finished));
    }

    @Test
    @DisplayName("Progression : scores réels des joueurs et classement par score")
    void recordProgress_UsesRealResultsAndRanksPlayers() {
        liveService.startSession(sessionId);
        progress("Moussa", 2, 1, 100, 12, false);
        LiveSessionResponse session = progress("Awa", 2, 2, 200, 10, true);

        assertThat(session.players().get(0).nickname()).isEqualTo("Awa");
        LivePlayerResponse awa = player(session, "Awa");
        assertThat(awa.score()).isEqualTo(200);
        assertThat(awa.answeredCount()).isEqualTo(2);
        assertThat(awa.accuracyPercent()).isEqualTo(100);
        assertThat(awa.avgResponseTimeSeconds()).isEqualTo(5.0);
        assertThat(awa.finished()).isTrue();
        assertThat(player(session, "Moussa").accuracyPercent()).isEqualTo(50);
        assertThat(player(session, "Absent").score()).isZero();
    }

    @Test
    @DisplayName("Progression : un instantané arrivé en retard n'écrase pas l'état le plus récent")
    void recordProgress_IgnoresStaleSnapshot() {
        liveService.startSession(sessionId);
        progress("Awa", 2, 2, 200, 10, false);
        LiveSessionResponse session = progress("Awa", 1, 1, 100, 5, false);

        assertThat(player(session, "Awa").score()).isEqualTo(200);
        assertThat(player(session, "Awa").answeredCount()).isEqualTo(2);
    }

    @Test
    @DisplayName("Fin du Live : scores inchangés, emails avec le rang dans la session, une seule fois par joueur")
    void finishSession_EmailsFinishedPlayersWithSessionRank() {
        liveService.startSession(sessionId);
        progress("Awa", 2, 2, 200, 10, true);
        progress("Moussa", 1, 1, 100, 6, false);

        LiveSessionResponse finished = liveService.finishSession(sessionId);

        assertThat(finished.status()).isEqualTo("FINISHED");
        assertThat(finished.manuallyStopped()).isFalse();
        assertThat(player(finished, "Awa").score()).isEqualTo(200);
        assertThat(player(finished, "Moussa").score()).isEqualTo(100);
        // Awa a terminé : 1ère sur 2 joueurs ayant répondu (« Absent » n'est pas classé)
        verify(smtpEmailService).sendQuizCompletedEmail("awa@example.com", "Awa", "Quiz SQL",
                100.0, 200, 200, 1, 2, false, null, null);
        // Moussa n'a pas encore terminé : pas d'email pour l'instant
        verify(smtpEmailService, never()).sendQuizCompletedEmail(eq("moussa@example.com"), anyString(), anyString(),
                anyDouble(), anyInt(), anyInt(), anyInt(), anyInt(), anyBoolean(), any(), any());

        // Moussa termine après la fin du Live : il reçoit son résultat à ce moment-là
        progress("Moussa", 2, 1, 100, 12, true);
        verify(smtpEmailService).sendQuizCompletedEmail("moussa@example.com", "Moussa", "Quiz SQL",
                50.0, 100, 200, 2, 2, false, null, null);

        // Un second arrêt ne renvoie aucun email
        liveService.stopSession(sessionId);
        verify(smtpEmailService, times(2)).sendQuizCompletedEmail(anyString(), anyString(), anyString(),
                anyDouble(), anyInt(), anyInt(), anyInt(), anyInt(), anyBoolean(), any(), any());
    }

    @Test
    @DisplayName("Réglages : le temps par question n'est modifiable qu'avant le lancement")
    void updateSettings_OnlyInLobby() {
        LiveSessionResponse updated = liveService.updateSettings(sessionId, new UpdateLiveSettingsRequest(45));
        assertThat(updated.timePerQuestionSeconds()).isEqualTo(45);
        assertThat(updated.totalDurationSeconds()).isEqualTo(90);

        assertThatThrownBy(() -> liveService.updateSettings(sessionId, new UpdateLiveSettingsRequest(2)))
                .isInstanceOf(BadRequestException.class);

        liveService.startSession(sessionId);
        assertThatThrownBy(() -> liveService.updateSettings(sessionId, new UpdateLiveSettingsRequest(30)))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    @DisplayName("Persistance : la session est retrouvée en base après expiration Redis et listée pour son animateur")
    void sessionsSurviveRedisExpiry_AndAreListedForHost() {
        User host = User.builder().id("host-1").prenom("Bakary").nom("Diassy").email("host@example.com").role(UserRole.CREATOR).build();
        UserPrincipal principal = new UserPrincipal(host);
        String hostedId = liveService.createSession(new CreateLiveSessionRequest("quiz-2", "Quiz Réseaux", 3, 20), principal).id();
        liveService.joinSession(hostedId, new JoinLiveSessionRequest("Fatou", "fatou@example.com", null));
        liveService.startSession(hostedId);

        // Redis expiré + backend redémarré (mémoire vide)
        redisStore.clear();
        LiveSessionServiceImpl restarted = newService();

        LiveSessionResponse reloaded = restarted.getSession(hostedId);
        assertThat(reloaded.status()).isEqualTo("IN_PROGRESS");
        assertThat(reloaded.players()).extracting(LivePlayerResponse::nickname).containsExactly("Fatou");
        assertThat(reloaded.createdAt()).isNotNull();

        List<LiveSessionResponse> mine = restarted.listHostSessions(principal);
        assertThat(mine).extracting(LiveSessionResponse::id).containsExactly(hostedId);
        assertThatThrownBy(() -> restarted.listHostSessions(null)).isInstanceOf(RuntimeException.class);
    }

    @Test
    @DisplayName("Concurrence : des réponses simultanées de plusieurs joueurs ne s'écrasent pas")
    void recordProgress_ConcurrentPlayersAreAllRecorded() throws Exception {
        int extraPlayers = 20;
        for (int i = 0; i < extraPlayers; i++) {
            liveService.joinSession(sessionId, new JoinLiveSessionRequest("Joueur " + i, null, null));
        }
        liveService.startSession(sessionId);
        List<String> ids = liveService.getSession(sessionId).players().stream().map(LivePlayerResponse::id).toList();

        ExecutorService pool = Executors.newFixedThreadPool(ids.size());
        CountDownLatch start = new CountDownLatch(1);
        List<Future<?>> futures = new ArrayList<>();
        for (String id : ids) {
            futures.add(pool.submit(() -> {
                start.await();
                return liveService.recordProgress(sessionId, new LiveProgressRequest(id, 2, 1, 100, 200, 1, 8, true));
            }));
        }
        start.countDown();
        for (Future<?> future : futures) {
            future.get(10, TimeUnit.SECONDS);
        }
        pool.shutdown();

        assertThat(liveService.getSession(sessionId).players())
                .allSatisfy(p -> {
                    assertThat(p.finished()).isTrue();
                    assertThat(p.score()).isEqualTo(100);
                });
    }
}
