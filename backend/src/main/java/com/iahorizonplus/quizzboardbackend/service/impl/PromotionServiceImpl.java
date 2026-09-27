package com.iahorizonplus.quizzboardbackend.service.impl;

import com.iahorizonplus.quizzboardbackend.entity.*;
import com.iahorizonplus.quizzboardbackend.exception.BadRequestException;
import com.iahorizonplus.quizzboardbackend.exception.ResourceNotFoundException;
import com.iahorizonplus.quizzboardbackend.exception.UnauthorizedException;
import com.iahorizonplus.quizzboardbackend.repository.ClasseRepository;
import com.iahorizonplus.quizzboardbackend.repository.PromotionRepository;
import com.iahorizonplus.quizzboardbackend.repository.UserRepository;
import com.iahorizonplus.quizzboardbackend.service.PromotionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Règles métier des promotions, appliquées par formateur :
 * une seule promotion EN COURS (démarrer une promotion archive la précédente),
 * une seule promotion ACTIVE (contexte de travail), une promotion ARCHIVÉE est en lecture seule.
 */
@Service
@RequiredArgsConstructor
public class PromotionServiceImpl implements PromotionService {

    private final PromotionRepository promotionRepository;
    private final UserRepository userRepository;
    private final ClasseRepository classeRepository;

    @Override
    @Transactional(readOnly = true)
    public List<Promotion> getPromotions(String creatorEmail) {
        User creator = creatorEmail != null ? userRepository.findByEmail(creatorEmail).orElse(null) : null;
        if (creator == null) {
            return List.of();
        }
        return promotionRepository.findByCreatorIdOrderByCreatedAtDesc(creator.getId());
    }

    @Override
    @Transactional(readOnly = true)
    public Promotion getPromotionById(String id) {
        return promotionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Promotion introuvable avec l'ID : " + id));
    }

    @Override
    @Transactional
    public Promotion createPromotion(String creatorEmail, Promotion promotion) {
        User creator = requireUser(creatorEmail);
        // id temporaire éventuel envoyé par le frontend : l'id est toujours généré par la base
        promotion.setId(null);
        if (promotion.getName() == null || promotion.getName().trim().isEmpty()) {
            throw new BadRequestException("name", "Le nom de la promotion est obligatoire.");
        }
        if (promotion.getYear() == null || promotion.getYear().trim().isEmpty()) {
            throw new BadRequestException("year", "L'année académique de la promotion est obligatoire (ex: 2025 - 2026).");
        }
        validateDates(promotion);
        promotion.setName(promotion.getName().trim());
        promotion.setYear(promotion.getYear().trim());
        promotion.setCreatorId(creator.getId());
        if (promotion.getCode() == null || promotion.getCode().isBlank()) {
            promotion.setCode("P" + (promotionRepository.countByCreatorId(creator.getId()) + 1));
        }
        if (promotion.getStatus() == null) {
            promotion.setStatus(PromotionStatus.UPCOMING);
        }

        if (promotion.getStatus() == PromotionStatus.IN_PROGRESS) {
            archiveOtherInProgress(creator.getId(), null);
            promotion.setActive(true);
        } else if (promotion.getStatus() == PromotionStatus.ARCHIVED) {
            promotion.setActive(false);
        }
        if (promotion.isActive()) {
            deactivateOthers(creator.getId(), null);
        }
        return promotionRepository.save(promotion);
    }

    @Override
    @Transactional
    public Promotion updatePromotion(String id, Promotion updated, String actorEmail) {
        Promotion existing = getPromotionById(id);
        assertCanManage(existing, actorEmail);

        PromotionStatus newStatus = updated.getStatus() != null ? updated.getStatus() : existing.getStatus();
        if (existing.getStatus() == PromotionStatus.ARCHIVED && newStatus != PromotionStatus.ARCHIVED) {
            throw new BadRequestException("status", "La promotion « " + existing.getName() + " » est archivée : elle est en lecture seule et son statut ne peut plus changer.");
        }

        if (updated.getName() != null && !updated.getName().isBlank() && !updated.getName().trim().equals(existing.getName())) {
            existing.setName(updated.getName().trim());
            for (Classe classe : classeRepository.findByPromotionId(id)) {
                classe.setPromotionLabel(existing.getName());
            }
        }
        if (updated.getDescription() != null) existing.setDescription(updated.getDescription());
        if (updated.getYear() != null && !updated.getYear().isBlank()) existing.setYear(updated.getYear().trim());
        if (updated.getCode() != null && !updated.getCode().isBlank()) existing.setCode(updated.getCode().trim());
        if (updated.getStartDate() != null) existing.setStartDate(updated.getStartDate());
        if (updated.getEndDate() != null) existing.setEndDate(updated.getEndDate());
        validateDates(existing);

        if (newStatus != existing.getStatus()) {
            if (newStatus == PromotionStatus.IN_PROGRESS) {
                archiveOtherInProgress(existing.getCreatorId(), existing.getId());
                deactivateOthers(existing.getCreatorId(), existing.getId());
                existing.setActive(true);
            } else if (newStatus == PromotionStatus.ARCHIVED) {
                existing.setActive(false);
            }
            existing.setStatus(newStatus);
        }
        return promotionRepository.save(existing);
    }

    @Override
    @Transactional
    public Promotion activatePromotion(String id, String actorEmail) {
        Promotion target = getPromotionById(id);
        assertCanManage(target, actorEmail);
        deactivateOthers(target.getCreatorId(), target.getId());
        target.setActive(true);
        return promotionRepository.save(target);
    }

    @Override
    @Transactional
    public void deletePromotion(String promotionId, String actorEmail) {
        Promotion promotion = getPromotionById(promotionId);
        assertCanManage(promotion, actorEmail);
        // Les classes de la promotion sont conservées, sans promotion
        for (Classe classe : classeRepository.findByPromotionId(promotionId)) {
            classe.setPromotionId(null);
            classe.setPromotionLabel(null);
        }
        promotionRepository.delete(promotion);
    }

    private void validateDates(Promotion promotion) {
        if (promotion.getStartDate() != null && promotion.getEndDate() != null
                && promotion.getEndDate().isBefore(promotion.getStartDate())) {
            throw new BadRequestException("endDate", "La date de fin doit être postérieure à la date de début.");
        }
    }

    private void archiveOtherInProgress(String creatorId, String exceptId) {
        for (Promotion p : promotionRepository.findByCreatorIdAndStatus(creatorId, PromotionStatus.IN_PROGRESS)) {
            if (!p.getId().equals(exceptId)) {
                p.setStatus(PromotionStatus.ARCHIVED);
                p.setActive(false);
            }
        }
    }

    private void deactivateOthers(String creatorId, String exceptId) {
        for (Promotion p : promotionRepository.findByCreatorIdOrderByCreatedAtDesc(creatorId)) {
            if (p.isActive() && !p.getId().equals(exceptId)) {
                p.setActive(false);
            }
        }
    }

    private User requireUser(String email) {
        if (email == null) {
            throw new UnauthorizedException("Authentification requise.");
        }
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new UnauthorizedException("Utilisateur introuvable : reconnectez-vous."));
    }

    private void assertCanManage(Promotion promotion, String actorEmail) {
        User actor = requireUser(actorEmail);
        if (actor.getRole() != UserRole.ADMIN && !actor.getId().equals(promotion.getCreatorId())) {
            throw new SecurityException("Vous n'êtes pas autorisé à modifier cette promotion.");
        }
    }
}
