package com.iahorizonplus.quizzboardbackend.dto.response;

public record AuthResponse(
    String token,
    String refreshToken,
    String tokenType,
    UserDto user
) {
    public AuthResponse(String token, String refreshToken, UserDto user) {
        this(token, refreshToken, "Bearer", user);
    }
}
