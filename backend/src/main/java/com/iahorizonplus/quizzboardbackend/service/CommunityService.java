package com.iahorizonplus.quizzboardbackend.service;

import com.iahorizonplus.quizzboardbackend.dto.request.CommunityRequests;
import com.iahorizonplus.quizzboardbackend.dto.response.CommunityResponse;
import com.iahorizonplus.quizzboardbackend.entity.*;

import java.util.List;

public interface CommunityService {
    /** Communautés dont l'utilisateur est membre et communautés publiques (toutes pour un administrateur). */
    List<CommunityResponse> getVisibleCommunities(String userId);
    /** Contenu complet, réservé aux membres. */
    CommunityResponse getCommunityDetail(String id, String userId);
    Community createCommunity(Community community, String creatorId, String creatorName);
    Community joinCommunity(String accessCode, String userId, String userName);
    void leaveCommunity(String communityId, String userId);

    CommunityResponse updateSettings(String communityId, CommunityRequests.Settings settings, String userId);
    String regenerateAccessCode(String communityId, String userId);
    void deleteCommunity(String communityId, String userId);

    void updateMemberRole(String communityId, String memberUserId, String role, String userId);
    void removeMember(String communityId, String memberUserId, String userId);

    ForumTopic createTopic(String communityId, ForumTopic topic, String authorId, String authorName);
    ForumComment addComment(String topicId, ForumComment comment, String authorId, String authorName);
    ForumTopic moderateTopic(String communityId, String topicId, CommunityRequests.TopicModeration moderation, String userId);
    void deleteTopic(String communityId, String topicId, String userId);
    void reportTopic(String topicId, String userId);
    void deleteComment(String topicId, String commentId, String userId);
    List<CommunityResponse.ModeratedTopic> getTopicsForModeration(String userId);
}
