package com.iahorizonplus.quizzboardbackend.service.impl;

import com.iahorizonplus.quizzboardbackend.entity.*;
import com.iahorizonplus.quizzboardbackend.exception.BadRequestException;
import com.iahorizonplus.quizzboardbackend.exception.ResourceNotFoundException;
import com.iahorizonplus.quizzboardbackend.repository.*;
import com.iahorizonplus.quizzboardbackend.service.CommunityService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class CommunityServiceImpl implements CommunityService {

    private final CommunityRepository communityRepository;
    private final CommunityMemberRepository memberRepository;
    private final ForumTopicRepository topicRepository;
    private final ForumCommentRepository commentRepository;
    private final MeetingRepository meetingRepository;
    private final ResourceFileRepository resourceRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public List<Community> getAllCommunities() {
        return communityRepository.findAll();
    }

    @Override
    @Transactional(readOnly = true)
    public Community getCommunityById(String id) {
        return communityRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Communauté non trouvée avec l'id: " + id));
    }

    @Override
    @Transactional
    public Community createCommunity(Community community, String creatorId, String creatorName) {
        if (community.getName() == null || community.getName().trim().isEmpty()) {
            throw new BadRequestException("name", "Le nom de la communauté est obligatoire.");
        }
        if (community.getCategory() == null || community.getCategory().trim().isEmpty()) {
            throw new BadRequestException("category", "La catégorie de la communauté est obligatoire.");
        }

        // === Enforcement des quotas par forfait ===
        User creator = userRepository.findById(creatorId)
                .orElseThrow(() -> new ResourceNotFoundException("Créateur non trouvé : " + creatorId));
        long existingCount = communityRepository.countByCreatorId(creatorId);

        if (creator.getSubscriptionTier() == SubscriptionTier.FREE && existingCount >= 1) {
            throw new BadRequestException("plan",
                    "Limite du forfait DÉCOUVERTE atteinte (1 communauté maximum). Passez au forfait STARTER pour en créer jusqu'à 10 !");
        } else if (creator.getSubscriptionTier() == SubscriptionTier.STARTER && existingCount >= 10) {
            throw new BadRequestException("plan",
                    "Limite du forfait STARTER atteinte (10 communautés maximum). Contactez-nous pour un accès PREMIUM.");
        }
        // === Fin des quotas ===

        community.setCreatorId(creatorId);
        community.setCreatorName(creatorName);

        if (community.getAccessCode() == null || community.getAccessCode().trim().isEmpty()) {
            community.setAccessCode("COMM-" + (100 + new SecureRandom().nextInt(900)));
        }

        Community saved = communityRepository.save(community);

        // Creator is automatically first member with CREATOR role
        CommunityMember member = CommunityMember.builder()
                .communityId(saved.getId())
                .userId(creatorId)
                .name(creatorName)
                .role("CREATOR")
                .build();
        memberRepository.save(member);

        return saved;
    }

    @Override
    @Transactional
    public Community joinCommunity(String accessCode, String userId, String userName) {
        if (accessCode == null || accessCode.trim().isEmpty()) {
            throw new BadRequestException("accessCode", "Le code d'accès à la communauté est obligatoire.");
        }
        Community community = communityRepository.findByAccessCode(accessCode.trim().toUpperCase())
                .orElseThrow(() -> new BadRequestException("accessCode", "Aucune communauté trouvée avec le code d'accès: " + accessCode));

        // Check if already a member
        if (memberRepository.findByCommunityIdAndUserId(community.getId(), userId).isEmpty()) {
            CommunityMember member = CommunityMember.builder()
                    .communityId(community.getId())
                    .userId(userId)
                    .name(userName)
                    .role("STUDENT")
                    .build();
            memberRepository.save(member);
        }

        return community;
    }

    @Override
    @Transactional
    public void leaveCommunity(String communityId, String userId) {
        memberRepository.findByCommunityIdAndUserId(communityId, userId)
                .ifPresent(memberRepository::delete);
    }

    @Override
    @Transactional
    public ForumTopic createTopic(String communityId, ForumTopic topic, String authorId, String authorName) {
        Community community = getCommunityById(communityId);
        topic.setCommunity(community);
        topic.setAuthorId(authorId);
        topic.setAuthorName(authorName);
        return topicRepository.save(topic);
    }

    @Override
    @Transactional
    public ForumComment addComment(String topicId, ForumComment comment, String authorId, String authorName) {
        ForumTopic topic = topicRepository.findById(topicId)
                .orElseThrow(() -> new ResourceNotFoundException("Topic non trouvé avec l'id: " + topicId));
        comment.setTopic(topic);
        comment.setAuthorId(authorId);
        comment.setAuthorName(authorName);
        return commentRepository.save(comment);
    }

    @Override
    @Transactional
    public Meeting scheduleMeeting(String communityId, Meeting meeting) {
        Community community = getCommunityById(communityId);
        meeting.setCommunity(community);
        return meetingRepository.save(meeting);
    }

    @Override
    @Transactional
    public ResourceFile addResource(String communityId, ResourceFile resource) {
        Community community = getCommunityById(communityId);
        resource.setCommunity(community);
        return resourceRepository.save(resource);
    }
}
