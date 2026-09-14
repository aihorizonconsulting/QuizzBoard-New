package com.iahorizonplus.quizzboardbackend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "invitations", indexes = {
    @Index(name = "idx_invitation_token", columnList = "token", unique = true),
    @Index(name = "idx_invitation_target_email", columnList = "targetEmail"),
    @Index(name = "idx_invitation_resource", columnList = "resourceId, type")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Invitation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false, unique = true, length = 64)
    private String token;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private InvitationType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private InvitationStatus status = InvitationStatus.PENDING;

    @Column(nullable = false)
    private String inviterId;

    @Column(nullable = false)
    private String inviterEmail;

    private String inviterName;

    @Column(nullable = false)
    private String targetEmail;

    @Column(nullable = false)
    private String resourceId;

    @Column(nullable = false)
    private String resourceName;

    @Builder.Default
    private String role = "STUDENT";

    @Column(length = 1000)
    private String message;

    @Column(nullable = false)
    private LocalDateTime expiresAt;

    private LocalDateTime acceptedAt;

    @CreationTimestamp
    private LocalDateTime createdAt;

    public boolean isExpired() {
        return LocalDateTime.now().isAfter(this.expiresAt);
    }

    public boolean isPending() {
        return this.status == InvitationStatus.PENDING && !isExpired();
    }
}
