package com.iahorizonplus.quizzboardbackend.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "community_meetings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Meeting {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(length = 1000)
    private String description;

    @Column(nullable = false)
    private String meetingUrl;

    @Column(nullable = false)
    @Builder.Default
    private String platform = "GOOGLE_MEET"; // GOOGLE_MEET, ZOOM, JITSI, TEAMS

    private LocalDateTime scheduledAt;

    @Builder.Default
    private int durationMinutes = 60;

    private String hostName;

    @Builder.Default
    private boolean isLive = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "community_id")
    @JsonIgnore
    private Community community;

    @CreationTimestamp
    private LocalDateTime createdAt;
}
