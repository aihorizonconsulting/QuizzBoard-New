package com.iahorizonplus.quizzboardbackend.dto.response;

import com.iahorizonplus.quizzboardbackend.entity.InvitationType;

public record AcceptInvitationResponse(
    String invitationId,
    InvitationType resourceType,
    String resourceId,
    String resourceName,
    String redirectUrl,
    String message
) {}
