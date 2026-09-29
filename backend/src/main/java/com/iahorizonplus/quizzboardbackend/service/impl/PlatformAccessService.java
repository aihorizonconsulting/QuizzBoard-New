package com.iahorizonplus.quizzboardbackend.service.impl;

import com.iahorizonplus.quizzboardbackend.entity.PlatformSettings;
import com.iahorizonplus.quizzboardbackend.entity.User;
import com.iahorizonplus.quizzboardbackend.entity.UserRole;
import com.iahorizonplus.quizzboardbackend.exception.UnauthorizedException;
import com.iahorizonplus.quizzboardbackend.repository.PlatformSettingsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * Accès à la plateforme selon les réglages de l'administration : en mode maintenance
 * (Admin > Paramètres), seuls les administrateurs peuvent se connecter.
 */
@Service
@RequiredArgsConstructor
public class PlatformAccessService {

    private final PlatformSettingsRepository settingsRepository;

    public void assertLoginAllowed(User user) {
        if (user.getRole() == UserRole.ADMIN) {
            return;
        }
        settingsRepository.findById("default-settings")
                .filter(PlatformSettings::isMaintenanceMode)
                .ifPresent(settings -> {
                    String message = settings.getMaintenanceMessage() != null && !settings.getMaintenanceMessage().isBlank()
                            ? settings.getMaintenanceMessage()
                            : "QuizzBoard est actuellement en maintenance.";
                    throw new UnauthorizedException(message + " Seuls les administrateurs peuvent se connecter pour le moment.");
                });
    }
}
