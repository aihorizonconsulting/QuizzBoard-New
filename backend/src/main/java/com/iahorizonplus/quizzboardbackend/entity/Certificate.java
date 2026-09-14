package com.iahorizonplus.quizzboardbackend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "certificates")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Certificate {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String participationId;

    @Column(nullable = false)
    private String quizTitle;

    @Column(nullable = false)
    private String recipientName;

    @Column(nullable = false)
    private double scorePercent;

    @Column(nullable = false)
    private String issuerName; // ex: "QuizzBoard Academy"

    @Column(nullable = false, unique = true, length = 100)
    private String verificationCode; // ex: "QZ-4891-95"

    @Builder.Default
    private String status = "VALID"; // VALID, REVOKED

    @CreationTimestamp
    private LocalDateTime issuedAt;
}
