package com.iahorizonplus.quizzboardbackend.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "platform_settings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PlatformSettings {

    @Id
    @Builder.Default
    private String id = "default-settings";

    @Builder.Default
    private int freeMaxQuizzes = 3;

    @Builder.Default
    private int freeMaxLiveParticipants = 25;

    @Builder.Default
    private int freeAiCreditsMonth = 5;

    @Builder.Default
    private double starterPriceFcfa = 999.0;

    @Builder.Default
    private double starterPriceUsd = 2.0;

    @Builder.Default
    private boolean isMaintenanceMode = false;

    @Builder.Default
    private String maintenanceMessage = "QuizzBoard est actuellement en maintenance planifiée.";

    @Builder.Default
    private boolean waveActive = true;

    @Builder.Default
    private boolean omActive = true;

    @Builder.Default
    private boolean stripeActive = true;

    @Builder.Default
    private boolean allowPublicRegistrations = true;

    @Builder.Default
    private boolean requireEmailVerification = false;
}
