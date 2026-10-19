package com.iahorizonplus.quizzboardbackend.service.impl;

import com.iahorizonplus.quizzboardbackend.entity.SubscriptionTier;
import com.iahorizonplus.quizzboardbackend.entity.User;
import com.iahorizonplus.quizzboardbackend.entity.UserRole;

import java.time.LocalDateTime;

/** Règles d'accès liées aux forfaits (contenus réservés à l'abonnement Apprenant Plus). */
public final class PlanAccess {

    public static final String LEARNER_PLUS_REQUIRED =
            "Réservé à l'abonnement Apprenant Plus : abonnez-vous depuis la page Tarifs pour y accéder.";

    private PlanAccess() {
    }

    public static boolean isLearner(User user) {
        return user != null && user.getRole() == UserRole.LEARNER;
    }

    /** Abonnement Apprenant Plus en cours de validité. */
    public static boolean hasLearnerPlus(User user) {
        return user != null
                && user.getSubscriptionTier() == SubscriptionTier.LEARNER_PLUS
                && (user.getSubscriptionExpiresAt() == null || user.getSubscriptionExpiresAt().isAfter(LocalDateTime.now()));
    }
}
