package com.iahorizonplus.quizzboardbackend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "audit_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String adminName;

    private String actorName;

    @Column(nullable = false)
    private String action;

    @Column(nullable = false)
    private String target;

    @Column(length = 1000)
    private String details;

    private String ipAddress;

    @Column(nullable = false)
    @Builder.Default
    private String severity = "INFO"; // INFO, WARNING, CRITICAL

    @CreationTimestamp
    private LocalDateTime timestamp;
}
