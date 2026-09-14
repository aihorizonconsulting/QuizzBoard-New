package com.iahorizonplus.quizzboardbackend.exception;

import lombok.Getter;

@Getter
public class BadRequestException extends RuntimeException {
    private final String field;

    public BadRequestException(String message) {
        super(message);
        this.field = null;
    }

    public BadRequestException(String field, String message) {
        super(message);
        this.field = field;
    }
}

