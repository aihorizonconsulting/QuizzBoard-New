package com.iahorizonplus.quizzboardbackend;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

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

}
