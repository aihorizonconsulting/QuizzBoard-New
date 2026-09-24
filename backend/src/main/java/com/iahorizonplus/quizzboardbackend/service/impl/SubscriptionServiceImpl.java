package com.iahorizonplus.quizzboardbackend.service.impl;

import com.iahorizonplus.quizzboardbackend.entity.*;
import com.iahorizonplus.quizzboardbackend.exception.ResourceNotFoundException;
import com.iahorizonplus.quizzboardbackend.repository.InvoiceRepository;
import com.iahorizonplus.quizzboardbackend.repository.PlatformSettingsRepository;
import com.iahorizonplus.quizzboardbackend.repository.UserRepository;
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
        return settingsRepository.save(settings);
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
