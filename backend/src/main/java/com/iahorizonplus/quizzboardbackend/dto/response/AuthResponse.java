package com.iahorizonplus.quizzboardbackend.dto.response;

public record AuthResponse(
    String token,
    String refreshToken,
    String tokenType,
    UserDto user,
    boolean requiresRoleSelection
) {
    public AuthResponse(String token, String refreshToken, UserDto user) {
        this(token, refreshToken, "Bearer", user, false);
    }

    public AuthResponse(String token, String refreshToken, String tokenType, UserDto user) {
        this(token, refreshToken, tokenType, user, false);
    }

    public static AuthResponse roleRequired(UserDto partialUser) {
        return new AuthResponse(null, null, "Bearer", partialUser, true);
    }
}
