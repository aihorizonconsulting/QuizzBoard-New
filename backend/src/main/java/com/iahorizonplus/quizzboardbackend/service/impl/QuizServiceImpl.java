package com.iahorizonplus.quizzboardbackend.service.impl;

import com.iahorizonplus.quizzboardbackend.entity.*;
import com.iahorizonplus.quizzboardbackend.exception.ResourceNotFoundException;
import com.iahorizonplus.quizzboardbackend.repository.QuizRepository;
import com.iahorizonplus.quizzboardbackend.repository.UserRepository;
import com.iahorizonplus.quizzboardbackend.service.QuizService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class QuizServiceImpl implements QuizService {

    private final QuizRepository quizRepository;
    private final UserRepository userRepository;

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

            // Enforce FREE limit (3 max), les ADMINS et abonnements payants sont exemptés
            if (creator.getRole() != UserRole.ADMIN && creator.getSubscriptionTier() == SubscriptionTier.FREE) {
                long existingCount = quizRepository.findByCreatorIdOrderByCreatedAtDesc(creator.getId()).size();
                if (existingCount >= 3) {
                    throw new IllegalStateException("Limite du forfait DÉCOUVERTE atteinte (3 quiz maximum). Passez au forfait STARTER pour des quiz illimités !");
                }
            }
        } else {
            quiz.setCreatorId(creatorId != null ? creatorId : "system");
            quiz.setCreatorName(creatorName != null ? creatorName : "Formateur");
        }

        quiz.setId(null);

        if (quiz.getShareCode() == null || quiz.getShareCode().trim().isEmpty()) {
            quiz.setShareCode("QM-" + (1000 + new SecureRandom().nextInt(9000)));
        }

        // Link questions and choices
        if (quiz.getQuestions() != null) {
            for (Question q : quiz.getQuestions()) {
                q.setId(null);
                q.setQuiz(quiz);
                if (q.getChoices() != null) {
                    for (Choice c : q.getChoices()) {
                        c.setId(null);
                        c.setQuestion(q);
                    }
                }
            }
        }

        return quizRepository.save(quiz);
    }

    @Override
    @Transactional
    public Quiz updateQuiz(String id, Quiz updated, String creatorId) {
        Quiz existing = getQuizById(id);
        if (!existing.getCreatorId().equals(creatorId)) {
            throw new SecurityException("Vous n'êtes pas autorisé à modifier ce quiz");
        }

        existing.setTitle(updated.getTitle());
        existing.setDescription(updated.getDescription());
        existing.setCategory(updated.getCategory());
        existing.setDifficulty(updated.getDifficulty());
        existing.setStatus(updated.getStatus());
        existing.setVisibility(updated.getVisibility());
        existing.setPin(updated.getPin());
        existing.setCoverImage(updated.getCoverImage());
        existing.setAssignedClassIds(updated.getAssignedClassIds());

        // Update questions if provided
        if (updated.getQuestions() != null) {
            existing.getQuestions().clear();
            for (Question q : updated.getQuestions()) {
                q.setQuiz(existing);
                if (q.getChoices() != null) {
                    for (Choice c : q.getChoices()) {
                        c.setQuestion(q);
                    }
                }
                existing.getQuestions().add(q);
            }
        }

        return quizRepository.save(existing);
    }

    @Override
    @Transactional
    public void deleteQuiz(String id, String creatorId) {
        Quiz existing = getQuizById(id);
        if (!existing.getCreatorId().equals(creatorId)) {
            throw new SecurityException("Vous n'êtes pas autorisé à supprimer ce quiz");
        }
        quizRepository.delete(existing);
    }

    @Override
    @Transactional
    public Quiz toggleVisibility(String id, String creatorId) {
        Quiz existing = getQuizById(id);
        if (!existing.getCreatorId().equals(creatorId)) {
            throw new SecurityException("Vous n'êtes pas autorisé à modifier la visibilité de ce quiz");
        }
        String current = existing.getVisibility();
        existing.setVisibility("PUBLIC".equalsIgnoreCase(current) ? "PRIVATE" : "PUBLIC");
        return quizRepository.save(existing);
    }

    @Override
    @Transactional
    public Quiz assignClasses(String quizId, List<String> classIds) {
        Quiz quiz = getQuizById(quizId);
        quiz.setAssignedClassIds(classIds);
        return quizRepository.save(quiz);
    }
}
