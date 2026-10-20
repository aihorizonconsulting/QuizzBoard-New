package com.iahorizonplus.quizzboardbackend.service.impl;

import com.iahorizonplus.quizzboardbackend.entity.Community;
import com.iahorizonplus.quizzboardbackend.entity.CommunityMember;
import com.iahorizonplus.quizzboardbackend.entity.UserRole;
import com.iahorizonplus.quizzboardbackend.exception.ForbiddenException;
import com.iahorizonplus.quizzboardbackend.exception.ResourceNotFoundException;
import com.iahorizonplus.quizzboardbackend.exception.UnauthorizedException;
import com.iahorizonplus.quizzboardbackend.repository.CommunityMemberRepository;
import com.iahorizonplus.quizzboardbackend.repository.CommunityRepository;
import com.iahorizonplus.quizzboardbackend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Droits dans une communauté : le créateur (CREATOR) et les modérateurs (MODERATOR) animent,
 * les membres (STUDENT) participent ; un administrateur de la plateforme peut tout modérer.
 */
@Component
@RequiredArgsConstructor
public class CommunityAccess {

    public static final String ROLE_CREATOR = "CREATOR";
    public static final String ROLE_MODERATOR = "MODERATOR";
    public static final String ROLE_STUDENT = "STUDENT";
    /** Rôle effectif d'un administrateur de la plateforme non membre. */
    public static final String ROLE_ADMIN = "ADMIN";

    private final CommunityRepository communityRepository;
    private final CommunityMemberRepository memberRepository;
    private final UserRepository userRepository;

    public Community community(String id) {
        return communityRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Communauté introuvable."));
    }

    public boolean isAdmin(String userId) {
        return userId != null && userRepository.findById(userId).map(u -> u.getRole() == UserRole.ADMIN).orElse(false);
    }

    /** CREATOR, MODERATOR, STUDENT ; ADMIN pour un administrateur non membre ; null sinon. */
    public String roleOf(Community community, String userId) {
        if (userId == null) return null;
        if (userId.equals(community.getCreatorId())) return ROLE_CREATOR;
        String role = memberRepository.findByCommunityIdAndUserId(community.getId(), userId)
                .map(CommunityMember::getRole).orElse(null);
        if (role != null) return role;
        return isAdmin(userId) ? ROLE_ADMIN : null;
    }

    public static boolean isManagerRole(String role) {
        return ROLE_CREATOR.equals(role) || ROLE_MODERATOR.equals(role) || ROLE_ADMIN.equals(role);
    }

    public String requireMember(Community community, String userId) {
        requireUser(userId);
        String role = roleOf(community, userId);
        if (role == null) {
            throw new ForbiddenException("Rejoignez cette communauté pour accéder à son contenu.");
        }
        return role;
    }

    public String requireManager(Community community, String userId) {
        String role = requireMember(community, userId);
        if (!isManagerRole(role)) {
            throw new ForbiddenException("Réservé à l'animateur et aux modérateurs de la communauté.");
        }
        return role;
    }

    public void requireOwner(Community community, String userId) {
        String role = requireMember(community, userId);
        if (!ROLE_CREATOR.equals(role) && !ROLE_ADMIN.equals(role)) {
            throw new ForbiddenException("Réservé au créateur de la communauté.");
        }
    }

    /** Déposer un document : l'animation, ou tout membre si le créateur l'a autorisé. */
    public String requireSharer(Community community, String userId) {
        String role = requireMember(community, userId);
        if (!isManagerRole(role) && !community.isMembersCanShare()) {
            throw new ForbiddenException("Seuls l'animateur et les modérateurs peuvent partager des documents dans cette communauté.");
        }
        return role;
    }

    private static void requireUser(String userId) {
        if (userId == null) {
            throw new UnauthorizedException("Connectez-vous pour accéder aux communautés.");
        }
    }
}
