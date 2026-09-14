package com.iahorizonplus.quizzboardbackend.dto.request;

import com.iahorizonplus.quizzboardbackend.entity.UserRole;
import jakarta.validation.constraints.NotBlank;

public record GoogleAuthRequest(
    @NotBlank(message = "Le token Google ID est obligatoire")
    String idToken,

    UserRole role
) {}
