package com.iahorizonplus.quizzboardbackend.service;

import com.iahorizonplus.quizzboardbackend.entity.*;

import java.util.List;

public interface CommunityService {
    List<Community> getAllCommunities();
    Community getCommunityById(String id);
    Community createCommunity(Community community, String creatorId, String creatorName);
    Community joinCommunity(String accessCode, String userId, String userName);
    void leaveCommunity(String communityId, String userId);
    ForumTopic createTopic(String communityId, ForumTopic topic, String authorId, String authorName);
    ForumComment addComment(String topicId, ForumComment comment, String authorId, String authorName);
    Meeting scheduleMeeting(String communityId, Meeting meeting);
    ResourceFile addResource(String communityId, ResourceFile resource);
}
