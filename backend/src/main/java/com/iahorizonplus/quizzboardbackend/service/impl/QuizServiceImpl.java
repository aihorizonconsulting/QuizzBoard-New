package com.iahorizonplus.quizzboardbackend.service.impl;

import com.iahorizonplus.quizzboardbackend.entity.*;
import com.iahorizonplus.quizzboardbackend.exception.BadRequestException;
import com.iahorizonplus.quizzboardbackend.exception.ResourceNotFoundException;
import com.iahorizonplus.quizzboardbackend.repository.ClasseRepository;
import com.iahorizonplus.quizzboardbackend.repository.PlatformSettingsRepository;
import com.iahorizonplus.quizzboardbackend.repository.QuizRepository;
import com.iahorizonplus.quizzboardbackend.repository.UserRepository;
import com.iahorizonplus.quizzboardbackend.service.QuizService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class QuizServiceImpl implements QuizService {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final QuizRepository quizRepository;
    private final UserRepository userRepository;
    private final ClasseRepository classeRepository;
    private final PlatformSettingsRepository settingsRepository;

    @Override
    @Transactional(readOnly = true)
    public List<Quiz> getAllPublicQuizzes() {
        return quizRepository.findByVisibilityAndStatus("PUBLIC", QuizStatus.PUBLISHED);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Quiz> getQuizzesByCreator(String creatorId) {
        return quizRepository.findByCreatorIdOrderByCreatedAtDesc(creatorId);
    }

    @Override
    @Transactional(readOnly = true)
    public Quiz getQuizById(String id) {
        return quizRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Quiz non trouvé avec l'id: " + id));
    }

    @Override
    @Transactional(readOnly = true)
    public Quiz getQuizByShareCodeOrPin(String codeOrPin) {
        if (codeOrPin == null || codeOrPin.trim().isEmpty()) {
            throw new IllegalArgumentException("Le code ou PIN est requis");
        }
        String clean = codeOrPin.trim().toUpperCase();
        return quizRepository.findByShareCode(clean)
                .or(() -> quizRepository.findByPin(clean))
                .orElseThrow(() -> new ResourceNotFoundException("Aucun quiz trouvé avec le code ou PIN: " + codeOrPin));
    }

    @Override
    @Transactional
    public Quiz createQuiz(Quiz quiz, String creatorId, String creatorName) {
        // Recherche du créateur par ID ou par Email avec fallback
        User creator = null;
        if (creatorId != null) {
            creator = userRepository.findById(creatorId)
                    .or(() -> userRepository.findByEmail(creatorId))
                    .orElse(null);
        }

        if (creator != null) {
            quiz.setCreatorId(creator.getId());
            quiz.setCreatorName(creatorName != null ? creatorName : creator.getName());

            // Limite du forfait FREE (réglable dans Admin > Paramètres), les ADMINS et abonnements payants
            // sont exemptés. Seuls les quiz créés sur la plateforme actuelle comptent : les quiz importés
            // de l'ancien QuizzBoard ne bloquent pas leurs auteurs.
            if (creator.getRole() != UserRole.ADMIN && creator.getSubscriptionTier() == SubscriptionTier.FREE) {
                int limit = freeQuizLimit();
                long createdOnPlatform = quizRepository.countCreatedOnPlatformByCreatorId(creator.getId());
                if (createdOnPlatform >= limit) {
                    throw new IllegalStateException("Limite du forfait DÉCOUVERTE atteinte (" + limit + " quiz maximum). Passez au forfait STARTER pour des quiz illimités !");
                }
            }
        } else {
            quiz.setCreatorId(creatorId != null ? creatorId : "system");
            quiz.setCreatorName(creatorName != null ? creatorName : "Formateur");
        }

        quiz.setId(null);
        applyDefaults(quiz);
        quiz.setShareCode(uniqueShareCode(quiz.getShareCode(), null));

        List<Question> questions = quiz.getQuestions() != null ? quiz.getQuestions() : new ArrayList<>();
        quiz.setQuestions(new ArrayList<>());
        mergeQuestions(quiz, questions);

        List<String> requestedClassIds = quiz.getAssignedClassIds();
        quiz.setAssignedClassIds(new ArrayList<>());
        Quiz saved = quizRepository.save(quiz);
        if (requestedClassIds != null && !requestedClassIds.isEmpty()) {
            syncClassAssignments(saved, requestedClassIds);
        }
        return saved;
    }

    @Override
    @Transactional
    public Quiz updateQuiz(String id, Quiz updated, String actorId) {
        Quiz existing = getQuizById(id);
        assertCanManage(existing, actorId, "modifier ce quiz");

        // Mise à jour partielle : un champ absent du payload ne vide jamais la valeur existante
        if (updated.getTitle() != null && !updated.getTitle().isBlank()) existing.setTitle(updated.getTitle().trim());
        if (updated.getDescription() != null) existing.setDescription(updated.getDescription());
        if (updated.getCategory() != null && !updated.getCategory().isBlank()) existing.setCategory(updated.getCategory());
        if (updated.getDifficulty() != null && !updated.getDifficulty().isBlank()) existing.setDifficulty(updated.getDifficulty());
        if (updated.getStatus() != null) existing.setStatus(updated.getStatus());
        if (updated.getVisibility() != null && !updated.getVisibility().isBlank()) existing.setVisibility(updated.getVisibility());
        if (updated.getPin() != null) existing.setPin(updated.getPin());
        if (updated.getCoverImage() != null) existing.setCoverImage(updated.getCoverImage());

        if (updated.getQuestions() != null) {
            mergeQuestions(existing, updated.getQuestions());
        }
        // Les classes assignées ne changent que par les endpoints d'assignation : une modification
        // du quiz envoyée avec une liste périmée (ou absente) ne doit pas effacer les assignations.

        return quizRepository.save(existing);
    }

    @Override
    @Transactional
    public void deleteQuiz(String id, String actorId) {
        Quiz existing = getQuizById(id);
        assertCanManage(existing, actorId, "supprimer ce quiz");
        for (Classe classe : classeRepository.findByAssignedQuizId(id)) {
            classe.getAssignedQuizIds().remove(id);
        }
        quizRepository.delete(existing);
    }

    @Override
    @Transactional
    public Quiz toggleVisibility(String id, String actorId) {
        Quiz existing = getQuizById(id);
        assertCanManage(existing, actorId, "modifier la visibilité de ce quiz");
        String current = existing.getVisibility();
        existing.setVisibility("PUBLIC".equalsIgnoreCase(current) ? "PRIVATE" : "PUBLIC");
        return quizRepository.save(existing);
    }

    @Override
    @Transactional
    public Quiz assignClasses(String quizId, List<String> classIds, String actorId) {
        Quiz quiz = getQuizById(quizId);
        assertCanManage(quiz, actorId, "assigner ce quiz");
        syncClassAssignments(quiz, classIds != null ? classIds : List.of());
        return quizRepository.save(quiz);
    }

    private int freeQuizLimit() {
        return settingsRepository.findById("default-settings")
                .map(PlatformSettings::getFreeMaxQuizzes)
                .orElse(PlatformSettings.builder().build().getFreeMaxQuizzes());
    }

    private void applyDefaults(Quiz quiz) {
        if (quiz.getTitle() == null || quiz.getTitle().isBlank()) {
            throw new BadRequestException("title", "Le titre du quiz est obligatoire.");
        }
        quiz.setTitle(quiz.getTitle().trim());
        if (quiz.getCategory() == null || quiz.getCategory().isBlank()) quiz.setCategory("Général");
        if (quiz.getDifficulty() == null || quiz.getDifficulty().isBlank()) quiz.setDifficulty("MEDIUM");
        if (quiz.getStatus() == null) quiz.setStatus(QuizStatus.PUBLISHED);
        if (quiz.getVisibility() == null || quiz.getVisibility().isBlank()) quiz.setVisibility("PUBLIC");
        if (quiz.getParticipationsCount() == null) quiz.setParticipationsCount(0);
        if (quiz.getAverageScorePercent() == null) quiz.setAverageScorePercent(0.0);
    }

    /** Code de partage en majuscules (la recherche par code se fait en majuscules) et unique en base. */
    private String uniqueShareCode(String requested, String currentQuizId) {
        String code = requested == null ? "" : requested.trim().toUpperCase();
        if (!code.isEmpty() && isShareCodeFree(code, currentQuizId)) {
            return code;
        }
        for (int attempt = 0; attempt < 30; attempt++) {
            String candidate = "QM-" + (1000 + RANDOM.nextInt(9000));
            if (isShareCodeFree(candidate, currentQuizId)) {
                return candidate;
            }
        }
        return "QM-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }

    private boolean isShareCodeFree(String code, String currentQuizId) {
        return quizRepository.findByShareCode(code)
                .map(other -> other.getId().equals(currentQuizId))
                .orElse(true);
    }

    /**
     * Met à jour les questions et leurs choix en conservant les identifiants existants
     * (les réponses des participants référencent l'id de la question). Les identifiants
     * temporaires du frontend sont ignorés : la question ou le choix est alors créé.
     */
    private void mergeQuestions(Quiz quiz, List<Question> incoming) {
        Map<String, Question> current = new HashMap<>();
        for (Question q : quiz.getQuestions()) {
            if (q.getId() != null) current.put(q.getId(), q);
        }
        List<Question> result = new ArrayList<>();
        int index = 0;
        for (Question in : incoming) {
            index++;
            if (in == null) continue;
            if (in.getText() == null || in.getText().isBlank()) {
                throw new BadRequestException("questions", "La question " + index + " n'a pas d'énoncé.");
            }
            Question target = in.getId() != null ? current.remove(in.getId()) : null;
            if (target == null) {
                target = new Question();
                target.setQuiz(quiz);
            }
            target.setText(in.getText());
            target.setType(in.getType() != null ? in.getType() : QuestionType.SINGLE_CHOICE);
            target.setTimeLimitSeconds(in.getTimeLimitSeconds() > 0 ? in.getTimeLimitSeconds() : 20);
            target.setPoints(in.getPoints() > 0 ? in.getPoints() : 100);
            target.setExplanation(in.getExplanation());
            target.setImageUrl(in.getImageUrl());
            target.setOrder(index);
            mergeChoices(target, in.getChoices() != null ? in.getChoices() : List.of());
            result.add(target);
        }
        quiz.getQuestions().clear();
        quiz.getQuestions().addAll(result);
    }

    private void mergeChoices(Question question, List<Choice> incoming) {
        Map<String, Choice> current = new HashMap<>();
        for (Choice c : question.getChoices()) {
            if (c.getId() != null) current.put(c.getId(), c);
        }
        List<Choice> result = new ArrayList<>();
        int index = 0;
        for (Choice in : incoming) {
            if (in == null || in.getText() == null || in.getText().isBlank()) continue;
            index++;
            Choice target = in.getId() != null ? current.remove(in.getId()) : null;
            if (target == null) {
                target = new Choice();
                target.setQuestion(question);
            }
            target.setText(in.getText());
            target.setCorrect(in.isCorrect());
            target.setOrder(index);
            result.add(target);
        }
        question.getChoices().clear();
        question.getChoices().addAll(result);
    }

    /** Garde synchronisées les deux vues de l'assignation : quiz.assignedClassIds et classe.assignedQuizIds. */
    private void syncClassAssignments(Quiz quiz, List<String> requestedClassIds) {
        Set<String> wanted = new LinkedHashSet<>();
        for (String classId : requestedClassIds) {
            if (classId != null && !classId.isBlank()) wanted.add(classId);
        }
        List<String> kept = new ArrayList<>();
        for (Classe classe : classeRepository.findAllById(wanted)) {
            if (!classe.getAssignedQuizIds().contains(quiz.getId())) {
                classe.getAssignedQuizIds().add(quiz.getId());
            }
            kept.add(classe.getId());
        }
        for (Classe classe : classeRepository.findByAssignedQuizId(quiz.getId())) {
            if (!kept.contains(classe.getId())) {
                classe.getAssignedQuizIds().remove(quiz.getId());
            }
        }
        quiz.getAssignedClassIds().clear();
        quiz.getAssignedClassIds().addAll(kept);
    }

    /** Le créateur du quiz ou un administrateur (modération) peuvent le gérer. */
    private void assertCanManage(Quiz quiz, String actorId, String action) {
        if (actorId != null && actorId.equals(quiz.getCreatorId())) {
            return;
        }
        boolean admin = actorId != null && userRepository.findById(actorId)
                .map(u -> u.getRole() == UserRole.ADMIN)
                .orElse(false);
        if (!admin) {
            throw new SecurityException("Vous n'êtes pas autorisé à " + action);
        }
    }
}
