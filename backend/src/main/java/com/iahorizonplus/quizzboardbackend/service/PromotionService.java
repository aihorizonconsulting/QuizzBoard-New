package com.iahorizonplus.quizzboardbackend.service;

import com.iahorizonplus.quizzboardbackend.entity.Promotion;

import java.util.List;

public interface PromotionService {
    List<Promotion> getPromotions(String creatorEmail);
    Promotion getPromotionById(String id);
    Promotion createPromotion(String creatorEmail, Promotion promotion);
    Promotion updatePromotion(String id, Promotion promotion, String actorEmail);
    /** Définit la promotion comme contexte de travail actif du formateur (une seule active à la fois). */
    Promotion activatePromotion(String id, String actorEmail);
    void deletePromotion(String promotionId, String actorEmail);
}
