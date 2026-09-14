package com.iahorizonplus.quizzboardbackend.dto.response;

import com.iahorizonplus.quizzboardbackend.entity.InvitationStatus;
import com.iahorizonplus.quizzboardbackend.entity.InvitationType;

import java.time.LocalDateTime;

public record InvitationResponse(
    String id,
    String token,
    InvitationType type,
    InvitationStatus status,
    String resourceId,
    String resourceName,
    String targetEmail,
    String inviterName,
    String inviterEmail,
    String role,
    String message,
    String inviteUrl,
    LocalDateTime expiresAt,
    LocalDateTime createdAt
) {}
