package com.iahorizonplus.quizzboardbackend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "communities")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Community {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(length = 1000)
    private String description;

    private String category;

    @Column(nullable = false, unique = true, length = 50)
    private String accessCode; // ex: "COMM-882"

    @Column(nullable = false)
    private String creatorId;

    private String creatorName;
    private String coverImage;

    @Builder.Default
    private boolean isPrivate = true;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "community_shared_quizzes", joinColumns = @JoinColumn(name = "community_id"))
    @Column(name = "quiz_id")
    @Builder.Default
    private List<String> sharedQuizIds = new ArrayList<>();

    @OneToMany(mappedBy = "community", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<ForumTopic> topics = new ArrayList<>();

    @OneToMany(mappedBy = "community", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<ResourceFile> resources = new ArrayList<>();

    @OneToMany(mappedBy = "community", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<Meeting> meetings = new ArrayList<>();

    @CreationTimestamp
    private LocalDateTime createdAt;
}
