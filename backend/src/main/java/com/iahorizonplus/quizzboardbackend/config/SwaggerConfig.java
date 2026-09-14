package com.iahorizonplus.quizzboardbackend.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SwaggerConfig {

    @Bean
    public OpenAPI customOpenAPI() {
        final String securitySchemeName = "BearerAuth";

        return new OpenAPI()
                .info(new Info()
                        .title("QuizzBoard Enterprise API")
                        .version("1.0.0")
                        .description("Documentation interactive de l'API QuizzBoard : Authentification JWT, Google OAuth2, Réinitialisation de mot de passe par SMTP, Swagger UI, Quotas et Gestion des Utilisateurs.")
                        .contact(new Contact()
                                .name("IA Horizon Plus Consulting")
                                .email("contact@iahorizonplus.com")
                                .url("https://quizzboard.iahorizonplus.com"))
                        .license(new License().name("Apache 2.0").url("https://springdoc.org")))
                .addSecurityItem(new SecurityRequirement().addList(securitySchemeName))
                .components(new Components()
                        .addSecuritySchemes(securitySchemeName, new SecurityScheme()
                                .name(securitySchemeName)
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")
                                .description("Entrez le token JWT obtenu après authentification (sans préfixe Bearer).")));
    }
}
