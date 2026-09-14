package com.iahorizonplus.quizzboardbackend.dto.request;

import com.iahorizonplus.quizzboardbackend.entity.InvitationType;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record CreateInvitationRequest(
    @NotNull(message = "Le type d'invitation est obligatoire (CLASS, COMMUNITY, LIVE_QUIZ)")
    InvitationType type,

    @NotNull(message = "L'identifiant de la ressource est obligatoire")
    String resourceId,

    @NotEmpty(message = "Au moins une adresse email de destination est obligatoire")
    List<String> targetEmails,

    String role, // STUDENT, MEMBER, PARTICIPANT
    String message,
    Integer expiryDays // default 7
) {}
