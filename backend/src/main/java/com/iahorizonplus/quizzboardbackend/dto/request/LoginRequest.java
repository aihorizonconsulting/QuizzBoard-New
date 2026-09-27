package com.iahorizonplus.quizzboardbackend.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
    @Email(message = "L'adresse email doit être valide")
    @NotBlank(message = "L'email est obligatoire")
    String email,

    @NotBlank(message = "Le mot de passe est obligatoire")
    String password
) {}
