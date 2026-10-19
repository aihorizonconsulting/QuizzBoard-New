package com.iahorizonplus.quizzboardbackend.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
@RequiredArgsConstructor
@Slf4j
public class SchemaCompatibilityInitializer implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) {
        ensurePlatformSettingsPricingColumns();
        allowUsersWithoutRoleDuringMigration();
    }

    private void ensurePlatformSettingsPricingColumns() {
        addColumnIfMissing("platform_settings", "starter_price_fcfa", "DOUBLE PRECISION DEFAULT 999.0 NOT NULL");
        addColumnIfMissing("platform_settings", "starter_price_usd", "DOUBLE PRECISION DEFAULT 2.0 NOT NULL");
        addColumnIfMissing("platform_settings", "learner_plus_price_fcfa", "DOUBLE PRECISION DEFAULT 200.0 NOT NULL");
        addColumnIfMissing("platform_settings", "learner_plus_price_usd", "DOUBLE PRECISION DEFAULT 0.5 NOT NULL");
    }

    private void allowUsersWithoutRoleDuringMigration() {
        try {
            jdbcTemplate.execute("ALTER TABLE users ALTER COLUMN role DROP NOT NULL");
        } catch (Exception ex) {
            log.debug("La colonne users.role est déjà nullable ou la table n'existe pas encore.");
        }
    }

    private void addColumnIfMissing(String table, String column, String definition) {
        try {
            jdbcTemplate.execute("ALTER TABLE " + table + " ADD COLUMN IF NOT EXISTS " + column + " " + definition);
        } catch (Exception ex) {
            log.debug("Colonne {}.{} déjà présente ou table pas encore créée.", table, column);
        }
    }
}
