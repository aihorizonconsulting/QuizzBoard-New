package com.iahorizonplus.quizzboardbackend.config;

import com.iahorizonplus.quizzboardbackend.entity.*;
import com.iahorizonplus.quizzboardbackend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import java.util.ArrayList;
import java.util.List;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PlatformSettingsRepository settingsRepository;
    private final QuizRepository quizRepository;
    private final ParticipationRepository participationRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        // 1. Initialisation des paramètres de la plateforme s'ils n'existent pas
        if (settingsRepository.count() == 0) {
            log.info("Configuration des paramètres système par défaut QuizzBoard...");
            settingsRepository.save(PlatformSettings.builder()
                    .id("default-settings")
                    .freeMaxQuizzes(3)
                    .freeMaxLiveParticipants(25)
                    .freeAiCreditsMonth(5)
                    .starterPriceFcfa(999.0)
                    .starterPriceUsd(2.0)
                    .isMaintenanceMode(false)
                    .waveActive(true)
                    .omActive(true)
                    .build());
        } else {
            settingsRepository.findById("default-settings").ifPresent(settings -> {
                if (settings.getStarterPriceFcfa() == 9900.0) {
                    settings.setStarterPriceFcfa(999.0);
                    settings.setStarterPriceUsd(2.0);
                    settingsRepository.save(settings);
                    log.info("Tarif STARTER mis à jour à 999 FCFA.");
                }
            });
        }

        // 2. Compte Administrateur Unique pour la gestion
        User admin = userRepository.findByEmail("admin@quizzboard.com").orElse(null);
        if (admin == null) {
            log.info("Création du compte Administrateur système QuizzBoard...");
            String encodedPassword = passwordEncoder.encode("Password123!");

            admin = User.builder()
                    .prenom("Admin")
                    .nom("QuizzBoard")
                    .email("admin@quizzboard.com")
                    .password(encodedPassword)
                    .role(UserRole.ADMIN)
                    .subscriptionTier(SubscriptionTier.STARTER)
                    .authProvider(AuthProvider.LOCAL)
                    .status("ACTIVE")
                    .emailVerified(true)
                    .xpPoints(0)
                    .level(1)
                    .streakDays(1)
                    .followersCount(0)
                    .followingCount(0)
                    .build();

            admin = userRepository.save(admin);
            log.info("Compte Administrateur (admin@quizzboard.com) configuré avec succès.");
        }

        // 3. Initialisation des quiz publics de référence si aucun quiz n'existe en base
        if (quizRepository.count() == 0) {
            log.info("Initialisation des quiz interactifs de référence QuizzBoard...");
            seedReferenceQuizzes(admin);
        }

        log.info("Vérification et initialisation de l'environnement QuizzBoard terminées.");
    }

    private void seedReferenceQuizzes(User creator) {
        String creatorId = creator.getId();
        String creatorName = creator.getPrenom() + " " + creator.getNom();

        // Quiz 1: IA & Prompting
        Quiz q1 = Quiz.builder()
                .title("Intelligence Artificielle & Prompt Engineering")
                .description("Évaluez vos compétences sur les architectures LLM, le prompting contextuel et les agents IA autonomes.")
                .category("IA & Data Science")
                .difficulty("MEDIUM")
                .status(QuizStatus.PUBLISHED)
                .creatorId(creatorId)
                .creatorName(creatorName)
                .shareCode("AI-2026")
                .pin("101202")
                .visibility("PUBLIC")
                .participationsCount(28)
                .averageScorePercent(96.5)
                .coverImage("https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=600&q=80")
                .build();

        Question q1_1 = Question.builder()
                .quiz(q1)
                .text("Quelle technique de prompting permet d'obtenir un raisonnement étape par étape d'un LLM ?")
                .type(QuestionType.SINGLE_CHOICE)
                .timeLimitSeconds(25)
                .points(100)
                .order(1)
                .explanation("Le Chain-of-Thought (CoT) encourage le modèle à décomposer son raisonnement intermédiaire avant de donner la réponse finale.")
                .build();
        q1_1.setChoices(List.of(
                Choice.builder().question(q1_1).text("Chain-of-Thought (Chaîne de pensée)").isCorrect(true).order(1).build(),
                Choice.builder().question(q1_1).text("Zero-shot simple").isCorrect(false).order(2).build(),
                Choice.builder().question(q1_1).text("Temperature Overdrive").isCorrect(false).order(3).build()
        ));

        Question q1_2 = Question.builder()
                .quiz(q1)
                .text("Que signifie RAG dans les architectures modernes d'IA générative ?")
                .type(QuestionType.SINGLE_CHOICE)
                .timeLimitSeconds(20)
                .points(100)
                .order(2)
                .explanation("RAG signifie Retrieval-Augmented Generation : recherche vectorielle couplée à la génération de texte.")
                .build();
        q1_2.setChoices(List.of(
                Choice.builder().question(q1_2).text("Retrieval-Augmented Generation").isCorrect(true).order(1).build(),
                Choice.builder().question(q1_2).text("Recursive Auto-encoder Graph").isCorrect(false).order(2).build(),
                Choice.builder().question(q1_2).text("Reinforcement Agent Gate").isCorrect(false).order(3).build()
        ));
        q1.setQuestions(new java.util.ArrayList<>(List.of(q1_1, q1_2)));
        Quiz savedQ1 = quizRepository.save(q1);

        // Quiz 2: Cybersécurité Web
        Quiz q2 = Quiz.builder()
                .title("Cybersécurité & Protection des Applications Web")
                .description("Maîtrisez le Top 10 OWASP, les failles XSS, CSRF, l'authentification JWT et les injections SQL.")
                .category("Cybersécurité")
                .difficulty("HARD")
                .status(QuizStatus.PUBLISHED)
                .creatorId(creatorId)
                .creatorName(creatorName)
                .shareCode("SEC-404")
                .pin("303404")
                .visibility("PUBLIC")
                .participationsCount(34)
                .averageScorePercent(94.0)
                .coverImage("https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=600&q=80")
                .build();

        Question q2_1 = Question.builder()
                .quiz(q2)
                .text("Quelle est la meilleure protection contre les attaques par injection SQL ?")
                .type(QuestionType.SINGLE_CHOICE)
                .timeLimitSeconds(20)
                .points(100)
                .order(1)
                .explanation("L'utilisation systématique de requêtes préparées (Prepared Statements / ORM paramétré) neutralise l'injection de code SQL arbitraire.")
                .build();
        q2_1.setChoices(List.of(
                Choice.builder().question(q2_1).text("Utiliser des requêtes paramétrées (Prepared Statements)").isCorrect(true).order(1).build(),
                Choice.builder().question(q2_1).text("Nettoyer uniquement les guillemets simples").isCorrect(false).order(2).build(),
                Choice.builder().question(q2_1).text("Chiffrer le mot de passe dans la requête").isCorrect(false).order(3).build()
        ));
        q2.setQuestions(new java.util.ArrayList<>(List.of(q2_1)));
        Quiz savedQ2 = quizRepository.save(q2);

        // Quiz 3: Architectures Microservices Spring Boot
        Quiz q3 = Quiz.builder()
                .title("Spring Boot 3 & Architectures REST Microservices")
                .description("Maturité Richardson Niveau 3, HATEOAS, Spring Security 6 et conteneurisation Docker multi-stage.")
                .category("Développement Web")
                .difficulty("MEDIUM")
                .status(QuizStatus.PUBLISHED)
                .creatorId(creatorId)
                .creatorName(creatorName)
                .shareCode("SPR-2026")
                .pin("505606")
                .visibility("PUBLIC")
                .participationsCount(42)
                .averageScorePercent(98.0)
                .coverImage("https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=600&q=80")
                .build();

        Question q3_1 = Question.builder()
                .quiz(q3)
                .text("Quel niveau du modèle de maturité de Richardson introduit les hypermédias (HATEOAS) ?")
                .type(QuestionType.SINGLE_CHOICE)
                .timeLimitSeconds(20)
                .points(100)
                .order(1)
                .explanation("Le Niveau 3 (Glory of REST) intègre les contrôles hypermédias (HATEOAS) pour rendre les API auto-descriptives.")
                .build();
        q3_1.setChoices(List.of(
                Choice.builder().question(q3_1).text("Niveau 3 : Contrôles Hypermédia (HATEOAS)").isCorrect(true).order(1).build(),
                Choice.builder().question(q3_1).text("Niveau 1 : Ressources").isCorrect(false).order(2).build(),
                Choice.builder().question(q3_1).text("Niveau 2 : Verbes HTTP").isCorrect(false).order(3).build()
        ));
        q3.setQuestions(new java.util.ArrayList<>(List.of(q3_1)));
        Quiz savedQ3 = quizRepository.save(q3);

        // Seed sample participations for realistic statistics
        List<Participation> sampleParts = List.of(
                Participation.builder().quizId(savedQ1.getId()).quizTitle(savedQ1.getTitle()).participantName("Aminata Diallo").participantEmail("aminata.diallo@edu.sn").score(100).maxScore(100).percentage(100.0).status("COMPLETED").timeTotalSeconds(42).build(),
                Participation.builder().quizId(savedQ1.getId()).quizTitle(savedQ1.getTitle()).participantName("Cheikh Ndiaye").participantEmail("cheikh.n@edu.sn").score(95).maxScore(100).percentage(95.0).status("COMPLETED").timeTotalSeconds(38).build(),
                Participation.builder().quizId(savedQ2.getId()).quizTitle(savedQ2.getTitle()).participantName("Moussa Konaté").participantEmail("moussa.k@edu.sn").score(100).maxScore(100).percentage(100.0).status("COMPLETED").timeTotalSeconds(50).build(),
                Participation.builder().quizId(savedQ2.getId()).quizTitle(savedQ2.getTitle()).participantName("Fatou Bamba").participantEmail("fatou.b@edu.sn").score(92).maxScore(100).percentage(92.0).status("COMPLETED").timeTotalSeconds(45).build(),
                Participation.builder().quizId(savedQ3.getId()).quizTitle(savedQ3.getTitle()).participantName("Ibrahima Sarr").participantEmail("ibrahima.s@edu.sn").score(100).maxScore(100).percentage(100.0).status("COMPLETED").timeTotalSeconds(35).build(),
                Participation.builder().quizId(savedQ3.getId()).quizTitle(savedQ3.getTitle()).participantName("Awa Diop").participantEmail("awa.d@edu.sn").score(96).maxScore(100).percentage(96.0).status("COMPLETED").timeTotalSeconds(40).build()
        );
        participationRepository.saveAll(sampleParts);
        log.info("3 quiz publics et {} participations réelles ont été initialisés.", sampleParts.size());
    }
}
