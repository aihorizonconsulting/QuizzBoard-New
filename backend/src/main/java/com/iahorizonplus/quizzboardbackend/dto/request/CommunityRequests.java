package com.iahorizonplus.quizzboardbackend.dto.request;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.LocalDateTime;

/** Corps des requêtes de gestion d'une communauté. */
public final class CommunityRequests {

    private CommunityRequests() {
    }

    /** Paramètres modifiables par le créateur (champ null = inchangé). */
    public record Settings(String name, String description, String category,
                           @JsonProperty("isPrivate") Boolean isPrivate, Boolean membersCanShare, String coverImage) {}

    /** Réunion en visio ; lien vide avec JITSI = salle générée automatiquement. */
    public record MeetingForm(String title, String description, String meetingUrl, String platform,
                              LocalDateTime scheduledAt, Integer durationMinutes, Boolean notifyMembers) {}

    public record LinkResource(String title, String url, String description) {}

    /** MODERATOR ou STUDENT. */
    public record MemberRole(String role) {}

    /** Épingler, verrouiller ou retirer le signalement d'un sujet (champ null = inchangé). */
    public record TopicModeration(@JsonProperty("isPinned") Boolean isPinned,
                                  @JsonProperty("isLocked") Boolean isLocked,
                                  @JsonProperty("isReported") Boolean isReported) {}

    public record ShareQuiz(String quizId) {}
}
