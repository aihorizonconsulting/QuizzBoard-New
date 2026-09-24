package com.iahorizonplus.quizzboardbackend.dto.request;

public record JoinLiveSessionRequest(
        String nickname,
        String email,
        String matricule
) {}
