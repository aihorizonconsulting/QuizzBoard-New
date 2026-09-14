package com.iahorizonplus.quizzboardbackend.service;

import com.iahorizonplus.quizzboardbackend.dto.request.*;
import com.iahorizonplus.quizzboardbackend.dto.response.AuthResponse;
import com.iahorizonplus.quizzboardbackend.dto.response.MessageResponse;
import com.iahorizonplus.quizzboardbackend.dto.response.UserDto;

public interface AuthService {

    AuthResponse signup(SignupRequest request);

    AuthResponse login(LoginRequest request);

    AuthResponse loginWithGoogle(GoogleAuthRequest request);

    MessageResponse forgotPassword(ForgotPasswordRequest request);

    MessageResponse resetPassword(ResetPasswordRequest request);

    UserDto getCurrentUser(String email);

    AuthResponse refreshToken(String refreshToken);
}
