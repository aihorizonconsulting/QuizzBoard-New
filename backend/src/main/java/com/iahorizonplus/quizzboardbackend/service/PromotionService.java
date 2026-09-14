package com.iahorizonplus.quizzboardbackend.service;

import com.iahorizonplus.quizzboardbackend.entity.Promotion;

import java.util.List;

public interface PromotionService {
    List<Promotion> getPromotions(String creatorEmail);
    Promotion getActivePromotion();
    Promotion getPromotionById(String id);
    Promotion createPromotion(String creatorEmail, Promotion promotion);
    Promotion updatePromotion(String id, Promotion promotion, String creatorEmail);
    Promotion setActivePromotion(String promotionId);
    void deletePromotion(String promotionId);
}
