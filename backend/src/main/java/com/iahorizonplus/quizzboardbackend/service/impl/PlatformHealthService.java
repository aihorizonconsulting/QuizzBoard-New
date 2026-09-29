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

    @Value("${app.ai.gemini.model:gemini-2.5-flash}")
    private String geminiModel;

    @Value("${app.ai.groq.api-key:}")
    private String groqApiKey;

    @Value("${app.ai.groq.model:llama-3.3-70b-versatile}")
    private String groqModel;

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
        services.add(isSet(geminiApiKey)
                ? service("gemini", "IA Google Gemini", UP, "Clé configurée (" + geminiModel + ")")
                : service("gemini", "IA Google Gemini", WARNING, "Clé absente : générateur de secours"));
        services.add(isSet(groqApiKey)
                ? service("groq", "IA Groq", UP, "Clé configurée (" + groqModel + ")")
                : service("groq", "IA Groq", WARNING, "Clé absente"));
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
        return value != null && !value.isBlank() && !value.contains("votre_");
    }
}
