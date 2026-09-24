package com.iahorizonplus.quizzboardbackend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "participations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Participation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String quizId;

    private String quizTitle;
    private String userId;

    private String classId;
    private String className;

    // Session Live d'origine : le résultat est alors envoyé par email par la session (rang dans le Live)
    private String liveSessionId;

    @Column(nullable = false)
    private String participantName;

    private String participantEmail;

    @Builder.Default
    private int score = 0;

    @Builder.Default
    private int maxScore = 100;

    @Builder.Default
    private double percentage = 0.0;

    @Builder.Default
    private int timeTotalSeconds = 0;

    @Builder.Default
    private String status = "COMPLETED"; // COMPLETED, IN_PROGRESS, ABANDONED

    @Builder.Default
    private boolean certificateEligible = false;

    private String certificateId;

    @OneToMany(mappedBy = "participation", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<ParticipantAnswer> answers = new ArrayList<>();

    @CreationTimestamp
    private LocalDateTime completedAt;
}
