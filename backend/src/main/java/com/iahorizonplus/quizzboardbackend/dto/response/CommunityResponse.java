package com.iahorizonplus.quizzboardbackend.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.iahorizonplus.quizzboardbackend.entity.ForumTopic;
import com.iahorizonplus.quizzboardbackend.entity.Meeting;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Communauté vue par l'utilisateur connecté : son rôle et ses droits, et (dans le détail seulement)
 * les membres, discussions, documents et réunions. Dans la liste, ces quatre listes valent null.
 */
public record CommunityResponse(
        String id,
        String name,
        String description,
        String category,
        /** null pour une communauté privée dont l'utilisateur n'est pas membre. */
        String accessCode,
        String creatorId,
        String creatorName,
        String coverImage,
        @JsonProperty("isPrivate") boolean isPrivate,
        boolean membersCanShare,
        int membersCount,
        int topicsCount,
        int resourcesCount,
        int meetingsCount,
        int quizzesCount,
        LocalDateTime createdAt,
        /** CREATOR, MODERATOR ou STUDENT ; null si l'utilisateur n'est pas membre. */
        String myRole,
        /** Animateur, modérateur ou administrateur : gère le contenu et les membres. */
        boolean canManage,
        /** Peut déposer des documents (animation, ou membres autorisés par l'animateur). */
        boolean canShare,
        List<String> sharedQuizIds,
        List<Member> members,
        List<ForumTopic> topics,
        List<Resource> resources,
        List<Meeting> meetings) {

    /** Email visible seulement par l'animation (et pour soi-même). Quiz et XP : sur les quiz partagés dans la communauté. */
    public record Member(String userId, String name, String email, String avatarUrl, String role,
                         LocalDateTime joinedAt, int quizzesCompleted, int totalXp) {}

    /** Document déposé (FILE, téléchargé via l'API) ou lien externe (LINK, fileUrl). */
    public record Resource(String id, String title, String description, String kind, String fileType, String fileSize,
                           String fileUrl, String originalFileName, String contentType, Long sizeBytes,
                           String uploadedById, String uploadedByName, LocalDateTime uploadedAt, int downloadCount) {}

    /** Sujet de forum pour la modération (administration). */
    public record ModeratedTopic(String id, String communityId, String communityName, String title, String content,
                                 String authorId, String authorName, int commentsCount,
                                 @JsonProperty("isPinned") boolean isPinned,
                                 @JsonProperty("isLocked") boolean isLocked,
                                 @JsonProperty("isReported") boolean isReported,
                                 LocalDateTime createdAt) {}
}
