# 🚀 Roadmap Complète : Mise en Place du Backend Spring Boot pour QuizzBoard

> **Projet** : QuizzBoard (Plateforme SaaS d'évaluation pédagogique, de quiz en direct multijoueurs, de cours structurés par IA et de gestion de cohortes académiques)  
> **Stack Backend cible** : Java 21 LTS, Spring Boot 3.3.x / 3.4.x, Spring Security 6 (JWT Stateless + OAuth2 Google), Spring Data JPA, PostgreSQL, Spring Mail (SMTP), Spring WebSocket (STOMP), SpringDoc OpenAPI 3 (Swagger), SDK Google Gemini / Groq Cloud.  
> **Frontend client** : Angular 19+ (Standalone Components, Signals, Reactive Layouts).

---

## 📑 Sommaire

1. [Synthèse de l'Analyse du Projet Frontend](#1-synthèse-de-lanalyse-du-projet-frontend)
2. [Architecture Technique & Dépendances Maven](#2-architecture-technique--dépendances-maven)
3. [Configuration Globale & application.yml](#3-configuration-globale--applicationyml)
4. [Étape 1 : Authentification Complète, Inscription, Mot de Passe Oublié (SMTP) & Google OAuth2](#étape-1--authentification-complète-inscription-mot-de-passe-oublié-smtp--google-oauth2)
5. [Étape 2 : Configuration Swagger / OpenAPI & Gestion Globale des Erreurs](#étape-2--configuration-swagger--openapi--gestion-globale-des-erreurs)
6. [Étape 3 : Module Utilisateurs, Profils & Abonnements (Free & Starter)](#étape-3--module-utilisateurs-profils--abonnements-free--starter)
7. [Étape 4 : Module Promotions Académiques & Classes](#étape-4--module-promotions-académiques--classes)
8. [Étape 5 : Module Quiz, Questions & Choix](#étape-5--module-quiz-questions--choix)
9. [Étape 6 : Moteur de Live Arena en Temps Réel (WebSockets & STOMP)](#étape-6--moteur-de-live-arena-en-temps-réel-websockets--stomp)
10. [Étape 7 : Module Cours Magistraux & Chapitres Pédagogiques](#étape-7--module-cours-magistraux--chapitres-pédagogiques)
11. [Étape 8 : Moteur IA Externe (Google Gemini & Groq)](#étape-8--moteur-ia-externe-google-gemini--groq)
12. [Étape 9 : Module Participations, Scores & Certificats Numériques](#étape-9--module-participations-scores--certificats-numériques)
13. [Étape 10 : Module Communautés, Forums, Ressources & Visioconférences](#étape-10--module-communautés-forums-ressources--visioconférences)
14. [Étape 11 : Module SuperAdmin, Métriques & Logs d'Audit](#étape-11--module-superadmin-métriques--logs-daudit)
15. [Matrice Complète de Tous les Endpoints REST (Frontend ↔ Backend)](#15-matrice-complète-de-tous-les-endpoints-rest-frontend--backend)
16. [Checklist d'Exécution & Bonnes Pratiques](#16-checklist-dexécution--bonnes-pratiques)

---

## 1. Synthèse de l'Analyse du Projet Frontend

L'analyse minutieuse du code source du frontend Angular (`quizzboard-client`) met en évidence les piliers fonctionnels suivants :

### 1.1 Profils & Rôles Applicatifs
* **`CREATOR` (Formateur / Enseignant)** : Crée des quiz, génère des cours avec l'IA, anime des arènes live sur smartphone, gère ses classes, promotions et communautés, suit ses abonnements (`FREE` ou `STARTER`).
* **`LEARNER` (Apprenant / Étudiant)** : Rejoint des sessions live par code PIN ou code de partage, suit les cours assignés à sa classe, participe aux forums, passe des certifications.
* **`ADMIN` (SuperAdmin)** : Supervise la plateforme, modère les utilisateurs et contenus, suit les métriques financières (MRR en FCFA et USD), gère les quotas IA et consulte les logs d'audit.

### 1.2 Forfaits & Facturation
* **`FREE`** : 0 FCFA (Limite à 3 quiz, 25 participants live max, 5 crédits IA/mois).
* **`STARTER`** : 9 900 FCFA/mois (~15 USD) avec paiements Wave, Orange Money et Stripe.

### 1.3 Fonctionnalités Avancées Identifiées
1. **Générateur IA de Quiz & Cours** : Utilisation de modèles LLM (Gemini 1.5 Flash / Groq) pour créer des QCM pertinents et des chapitres de cours détaillés avec quiz intégrés.
2. **Arène Live Multijoueurs** : Interaction synchrone en direct avec calcul de points, séries (streaks), temps de réponse et podium.
3. **Gestion Académique par Promotions & Cohortes** : Contexte annuel actif (`UPCOMING`, `IN_PROGRESS`, `ARCHIVED`) avec règles d'immutabilité et classes rattachées.
4. **Certificats Numériques Vérifiables** : Délivrés automatiquement dès 80% de réussite avec code unique d'authenticité (ex: `QZ-4892-95`).
5. **Envoi d'Emails Transactionnels (SMTP)** : Bienvenue, validation de compte, lien de réinitialisation de mot de passe, notification de certificat.

---

## 2. Architecture Technique & Dépendances Maven

### 2.1 Remarque Importante sur la Version Spring Boot
Dans le fichier `pom.xml` actuel du backend, le parent est indiqué en `4.1.1`. Spring Boot 4.x n'étant pas encore une version GA de production, il est **fortement recommandé** d'utiliser **Spring Boot 3.3.x ou 3.4.x** (avec **Java 21 LTS**), garantissant une compatibilité totale avec Spring Security 6, Jakarta EE 10 et SpringDoc OpenAPI v2.

### 2.2 Dépendances Complètes à Ajouter dans `pom.xml`

```xml
<dependencies>
    <!-- 1. Spring Boot Web, Security, Data JPA & Validation -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-security</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-jpa</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-validation</artifactId>
    </dependency>
    
    <!-- 2. WebSockets & STOMP (Live Quiz Multiplayer) -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-websocket</artifactId>
    </dependency>

    <!-- 3. Base de Données PostgreSQL & Driver -->
    <dependency>
        <groupId>org.postgresql</groupId>
        <artifactId>postgresql</artifactId>
        <scope>runtime</scope>
    </dependency>

    <!-- 4. Lombok & DevTools -->
    <dependency>
        <groupId>org.projectlombok</groupId>
        <artifactId>lombok</artifactId>
        <optional>true</optional>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-devtools</artifactId>
        <scope>runtime</scope>
        <optional>true</optional>
    </dependency>

    <!-- 5. JWT (JSON Web Tokens - Modern JJWT 0.12.x) -->
    <dependency>
        <groupId>io.jsonwebtoken</groupId>
        <artifactId>jjwt-api</artifactId>
        <version>0.12.6</version>
    </dependency>
    <dependency>
        <groupId>io.jsonwebtoken</groupId>
        <artifactId>jjwt-impl</artifactId>
        <version>0.12.6</version>
        <scope>runtime</scope>
    </dependency>
    <dependency>
        <groupId>io.jsonwebtoken</groupId>
        <artifactId>jjwt-jackson</artifactId>
        <version>0.12.6</version>
        <scope>runtime</scope>
    </dependency>

    <!-- 6. Google Auth & OAuth2 Client -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-oauth2-client</artifactId>
    </dependency>
    <dependency>
        <groupId>com.google.api-client</groupId>
        <artifactId>google-api-client</artifactId>
        <version>2.7.0</version>
    </dependency>

    <!-- 7. Spring Mail (SMTP) & Moteur de Templates Thymeleaf pour les Emails -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-mail</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-thymeleaf</artifactId>
    </dependency>

    <!-- 8. Documentation Swagger / OpenAPI 3 -->
    <dependency>
        <groupId>org.springdoc</groupId>
        <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
        <version>2.6.0</version>
    </dependency>

    <!-- 9. Client HTTP Réactif pour Appel des APIs IA (Gemini & Groq) -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-webflux</artifactId>
    </dependency>

    <!-- 10. Tests -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-test</artifactId>
        <scope>test</scope>
    </dependency>
    <dependency>
        <groupId>org.springframework.security</groupId>
        <artifactId>spring-security-test</artifactId>
        <scope>test</scope>
    </dependency>
</dependencies>
```

### 2.3 Structure de Packages Recommandée (Clean & Modular Architecture)

```
com.iahorizonplus.quizzboardbackend
│
├── config/                 # Configurations (SecurityConfig, SwaggerConfig, MailConfig, WebSocketConfig, CorsConfig)
├── security/               # Filtre JWT, UserDetailsService, JwtUtils, SecurityExceptions
├── controller/             # Endpoints REST (Auth, User, Quiz, Course, Promotion, Classe, Admin...)
├── service/                # Interfaces des services métiers
│   └── impl/               # Implémentations des services
├── repository/             # Interfaces Spring Data JPA
├── entity/                 # Entités JPA avec relations Hibernate
├── dto/                    # Data Transfer Objects (Requests & Responses)
│   ├── request/
│   └── response/
├── mapper/                 # Mappers Entités <-> DTOs (MapStruct ou manuels)
├── exception/              # GlobalExceptionHandler, Custom Exceptions (ResourceNotFound, BadCredentials...)
└── external/               # Clients externes (GeminiClient, GroqClient, SmtpEmailService, PaymentGateways)
```

---

## 3. Configuration Globale & application.yml

Fichier `src/main/resources/application.yml` :

```yaml
server:
  port: 8080
  servlet:
    context-path: /api/v1

spring:
  application:
    name: quizzboard-backend

  # 1. Configuration PostgreSQL
  datasource:
    url: jdbc:postgresql://${DB_HOST:localhost}:${DB_PORT:5432}/${DB_NAME:quizzboard_db}
    username: ${DB_USER:postgres}
    password: ${DB_PASSWORD:postgres}
    driver-class-name: org.postgresql.Driver
  jpa:
    hibernate:
      ddl-auto: update
    show-sql: false
    properties:
      hibernate:
        format_sql: true
        dialect: org.hibernate.dialect.PostgreSQLDialect

  # 2. Configuration SMTP (Gmail, Brevo, Sendgrid ou serveur d'entreprise)
  mail:
    host: ${SMTP_HOST:smtp.gmail.com}
    port: ${SMTP_PORT:588}
    username: ${SMTP_USERNAME:contact.iahorizonplus@gmail.com}
    password: ${SMTP_PASSWORD:votre_mot_de_passe_application}
    properties:
      mail:
        smtp:
          auth: true
          starttls:
            enable: true
            required: true

  # 3. Google OAuth2 Client
  security:
    oauth2:
      client:
        registration:
          google:
            client-id: ${GOOGLE_CLIENT_ID:votre-google-client-id.apps.googleusercontent.com}
            client-secret: ${GOOGLE_CLIENT_SECRET:votre-google-client-secret}
            scope:
              - email
              - profile

# 4. Paramètres Applicatifs Spécifiques
app:
  jwt:
    secret: ${JWT_SECRET:9a8f3b2c1d4e5f60718293a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4}
    expiration-ms: 86400000        # 24 heures
    refresh-expiration-ms: 604800000 # 7 jours
  cors:
    allowed-origins: ${CORS_ORIGINS:http://localhost:4200,https://quizzboard.iahorizonplus.com}
  mail:
    from: "QuizzBoard Support <no-reply@quizzboard.com>"
    reset-password-url: "http://localhost:4200/reinitialisation-mot-de-passe?token="
  ai:
    gemini:
      api-key: ${GEMINI_API_KEY:votre_gemini_api_key}
      model: "gemini-1.5-flash"
      base-url: "https://generativelanguage.googleapis.com/v1beta"
    groq:
      api-key: ${GROQ_API_KEY:votre_groq_api_key}
      model: "llama-3.3-70b-versatile"
      base-url: "https://api.groq.com/openai/v1"

# 5. Swagger / OpenAPI Configuration
springdoc:
  swagger-ui:
    path: /swagger-ui.html
    tags-sorter: alpha
    operations-sorter: method
  api-docs:
    path: /v3/api-docs
```

---

## Étape 1 : Authentification Complète, Inscription, Mot de Passe Oublié (SMTP) & Google OAuth2

Cette étape est la **fondation critique** du backend. Elle sécurise tous les accès, gère la session utilisateur et répond fidèlement aux besoins des formulaires de `LoginComponent` et `SignupComponent`.

### 1.1 Entité Utilisateur & Enums

#### `UserRole.java`
```java
package com.iahorizonplus.quizzboardbackend.entity;

public enum UserRole {
    CREATOR,
    LEARNER,
    ADMIN
}
```

#### `SubscriptionTier.java`
```java
package com.iahorizonplus.quizzboardbackend.entity;

public enum SubscriptionTier {
    FREE,
    STARTER
}
```

#### `AuthProvider.java`
```java
package com.iahorizonplus.quizzboardbackend.entity;

public enum AuthProvider {
    LOCAL,
    GOOGLE
}
```

#### `User.java`
```java
package com.iahorizonplus.quizzboardbackend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false, length = 100)
    private String prenom;

    @Column(nullable = false, length = 100)
    private String nom;

    @Column(nullable = false, unique = true, length = 150)
    private String email;

    @Column(nullable = true)
    private String password; // Nullable pour les utilisateurs Google OAuth2

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UserRole role; // CREATOR, LEARNER, ADMIN

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SubscriptionTier subscriptionTier = SubscriptionTier.FREE;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AuthProvider authProvider = AuthProvider.LOCAL;

    private String googleSub; // Identifiant Google unique (sub)

    private String avatarUrl;
    private String organization;
    private String phoneNumber;

    @Builder.Default
    private Integer xpPoints = 0;

    @Builder.Default
    private Integer level = 1;

    @Builder.Default
    private Integer streakDays = 1;

    @Builder.Default
    private Integer followersCount = 0;

    @Builder.Default
    private Integer followingCount = 0;

    @Builder.Default
    private String status = "ACTIVE"; // ACTIVE, SUSPENDED

    private boolean emailVerified = false;
    private String emailVerificationToken;

    // Champs pour le mot de passe oublié
    private String passwordResetToken;
    private LocalDateTime passwordResetTokenExpiry;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
```

---

### 1.2 DTOs de l'Authentification

#### Requêtes DTO
* `SignupRequest.java` :
  ```java
  public record SignupRequest(
      @NotBlank(message = "Le prénom est obligatoire") String prenom,
      @NotBlank(message = "Le nom est obligatoire") String nom,
      @Email(message = "Email invalide") @NotBlank String email,
      @Size(min = 6, message = "Le mot de passe doit comporter au moins 6 caractères") String password,
      @NotNull(message = "Le rôle est obligatoire") UserRole role
  ) {}
  ```
* `LoginRequest.java` :
  ```java
  public record LoginRequest(
      @Email @NotBlank String email,
      @NotBlank String password
  ) {}
  ```
* `GoogleAuthRequest.java` :
  ```java
  public record GoogleAuthRequest(
      @NotBlank String idToken,
      UserRole role // Rôle sélectionné lors de l'inscription Google (défaut CREATOR)
  ) {}
  ```
* `ForgotPasswordRequest.java` :
  ```java
  public record ForgotPasswordRequest(
      @Email @NotBlank String email
  ) {}
  ```
* `ResetPasswordRequest.java` :
  ```java
  public record ResetPasswordRequest(
      @NotBlank String token,
      @Size(min = 6) String newPassword
  ) {}
  ```

#### Réponses DTO
* `AuthResponse.java` :
  ```java
  public record AuthResponse(
      String token,
      String refreshToken,
      UserDto user
  ) {}
  ```

---

### 1.3 Gestion de l'Inscription & Hachage du Mot de Passe

1. Le contrôleur reçoit la requête `POST /auth/signup`.
2. Vérifie l'unicité de l'email via `userRepository.existsByEmail(email)`.
3. Encode le mot de passe avec `BCryptPasswordEncoder`.
4. Initialise les attributs du modèle utilisateur avec un avatar par défaut adapté au rôle (`CREATOR` ou `LEARNER`).
5. Génère un token de vérification d'email et déclenche l'envoi d'un email de bienvenue avec lien d'activation via `SmtpEmailService`.
6. Génère les tokens JWT (`accessToken` + `refreshToken`) pour connecter l'utilisateur immédiatement.

---

### 1.4 Gestion du Mot de Passe Oublié (Flux SMTP Sécurisé)

Le frontend comporte un lien **"Oublié ?"** sur le formulaire de connexion. Voici l'implémentation complète :

1. **Demande de réinitialisation (`POST /auth/forgot-password`)** :
   - L'utilisateur saisit son adresse email.
   - Si l'utilisateur existe dans la base :
     - Génération d'un token aléatoire sécurisé (UUID ou 6 chiffres) avec expiration à `LocalDateTime.now().plusMinutes(15)`.
     - Sauvegarde du token et de l'expiration sur l'entité `User`.
     - Envoi d'un email HTML moderne via `SmtpEmailService` contenant le lien :  
       `${app.mail.reset-password-url}${token}`.
   - **Protection anti-énumération** : L'API retourne toujours un message de succès générique (`"Si l'adresse existe, un email de réinitialisation a été envoyé"`), que l'email existe ou non en base.

2. **Validation & Changement de mot de passe (`POST /auth/reset-password`)** :
   - Le backend recherche l'utilisateur par le `passwordResetToken`.
   - Vérifie que `passwordResetTokenExpiry` est postérieur à l'heure actuelle.
   - Encode le nouveau mot de passe avec `BCrypt`.
   - Réinitialise le token et son expiration à `null`.
   - Envoie un email de confirmation de modification de sécurité via SMTP.

#### Implémentation du Service Email SMTP (`SmtpEmailService.java`)
```java
package com.iahorizonplus.quizzboardbackend.external;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class SmtpEmailService {

    private final JavaMailSender mailSender;

    @Value("${app.mail.from}")
    private String fromEmail;

    @Value("${app.mail.reset-password-url}")
    private String resetPasswordBaseUrl;

    @Async
    public void sendPasswordResetEmail(String toEmail, String userName, String token) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject("Réinitialisation de votre mot de passe QuizzBoard");

            String resetLink = resetPasswordBaseUrl + token;
            String htmlContent = """
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #E2E8F0; border-radius: 8px;">
                    <div style="text-align: center; margin-bottom: 24px;">
                        <h1 style="color: #0F172A; margin: 0;">QuizzBoard</h1>
                        <p style="color: #64748B; font-size: 14px;">Plateforme d'Évaluation & Quiz Interactifs</p>
                    </div>
                    <p style="color: #334155; font-size: 15px;">Bonjour <strong>%s</strong>,</p>
                    <p style="color: #334155; font-size: 15px;">Nous avons reçu une demande de réinitialisation de mot de passe pour votre compte QuizzBoard.</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="%s" style="background-color: #0F172A; color: #FFFFFF; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                            Réinitialiser mon mot de passe
                        </a>
                    </div>
                    <p style="color: #64748B; font-size: 13px;">Ce lien est valable pendant <strong>15 minutes</strong>. Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email en toute sécurité.</p>
                    <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 24px 0;" />
                    <p style="color: #94A3B8; font-size: 12px; text-align: center;">© 2026 QuizzBoard. Tous droits réservés.</p>
                </div>
            """.formatted(userName, resetLink);

            helper.setText(htmlContent, true);
            mailSender.send(message);
            log.info("Email de réinitialisation envoyé avec succès à {}", toEmail);
        } catch (MessagingException e) {
            log.error("Erreur lors de l'envoi de l'email SMTP à {}", toEmail, e);
        }
    }
}
```

---

### 1.5 Authentification avec Google (Sign-In with Google)

Le frontend propose les boutons `"Continuer avec Google"` sur `/connexion` et `"S'inscrire avec Google"` sur `/inscription`.

#### Architecture du Flux Google OAuth2 recommandé pour SPA (Angular + Spring Boot) :
1. **Frontend Angular** : Utilise le SDK officiel Google Identity Services (`@google/accounts`) pour afficher le bouton Google et récupérer un `idToken` sécurisé (JWT signé par Google).
2. **Envoi au Backend** : Le client Angular transmet le `idToken` via `POST /api/v1/auth/google` avec le rôle souhaité (`CREATOR` ou `LEARNER`).
3. **Vérification Côté Spring Boot** :
   - Le backend utilise `GoogleIdTokenVerifier` (de Google API Client Java) pour valider l'intégrité cryptographique du token et vérifier que l'audience correspond bien au `GOOGLE_CLIENT_ID` configuré.
   - Extraction des claims : `email`, `given_name`, `family_name`, `picture`, `sub`.
4. **Auto-Provisioning / Connexion** :
   - Si un utilisateur avec cet email existe déjà : mise à jour de son `googleSub` et `avatarUrl`, puis émission du token JWT applicatif QuizzBoard.
   - Si l'utilisateur n'existe pas : création automatique d'un compte avec le rôle spécifié, attribution du statut `ACTIVE` et de l'avatar Google.
5. **Réponse** : Retourne l'`AuthResponse` avec le JWT de session QuizzBoard.

#### Implémentation du Service de Vérification Google (`GoogleAuthService.java`)
```java
package com.iahorizonplus.quizzboardbackend.service.impl;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.iahorizonplus.quizzboardbackend.dto.request.GoogleAuthRequest;
import com.iahorizonplus.quizzboardbackend.dto.response.AuthResponse;
import com.iahorizonplus.quizzboardbackend.entity.AuthProvider;
import com.iahorizonplus.quizzboardbackend.entity.SubscriptionTier;
import com.iahorizonplus.quizzboardbackend.entity.User;
import com.iahorizonplus.quizzboardbackend.entity.UserRole;
import com.iahorizonplus.quizzboardbackend.exception.BadRequestException;
import com.iahorizonplus.quizzboardbackend.mapper.UserMapper;
import com.iahorizonplus.quizzboardbackend.repository.UserRepository;
import com.iahorizonplus.quizzboardbackend.security.JwtUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;

@Service
@RequiredArgsConstructor
@Slf4j
public class GoogleAuthService {

    private final UserRepository userRepository;
    private final JwtUtils jwtUtils;
    private final UserMapper userMapper;

    @Value("${spring.security.oauth2.client.registration.google.client-id}")
    private String googleClientId;

    @Transactional
    public AuthResponse authenticateWithGoogle(GoogleAuthRequest request) {
        GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(
                new NetHttpTransport(), 
                GsonFactory.getDefaultInstance()
        )
        .setAudience(Collections.singletonList(googleClientId))
        .build();

        GoogleIdToken idToken;
        try {
            idToken = verifier.verify(request.idToken());
        } catch (Exception e) {
            log.error("Échec de la vérification du token Google", e);
            throw new BadRequestException("Token Google invalide ou corrompu.");
        }

        if (idToken == null) {
            throw new BadRequestException("Token Google expiré ou invalide.");
        }

        GoogleIdToken.Payload payload = idToken.getPayload();
        String email = payload.getEmail();
        String googleSub = payload.getSubject();
        String prenom = (String) payload.get("given_name");
        String nom = (String) payload.get("family_name");
        String pictureUrl = (String) payload.get("picture");

        User user = userRepository.findByEmail(email).map(existingUser -> {
            // Utilisateur déjà existant, mise à jour des infos Google
            existingUser.setGoogleSub(googleSub);
            if (existingUser.getAvatarUrl() == null) {
                existingUser.setAvatarUrl(pictureUrl);
            }
            return userRepository.save(existingUser);
        }).orElseGet(() -> {
            // Création d'un nouvel utilisateur (Auto-provisioning)
            UserRole assignedRole = request.role() != null ? request.role() : UserRole.CREATOR;
            User newUser = User.builder()
                    .prenom(prenom != null ? prenom : "Utilisateur")
                    .nom(nom != null ? nom : "Google")
                    .email(email)
                    .role(assignedRole)
                    .subscriptionTier(SubscriptionTier.FREE)
                    .authProvider(AuthProvider.GOOGLE)
                    .googleSub(googleSub)
                    .avatarUrl(pictureUrl)
                    .emailVerified(true)
                    .status("ACTIVE")
                    .xpPoints(0)
                    .level(1)
                    .streakDays(1)
                    .build();
            return userRepository.save(newUser);
        });

        String jwtToken = jwtUtils.generateToken(user.getEmail(), user.getRole().name());
        String refreshToken = jwtUtils.generateRefreshToken(user.getEmail());

        return new AuthResponse(jwtToken, refreshToken, userMapper.toDto(user));
    }
}
```

---

### 1.6 Sécurité Spring Security 6 & Configuration du Filtre JWT

#### `SecurityConfig.java`
```java
package com.iahorizonplus.quizzboardbackend.config;

import com.iahorizonplus.quizzboardbackend.security.JwtAuthenticationEntryPoint;
import com.iahorizonplus.quizzboardbackend.security.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final JwtAuthenticationEntryPoint unauthorizedHandler;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .exceptionHandling(ex -> ex.authenticationEntryPoint(unauthorizedHandler))
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                // Endpoints Publics (Auth, Swagger, WebSocket, Explorations)
                .requestMatchers("/auth/**").permitAll()
                .requestMatchers("/swagger-ui/**", "/v3/api-docs/**", "/swagger-ui.html").permitAll()
                .requestMatchers("/ws-live/**").permitAll() // WebSocket handshake
                .requestMatchers(HttpMethod.GET, "/quizzes/public", "/quizzes/share/**", "/certificates/verify/**").permitAll()
                // Espace SuperAdmin
                .requestMatchers("/admin/**").hasRole("ADMIN")
                // Espace Formateur / Créateur
                .requestMatchers("/creator/**", "/ai/**").hasAnyRole("CREATOR", "ADMIN")
                // Tout le reste nécessite une authentification
                .anyRequest().authenticated()
            );

        http.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(List.of("http://localhost:4200", "https://quizzboard.iahorizonplus.com"));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-Requested-With", "Accept"));
        configuration.setExposedHeaders(List.of("Authorization"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
```

---

## Étape 2 : Configuration Swagger / OpenAPI & Gestion Globale des Erreurs

Pour documenter exhaustivement chaque endpoint et permettre de tester facilement l'API avec les tokens JWT, voici la configuration Swagger OpenAPI 3.

### 2.1 Configuration Swagger UI (`SwaggerConfig.java`)
```java
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
                .title("QuizzBoard Backend API Documentation")
                .version("1.0.0")
                .description("API REST complète de la plateforme QuizzBoard : Authentification JWT, Google OAuth2, Générateur IA (Gemini/Groq), Live Arène Multijoueurs, Gestion Académique, Certifications et Paiements.")
                .contact(new Contact()
                    .name("Support QuizzBoard - IA Horizon Plus Consulting")
                    .email("support@quizzboard.com")
                    .url("https://quizzboard.iahorizonplus.com"))
                .license(new License().name("Apache 2.0").url("https://springdoc.org")))
            .addSecurityItem(new SecurityRequirement().addList(securitySchemeName))
            .components(new Components()
                .addSecuritySchemes(securitySchemeName, new SecurityScheme()
                    .name(securitySchemeName)
                    .type(SecurityScheme.Type.HTTP)
                    .scheme("bearer")
                    .bearerFormat("JWT")
                    .description("Entrez le token JWT obtenu lors de la connexion (sans le préfixe Bearer).")));
    }
}
```

### 2.2 Gestion Globale des Exceptions (RFC 7807) (`GlobalExceptionHandler.java`)
Permet de standardiser tous les retours d'erreurs (400, 401, 403, 404, 500) sous un format JSON unifié compréhensible par Angular :
```json
{
  "timestamp": "2026-09-06T17:00:00Z",
  "status": 404,
  "error": "Not Found",
  "message": "Le quiz avec l'ID 'quiz-123' n'existe pas.",
  "path": "/api/v1/quizzes/quiz-123"
}
```

---

## Étape 3 : Module Utilisateurs, Profils & Abonnements (Free & Starter)

Gère les profils des formateurs et apprenants, les statistiques d'apprentissage et la souscription aux abonnements.

### 3.1 Entités
* `User` : Voir section 1.1.
* `Invoice` :
  - `id`, `userId`, `planName`, `amountFcfa`, `amountUsd`, `paymentMethod` (`WAVE`, `ORANGE_MONEY`, `STRIPE`), `status` (`PAID`, `PENDING`, `FAILED`), `reference`, `createdAt`.

### 3.2 Endpoints REST du Module Utilisateur & Abonnements
* `GET /users/me` : Récupère les informations complètes de l'utilisateur connecté.
* `PUT /users/me` : Met à jour le profil (nom, prénom, organisation, téléphone, avatar).
* `PATCH /users/me/avatar` : Upload Multipart de la photo de profil.
* `GET /users/plans` : Liste les plans disponibles (`FREE` et `STARTER` avec tarifs en FCFA et USD).
* `POST /subscriptions/upgrade` : Souscription à l'abonnement `STARTER` avec init de paiement (Wave/OM/Stripe).
* `GET /subscriptions/invoices` : Historique des factures de l'utilisateur.

---

## Étape 4 : Module Promotions Académiques & Classes

Reflète l'organisation pédagogique vue dans `PromotionService` et `ClasseService`.

### 4.1 Entités
#### `Promotion.java`
```java
@Entity
@Table(name = "promotions")
public class Promotion {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false, length = 50)
    private String code; // ex: P7

    @Column(nullable = false, length = 150)
    private String name; // ex: Promotion 7

    private String year; // ex: 2025 - 2026
    private LocalDate startDate;
    private LocalDate endDate;

    @Enumerated(EnumType.STRING)
    private PromotionStatus status; // UPCOMING, IN_PROGRESS, ARCHIVED

    private boolean isActive; // Un seul contexte actif à la fois
    private String creatorId;
}
```

#### `Classe.java` & `Student.java`
- `Classe` : `id`, `name`, `code`, `level` (ex: `Licence 3 - Génie Logiciel`), `promotionId`, `creatorId`, `color`, `coverImage`.
- `Student` : `id`, `classeId`, `prenom`, `nom`, `email`, `matricule`, `status` (`ACTIVE`, `PENDING`), progression générale.

### 4.2 Endpoints Clés
* `GET /promotions` : Liste toutes les promotions du formateur.
* `POST /promotions` : Crée une nouvelle promotion.
* `PATCH /promotions/{id}/activate` : Définit la promotion comme contexte actif unique.
* `GET /classes?promotionId={id}` : Liste les classes filtrées par promotion.
* `POST /classes` : Crée une classe.
* `POST /classes/{id}/students` : Ajoute un apprenant (manuellement ou par import CSV).
* `DELETE /classes/{classId}/students/{studentId}` : Retire un apprenant.

---

## Étape 5 : Module Quiz, Questions & Choix

Cœur de l'évaluation pédagogique de QuizzBoard.

### 5.1 Entités Relationnelles
* `Quiz` : `id`, `title`, `description`, `category`, `difficulty` (`EASY`, `MEDIUM`, `HARD`), `status` (`DRAFT`, `PUBLISHED`, `ARCHIVED`), `visibility` (`PUBLIC`, `PRIVATE`), `shareCode` (ex: `QZ-9021`), `creatorId`, `promotionId`, `assignedClassIds` (CollectionElement).
* `Question` : `id`, `quizId`, `text`, `type` (`SINGLE_CHOICE`, `MULTIPLE_CHOICE`, `TRUE_FALSE`), `timeLimitSeconds`, `points`, `explanation`, `imageUrl`, `orderIndex`.
* `Choice` : `id`, `questionId`, `text`, `isCorrect` (booléen masqué pour les étudiants avant la validation), `orderIndex`.

### 5.2 Endpoints Clés
* `GET /quizzes` : Liste les quiz du créateur connecté (avec filtres et pagination).
* `GET /quizzes/public` : Liste publique pour la page `/decouvrir`.
* `GET /quizzes/{id}` : Détails d'un quiz avec ses questions.
* `GET /quizzes/share/{shareCode}` : Récupération d'un quiz via son code de partage pour les apprenants.
* `POST /quizzes` : Création complète d'un quiz avec questions et choix en cascade.
* `PUT /quizzes/{id}` : Mise à jour du quiz.
* `PATCH /quizzes/{id}/visibility` : Bascule `PUBLIC` ↔ `PRIVATE`.
* `DELETE /quizzes/{id}` : Suppression d'un quiz.

---

## Étape 6 : Moteur de Live Arena en Temps Réel (WebSockets & STOMP)

Permet d'animer des quiz multijoueurs synchronisés en salle de classe ou à distance (`LiveHostComponent`).

### 6.1 Architecture WebSocket
* Endpoint d'établissement de connexion : `ws://localhost:8080/api/v1/ws-live` (avec fallback SockJS).
* Message Broker STOMP : `/topic` (diffusion vers les joueurs) et `/app` (commandes du host).
* Canaux STOMP :
  - `/topic/session/{pin}` : Événements diffusés à tous les participants d'une session.
  - `/app/live/join` : Un apprenant rejoint la session avec son pseudo et le code PIN.
  - `/app/live/start` : L'animateur lance le quiz.
  - `/app/live/next-question` : L'animateur passe à la question suivante.
  - `/app/live/submit-answer` : Un apprenant envoie sa réponse.
  - `/app/live/finish` : Fin du live et affichage du podium final.

### 6.2 Modèle en Mémoire ou Redis
Pour garantir une latence sous les 50 ms lors des sessions live avec plus de 100 participants simultanés, l'état de la session live (`LiveQuizSession`) est conservé en cache mémoire (ou Redis) avec persistance finale des scores en base PostgreSQL à la fin du jeu.

---

## Étape 7 : Module Cours Magistraux & Chapitres Pédagogiques

Correspond aux écrans `CourseListComponent` et `CourseDetailComponent`.

### 7.1 Entités
* `Course` : `id`, `title`, `description`, `category`, `level`, `coverImage`, `estimatedHours`, `status`, `hasChapterQuizzes`, `hasFinalQuiz`, `hasCertificate`, `certificateMinimumScore`.
* `CourseChapter` : `id`, `courseId`, `orderIndex`, `title`, `summary`, `content` (Markdown structuré), `estimatedMinutes`, `hasQuiz`, `quizId`.

### 7.2 Endpoints Clés
* `GET /courses` : Liste des cours créés par le formateur.
* `GET /courses/{id}` : Détail complet du cours avec tous ses chapitres.
* `POST /courses` : Création d'un cours.
* `PUT /courses/{id}` : Modification d'un cours.
* `DELETE /courses/{id}` : Suppression d'un cours.
* `POST /courses/{id}/assign-classes` : Assignation d'un cours à une ou plusieurs classes.

---

## Étape 8 : Moteur IA Externe (Google Gemini & Groq)

Ce module remplace la simulation mock de `QuizService.generateQuizWithAiPrompt()` et `CourseService.generateCourseWithAi()`.

### 8.1 Fournisseurs & Stratégie Multi-LLM
* **Google Gemini 1.5 Flash** (Recommandé) : Idéal pour l'extraction de questions depuis de longs documents PDF et génération en JSON structuré.
* **Groq Cloud (Llama 3.3 70B)** : Idéal pour une génération quasi-instantanée (latence < 300 ms).

### 8.2 Schéma JSON Strict
Les requêtes vers l'API Gemini ou Groq imposent un **Response Schema (Structured Outputs)** :
```json
{
  "title": "Nom du quiz",
  "questions": [
    {
      "text": "Énoncé de la question",
      "type": "SINGLE_CHOICE",
      "timeLimitSeconds": 20,
      "points": 100,
      "explanation": "Explication pédagogique de la réponse correcte.",
      "choices": [
        { "text": "Option A", "isCorrect": true, "order": 1 },
        { "text": "Option B", "isCorrect": false, "order": 2 },
        { "text": "Option C", "isCorrect": false, "order": 3 },
        { "text": "Option D", "isCorrect": false, "order": 4 }
      ]
    }
  ]
}
```

### 8.3 Endpoints IA
* `POST /ai/generate-quiz` : Génère un ensemble de questions à partir d'un thème ou prompt.
* `POST /ai/generate-quiz-from-file` : Génère des questions à partir d'un cours ou document uploadé (PDF / Texte).
* `POST /ai/generate-course` : Génère un cours complet multi-chapitres selon les options `CourseAiGenerationOptions` (sujet, niveau, nombre de chapitres, avec quiz).

---

## Étape 9 : Module Participations, Scores & Certificats Numériques

### 9.1 Entités
* `Participation` : `id`, `quizId`, `userId`, `participantName`, `score`, `maxScore`, `percentage`, `timeTotalSeconds`, `completedAt`, `certificateEligible`.
* `ParticipantAnswer` : `id`, `participationId`, `questionId`, `selectedChoiceIds`, `isCorrect`, `timeSpentSeconds`, `pointsEarned`.
* `Certificate` : `id`, `participationId`, `recipientName`, `quizTitle`, `scorePercent`, `verificationCode` (ex: `QZ-8821-95`), `issuedAt`, `status` (`VALID`, `REVOKED`).

### 9.2 Endpoints Clés
* `POST /participations` : Soumission des réponses d'un quiz, calcul automatique de la note et attribution éventuelle du certificat.
* `GET /participations/my` : Historique des résultats de l'apprenant.
* `GET /certificates/{id}` : Récupération du certificat pour téléchargement ou affichage.
* `GET /certificates/verify/{verificationCode}` : **Endpoint public** permettant à un recruteur ou une université de vérifier l'authenticité d'un diplôme QuizzBoard.
* `PATCH /admin/certificates/{id}/toggle-status` : Révocation ou réactivation d'un certificat par l'administrateur.

---

## Étape 10 : Module Communautés, Forums, Ressources & Visioconférences

Reflète l'espace collaboratif `CommunityService`.

### 10.1 Entités
* `Community` : `id`, `name`, `description`, `category`, `accessCode`, `creatorId`, `isPrivate`, `coverImage`.
* `CommunityMember` : `communityId`, `userId`, `role` (`CREATOR`, `STUDENT`, `MODERATOR`), `joinedAt`.
* `ForumTopic` : `id`, `communityId`, `authorId`, `title`, `content`, `isPinned`, `isLocked`, `createdAt`.
* `ForumComment` : `id`, `topicId`, `authorId`, `content`, `likesCount`, `createdAt`.
* `ResourceFile` : `id`, `communityId`, `title`, `fileType` (`PDF`, `DOC`, `ZIP`, `IMAGE`), `fileUrl`, `fileSize`.
* `Meeting` : `id`, `communityId`, `title`, `description`, `meetingUrl`, `platform` (`GOOGLE_MEET`, `ZOOM`, `JITSI`, `TEAMS`), `scheduledAt`, `durationMinutes`, `isLive`.

### 10.2 Endpoints Clés
* `GET /communities` : Liste des communautés de l'utilisateur.
* `POST /communities` : Création d'une communauté.
* `POST /communities/join` : Rejoindre une communauté via son `accessCode`.
* `GET /communities/{id}/topics` : Liste des sujets de discussion du forum.
* `POST /communities/{id}/topics` : Création d'un sujet.
* `POST /communities/topics/{topicId}/comments` : Ajout d'un commentaire.
* `POST /communities/{id}/resources` : Upload d'un fichier de cours/ressource.
* `POST /communities/{id}/meetings` : Planification d'une session de visioconférence.

---

## Étape 11 : Module SuperAdmin, Métriques & Logs d'Audit

Permet d'alimenter les pages d'administration `/admin/dashboard`, `/admin/users`, `/admin/finances`, `/admin/system`, `/admin/settings`.

### 11.1 Entités
* `AuditLog` : `id`, `timestamp`, `adminName`, `action`, `target`, `ipAddress`, `severity` (`INFO`, `WARNING`, `CRITICAL`).
* `PlatformSettings` : `id`, `freeMaxQuizzes`, `freeMaxLiveParticipants`, `freeAiCreditsMonth`, `starterPriceFcfa`, `starterPriceUsd`, `isMaintenanceMode`, `maintenanceMessage`, `waveActive`, `omActive`, `stripeActive`, `allowPublicRegistrations`, `requireEmailVerification`.

### 11.2 Endpoints Clés
* `GET /admin/metrics` : Statistiques temps réel (utilisateurs, MRR, quiz totaux, appels IA du mois, latence Gemini/Groq, santé DB).
* `GET /admin/users` : Liste complète des utilisateurs avec pagination et recherche.
* `PATCH /admin/users/{id}/status` : Suspendre ou réactiver un compte utilisateur.
* `PATCH /admin/users/{id}/role` : Modifier le rôle d'un utilisateur (`CREATOR`, `LEARNER`, `ADMIN`).
* `PATCH /admin/users/{id}/tier` : Modifier le forfait (`FREE` ou `STARTER`).
* `GET /admin/transactions` : Journal des transactions financières (Wave, Orange Money, Stripe).
* `GET /admin/audit-logs` : Journal d'audit de sécurité des actions administratives.
* `GET /admin/settings` : Récupération des paramètres globaux.
* `PUT /admin/settings` : Mise à jour des paramètres et quotas de la plateforme.

---

## 15. Matrice Complète de Tous les Endpoints REST (Frontend ↔ Backend)

| Domaine | Méthode | URL Endpoint | Description | Rôle Requis |
| :--- | :--- | :--- | :--- | :--- |
| **Auth** | `POST` | `/api/v1/auth/signup` | Inscription manuelle d'un utilisateur | Public |
| **Auth** | `POST` | `/api/v1/auth/login` | Connexion avec email et mot de passe | Public |
| **Auth** | `POST` | `/api/v1/auth/google` | Connexion ou Inscription avec Google ID Token | Public |
| **Auth** | `POST` | `/api/v1/auth/forgot-password` | Envoi d'un email de réinitialisation SMTP | Public |
| **Auth** | `POST` | `/api/v1/auth/reset-password` | Réinitialisation effective du mot de passe | Public |
| **Auth** | `POST` | `/api/v1/auth/refresh` | Rafraîchissement du token JWT d'accès | Public |
| **Auth** | `GET` | `/api/v1/auth/me` | Informations de l'utilisateur authentifié | Authentifié |
| **User** | `PUT` | `/api/v1/users/me` | Mise à jour des infos personnelles | Authentifié |
| **User** | `PATCH` | `/api/v1/users/me/avatar` | Upload de photo de profil | Authentifié |
| **Abonnements** | `GET` | `/api/v1/subscriptions/plans` | Liste des forfaits et tarifs (FCFA / USD) | Authentifié |
| **Abonnements** | `POST` | `/api/v1/subscriptions/subscribe` | Souscription au forfait STARTER (Wave/OM/Stripe) | CREATOR |
| **Abonnements** | `GET` | `/api/v1/subscriptions/invoices` | Liste des factures de l'utilisateur | CREATOR |
| **Promotions** | `GET` | `/api/v1/promotions` | Liste des promotions de l'enseignant | CREATOR |
| **Promotions** | `POST` | `/api/v1/promotions` | Création d'une promotion | CREATOR |
| **Promotions** | `PATCH` | `/api/v1/promotions/{id}/activate` | Définit la promotion comme contexte actif | CREATOR |
| **Classes** | `GET` | `/api/v1/classes` | Liste des classes de la promotion active | CREATOR |
| **Classes** | `POST` | `/api/v1/classes` | Création d'une nouvelle classe | CREATOR |
| **Classes** | `POST` | `/api/v1/classes/{id}/students` | Ajout d'un étudiant à la classe | CREATOR |
| **Classes** | `DELETE` | `/api/v1/classes/{id}/students/{studId}` | Retrait d'un étudiant de la classe | CREATOR |
| **Classes** | `POST` | `/api/v1/classes/{id}/assign-quiz` | Assigne un quiz à la classe | CREATOR |
| **Quiz** | `GET` | `/api/v1/quizzes` | Liste des quiz du créateur | CREATOR |
| **Quiz** | `GET` | `/api/v1/quizzes/public` | Liste des quiz publics (pour explorer) | Public |
| **Quiz** | `GET` | `/api/v1/quizzes/{id}` | Détail d'un quiz avec ses questions | Authentifié |
| **Quiz** | `GET` | `/api/v1/quizzes/share/{code}` | Recherche d'un quiz par son code de partage | Public |
| **Quiz** | `POST` | `/api/v1/quizzes` | Création d'un quiz avec questions/choix | CREATOR |
| **Quiz** | `PUT` | `/api/v1/quizzes/{id}` | Mise à jour d'un quiz | CREATOR |
| **Quiz** | `PATCH` | `/api/v1/quizzes/{id}/visibility` | Bascule la visibilité (PUBLIC / PRIVATE) | CREATOR |
| **Quiz** | `DELETE` | `/api/v1/quizzes/{id}` | Suppression d'un quiz | CREATOR |
| **Live Arena** | `WS` | `/api/v1/ws-live` | Handshake WebSocket pour le live | Public |
| **Live Arena** | `POST` | `/api/v1/live/sessions` | Initialise une session live (génère un PIN) | CREATOR |
| **Live Arena** | `GET` | `/api/v1/live/sessions/{pin}` | Récupère l'état courant de la session live | Public |
| **Cours** | `GET` | `/api/v1/courses` | Liste des cours magistraux | Authentifié |
| **Cours** | `GET` | `/api/v1/courses/{id}` | Détail complet d'un cours et chapitres | Authentifié |
| **Cours** | `POST` | `/api/v1/courses` | Création d'un cours avec chapitres | CREATOR |
| **Cours** | `PUT` | `/api/v1/courses/{id}` | Modification d'un cours | CREATOR |
| **Cours** | `DELETE` | `/api/v1/courses/{id}` | Suppression d'un cours | CREATOR |
| **IA Générative** | `POST` | `/api/v1/ai/generate-quiz` | Génération de quiz par prompt (Gemini/Groq) | CREATOR |
| **IA Générative** | `POST` | `/api/v1/ai/generate-course` | Génération d'un cours complet par IA | CREATOR |
| **Participations** | `POST` | `/api/v1/participations` | Soumission d'une tentative de quiz | Authentifié |
| **Participations** | `GET` | `/api/v1/participations/my` | Mes résultats et statistiques | LEARNER |
| **Certificats** | `GET` | `/api/v1/certificates/{id}` | Détails du certificat obtenu | Authentifié |
| **Certificats** | `GET` | `/api/v1/certificates/verify/{code}` | Vérification publique de validité | Public |
| **Communautés** | `GET` | `/api/v1/communities` | Liste des communautés rejointes | Authentifié |
| **Communautés** | `POST` | `/api/v1/communities` | Création d'une communauté | CREATOR |
| **Communautés** | `POST` | `/api/v1/communities/join` | Rejoindre via code d'accès | Authentifié |
| **Communautés** | `POST` | `/api/v1/communities/{id}/topics` | Poster un sujet de forum | Membre |
| **Communautés** | `POST` | `/api/v1/communities/topics/{id}/comments` | Commenter un sujet | Membre |
| **Communautés** | `POST` | `/api/v1/communities/{id}/resources` | Upload d'une ressource (PDF/Doc) | Membre |
| **Communautés** | `POST` | `/api/v1/communities/{id}/meetings` | Planifier une visioconférence | CREATOR |
| **Admin** | `GET` | `/api/v1/admin/metrics` | Métriques globales et santé système | ADMIN |
| **Admin** | `GET` | `/api/v1/admin/users` | Liste des utilisateurs pour modération | ADMIN |
| **Admin** | `PATCH` | `/api/v1/admin/users/{id}/status` | Suspendre / Activer un compte | ADMIN |
| **Admin** | `PATCH` | `/api/v1/admin/users/{id}/role` | Changer le rôle d'un utilisateur | ADMIN |
| **Admin** | `PATCH` | `/api/v1/admin/users/{id}/tier` | Modifier le plan d'un utilisateur | ADMIN |
| **Admin** | `GET` | `/api/v1/admin/transactions` | Historique des paiements Wave/OM/Stripe | ADMIN |
| **Admin** | `GET` | `/api/v1/admin/audit-logs` | Journal d'audit de sécurité | ADMIN |
| **Admin** | `GET` | `/api/v1/admin/settings` | Paramètres et quotas globaux | ADMIN |
| **Admin** | `PUT` | `/api/v1/admin/settings` | Mise à jour des paramètres globaux | ADMIN |
| **Notifications**| `GET` | `/api/v1/notifications` | Notifications de l'utilisateur connecté | Authentifié |
| **Notifications**| `PATCH` | `/api/v1/notifications/{id}/read` | Marquer une notification comme lue | Authentifié |

---

## 16. Checklist d'Exécution & Bonnes Pratiques

### 16.1 Ordre Recommandé de Développement Backend
1. **Étape 1 (Prioritaire)** :
   - Mise en place de PostgreSQL et création de l'entité `User`.
   - Implémentation du `SecurityConfig` avec `JwtAuthenticationFilter` et `BCryptPasswordEncoder`.
   - Implémentation de `POST /auth/signup` et `POST /auth/login`.
   - Configuration du `SmtpEmailService` et implémentation du flux mot de passe oublié (`/auth/forgot-password` et `/auth/reset-password`).
   - Intégration de l'authentification Google via `GoogleIdTokenVerifier` (`POST /auth/google`).
2. **Étape 2** :
   - Activation de Swagger UI (`/swagger-ui.html`) pour tester immédiatement les endpoints d'authentification avec le bouton "Authorize".
3. **Étape 3** :
   - Implémentation des modules `Promotions` et `Classes` (qui servent de contexte aux quiz et cours).
4. **Étape 4** :
   - Implémentation du module `Quizzes` et `Questions` avec gestion des droits créateurs.
5. **Étape 5** :
   - Intégration des APIs d'Intelligence Artificielle (Google Gemini 1.5 Flash ou Groq Cloud).
6. **Étape 6** :
   - Configuration des WebSockets STOMP pour l'arène Live multijoueurs.
7. **Étape 7** :
   - Implémentation des cours magistraux, participations, scores et génération des certificats.
8. **Étape 8** :
   - Module Communautés, forums et upload de ressources.
9. **Étape 9** :
   - Module SuperAdmin, métriques, gestion financière et journal d'audit.
10. **Étape 10 (Côté Frontend Angular)** :
    - Remplacement des `MOCK_*` dans les services Angular (`AuthService`, `QuizService`, etc.) par des appels `HttpClient` vers `http://localhost:8080/api/v1`.
    - Ajout d'un `auth.interceptor.ts` Angular qui injecte automatiquement le header `Authorization: Bearer <token>`.

---

*Document généré par Antigravity pour le projet QuizzBoard - Horizon Plus Consulting.*
