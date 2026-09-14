package com.iahorizonplus.quizzboardbackend.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record ForgotPasswordRequest(
    @Email(message = "L'adresse email doit être valide")
    @NotBlank(message = "L'email est obligatoire")
    String email
) {}
