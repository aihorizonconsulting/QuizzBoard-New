package com.iahorizonplus.quizzboardbackend.exception;

/** Fonction réservée à un forfait payant (réponse 403 avec un message explicite pour l'utilisateur). */
public class PlanRequiredException extends RuntimeException {
    public PlanRequiredException(String message) {
        super(message);
    }
}
