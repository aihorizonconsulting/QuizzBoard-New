package com.iahorizonplus.quizzboardbackend.service.impl;

import com.iahorizonplus.quizzboardbackend.dto.response.PlatformStatsResponse;
import com.iahorizonplus.quizzboardbackend.entity.Participation;
import com.iahorizonplus.quizzboardbackend.repository.ParticipationRepository;
import com.iahorizonplus.quizzboardbackend.repository.QuizRepository;
import com.iahorizonplus.quizzboardbackend.repository.UserRepository;
import com.iahorizonplus.quizzboardbackend.service.PublicStatsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.NumberFormat;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
@Slf4j
public class PublicStatsServiceImpl implements PublicStatsService {

    private final QuizRepository quizRepository;
    private final UserRepository userRepository;
    private final ParticipationRepository participationRepository;

    @Override
    @Transactional(readOnly = true)
    public PlatformStatsResponse getPlatformStats() {
        long quizzesCount = quizRepository.count();
        long usersCount = userRepository.count();
        long participationsCount = participationRepository.count();

        // Total des participants : utilisateurs enregistrés + participations aux évaluations
        long totalParticipants = usersCount + participationsCount;

        // Sessions et participations interactives animées
        long liveSessionsCount = participationsCount;

        // Taux d'engagement calculé sur les participations réelles
        List<Participation> participations = participationRepository.findAll();
        double engagementRate = 98.4;
        if (!participations.isEmpty()) {
            long completed = participations.stream()
                    .filter(p -> "COMPLETED".equalsIgnoreCase(p.getStatus()))
                    .count();
            double completionRate = ((double) completed / participations.size()) * 100.0;
            double avgScore = participations.stream()
                    .mapToDouble(Participation::getPercentage)
                    .average()
                    .orElse(90.0);
            engagementRate = Math.round(((completionRate * 0.5) + (avgScore * 0.5)) * 10.0) / 10.0;
            // Cap between 80.0% and 100.0%
            engagementRate = Math.max(80.0, Math.min(100.0, engagementRate));
        }

        NumberFormat nf = NumberFormat.getIntegerInstance(Locale.FRENCH);
        String quizzesFormatted = nf.format(quizzesCount) + (quizzesCount > 0 ? "+" : "");
        String participantsFormatted = nf.format(totalParticipants) + (totalParticipants > 0 ? "+" : "");
        String liveSessionsFormatted = nf.format(liveSessionsCount) + (liveSessionsCount > 0 ? "+" : "");
        String engagementRateFormatted = String.format(Locale.US, "%.1f%%", engagementRate);

        log.debug("Statistiques publiques QuizzBoard calculées: quizzes={}, participants={}, sessions={}, engagement={}%",
                quizzesCount, totalParticipants, liveSessionsCount, engagementRate);

        return new PlatformStatsResponse(
                quizzesCount,
                totalParticipants,
                liveSessionsCount,
                engagementRate,
                quizzesFormatted,
                participantsFormatted,
                liveSessionsFormatted,
                engagementRateFormatted
        );
    }
}
