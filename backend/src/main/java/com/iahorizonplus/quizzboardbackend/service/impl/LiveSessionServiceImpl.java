package com.iahorizonplus.quizzboardbackend.service.impl;

import com.fasterxml.jackson.annotation.JsonAutoDetect;
import com.fasterxml.jackson.annotation.PropertyAccessor;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.iahorizonplus.quizzboardbackend.dto.request.CreateLiveSessionRequest;
import com.iahorizonplus.quizzboardbackend.dto.request.JoinLiveSessionRequest;
import com.iahorizonplus.quizzboardbackend.dto.request.LiveProgressRequest;
import com.iahorizonplus.quizzboardbackend.dto.request.UpdateLiveSettingsRequest;
import com.iahorizonplus.quizzboardbackend.dto.response.LiveSessionResponse;
import com.iahorizonplus.quizzboardbackend.entity.LiveSessionRecord;
import com.iahorizonplus.quizzboardbackend.exception.BadRequestException;
import com.iahorizonplus.quizzboardbackend.exception.ResourceNotFoundException;
import com.iahorizonplus.quizzboardbackend.exception.UnauthorizedException;
import com.iahorizonplus.quizzboardbackend.external.SmtpEmailService;
import com.iahorizonplus.quizzboardbackend.repository.LiveSessionRecordRepository;
import com.iahorizonplus.quizzboardbackend.security.UserPrincipal;
import com.iahorizonplus.quizzboardbackend.service.LiveSessionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ThreadLocalRandom;

@Service
@RequiredArgsConstructor
@Slf4j
public class LiveSessionServiceImpl implements LiveSessionService {

    private static final String LIVE_SESSION_KEY_PREFIX = "quizzboard:live-session:";
    private static final String LIVE_SESSION_KEY_PATTERN = LIVE_SESSION_KEY_PREFIX + "*";

    // Mapper dédié au stockage Redis (sérialisation par champs). Volontairement pas un bean Spring :
    // un ObjectMapper déclaré en bean remplace celui de Spring Boot pour toute l'API REST
    // (champs inconnus rejetés en 400, dates sérialisées en tableaux).
    private static final ObjectMapper REDIS_MAPPER = new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .setVisibility(PropertyAccessor.FIELD, JsonAutoDetect.Visibility.ANY)
            .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

    private final StringRedisTemplate redisTemplate;
    private final SmtpEmailService smtpEmailService;
    private final LiveSessionRecordRepository recordRepository;
    private final Map<String, LiveSessionState> sessions = new ConcurrentHashMap<>();
    // Un verrou par session : les requêtes simultanées (joueurs, animateur) sont appliquées l'une après l'autre
    private final Map<String, Object> locks = new ConcurrentHashMap<>();

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
        state.createdAt = LocalDateTime.now();

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
                .or(() -> findActiveByPinFromDatabase(cleanPin))
                .map(this::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException("Session Live introuvable avec ce PIN."));
    }

    @Override
    public List<LiveSessionResponse> listHostSessions(UserPrincipal currentUser) {
        if (currentUser == null) {
            throw new UnauthorizedException("Connectez-vous pour retrouver vos sessions Live.");
        }
        try {
            return recordRepository.findTop100ByHostIdOrderByCreatedAtDesc(currentUser.getId()).stream()
                    .map(this::fromRecord)
                    .filter(Objects::nonNull)
                    .map(this::toResponse)
                    .toList();
        } catch (DataAccessException ex) {
            log.warn("Historique des sessions Live indisponible : {}", ex.getMessage());
            return List.of();
        }
    }

    @Override
    public LiveSessionResponse joinSession(String id, JoinLiveSessionRequest request) {
        String email = trimToNull(request != null ? request.email() : null);
        String matricule = trimToNull(request != null ? request.matricule() : null);
        String nickname = trimToNull(request != null ? request.nickname() : null);
        if (nickname == null) {
            if (email != null && email.contains("@")) {
                String prefix = email.substring(0, email.indexOf('@')).replace('.', ' ').replace('_', ' ');
                nickname = capitalize(prefix);
            } else if (matricule != null) {
                nickname = "Élève (" + matricule + ")";
            }
        }

        synchronized (lockFor(id)) {
            LiveSessionState state = findById(id);
            if ("FINISHED".equals(state.status)) {
                throw new BadRequestException("status", "Cette session Live est déjà terminée.");
            }
            final String joinedNickname = nickname != null ? nickname : "Participant #" + (state.players.size() + 1);
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
                player.ready = true;
                state.players.add(player);
            }
            save(state);
            return toResponse(state);
        }
    }

    @Override
    public LiveSessionResponse updateSettings(String id, UpdateLiveSettingsRequest request) {
        synchronized (lockFor(id)) {
            LiveSessionState state = findById(id);
            if (!"LOBBY".equals(state.status)) {
                throw new BadRequestException("status", "Le temps par question ne peut être modifié qu'avant le lancement du Live.");
            }
            Integer seconds = request != null ? request.timePerQuestionSeconds() : null;
            if (seconds == null || seconds < 5 || seconds > 300) {
                throw new BadRequestException("timePerQuestionSeconds", "Le temps par question doit être compris entre 5 et 300 secondes.");
            }
            state.timePerQuestionSeconds = seconds;
            save(state);
            return toResponse(state);
        }
    }

    @Override
    public LiveSessionResponse startSession(String id) {
        synchronized (lockFor(id)) {
            LiveSessionState state = findById(id);
            LocalDateTime now = LocalDateTime.now();
            state.status = "IN_PROGRESS";
            state.currentQuestionIndex = 0;
            state.startedAt = now;
            state.expectedEndAt = now.plusSeconds((long) state.totalQuestions * state.timePerQuestionSeconds);
            state.endedAt = null;
            state.manuallyStopped = false;
            state.players.forEach(LivePlayerState::resetResults);
            save(state);
            return toResponse(state);
        }
    }

    /**
     * Enregistre la progression réelle d'un joueur (envoyée par son navigateur après chaque réponse).
     */
    @Override
    public LiveSessionResponse recordProgress(String id, LiveProgressRequest request) {
        if (request == null || isBlank(request.playerId())) {
            throw new BadRequestException("playerId", "Le joueur est obligatoire.");
        }
        synchronized (lockFor(id)) {
            LiveSessionState state = findById(id);
            LivePlayerState player = state.players.stream()
                    .filter(p -> request.playerId().equals(p.id))
                    .findFirst()
                    .orElseThrow(() -> new ResourceNotFoundException("Joueur introuvable dans cette session Live."));

            int answered = Math.max(0, orZero(request.answeredCount()));
            // Instantané en retard ou joueur déjà terminé : on conserve l'état le plus récent
            if (player.finished || answered < player.answeredCount) {
                return toResponse(state);
            }

            player.answeredCount = answered;
            player.correctCount = Math.min(answered, Math.max(0, orZero(request.correctCount())));
            player.score = Math.max(0, orZero(request.score()));
            player.maxScore = Math.max(0, orZero(request.maxScore()));
            player.streak = Math.max(0, orZero(request.streak()));
            player.totalTimeSeconds = Math.max(0, orZero(request.totalTimeSeconds()));
            player.accuracyPercent = answered > 0 ? Math.round(player.correctCount * 100f / answered) : 0;
            player.avgResponseTimeSeconds = answered > 0 ? Math.round(player.totalTimeSeconds * 10.0 / answered) / 10.0 : 0;
            player.finished = Boolean.TRUE.equals(request.finished());
            sortPlayers(state);

            // Joueur ayant terminé après la fin du Live : envoi immédiat de son résultat
            if (player.finished && "FINISHED".equals(state.status)) {
                sendResultEmail(state, player);
            }
            save(state);
            return toResponse(state);
        }
    }

    @Override
    public LiveSessionResponse finishSession(String id) {
        return endSession(id, false);
    }

    @Override
    public LiveSessionResponse stopSession(String id) {
        return endSession(id, true);
    }

    /**
     * Termine le Live et envoie à chaque joueur ayant fini son résultat avec son rang dans la session.
     * Les joueurs qui terminent plus tard reçoivent leur email à ce moment-là (voir recordProgress).
     */
    private LiveSessionResponse endSession(String id, boolean manuallyStopped) {
        synchronized (lockFor(id)) {
            LiveSessionState state = findById(id);
            if (!"FINISHED".equals(state.status)) {
                state.status = "FINISHED";
                state.manuallyStopped = manuallyStopped;
                state.endedAt = LocalDateTime.now();
            }
            sortPlayers(state);
            state.players.stream()
                    .filter(p -> p.finished)
                    .forEach(p -> sendResultEmail(state, p));
            save(state);
            return toResponse(state);
        }
    }

    private Object lockFor(String id) {
        return locks.computeIfAbsent(id, key -> new Object());
    }

    private LiveSessionState findById(String id) {
        LiveSessionState state = findFromRedis(id);
        if (state == null) {
            state = sessions.get(id);
        }
        if (state == null) {
            // Session expirée de Redis (ou backend redémarré) : on la recharge depuis la base
            state = findFromDatabase(id);
            if (state != null) {
                sessions.put(state.id, state);
            }
        }
        if (state == null) {
            throw new ResourceNotFoundException("Session Live introuvable.");
        }
        return state;
    }

    /** Classement réel : score décroissant, puis le plus rapide en cas d'égalité. */
    private void sortPlayers(LiveSessionState state) {
        state.players.sort(Comparator.comparingInt((LivePlayerState p) -> p.score).reversed()
                .thenComparingInt(p -> p.answeredCount > 0 ? p.totalTimeSeconds : Integer.MAX_VALUE));
    }

    /**
     * Envoie à un joueur son résultat avec son rang parmi les joueurs de cette session
     * (les inscrits qui n'ont répondu à aucune question ne sont pas classés).
     */
    private void sendResultEmail(LiveSessionState state, LivePlayerState player) {
        if (player.emailSent || !player.finished || isBlank(player.email)) {
            return;
        }
        List<LivePlayerState> ranked = state.players.stream().filter(p -> p.answeredCount > 0).toList();
        int rank = Math.max(1, ranked.indexOf(player) + 1);
        int maxScore = player.maxScore > 0 ? player.maxScore : Math.max(1, state.totalQuestions) * 100;
        double percentage = Math.round(player.score * 1000.0 / maxScore) / 10.0;
        try {
            smtpEmailService.sendQuizCompletedEmail(player.email, player.nickname, state.quizTitle,
                    percentage, player.score, maxScore, rank, Math.max(1, ranked.size()), false, null, null);
            player.emailSent = true;
        } catch (Exception e) {
            log.warn("Email de résultat Live non déclenché pour {} : {}", player.email, e.getMessage());
        }
    }

    private LiveSessionResponse toResponse(LiveSessionState state) {
        int duration = state.totalQuestions * state.timePerQuestionSeconds;
        long elapsed = state.startedAt == null ? 0
                : Math.max(0, Duration.between(state.startedAt, Objects.requireNonNullElse(state.endedAt, LocalDateTime.now())).getSeconds());
        List<LiveSessionResponse.LivePlayerResponse> players = state.players.stream()
                .map(p -> new LiveSessionResponse.LivePlayerResponse(
                        p.id, p.nickname, p.email, p.matricule, p.score, p.streak,
                        p.ready, p.accuracyPercent, p.avgResponseTimeSeconds,
                        p.answeredCount, p.finished
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
                elapsed,
                state.startedAt,
                state.expectedEndAt,
                state.endedAt,
                state.manuallyStopped,
                state.createdAt,
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
            return raw == null ? null : REDIS_MAPPER.readValue(raw, LiveSessionState.class);
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
                LiveSessionState state = REDIS_MAPPER.readValue(raw, LiveSessionState.class);
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
        String json;
        try {
            json = REDIS_MAPPER.writeValueAsString(state);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Impossible de sérialiser la session Live.", ex);
        }
        try {
            redisTemplate.opsForValue().set(redisKey(state.id), json, Duration.ofHours(liveSessionTtlHours));
        } catch (DataAccessException ex) {
            log.warn("Redis indisponible, session Live {} conservée en mémoire locale.", state.id);
        }
        // Copie durable : l'animateur retrouve ses Lives et leurs résultats après expiration Redis
        try {
            recordRepository.save(LiveSessionRecord.builder()
                    .id(state.id)
                    .hostId(state.hostId)
                    .pinCode(clean(state.pin))
                    .quizId(state.quizId)
                    .quizTitle(state.quizTitle)
                    .status(state.status)
                    .playersCount(state.players.size())
                    .stateJson(json)
                    .createdAt(state.createdAt)
                    .build());
        } catch (DataAccessException ex) {
            log.warn("Session Live {} non archivée en base : {}", state.id, ex.getMessage());
        }
    }

    private LiveSessionState findFromDatabase(String id) {
        try {
            return recordRepository.findById(id).map(this::fromRecord).orElse(null);
        } catch (DataAccessException ex) {
            log.warn("Base indisponible pour la session Live {}.", id);
            return null;
        }
    }

    private Optional<LiveSessionState> findActiveByPinFromDatabase(String cleanPin) {
        try {
            return recordRepository.findFirstByPinCodeAndStatusNotOrderByCreatedAtDesc(cleanPin, "FINISHED")
                    .map(this::fromRecord);
        } catch (DataAccessException ex) {
            log.warn("Base indisponible pour la recherche Live par PIN.");
            return Optional.empty();
        }
    }

    private LiveSessionState fromRecord(LiveSessionRecord record) {
        try {
            LiveSessionState state = REDIS_MAPPER.readValue(record.getStateJson(), LiveSessionState.class);
            if (state.createdAt == null) {
                state.createdAt = record.getCreatedAt();
            }
            return state;
        } catch (JsonProcessingException ex) {
            log.warn("Session Live {} illisible en base.", record.getId(), ex);
            return null;
        }
    }

    private boolean isPinAvailable(String candidate) {
        boolean memoryAvailable = sessions.values().stream().noneMatch(s -> clean(s.pin).equals(candidate));
        if (!memoryAvailable || findActiveByPinFromDatabase(candidate).isPresent()) {
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
                LiveSessionState state = REDIS_MAPPER.readValue(raw, LiveSessionState.class);
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

    private int orZero(Integer value) {
        return value == null ? 0 : value;
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
        public LocalDateTime createdAt;
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
        public int answeredCount;
        public int correctCount;
        public int totalTimeSeconds;
        public int maxScore;
        public boolean finished;
        public boolean emailSent;

        void resetResults() {
            score = 0;
            streak = 0;
            accuracyPercent = 0;
            avgResponseTimeSeconds = 0;
            answeredCount = 0;
            correctCount = 0;
            totalTimeSeconds = 0;
            maxScore = 0;
            finished = false;
            emailSent = false;
        }
    }
}
