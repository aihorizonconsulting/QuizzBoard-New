package com.iahorizonplus.quizzboardbackend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * Parcours de perfectionnement (remise à niveau) préparé pour un apprenant après un quiz réussi à moins
 * de 70 % : un mini-cours et un quiz d'entraînement générés par l'IA sur les notions manquées.
 * Un seul parcours par apprenant et par quiz (un nouvel échec met à jour le score et les notions).
 */
@Entity
@Table(name = "remedial_packs", indexes = {
        @Index(name = "idx_remedial_user", columnList = "userId"),
        @Index(name = "idx_remedial_user_quiz", columnList = "userId, quizId")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RemedialPack {

    public static final String PENDING = "PENDING";
    public static final String GENERATING = "GENERATING";
    public static final String READY = "READY";
    public static final String FAILED = "FAILED";

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String userId;

    @Column(nullable = false)
    private String quizId;

    private String quizTitle;

    /** Dernière participation ratée à l'origine du parcours. */
    private String participationId;

    private double scorePercent;

    /** Questions manquées et leur bonne réponse (tableau JSON de textes). */
    @Column(columnDefinition = "TEXT")
    private String missedNotions;

    private int missedCount;

    @Builder.Default
    private String status = PENDING;

    /** Contenu généré : {"chapters": [...], "questions": [...]} (JSON). */
    @Column(columnDefinition = "TEXT")
    private String content;

    private String failureReason;

    /** Meilleur score obtenu au quiz d'entraînement (null tant qu'il n'a pas été fait). */
    private Double bestPracticeScore;

    private int practiceAttempts;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    private LocalDateTime readyAt;
}
