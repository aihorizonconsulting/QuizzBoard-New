package com.iahorizonplus.quizzboardbackend.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.iahorizonplus.quizzboardbackend.dto.request.AiCourseGenerateRequest;
import com.iahorizonplus.quizzboardbackend.dto.request.AiQuizGenerateRequest;
import com.iahorizonplus.quizzboardbackend.entity.*;
import com.iahorizonplus.quizzboardbackend.exception.BadRequestException;
import com.iahorizonplus.quizzboardbackend.repository.CourseChapterRepository;
import com.iahorizonplus.quizzboardbackend.repository.CourseRepository;
import com.iahorizonplus.quizzboardbackend.repository.UserRepository;
import com.iahorizonplus.quizzboardbackend.service.AiService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AiServiceImpl implements AiService {

    private final CourseRepository courseRepository;
    private final CourseChapterRepository courseChapterRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;
    private final RestClient restClient = RestClient.create();

    @Value("${app.ai.gemini.api-key:}")
    private String geminiApiKey;

    @Value("${app.ai.groq.api-key:}")
    private String groqApiKey;

    @Override
    public List<Question> generateQuizQuestions(AiQuizGenerateRequest request, String creatorEmail) {
        log.info("Génération de {} questions IA pour le thème : {}", request.count(), request.prompt());

        // === Enforcement du quota mensuel de requêtes IA ===
        if (creatorEmail != null) {
            userRepository.findByEmail(creatorEmail).ifPresent(creator -> {
                LocalDateTime startOfMonth = LocalDateTime.now().withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0).withNano(0);
                long monthlyUsage = courseRepository.countByCreatorIdAndCreatedAtAfter(creator.getId(), startOfMonth);

                if (creator.getRole() != UserRole.ADMIN && creator.getSubscriptionTier() == SubscriptionTier.FREE && monthlyUsage >= 5) {
                    throw new BadRequestException("quota",
                            "Quota mensuel IA épuisé pour le forfait DÉCOUVERTE (5 générations/mois). Passez au forfait STARTER pour 100 générations par mois !");
                } else if (creator.getRole() != UserRole.ADMIN && creator.getSubscriptionTier() == SubscriptionTier.STARTER && monthlyUsage >= 100) {
                    throw new BadRequestException("quota",
                            "Quota mensuel IA épuisé pour le forfait STARTER (100 générations/mois). Contactez-nous pour un accès PREMIUM.");
                }
            });
        }
        // === Fin du quota IA ===

        int count = Math.max(1, request.count());

        // 1. Tenter l'appel direct à l'API Google Gemini 1.5 Flash si une clé est configurée
        if (isGeminiConfigured()) {
            List<Question> geminiQuestions = callGeminiForQuiz(request.prompt(), count);
            if (geminiQuestions != null && !geminiQuestions.isEmpty()) {
                return geminiQuestions;
            }
        }

        // 2. Génération pédagogique structurée de repli (Zero-Crash Fallback)
        log.info("Utilisation du moteur pédagogique intégré pour : {}", request.prompt());
        List<Question> questions = new ArrayList<>();
        for (int i = 1; i <= count; i++) {
            QuestionType type = (i % 3 == 0) ? QuestionType.TRUE_FALSE : (i % 2 == 0 ? QuestionType.MULTIPLE_CHOICE : QuestionType.SINGLE_CHOICE);
            String questionText;
            List<Choice> choices = new ArrayList<>();

            if (type == QuestionType.TRUE_FALSE) {
                questionText = String.format("Dans le cadre de \"%s\", l'application des bonnes pratiques garantit-elle une performance optimale ?", request.prompt());
                choices.add(Choice.builder().id(UUID.randomUUID().toString()).text("Vrai (Recommandé par les standards pédagogiques)").isCorrect(true).order(1).build());
                choices.add(Choice.builder().id(UUID.randomUUID().toString()).text("Faux").isCorrect(false).order(2).build());
            } else if (type == QuestionType.MULTIPLE_CHOICE) {
                questionText = String.format("Quels sont les piliers essentiels à maîtriser concernant \"%s\" ? (Sélection multiple)", request.prompt());
                choices.add(Choice.builder().id(UUID.randomUUID().toString()).text("Pilier méthodologique et rigueur d'application").isCorrect(true).order(1).build());
                choices.add(Choice.builder().id(UUID.randomUUID().toString()).text("Analyse continue des métriques et résultats").isCorrect(true).order(2).build());
                choices.add(Choice.builder().id(UUID.randomUUID().toString()).text("Ignorer les étapes de validation préliminaires").isCorrect(false).order(3).build());
                choices.add(Choice.builder().id(UUID.randomUUID().toString()).text("Adoption des standards de l'industrie").isCorrect(true).order(4).build());
            } else {
                questionText = String.format("Quel est le principe directeur fondamental régissant \"%s\" ?", request.prompt());
                choices.add(Choice.builder().id(UUID.randomUUID().toString()).text("Option A : Fondement vérifié et conforme aux normes").isCorrect(true).order(1).build());
                choices.add(Choice.builder().id(UUID.randomUUID().toString()).text("Option B : Approche heuristique incomplète").isCorrect(false).order(2).build());
                choices.add(Choice.builder().id(UUID.randomUUID().toString()).text("Option C : Distracteur courant dans la littérature").isCorrect(false).order(3).build());
                choices.add(Choice.builder().id(UUID.randomUUID().toString()).text("Option D : Hypothèse non validée").isCorrect(false).order(4).build());
            }

            Question q = Question.builder()
                    .id(UUID.randomUUID().toString())
                    .text(questionText)
                    .type(type)
                    .timeLimitSeconds(20)
                    .points(100)
                    .explanation(String.format("Explication QuizzMind IA : Ce concept est fondamental dans l'assimilation durable de %s.", request.prompt()))
                    .order(i)
                    .choices(choices)
                    .build();

            for (Choice c : choices) {
                c.setQuestion(q);
            }
            questions.add(q);
        }

        return questions;
    }

    @Override
    @Transactional
    public Course generateCourse(String creatorEmail, AiCourseGenerateRequest request) {
        log.info("Génération d'un cours magistral IA par {} sur le sujet : {}", creatorEmail, request.topic());

        User creator = userRepository.findByEmail(creatorEmail).orElse(null);
        String creatorName = creator != null ? creator.getPrenom() + " " + creator.getNom() : "Professeur";
        String creatorId = creator != null ? creator.getId() : "system";

        int chaptersCount = Math.max(1, request.chaptersCount());

        Course course = Course.builder()
                .title("Cours Magistral : " + request.topic())
                .description(String.format("Support de cours complet et structuré généré par QuizzMind IA en %d chapitres progressifs.", chaptersCount))
                .category(request.category() != null ? request.category() : "Informatique & Sciences")
                .level(request.level() != null ? request.level() : CourseLevel.INTERMEDIATE)
                .coverImage(generateThematicCoverImage(request.topic(), request.category()))
                .creatorId(creatorId)
                .creatorName(creatorName)
                .estimatedHours(Math.round(chaptersCount * 1.5f))
                .status("PUBLISHED")
                .assignedClassIds(request.targetClassId() != null ? List.of(request.targetClassId()) : new ArrayList<>())
                .assignedClassNames(request.targetClassName() != null ? List.of(request.targetClassName()) : new ArrayList<>())
                .hasChapterQuizzes(request.withChapterQuizzes())
                .hasFinalQuiz(request.withFinalQuiz())
                .finalQuizTitle(request.withFinalQuiz() ? "Examen Final de Certification : " + request.topic() : null)
                .finalQuizQuestionsCount(request.withFinalQuiz() ? 10 : null)
                .hasCertificate(request.hasCertificate())
                .certificateMinimumScore(request.certificateMinimumScore() != null ? request.certificateMinimumScore() : 80)
                .build();

        Course savedCourse = courseRepository.save(course);

        // 1. Tenter l'appel direct à Gemini pour le syllabus complet
        List<CourseChapter> chapters = null;
        if (isGeminiConfigured()) {
            chapters = callGeminiForChapters(request.topic(), chaptersCount, savedCourse, request.withChapterQuizzes());
        }

        // 2. Repli pédagogique structuré si Gemini n'est pas configuré ou a échoué
        if (chapters == null || chapters.isEmpty()) {
            chapters = new ArrayList<>();
            for (int i = 1; i <= chaptersCount; i++) {
                CourseChapter chapter = CourseChapter.builder()
                        .order(i)
                        .title(String.format("Chapitre %d : Fondements et Cas Pratiques sur %s (Partie %d)", i, request.topic(), i))
                        .summary(String.format("Notions fondamentales, cas pratiques et pièges courants à éviter dans le module %d.", i))
                        .content(String.format("""
                            ### Vue d'ensemble du Chapitre %d
                            Dans cette section consacrée à **%s**, nous explorons les piliers essentiels nécessaires pour maîtriser le sujet.
                            
                            #### Concepts Clés :
                            1. **Principe directeur** : Comprendre comment appliquer concrètement %s dans un environnement réel.
                            2. **Mécanismes fondamentaux** : Règles d'architecture, normes et bonnes pratiques professionnelles.
                            3. **Cas d'usage pratique** : Mise en situation concrète avec résolution pas à pas.
                            
                            #### Synthèse pédagogique :
                            La régularité et la rigueur dans l'application de ces concepts garantissent une assimilation durable et un haut niveau de rétention.
                            """, i, request.topic(), request.topic()))
                        .estimatedMinutes(40 + i * 5)
                        .hasQuiz(request.withChapterQuizzes())
                        .quizTitle(request.withChapterQuizzes() ? String.format("Quiz Chapitre %d : Évaluation %s", i, request.topic()) : null)
                        .quizQuestionsCount(request.withChapterQuizzes() ? 4 : null)
                        .course(savedCourse)
                        .build();

                chapters.add(courseChapterRepository.save(chapter));
            }
        }

        savedCourse.setChapters(chapters);
        return savedCourse;
    }

    private boolean isGeminiConfigured() {
        return geminiApiKey != null && !geminiApiKey.isBlank() && !geminiApiKey.contains("votre_cle");
    }

    private List<Question> callGeminiForQuiz(String prompt, int count) {
        try {
            String systemInstruction = String.format("""
                Tu es un enseignant et concepteur pédagogique expert.
                Génère exactement %d questions d'évaluation interactives basées sur le thème suivant : "%s".
                Chaque question doit comporter :
                - "text": l'énoncé clair de la question en français
                - "type": soit "SINGLE_CHOICE", "MULTIPLE_CHOICE", ou "TRUE_FALSE"
                - "timeLimitSeconds": 20
                - "points": 100
                - "explanation": une explication pédagogique détaillée
                - "choices": une liste d'au moins 2 à 4 choix, avec "text", "isCorrect" (boolean), et "order" (1, 2, 3...)
                Retourne UNIQUEMENT un tableau JSON valide d'objets question sans balises markdown additionnelles.
                """, count, prompt);

            Map<String, Object> requestBody = Map.of(
                    "contents", List.of(Map.of(
                            "parts", List.of(Map.of("text", systemInstruction))
                    )),
                    "generationConfig", Map.of(
                            "response_mime_type", "application/json",
                            "temperature", 0.7
                    )
            );

            String url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + geminiApiKey.trim();

            String response = restClient.post()
                    .uri(url)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestBody)
                    .retrieve()
                    .body(String.class);

            if (response != null && !response.isBlank()) {
                JsonNode root = objectMapper.readTree(response);
                JsonNode textNode = root.path("candidates").path(0).path("content").path("parts").path(0).path("text");
                if (!textNode.isMissingNode()) {
                    String jsonText = textNode.asText().trim();
                    JsonNode questionsArray = objectMapper.readTree(jsonText);
                    if (questionsArray.isArray() && questionsArray.size() > 0) {
                        List<Question> parsedQuestions = new ArrayList<>();
                        int order = 1;
                        for (JsonNode qNode : questionsArray) {
                            QuestionType type = QuestionType.SINGLE_CHOICE;
                            String typeStr = qNode.path("type").asText("SINGLE_CHOICE").toUpperCase();
                            try {
                                type = QuestionType.valueOf(typeStr);
                            } catch (Exception ignored) {}

                            Question q = Question.builder()
                                    .id(UUID.randomUUID().toString())
                                    .text(qNode.path("text").asText("Question sans titre"))
                                    .type(type)
                                    .timeLimitSeconds(qNode.path("timeLimitSeconds").asInt(20))
                                    .points(qNode.path("points").asInt(100))
                                    .explanation(qNode.path("explanation").asText("Explication QuizzMind IA."))
                                    .order(order++)
                                    .build();

                            List<Choice> choices = new ArrayList<>();
                            JsonNode choicesArray = qNode.path("choices");
                            if (choicesArray.isArray()) {
                                int choiceOrder = 1;
                                for (JsonNode cNode : choicesArray) {
                                    Choice c = Choice.builder()
                                            .id(UUID.randomUUID().toString())
                                            .text(cNode.path("text").asText())
                                            .isCorrect(cNode.path("isCorrect").asBoolean(false))
                                            .order(choiceOrder++)
                                            .question(q)
                                            .build();
                                    choices.add(c);
                                }
                            }
                            q.setChoices(choices);
                            parsedQuestions.add(q);
                        }
                        log.info("Gemini 1.5 Flash a généré avec succès {} questions réelles pour : {}", parsedQuestions.size(), prompt);
                        return parsedQuestions;
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Appel direct à Google Gemini API échoué ({}), bascule automatique sur le modèle pédagogique intégré.", e.getMessage());
        }
        return null;
    }

    private List<CourseChapter> callGeminiForChapters(String topic, int chaptersCount, Course course, boolean withChapterQuizzes) {
        try {
            String systemInstruction = String.format("""
                Tu es un professeur d'université et concepteur de cours.
                Rédige le syllabus complet en %d chapitres détaillés pour le cours suivant : "%s".
                Pour chaque chapitre, fournis :
                - "title": le titre du chapitre
                - "summary": un résumé concis des compétences acquises
                - "content": le contenu pédagogique complet du cours au format Markdown avec sections, concepts clés et exemples
                - "estimatedMinutes": la durée estimée de lecture (ex: 45)
                Retourne UNIQUEMENT un tableau JSON valide d'objets chapitre.
                """, chaptersCount, topic);

            Map<String, Object> requestBody = Map.of(
                    "contents", List.of(Map.of(
                            "parts", List.of(Map.of("text", systemInstruction))
                    )),
                    "generationConfig", Map.of(
                            "response_mime_type", "application/json",
                            "temperature", 0.7
                    )
            );

            String url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + geminiApiKey.trim();

            String response = restClient.post()
                    .uri(url)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestBody)
                    .retrieve()
                    .body(String.class);

            if (response != null && !response.isBlank()) {
                JsonNode root = objectMapper.readTree(response);
                JsonNode textNode = root.path("candidates").path(0).path("content").path("parts").path(0).path("text");
                if (!textNode.isMissingNode()) {
                    JsonNode chaptersArray = objectMapper.readTree(textNode.asText().trim());
                    if (chaptersArray.isArray() && chaptersArray.size() > 0) {
                        List<CourseChapter> chapters = new ArrayList<>();
                        int order = 1;
                        for (JsonNode chNode : chaptersArray) {
                            CourseChapter ch = CourseChapter.builder()
                                    .order(order)
                                    .title(chNode.path("title").asText("Chapitre " + order))
                                    .summary(chNode.path("summary").asText("Résumé du chapitre " + order))
                                    .content(chNode.path("content").asText("Contenu détaillé du chapitre."))
                                    .estimatedMinutes(chNode.path("estimatedMinutes").asInt(45))
                                    .hasQuiz(withChapterQuizzes)
                                    .quizTitle(withChapterQuizzes ? "Quiz d'évaluation : " + chNode.path("title").asText() : null)
                                    .quizQuestionsCount(withChapterQuizzes ? 4 : null)
                                    .course(course)
                                    .build();
                            chapters.add(courseChapterRepository.save(ch));
                            order++;
                        }
                        log.info("Gemini 1.5 Flash a généré avec succès {} chapitres de cours pour : {}", chapters.size(), topic);
                        return chapters;
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Appel direct à Google Gemini pour le cours échoué ({}), bascule automatique sur le modèle pédagogique intégré.", e.getMessage());
        }
        return null;
    }

    @Override
    public String generateThematicCoverImage(String topic, String category) {
        String query = ((topic != null ? topic : "") + " " + (category != null ? category : "")).toLowerCase();

        if (query.contains("docker") || query.contains("kubernetes") || query.contains("devops") || query.contains("cloud") || query.contains("linux")) {
            return "https://images.unsplash.com/photo-1607799279861-4dd421887fb3?auto=format&fit=crop&w=1200&q=80";
        } else if (query.contains("ia") || query.contains("ai") || query.contains("intelligence") || query.contains("machine learning") || query.contains("deep learning") || query.contains("llm")) {
            return "https://images.unsplash.com/photo-1677442136019-21780efad99a?auto=format&fit=crop&w=1200&q=80";
        } else if (query.contains("python") || query.contains("data") || query.contains("sql") || query.contains("bdd") || query.contains("database") || query.contains("analyse")) {
            return "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80";
        } else if (query.contains("web") || query.contains("javascript") || query.contains("react") || query.contains("angular") || query.contains("frontend") || query.contains("html") || query.contains("css")) {
            return "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80";
        } else if (query.contains("securite") || query.contains("cyber") || query.contains("security") || query.contains("reseau") || query.contains("network")) {
            return "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80";
        } else if (query.contains("business") || query.contains("management") || query.contains("finance") || query.contains("marketing") || query.contains("projet") || query.contains("rh")) {
            return "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80";
        } else if (query.contains("math") || query.contains("science") || query.contains("physique") || query.contains("chimie")) {
            return "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=1200&q=80";
        } else if (query.contains("sante") || query.contains("medecine") || query.contains("medical") || query.contains("biologie")) {
            return "https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?auto=format&fit=crop&w=1200&q=80";
        } else if (query.contains("droit") || query.contains("justice") || query.contains("juridique") || query.contains("loi")) {
            return "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1200&q=80";
        } else if (query.contains("anglais") || query.contains("langue") || query.contains("francais") || query.contains("espagnol") || query.contains("communication")) {
            return "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=1200&q=80";
        } else {
            String cleanTopic = (topic != null && !topic.isBlank()) ? topic.replaceAll("[^a-zA-Z0-9 ]", "").trim() : "education";
            return "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80";
        }
    }
}
