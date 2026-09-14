package com.iahorizonplus.quizzboardbackend.dto.response;

import com.iahorizonplus.quizzboardbackend.entity.AuthProvider;
import com.iahorizonplus.quizzboardbackend.entity.SubscriptionTier;
import com.iahorizonplus.quizzboardbackend.entity.UserRole;

import java.time.LocalDateTime;

public record UserDto(
    String id,
    String prenom,
    String nom,
    String email,
    UserRole role,
    SubscriptionTier subscriptionTier,
    AuthProvider authProvider,
    String avatarUrl,
    String organization,
    String phoneNumber,
    Integer xpPoints,
    Integer level,
    Integer streakDays,
    Integer followersCount,
    Integer followingCount,
    String status,
    boolean emailVerified,
    LocalDateTime createdAt
) {}
