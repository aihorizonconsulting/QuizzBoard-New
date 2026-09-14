package com.iahorizonplus.quizzboardbackend.dto.request;

import com.iahorizonplus.quizzboardbackend.entity.UserRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record SignupRequest(
    @NotBlank(message = "Le prénom est obligatoire")
    String prenom,

    @NotBlank(message = "Le nom est obligatoire")
    String nom,

    @Email(message = "L'adresse email doit être valide")
    @NotBlank(message = "L'email est obligatoire")
    String email,

    @NotBlank(message = "Le mot de passe est obligatoire")
    @Size(min = 6, message = "Le mot de passe doit comporter au moins 6 caractères")
    String password,

    @NotNull(message = "Le rôle est obligatoire (CREATOR ou LEARNER)")
    UserRole role
) {}
