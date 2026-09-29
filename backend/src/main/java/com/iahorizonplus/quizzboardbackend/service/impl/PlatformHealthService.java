package com.iahorizonplus.quizzboardbackend.service.impl;

import com.iahorizonplus.quizzboardbackend.config.PayDunyaConfig;
import com.iahorizonplus.quizzboardbackend.external.SmtpEmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.connection.RedisConnection;
import org.springframework.data.redis.core.RedisCallback;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * État réel des services de la plateforme pour la supervision admin : base de données et Redis sont
 * interrogés (avec leur temps de réponse), emails, paiement et IA selon leur configuration effective.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PlatformHealthService {

    public static final String UP = "UP";
    public static final String WARNING = "WARNING";
    public static final String DOWN = "DOWN";

    private final JdbcTemplate jdbcTemplate;
    private final StringRedisTemplate redisTemplate;
    private final SmtpEmailService smtpEmailService;
    private final PayDunyaConfig payDunyaConfig;

    @Value("${app.payment.simulation-enabled:false}")
    private boolean paymentSimulation;

    @Value("${app.ai.gemini.api-key:}")
    private String geminiApiKey;

    @Value("${app.ai.gemini.model:gemini-3.5-flash}")
    private String geminiModel;

    @Value("${app.ai.gemini.fallback-model:gemini-3.5-flash-lite}")
    private String geminiFallbackModel;

    @Value("${app.ai.gemini.base-url:https://generativelanguage.googleapis.com/v1beta}")
    private String geminiBaseUrl;

    private final HttpClient httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(4)).build();

    /** Résultat du test Gemini gardé 5 minutes (chaque test est une petite génération réelle). */
    private static final long GEMINI_CHECK_TTL_MS = 5 * 60 * 1000L;
    private volatile Map<String, Object> lastGeminiStatus;
    private volatile long lastGeminiCheckAt;

    public List<Map<String, Object>> checkServices() {
        List<Map<String, Object>> services = new ArrayList<>();
        services.add(probe("database", "Base de données PostgreSQL",
                () -> jdbcTemplate.queryForObject("select 1", Integer.class)));
        services.add(probe("redis", "Redis (sessions Live)",
                () -> redisTemplate.execute((RedisCallback<String>) RedisConnection::ping)));
        services.add(smtpEmailService.isDeliveryEnabled()
                ? service("smtp", "Envoi des emails (SMTP)", UP, "Configuré")
                : service("smtp", "Envoi des emails (SMTP)", DOWN, "Désactivé : aucun email n'est envoyé"));
        services.add(paymentStatus());
        services.add(geminiStatus());
        return services;
    }

    private Map<String, Object> paymentStatus() {
        String name = "Paiement PayDunya";
        if (payDunyaConfig.isConfigured()) {
            boolean live = "live".equalsIgnoreCase(payDunyaConfig.getMode());
            return service("paydunya", name, live ? UP : WARNING, live ? "Configuré (mode réel)" : "Configuré en mode test (sandbox)");
        }
        return paymentSimulation
                ? service("paydunya", name, WARNING, "Paiement simulé (environnement de test)")
                : service("paydunya", name, DOWN, "Clés absentes : les paiements échouent");
    }

    /**
     * Test réel de l'IA : une très courte génération avec le modèle principal, puis le modèle de secours.
     * (La fiche d'un modèle peut répondre alors que Google refuse d'y générer : cas de gemini-2.5-flash.)
     * Sans génération possible, « Générer avec l'IA » produit des questions génériques de secours.
     */
    private Map<String, Object> geminiStatus() {
        String name = "IA Google Gemini";
        if (!isSet(geminiApiKey)) {
            return service("gemini", name, WARNING, "Clé GEMINI_API_KEY absente : questions génériques de secours");
        }
        Map<String, Object> cached = lastGeminiStatus;
        if (cached != null && System.currentTimeMillis() - lastGeminiCheckAt < GEMINI_CHECK_TTL_MS) {
            return cached;
        }
        long start = System.nanoTime();
        int primary = generationStatus(geminiModel);
        long ms = Math.max(1, (System.nanoTime() - start) / 1_000_000);
        Map<String, Object> status;
        if (primary == 200) {
            status = service("gemini", name, UP, "Opérationnel, modèle " + geminiModel + " (" + ms + " ms)");
        } else if (primary == 400 || primary == 401 || primary == 403) {
            status = service("gemini", name, DOWN, "Clé refusée par Google (HTTP " + primary + ") : questions génériques de secours");
        } else {
            int fallback = generationStatus(geminiFallbackModel);
            String problem = primary == 404 ? "indisponible pour cette clé"
                    : primary == 429 ? "quota dépassé"
                    : primary == 503 ? "saturé chez Google"
                    : primary < 0 ? "ne répond pas" : "en erreur (HTTP " + primary + ")";
            status = fallback == 200
                    ? service("gemini", name, WARNING, "Modèle " + geminiModel + " " + problem + " : modèle de secours " + geminiFallbackModel + " utilisé")
                    : service("gemini", name, DOWN, "Modèles " + geminiModel + " et " + geminiFallbackModel + " indisponibles : questions génériques de secours");
        }
        lastGeminiStatus = status;
        lastGeminiCheckAt = System.currentTimeMillis();
        return status;
    }

    /** Code HTTP d'une génération minimale (-1 si Google est injoignable). */
    private int generationStatus(String model) {
        if (model == null || model.isBlank()) return -1;
        String url = geminiBaseUrl + "/models/" + model.trim() + ":generateContent?key=" + URLEncoder.encode(geminiApiKey.trim(), StandardCharsets.UTF_8);
        String body = "{\"contents\":[{\"parts\":[{\"text\":\"Reponds OK\"}]}]}";
        try {
            HttpResponse<Void> response = httpClient.send(
                    HttpRequest.newBuilder(URI.create(url)).timeout(Duration.ofSeconds(15))
                            .header("Content-Type", "application/json")
                            .POST(HttpRequest.BodyPublishers.ofString(body)).build(),
                    HttpResponse.BodyHandlers.discarding());
            return response.statusCode();
        } catch (Exception e) {
            log.warn("Supervision : Google Gemini ({}) injoignable ({})", model, e.getMessage());
            return -1;
        }
    }

    private Map<String, Object> probe(String id, String name, Runnable check) {
        long start = System.nanoTime();
        try {
            check.run();
            long ms = Math.max(1, (System.nanoTime() - start) / 1_000_000);
            Map<String, Object> s = service(id, name, UP, "Opérationnel (" + ms + " ms)");
            s.put("latencyMs", ms);
            return s;
        } catch (Exception e) {
            log.warn("Supervision : {} injoignable ({})", name, e.getMessage());
            return service(id, name, DOWN, "Injoignable");
        }
    }

    private static Map<String, Object> service(String id, String name, String status, String detail) {
        Map<String, Object> s = new LinkedHashMap<>();
        s.put("id", id);
        s.put("name", name);
        s.put("status", status);
        s.put("detail", detail);
        return s;
    }

    private static boolean isSet(String value) {
        // Mêmes règles que la génération IA (valeurs d'exemple des fichiers .env ignorées)
        return value != null && !value.isBlank() && !value.contains("votre_") && !value.contains("your_key");
    }
}
