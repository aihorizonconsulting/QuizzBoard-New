package com.iahorizonplus.quizzboardbackend.entity;

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

    @Column(nullable = true)
    private String password;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UserRole role;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private SubscriptionTier subscriptionTier = SubscriptionTier.FREE;

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

    @Builder.Default
    private boolean emailVerified = false;

    private String emailVerificationToken;

    // Réinitialisation de mot de passe
    private String passwordResetToken;
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
