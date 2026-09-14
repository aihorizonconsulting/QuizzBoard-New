package com.iahorizonplus.quizzboardbackend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "community_members")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CommunityMember {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String communityId;

    @Column(nullable = false)
    private String userId;

    private String name;
    private String email;
    private String avatarUrl;

    @Builder.Default
    private String role = "STUDENT"; // CREATOR, STUDENT, MODERATOR

    @Builder.Default
    private int quizzesCompleted = 0;

    @Builder.Default
    private int totalXp = 0;

    @CreationTimestamp
    private LocalDateTime joinedAt;
}
