package com.iahorizonplus.quizzboardbackend.service.impl;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.iahorizonplus.quizzboardbackend.entity.RemedialPack;
import com.iahorizonplus.quizzboardbackend.repository.RemedialPackRepository;
import com.iahorizonplus.quizzboardbackend.service.AiService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Génère en arrière-plan le contenu d'un parcours de remise à niveau (l'appel à l'IA prend plusieurs
 * secondes : la fin du quiz n'attend pas).
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class RemedialGenerationWorker {

    /** Une génération « en cours » depuis plus longtemps est considérée comme interrompue. */
    static final long STALE_GENERATION_MINUTES = 5;

    private final RemedialPackRepository packRepository;
    private final AiService aiService;
    private final ObjectMapper objectMapper;

    @Async
    public void generateAsync(String packId) {
        generate(packId);
    }

    public void generate(String packId) {
        RemedialPack pack = packRepository.findById(packId).orElse(null);
        if (pack == null || RemedialPack.READY.equals(pack.getStatus())) {
            return;
        }
        if (RemedialPack.GENERATING.equals(pack.getStatus()) && pack.getUpdatedAt() != null
                && pack.getUpdatedAt().isAfter(LocalDateTime.now().minusMinutes(STALE_GENERATION_MINUTES))) {
            return;
        }
        pack.setStatus(RemedialPack.GENERATING);
        pack.setFailureReason(null);
        packRepository.save(pack);

        ObjectNode content = aiService.generateRemedialContent(pack.getQuizTitle(), pack.getScorePercent(), notionsOf(pack));

        RemedialPack current = packRepository.findById(packId).orElse(pack);
        if (content != null) {
            current.setContent(content.toString());
            current.setStatus(RemedialPack.READY);
            current.setReadyAt(LocalDateTime.now());
            current.setFailureReason(null);
        } else {
            current.setStatus(RemedialPack.FAILED);
            current.setFailureReason("L'IA n'a pas pu préparer ce parcours pour le moment : relancez la préparation dans quelques minutes.");
        }
        packRepository.save(current);
    }

    List<String> notionsOf(RemedialPack pack) {
        try {
            return pack.getMissedNotions() == null ? List.of()
                    : objectMapper.readValue(pack.getMissedNotions(), new TypeReference<List<String>>() {});
        } catch (Exception e) {
            return List.of();
        }
    }
}
