package com.iahorizonplus.quizzboardbackend.service.impl;

import com.iahorizonplus.quizzboardbackend.dto.response.PlanUsageResponse;
import com.iahorizonplus.quizzboardbackend.entity.*;
import com.iahorizonplus.quizzboardbackend.exception.ResourceNotFoundException;
import com.iahorizonplus.quizzboardbackend.repository.CommunityRepository;
import com.iahorizonplus.quizzboardbackend.repository.InvoiceRepository;
import com.iahorizonplus.quizzboardbackend.repository.QuizRepository;
import com.iahorizonplus.quizzboardbackend.repository.PlatformSettingsRepository;
import com.iahorizonplus.quizzboardbackend.repository.UserRepository;
import com.iahorizonplus.quizzboardbackend.service.AdminService;
import com.iahorizonplus.quizzboardbackend.service.SubscriptionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class SubscriptionServiceImpl implements SubscriptionService {

    private final UserRepository userRepository;
    private final InvoiceRepository invoiceRepository;
    private final PlatformSettingsRepository settingsRepository;
    private final QuizRepository quizRepository;
    private final CommunityRepository communityRepository;
    private final AdminService adminService;

    static final int STARTER_MAX_COMMUNITIES = 10;
    static final int STARTER_MAX_LIVE_PARTICIPANTS = 300;

    @Override
    @Transactional
    public SubscriptionTier getCurrentTier(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur introuvable"));
        expireIfNeeded(user);
        return user.getSubscriptionTier();
    }

    @Override
    @Transactional
    public void upgradeUserTier(String userId, SubscriptionTier tier) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur introuvable"));
        user.setSubscriptionTier(tier);
        user.setSubscriptionExpiresAt(tier == SubscriptionTier.FREE ? null : LocalDateTime.now().plusMonths(1));
        userRepository.save(user);
        log.info("Abonnement utilisateur {} mis à niveau vers {}", userId, tier);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Invoice> getUserInvoices(String userId) {
        return invoiceRepository.findByUserId(userId);
    }

    @Override
    @Transactional(readOnly = true)
    public PlatformSettings getPlatformSettings() {
        return settingsRepository.findById("default-settings")
                .orElseGet(() -> settingsRepository.save(PlatformSettings.builder().id("default-settings").build()));
    }

    @Override
    @Transactional
    public PlatformSettings updatePlatformSettings(PlatformSettings settings) {
        settings.setId("default-settings");
        PlatformSettings saved = settingsRepository.save(settings);
        adminService.audit("Paramètres de la plateforme modifiés", "Paramètres", String.format(
                "Maintenance : %s ; FREE : %d quiz, %d joueurs Live, %d générations IA / mois ; Starter : %.0f FCFA ; signataire : %s",
                saved.isMaintenanceMode() ? "activée" : "désactivée", saved.getFreeMaxQuizzes(), saved.getFreeMaxLiveParticipants(),
                saved.getFreeAiCreditsMonth(), saved.getStarterPriceFcfa(), saved.getCertificateSignatoryName()),
                saved.isMaintenanceMode() ? "CRITICAL" : "WARNING");
        return saved;
    }

    @Override
    @Transactional
    public PlanUsageResponse getUsage(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur introuvable"));
        expireIfNeeded(user);
        PlatformSettings settings = getPlatformSettings();
        boolean admin = user.getRole() == UserRole.ADMIN;
        boolean free = user.getSubscriptionTier() == SubscriptionTier.FREE;

        long quizzesCreated = quizRepository.countCreatedOnPlatformByCreatorId(userId);
        long quizzesImported = Math.max(0, quizRepository.countByCreatorId(userId) - quizzesCreated);
        Integer quizzesLimit = (!admin && free) ? settings.getFreeMaxQuizzes() : null;

        long communitiesCreated = communityRepository.countCreatedOnPlatformByCreatorId(userId);
        Integer communitiesLimit = free ? 1 : (user.getSubscriptionTier() == SubscriptionTier.STARTER ? STARTER_MAX_COMMUNITIES : null);

        return new PlanUsageResponse(
                user.getSubscriptionTier(),
                user.getSubscriptionExpiresAt(),
                quizzesCreated,
                quizzesImported,
                quizzesLimit,
                communitiesCreated,
                communitiesLimit,
                AiServiceImpl.aiCreditsUsedThisMonth(user),
                AiServiceImpl.monthlyAiLimit(user, settings),
                free ? settings.getFreeMaxLiveParticipants() : STARTER_MAX_LIVE_PARTICIPANTS
        );
    }

    private void expireIfNeeded(User user) {
        if (user.getSubscriptionTier() != SubscriptionTier.FREE
                && user.getSubscriptionExpiresAt() != null
                && user.getSubscriptionExpiresAt().isBefore(LocalDateTime.now())) {
            user.setSubscriptionTier(SubscriptionTier.FREE);
            user.setSubscriptionExpiresAt(null);
            userRepository.save(user);
            log.info("Abonnement expiré pour {}, retour au forfait FREE.", user.getEmail());
        }
    }
}
