package com.iahorizonplus.quizzboardbackend.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false, length = 100)
    private String prenom;

    @Column(nullable = false, length = 100)
    private String nom;

    @Column(nullable = false, unique = true, length = 150)
    private String email;

    // Jamais renvoyé dans les réponses JSON (ex. liste des utilisateurs de l'administration)
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    @Column(nullable = true)
    private String password;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UserRole role;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private SubscriptionTier subscriptionTier = SubscriptionTier.FREE;

    private LocalDateTime subscriptionExpiresAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private AuthProvider authProvider = AuthProvider.LOCAL;

    private String googleSub;

    private String avatarUrl;
    private String organization;
    private String phoneNumber;

    @Builder.Default
    private Integer xpPoints = 0;

    @Builder.Default
    private Integer level = 1;

    @Builder.Default
    private Integer streakDays = 1;

    @Builder.Default
    private Integer followersCount = 0;

    @Builder.Default
    private Integer followingCount = 0;

    @Builder.Default
    private String status = "ACTIVE"; // ACTIVE, SUSPENDED

    // Générations IA consommées sur le mois aiGenerationsPeriod (AAAA-MM) : quota mensuel du forfait
    @Builder.Default
    private Integer aiGenerationsCount = 0;

    private String aiGenerationsPeriod;

    @Builder.Default
    private boolean emailVerified = false;

    @JsonIgnore
    private String emailVerificationToken;

    // Réinitialisation de mot de passe
    @JsonIgnore
    private String passwordResetToken;
    @JsonIgnore
    private LocalDateTime passwordResetTokenExpiry;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    public String getName() {
        String full = (prenom != null ? prenom : "") + (nom != null ? " " + nom : "");
        return full.isBlank() ? email : full.trim();
    }

    public boolean isActive() {
        return "ACTIVE".equalsIgnoreCase(this.status);
    }

    public void setActive(boolean active) {
        this.status = active ? "ACTIVE" : "SUSPENDED";
    }
}
