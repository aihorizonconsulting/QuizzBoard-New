package com.iahorizonplus.quizzboardbackend.service.impl;

import com.iahorizonplus.quizzboardbackend.entity.UserRole;
import com.iahorizonplus.quizzboardbackend.exception.BadRequestException;

/**
 * Règle commune aux rôles choisis par l'utilisateur lui-même (inscription,
 * Google Sign-In, confirmation du rôle d'un compte importé).
 */
final class SelfAssignedRole {

    private SelfAssignedRole() {
    }

    /** Seuls CREATOR et LEARNER peuvent être choisis : ADMIN est réservé à l'administration. */
    static UserRole require(UserRole role) {
        if (role != UserRole.CREATOR && role != UserRole.LEARNER) {
            throw new BadRequestException("role", "Rôle invalide : choisissez Formateur (CREATOR) ou Apprenant (LEARNER).");
        }
        return role;
    }
}
