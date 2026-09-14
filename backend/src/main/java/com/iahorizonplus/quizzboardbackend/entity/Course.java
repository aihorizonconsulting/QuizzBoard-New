package com.iahorizonplus.quizzboardbackend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "courses")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Course {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false, length = 250)
    private String title;

    @Column(length = 1000)
    private String description;

    @Column(nullable = false)
    private String category;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private CourseLevel level = CourseLevel.INTERMEDIATE;

    private String coverImage;

    @Column(nullable = false)
    private String creatorId;

    private String creatorName;

    @Builder.Default
    private int estimatedHours = 5;

    @Builder.Default
    private String status = "PUBLISHED"; // DRAFT, PUBLISHED

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "course_assigned_classes", joinColumns = @JoinColumn(name = "course_id"))
    @Column(name = "class_id")
    @Builder.Default
    private List<String> assignedClassIds = new ArrayList<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "course_assigned_class_names", joinColumns = @JoinColumn(name = "course_id"))
    @Column(name = "class_name")
    @Builder.Default
    private List<String> assignedClassNames = new ArrayList<>();

    @Builder.Default
    private boolean hasChapterQuizzes = true;

    @Builder.Default
    private boolean hasFinalQuiz = true;

    private String finalQuizTitle;
    private Integer finalQuizQuestionsCount;

    // Configuration des certificats
    @Builder.Default
    private boolean hasCertificate = true;

    @Builder.Default
    private String certificateTemplateType = "DEFAULT"; // DEFAULT, CUSTOM

    private String certificateCustomTemplateUrl;

    @Builder.Default
    private Integer certificateMinimumScore = 80;

    @OneToMany(mappedBy = "course", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<CourseChapter> chapters = new ArrayList<>();

    @CreationTimestamp
    private LocalDateTime createdAt;
}
