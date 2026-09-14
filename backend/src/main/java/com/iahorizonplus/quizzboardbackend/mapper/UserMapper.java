package com.iahorizonplus.quizzboardbackend.mapper;

import com.iahorizonplus.quizzboardbackend.dto.response.UserDto;
import com.iahorizonplus.quizzboardbackend.entity.User;
import org.springframework.stereotype.Component;

@Component
public class UserMapper {

    public UserDto toDto(User user) {
        if (user == null) {
            return null;
        }

        return new UserDto(
                user.getId(),
                user.getPrenom(),
                user.getNom(),
                user.getEmail(),
                user.getRole(),
                user.getSubscriptionTier(),
                user.getAuthProvider(),
                user.getAvatarUrl(),
                user.getOrganization(),
                user.getPhoneNumber(),
                user.getXpPoints(),
                user.getLevel(),
                user.getStreakDays(),
                user.getFollowersCount(),
                user.getFollowingCount(),
                user.getStatus(),
                user.isEmailVerified(),
                user.getCreatedAt()
        );
    }
}
