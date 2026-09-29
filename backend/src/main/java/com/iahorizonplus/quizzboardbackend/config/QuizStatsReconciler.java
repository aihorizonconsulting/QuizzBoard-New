package com.iahorizonplus.quizzboardbackend.config;

import com.iahorizonplus.quizzboardbackend.service.impl.LearningStatsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

/**
 * Au démarrage, aligne le nombre de participations et la moyenne de chaque quiz sur les participations
 * terminées (les quiz importés de l'ancien QuizzBoard affichaient « 0 joués »). Idempotent.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class QuizStatsReconciler implements ApplicationRunner {

    private final LearningStatsService learningStatsService;

    @Override
    public void run(ApplicationArguments args) {
        try {
            int updated = learningStatsService.refreshAllQuizStats();
            log.info("Statistiques des quiz alignées sur les participations terminées : {} quiz mis à jour.", updated);
        } catch (Exception e) {
            log.warn("Alignement des statistiques des quiz impossible : {}", e.getMessage());
        }
    }
}
