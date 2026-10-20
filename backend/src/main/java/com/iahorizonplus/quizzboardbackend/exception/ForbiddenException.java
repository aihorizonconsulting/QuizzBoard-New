package com.iahorizonplus.quizzboardbackend.exception;

/** Action refusée pour cet utilisateur (réponse 403 avec un message explicite, ex. réservé à l'animateur). */
public class ForbiddenException extends RuntimeException {
    public ForbiddenException(String message) {
        super(message);
    }
}
