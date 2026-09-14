package com.iahorizonplus.quizzboardbackend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "quizzes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Quiz {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(length = 1000)
    private String description;

    @Column(nullable = false)
    private String category;

    @Column(nullable = false)
    @Builder.Default
    private String difficulty = "MEDIUM"; // EASY, MEDIUM, HARD

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private QuizStatus status = QuizStatus.PUBLISHED;

    @Column(nullable = false)
    private String creatorId;

    private String creatorName;
    private String creatorAvatar;
    private String coverImage;

    @Column(nullable = false, unique = true, length = 50)
    private String shareCode; // ex: "QZ-8821"

    @Column(length = 10)
    private String pin; // ex: "123456"

    @Builder.Default
    private String visibility = "PUBLIC"; // PUBLIC, PRIVATE

    private String promotionId;
    private String promotionLabel;
    private String communityId;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "quiz_assigned_classes", joinColumns = @JoinColumn(name = "quiz_id"))
    @Column(name = "class_id")
    @Builder.Default
    private List<String> assignedClassIds = new ArrayList<>();

    @Builder.Default
    private Integer participationsCount = 0;

    @Builder.Default
    private Double averageScorePercent = 0.0;

    @OneToMany(mappedBy = "quiz", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<Question> questions = new ArrayList<>();

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
