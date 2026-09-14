package com.iahorizonplus.quizzboardbackend.dto.response;

public record MessageResponse(
    String message,
    boolean success
) {
    public MessageResponse(String message) {
        this(message, true);
    }
}
