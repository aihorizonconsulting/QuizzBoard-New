package com.iahorizonplus.quizzboardbackend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * Copie durable d'une session Live. Redis garde l'état "chaud" (avec expiration) ;
 * cette table permet de retrouver ses Lives et leurs résultats après déconnexion ou expiration.
 */
@Entity
@Table(name = "live_sessions", indexes = {
        @Index(name = "idx_live_sessions_host", columnList = "hostId"),
        @Index(name = "idx_live_sessions_pin", columnList = "pinCode")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LiveSessionRecord {

    // Même identifiant que la session Live ("live-<uuid>")
    @Id
    private String id;

    @Column(nullable = false)
    private String hostId;

    // PIN normalisé (sans espaces) pour la recherche
    @Column(nullable = false)
    private String pinCode;

    private String quizId;
    private String quizTitle;

    @Column(nullable = false)
    private String status;

    private int playersCount;

    // État complet de la session (joueurs, scores, horaires) sérialisé en JSON
    @Column(nullable = false, columnDefinition = "text")
    private String stateJson;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
