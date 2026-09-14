package com.iahorizonplus.quizzboardbackend.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "students")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Student {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String prenom;

    @Column(nullable = false)
    private String nom;

    @Column(nullable = false)
    private String email;

    private String matricule;
    private String avatarUrl;

    @Builder.Default
    private Double averageScorePercent = 0.0;

    @Builder.Default
    private Integer quizzesCompletedCount = 0;

    @Builder.Default
    private Integer coursesProgressPercent = 0;

    @Builder.Default
    private Integer coursesCompletedCount = 0;

    @Builder.Default
    private String status = "ACTIVE"; // ACTIVE, PENDING

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "class_id")
    @JsonIgnore
    private Classe classe;

    @CreationTimestamp
    private LocalDateTime joinedAt;
}
