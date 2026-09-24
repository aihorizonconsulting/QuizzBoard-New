package com.iahorizonplus.quizzboardbackend.config;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.core.JsonToken;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;
import com.fasterxml.jackson.datatype.jsr310.deser.LocalDateTimeDeserializer;
import org.springframework.boot.autoconfigure.jackson.Jackson2ObjectMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.regex.Pattern;

/**
 * Ajuste l'ObjectMapper de Spring Boot sans le remplacer (ne jamais déclarer d'ObjectMapper en bean :
 * il remplacerait celui de Boot pour toute l'API).
 */
@Configuration
public class JacksonConfig {

    @Bean
    public Jackson2ObjectMapperBuilderCustomizer lenientLocalDateTimeCustomizer() {
        return builder -> builder.deserializerByType(LocalDateTime.class, new LenientLocalDateTimeDeserializer());
    }

    /**
     * Le frontend envoie souvent des dates seules ("2026-09-24") pour des champs LocalDateTime
     * (createdAt, joinedAt...) : elles sont lues comme le début de journée au lieu d'être rejetées en 400.
     */
    static class LenientLocalDateTimeDeserializer extends JsonDeserializer<LocalDateTime> {
        private static final Pattern DATE_ONLY = Pattern.compile("\\d{4}-\\d{2}-\\d{2}");

        @Override
        public LocalDateTime deserialize(JsonParser parser, DeserializationContext context) throws IOException {
            if (parser.currentToken() == JsonToken.VALUE_STRING) {
                String text = parser.getText().trim();
                if (text.isEmpty()) {
                    return null;
                }
                if (DATE_ONLY.matcher(text).matches()) {
                    return LocalDate.parse(text).atStartOfDay();
                }
            }
            return LocalDateTimeDeserializer.INSTANCE.deserialize(parser, context);
        }
    }
}
