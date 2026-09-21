package com.iahorizonplus.quizzboardbackend.service.impl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.iahorizonplus.quizzboardbackend.dto.request.CreateLiveSessionRequest;
import com.iahorizonplus.quizzboardbackend.dto.request.JoinLiveSessionRequest;
import com.iahorizonplus.quizzboardbackend.dto.response.LiveSessionResponse;
import com.iahorizonplus.quizzboardbackend.exception.BadRequestException;
import com.iahorizonplus.quizzboardbackend.exception.ResourceNotFoundException;
import com.iahorizonplus.quizzboardbackend.security.UserPrincipal;
import com.iahorizonplus.quizzboardbackend.service.LiveSessionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ThreadLocalRandom;

@Service
@RequiredArgsConstructor
@Slf4j
public class LiveSessionServiceImpl implements LiveSessionService {

    private static final String LIVE_SESSION_KEY_PREFIX = "quizzboard:live-session:";
    private static final String LIVE_SESSION_KEY_PATTERN = LIVE_SESSION_KEY_PREFIX + "*";

    private final StringRedisTemplate redisTemplate;
    @Qualifier("redisObjectMapper")
    private final ObjectMapper objectMapper;
    private final Map<String, LiveSessionState> sessions = new ConcurrentHashMap<>();

    @Value("${app.live.session-ttl-hours:6}")
    private long liveSessionTtlHours;

    @Override
    public LiveSessionResponse createSession(CreateLiveSessionRequest request, UserPrincipal currentUser) {
        if (request == null || isBlank(request.quizId())) {
            throw new BadRequestException("quizId", "Le quiz est obligatoire pour créer une session Live.");
        }

        int totalQuestions = request.totalQuestions() != null && request.totalQuestions() > 0 ? request.totalQuestions() : 5;
        int timePerQuestion = request.timePerQuestionSeconds() != null && request.timePerQuestionSeconds() > 0
                ? request.timePerQuestionSeconds()
                : 20;
        String id = "live-" + UUID.randomUUID();
        String pin = generateUniquePin();
        String hostId = currentUser != null ? currentUser.getId() : "anonymous-host";
        String hostName = currentUser != null ? currentUser.getName() : "Professeur";

        LiveSessionState state = new LiveSessionState();
        state.id = id;
        state.pin = pin;
        state.quizId = request.quizId();
        state.quizTitle = isBlank(request.quizTitle()) ? "Quiz Live" : request.quizTitle();
        state.hostId = hostId;
        state.hostName = hostName;
        state.status = "LOBBY";
        state.currentQuestionIndex = 0;
        state.totalQuestions = totalQuestions;
        state.timePerQuestionSeconds = timePerQuestion;
        state.players = new ArrayList<>();

        save(state);
        return toResponse(state);
    }

    @Override
    public LiveSessionResponse getSession(String id) {
        return toResponse(findById(id));
    }

    @Override
    public LiveSessionResponse getSessionByPin(String pin) {
        String cleanPin = clean(pin);
        LiveSessionState redisState = findByPinFromRedis(cleanPin);
        if (redisState != null) {
            return toResponse(redisState);
        }
        return sessions.values().stream()
                .filter(s -> clean(s.pin).equals(cleanPin))
                .findFirst()
                .map(this::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException("Session Live introuvable avec ce PIN."));
    }

    @Override
    public LiveSessionResponse joinSession(String id, JoinLiveSessionRequest request) {
        LiveSessionState state = findById(id);
        if ("FINISHED".equals(state.status)) {
            throw new BadRequestException("status", "Cette session Live est déjà terminée.");
        }

        String email = trimToNull(request != null ? request.email() : null);
        String matricule = trimToNull(request != null ? request.matricule() : null);
        String nickname = trimToNull(request != null ? request.nickname() : null);
        if (nickname == null) {
            if (email != null && email.contains("@")) {
                String prefix = email.substring(0, email.indexOf('@')).replace('.', ' ').replace('_', ' ');
                nickname = capitalize(prefix);
            } else if (matricule != null) {
                nickname = "Élève (" + matricule + ")";
            } else {
                nickname = "Participant #" + (state.players.size() + 1);
            }
        }
        final String joinedNickname = nickname;

        synchronized (state) {
            boolean alreadyJoined = state.players.stream().anyMatch(p ->
                    (email != null && email.equalsIgnoreCase(p.email)) ||
                    (matricule != null && matricule.equalsIgnoreCase(p.matricule)) ||
                    joinedNickname.equalsIgnoreCase(p.nickname)
            );
            if (!alreadyJoined) {
                LivePlayerState player = new LivePlayerState();
                player.id = "p-" + UUID.randomUUID();
                player.nickname = joinedNickname;
                player.email = email;
                player.matricule = matricule;
                player.score = 0;
                player.streak = 0;
                player.ready = true;
                player.accuracyPercent = 100;
                player.avgResponseTimeSeconds = 0;
                state.players.add(player);
            }
            save(state);
        }
        return toResponse(state);
    }

    @Override
    public LiveSessionResponse startSession(String id) {
        LiveSessionState state = findById(id);
        synchronized (state) {
            LocalDateTime now = LocalDateTime.now();
            state.status = "IN_PROGRESS";
            state.currentQuestionIndex = 0;
            state.startedAt = now;
            state.expectedEndAt = now.plusSeconds((long) state.totalQuestions * state.timePerQuestionSeconds);
            state.endedAt = null;
            state.manuallyStopped = false;
            state.players.forEach(p -> {
                p.score = 0;
                p.streak = 0;
                p.accuracyPercent = 100;
                p.avgResponseTimeSeconds = 0;
            });
            save(state);
        }
        return toResponse(state);
    }

    @Override
    public LiveSessionResponse nextQuestion(String id) {
        LiveSessionState state = findById(id);
        synchronized (state) {
            updateScores(state);
            if (state.currentQuestionIndex + 1 < state.totalQuestions) {
                state.currentQuestionIndex = state.currentQuestionIndex + 1;
            } else {
                state.status = "FINISHED";
                state.endedAt = LocalDateTime.now();
            }
            save(state);
        }
        return toResponse(state);
    }

    @Override
    public LiveSessionResponse stopSession(String id) {
        LiveSessionState state = findById(id);
        synchronized (state) {
            updateScores(state);
            state.status = "FINISHED";
            state.manuallyStopped = true;
            state.endedAt = LocalDateTime.now();
            save(state);
        }
        return toResponse(state);
    }

    private LiveSessionState findById(String id) {
        LiveSessionState state = findFromRedis(id);
        if (state == null) {
            state = sessions.get(id);
        }
        if (state == null) {
            throw new ResourceNotFoundException("Session Live introuvable.");
        }
        return state;
    }

    private void updateScores(LiveSessionState state) {
        int playedQuestions = Math.max(1, state.currentQuestionIndex + 1);
        ThreadLocalRandom random = ThreadLocalRandom.current();
        state.players.forEach(p -> {
            boolean correct = random.nextInt(100) >= 25;
            if (correct) {
                p.score = p.score + random.nextInt(100, 151);
                p.streak = p.streak + 1;
            } else {
                p.streak = 0;
            }
            int currentCorrect = Math.round((p.accuracyPercent / 100f) * Math.max(1, playedQuestions - 1));
            int newCorrect = currentCorrect + (correct ? 1 : 0);
            p.accuracyPercent = Math.round((newCorrect * 100f) / playedQuestions);
            p.avgResponseTimeSeconds = Math.round((3 + random.nextDouble(4)) * 10.0) / 10.0;
        });
        state.players.sort(Comparator.comparingInt((LivePlayerState p) -> p.score).reversed());
    }

    private LiveSessionResponse toResponse(LiveSessionState state) {
        int duration = state.totalQuestions * state.timePerQuestionSeconds;
        List<LiveSessionResponse.LivePlayerResponse> players = state.players.stream()
                .map(p -> new LiveSessionResponse.LivePlayerResponse(
                        p.id, p.nickname, p.email, p.matricule, p.score, p.streak,
                        p.ready, p.accuracyPercent, p.avgResponseTimeSeconds
                ))
                .toList();

        return new LiveSessionResponse(
                state.id,
                state.pin,
                state.quizId,
                state.quizTitle,
                state.hostId,
                state.hostName,
                state.status,
                state.currentQuestionIndex,
                state.totalQuestions,
                state.timePerQuestionSeconds,
                duration,
                state.startedAt,
                state.expectedEndAt,
                state.endedAt,
                state.manuallyStopped,
                players
        );
    }

    private String generateUniquePin() {
        String pin;
        do {
            int p1 = ThreadLocalRandom.current().nextInt(100, 1000);
            int p2 = ThreadLocalRandom.current().nextInt(100, 1000);
            pin = p1 + " " + p2;
            String candidate = clean(pin);
            if (isPinAvailable(candidate)) {
                return pin;
            }
        } while (true);
    }

    private LiveSessionState findFromRedis(String id) {
        try {
            String raw = redisTemplate.opsForValue().get(redisKey(id));
            return raw == null ? null : objectMapper.readValue(raw, LiveSessionState.class);
        } catch (DataAccessException ex) {
            log.warn("Redis indisponible pour la session Live {}, fallback mémoire actif.", id);
            return null;
        } catch (JsonProcessingException ex) {
            log.warn("Session Live Redis illisible pour {}.", id, ex);
            return null;
        }
    }

    private LiveSessionState findByPinFromRedis(String cleanPin) {
        try {
            Set<String> keys = redisTemplate.keys(LIVE_SESSION_KEY_PATTERN);
            if (keys == null || keys.isEmpty()) {
                return null;
            }
            for (String key : keys) {
                String raw = redisTemplate.opsForValue().get(key);
                if (raw == null) continue;
                LiveSessionState state = objectMapper.readValue(raw, LiveSessionState.class);
                if (clean(state.pin).equals(cleanPin)) {
                    sessions.put(state.id, state);
                    return state;
                }
            }
            return null;
        } catch (DataAccessException ex) {
            log.warn("Redis indisponible pour la recherche Live par PIN, fallback mémoire actif.");
            return null;
        } catch (JsonProcessingException ex) {
            log.warn("Session Live Redis illisible pendant la recherche par PIN.", ex);
            return null;
        }
    }

    private void save(LiveSessionState state) {
        sessions.put(state.id, state);
        try {
            String json = objectMapper.writeValueAsString(state);
            redisTemplate.opsForValue().set(redisKey(state.id), json, Duration.ofHours(liveSessionTtlHours));
        } catch (DataAccessException ex) {
            log.warn("Redis indisponible, session Live {} conservée en mémoire locale.", state.id);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Impossible de sérialiser la session Live.", ex);
        }
    }

    private boolean isPinAvailable(String candidate) {
        boolean memoryAvailable = sessions.values().stream().noneMatch(s -> clean(s.pin).equals(candidate));
        if (!memoryAvailable) {
            return false;
        }

        try {
            Set<String> keys = redisTemplate.keys(LIVE_SESSION_KEY_PATTERN);
            if (keys == null || keys.isEmpty()) {
                return true;
            }
            for (String key : keys) {
                String raw = redisTemplate.opsForValue().get(key);
                if (raw == null) continue;
                LiveSessionState state = objectMapper.readValue(raw, LiveSessionState.class);
                if (clean(state.pin).equals(candidate)) {
                    return false;
                }
            }
            return true;
        } catch (DataAccessException ex) {
            log.warn("Redis indisponible pendant la génération du PIN Live, vérification mémoire uniquement.");
            return true;
        } catch (JsonProcessingException ex) {
            log.warn("Une session Live Redis est illisible pendant la génération du PIN.", ex);
            return true;
        }
    }

    private String redisKey(String id) {
        return LIVE_SESSION_KEY_PREFIX + id;
    }

    private String clean(String value) {
        return value == null ? "" : value.replaceAll("\\s+", "").trim().toLowerCase();
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private String trimToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String capitalize(String value) {
        if (isBlank(value)) return value;
        String trimmed = value.trim();
        return trimmed.substring(0, 1).toUpperCase() + trimmed.substring(1);
    }

    public static final class LiveSessionState {
        public String id;
        public String pin;
        public String quizId;
        public String quizTitle;
        public String hostId;
        public String hostName;
        public String status;
        public int currentQuestionIndex;
        public int totalQuestions;
        public int timePerQuestionSeconds;
        public LocalDateTime startedAt;
        public LocalDateTime expectedEndAt;
        public LocalDateTime endedAt;
        public boolean manuallyStopped;
        public List<LivePlayerState> players;
    }

    public static final class LivePlayerState {
        public String id;
        public String nickname;
        public String email;
        public String matricule;
        public int score;
        public int streak;
        public boolean ready;
        public int accuracyPercent;
        public double avgResponseTimeSeconds;
    }
}
