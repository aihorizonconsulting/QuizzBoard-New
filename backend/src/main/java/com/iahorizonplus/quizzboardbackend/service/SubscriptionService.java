package com.iahorizonplus.quizzboardbackend.service;

import com.iahorizonplus.quizzboardbackend.dto.response.PlanUsageResponse;
import com.iahorizonplus.quizzboardbackend.entity.Invoice;
import com.iahorizonplus.quizzboardbackend.entity.PlatformSettings;
import com.iahorizonplus.quizzboardbackend.entity.SubscriptionTier;

import java.util.List;

public interface SubscriptionService {
    SubscriptionTier getCurrentTier(String userId);
    void upgradeUserTier(String userId, SubscriptionTier tier);
    List<Invoice> getUserInvoices(String userId);
    PlatformSettings getPlatformSettings();
    PlatformSettings updatePlatformSettings(PlatformSettings settings);
    /** Consommation du forfait de l'utilisateur, calculée avec les mêmes règles que les quotas appliqués. */
    PlanUsageResponse getUsage(String userId);
}
