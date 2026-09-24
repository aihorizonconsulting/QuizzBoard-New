package com.iahorizonplus.quizzboardbackend;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class QuizzboardBackendApplicationTests {

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void contextLoads() {
    }

    /**
     * L'API doit utiliser l'ObjectMapper de Spring Boot : un ObjectMapper déclaré en bean ailleurs
     * le remplace, et le frontend reçoit alors des 400 (champs en trop) et des dates en tableaux.
     */
    @Test
    void apiObjectMapper_IsSpringBootDefault() {
        assertThat(objectMapper.isEnabled(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)).isFalse();
        assertThat(objectMapper.isEnabled(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)).isFalse();
    }

    /** Le frontend envoie parfois une date seule pour un champ date-heure (createdAt d'une classe...). */
    @Test
    void apiObjectMapper_AcceptsDateOnlyForLocalDateTime() throws Exception {
        assertThat(objectMapper.readValue("\"2026-09-24\"", LocalDateTime.class))
                .isEqualTo(LocalDateTime.of(2026, 9, 24, 0, 0));
        assertThat(objectMapper.readValue("\"2026-09-24T10:15:30\"", LocalDateTime.class))
                .isEqualTo(LocalDateTime.of(2026, 9, 24, 10, 15, 30));
        assertThat(objectMapper.readValue("\"\"", LocalDateTime.class)).isNull();
    }

}
