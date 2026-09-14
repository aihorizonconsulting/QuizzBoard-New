package com.iahorizonplus.quizzboardbackend.service.impl;

import com.iahorizonplus.quizzboardbackend.entity.Promotion;
import com.iahorizonplus.quizzboardbackend.entity.User;
import com.iahorizonplus.quizzboardbackend.exception.BadRequestException;
import com.iahorizonplus.quizzboardbackend.exception.ResourceNotFoundException;
import com.iahorizonplus.quizzboardbackend.repository.PromotionRepository;
import com.iahorizonplus.quizzboardbackend.repository.UserRepository;
import com.iahorizonplus.quizzboardbackend.service.PromotionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PromotionServiceImpl implements PromotionService {

    private final PromotionRepository promotionRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public List<Promotion> getPromotions(String creatorEmail) {
        User creator = userRepository.findByEmail(creatorEmail).orElse(null);
        if (creator != null) {
            return promotionRepository.findByCreatorIdOrderByCreatedAtDesc(creator.getId());
        }
        return promotionRepository.findAll();
    }

    @Override
    @Transactional(readOnly = true)
    public Promotion getActivePromotion() {
        return promotionRepository.findByIsActiveTrue()
                .orElseGet(() -> promotionRepository.findAll().stream().findFirst().orElse(null));
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
        if (promotion.getName() == null || promotion.getName().trim().isEmpty()) {
            throw new BadRequestException("name", "Le nom de la promotion est obligatoire.");
        }
        if (promotion.getYear() == null || promotion.getYear().trim().isEmpty()) {
            throw new BadRequestException("year", "L'année académique de la promotion est obligatoire (ex: 2025 - 2026).");
        }

        User creator = userRepository.findByEmail(creatorEmail).orElse(null);
        if (creator != null) {
            promotion.setCreatorId(creator.getId());
        }

        if (promotion.isActive()) {
            deactivateAll();
        }

        return promotionRepository.save(promotion);
    }

    @Override
    @Transactional
    public Promotion setActivePromotion(String promotionId) {
        Promotion target = getPromotionById(promotionId);
        deactivateAll();
        target.setActive(true);
        return promotionRepository.save(target);
    }

    @Override
    @Transactional
    public Promotion updatePromotion(String id, Promotion updated, String creatorEmail) {
        Promotion existing = getPromotionById(id);
        existing.setName(updated.getName());
        existing.setDescription(updated.getDescription());
        existing.setYear(updated.getYear());
        existing.setStatus(updated.getStatus());
        existing.setStartDate(updated.getStartDate());
        existing.setEndDate(updated.getEndDate());
        return promotionRepository.save(existing);
    }

    @Override
    @Transactional
    public void deletePromotion(String promotionId) {
        promotionRepository.deleteById(promotionId);
    }

    private void deactivateAll() {
        List<Promotion> all = promotionRepository.findAll();
        for (Promotion p : all) {
            p.setActive(false);
        }
        promotionRepository.saveAll(all);
    }
}
