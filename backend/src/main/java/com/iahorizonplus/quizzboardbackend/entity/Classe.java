package com.iahorizonplus.quizzboardbackend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "classes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Classe {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(nullable = false, length = 50)
    private String code;

    private String level; // ex: 'Licence 3', 'Master 2'

    @Column(length = 500)
    private String description;

    private String creatorId;
    private String creatorName;

    private String promotionId;
    private String promotionLabel;

    @Builder.Default
    private String color = "#0F172A";

    private String coverImage;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "class_assigned_quizzes", joinColumns = @JoinColumn(name = "class_id"))
    @Column(name = "quiz_id")
    @Builder.Default
    private List<String> assignedQuizIds = new ArrayList<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "class_assigned_courses", joinColumns = @JoinColumn(name = "class_id"))
    @Column(name = "course_id")
    @Builder.Default
    private List<String> assignedCourseIds = new ArrayList<>();

    @OneToMany(mappedBy = "classe", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<Student> students = new ArrayList<>();

    @CreationTimestamp
    private LocalDateTime createdAt;
}
