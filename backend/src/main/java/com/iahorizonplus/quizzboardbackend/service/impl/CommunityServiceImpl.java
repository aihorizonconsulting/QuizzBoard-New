package com.iahorizonplus.quizzboardbackend.service.impl;

import com.iahorizonplus.quizzboardbackend.dto.request.CommunityRequests;
import com.iahorizonplus.quizzboardbackend.dto.response.CommunityResponse;
import com.iahorizonplus.quizzboardbackend.entity.*;
import com.iahorizonplus.quizzboardbackend.exception.BadRequestException;
import com.iahorizonplus.quizzboardbackend.exception.ForbiddenException;
import com.iahorizonplus.quizzboardbackend.exception.ResourceNotFoundException;
import com.iahorizonplus.quizzboardbackend.repository.*;
import com.iahorizonplus.quizzboardbackend.service.CommunityService;
import com.iahorizonplus.quizzboardbackend.service.FileStorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.security.SecureRandom;
import java.text.Normalizer;
import java.util.*;
import java.util.stream.Collectors;

import static com.iahorizonplus.quizzboardbackend.service.impl.CommunityAccess.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class CommunityServiceImpl implements CommunityService {

    private static final String CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    private static final SecureRandom RANDOM = new SecureRandom();

    private final CommunityRepository communityRepository;
    private final CommunityMemberRepository memberRepository;
    private final ForumTopicRepository topicRepository;
    private final ForumCommentRepository commentRepository;
    private final UserRepository userRepository;
    private final ParticipationRepository participationRepository;
    private final FileStorageService fileStorageService;
    private final CommunityAccess access;

    // ------------------------------------------------------------------ Consultation

    @Override
    @Transactional(readOnly = true)
    public List<CommunityResponse> getVisibleCommunities(String userId) {
        boolean admin = access.isAdmin(userId);
        Map<String, String> myRoles = userId == null ? Map.of() : memberRepository.findByUserId(userId).stream()
                .collect(Collectors.toMap(CommunityMember::getCommunityId, CommunityMember::getRole, (a, b) -> a));
        List<CommunityResponse> visible = new ArrayList<>();
        communityRepository.findAll().stream()
                .sorted(Comparator.comparing(Community::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .forEach(c -> {
                    String role = userId != null && userId.equals(c.getCreatorId()) ? ROLE_CREATOR : myRoles.get(c.getId());
                    if (role == null && admin) role = ROLE_ADMIN;
                    if (role != null || !c.isPrivate()) {
                        visible.add(toResponse(c, role, userId, false));
                    }
                });
        return visible;
    }

    @Override
    @Transactional(readOnly = true)
    public CommunityResponse getCommunityDetail(String id, String userId) {
        Community community = access.community(id);
        return toResponse(community, access.requireMember(community, userId), userId, true);
    }

    // ------------------------------------------------------------------ Création, adhésion

    @Override
    @Transactional
    public Community createCommunity(Community community, String creatorId, String creatorName) {
        // id temporaire éventuel envoyé par le frontend : l'id est toujours généré par la base
        community.setId(null);
        validateName(community.getName());
        validateDescription(community.getDescription());
        if (community.getCategory() == null || community.getCategory().trim().isEmpty()) {
            throw new BadRequestException("category", "La catégorie de la communauté est obligatoire.");
        }

        // === Enforcement des quotas par forfait ===
        User creator = userRepository.findById(creatorId)
                .orElseThrow(() -> new ResourceNotFoundException("Créateur non trouvé : " + creatorId));
        long existingCount = communityRepository.countCreatedOnPlatformByCreatorId(creatorId);

        if (creator.getSubscriptionTier() == SubscriptionTier.FREE && existingCount >= 1) {
            throw new BadRequestException("plan", creator.getRole() == UserRole.LEARNER
                    ? "Limite du forfait gratuit atteinte (1 communauté). Passez à l'abonnement Apprenant Plus pour créer autant de communautés que vous voulez."
                    : "Limite du forfait DÉCOUVERTE atteinte (1 communauté maximum). Passez au forfait STARTER pour en créer jusqu'à 10 !");
        } else if (creator.getSubscriptionTier() == SubscriptionTier.STARTER && existingCount >= 10) {
            throw new BadRequestException("plan",
                    "Limite du forfait STARTER atteinte (10 communautés maximum). Contactez-nous pour un accès PREMIUM.");
        }
        // === Fin des quotas ===

        community.setName(community.getName().trim());
        community.setCreatorId(creatorId);
        community.setCreatorName(creatorName);
        community.setAccessCode(newAccessCode(community.getName()));
        community.setSharedQuizIds(new ArrayList<>());

        Community saved = communityRepository.save(community);

        // Le créateur est le premier membre, avec le rôle d'animateur
        memberRepository.save(CommunityMember.builder()
                .communityId(saved.getId())
                .userId(creatorId)
                .name(creatorName)
                .email(creator.getEmail())
                .avatarUrl(creator.getAvatarUrl())
                .role(ROLE_CREATOR)
                .build());

        return saved;
    }

    @Override
    @Transactional
    public Community joinCommunity(String accessCode, String userId, String userName) {
        if (accessCode == null || accessCode.trim().isEmpty()) {
            throw new BadRequestException("accessCode", "Le code d'accès à la communauté est obligatoire.");
        }
        Community community = communityRepository.findByAccessCode(accessCode.trim().toUpperCase())
                .or(() -> communityRepository.findByAccessCode(accessCode.trim()))
                .orElseThrow(() -> new BadRequestException("accessCode", "Aucune communauté trouvée avec le code d'accès : " + accessCode.trim()));

        if (!userId.equals(community.getCreatorId())
                && memberRepository.findByCommunityIdAndUserId(community.getId(), userId).isEmpty()) {
            User user = userRepository.findById(userId).orElse(null);
            memberRepository.save(CommunityMember.builder()
                    .communityId(community.getId())
                    .userId(userId)
                    .name(userName)
                    .email(user != null ? user.getEmail() : null)
                    .avatarUrl(user != null ? user.getAvatarUrl() : null)
                    .role(ROLE_STUDENT)
                    .build());
        }
        return community;
    }

    @Override
    @Transactional
    public void leaveCommunity(String communityId, String userId) {
        Community community = access.community(communityId);
        if (userId != null && userId.equals(community.getCreatorId())) {
            throw new BadRequestException("Vous avez créé cette communauté : vous ne pouvez pas la quitter. Supprimez-la depuis l'onglet Paramètres si elle n'est plus utile.");
        }
        memberRepository.findByCommunityIdAndUserId(communityId, userId).ifPresent(memberRepository::delete);
    }

    // ------------------------------------------------------------------ Paramètres (créateur)

    @Override
    @Transactional
    public CommunityResponse updateSettings(String communityId, CommunityRequests.Settings settings, String userId) {
        Community community = access.community(communityId);
        access.requireOwner(community, userId);
        if (settings.name() != null) {
            validateName(settings.name());
            community.setName(settings.name().trim());
        }
        if (settings.description() != null) {
            validateDescription(settings.description());
            community.setDescription(settings.description().trim());
        }
        if (settings.category() != null) {
            if (settings.category().isBlank()) {
                throw new BadRequestException("category", "La catégorie de la communauté est obligatoire.");
            }
            community.setCategory(settings.category().trim());
        }
        if (settings.isPrivate() != null) community.setPrivate(settings.isPrivate());
        if (settings.membersCanShare() != null) community.setMembersCanShare(settings.membersCanShare());
        if (settings.coverImage() != null) {
            String cover = settings.coverImage().trim();
            if (!cover.isEmpty() && !cover.startsWith("https://") && !cover.startsWith("http://")) {
                throw new BadRequestException("coverImage", "L'image de couverture doit être une adresse web (https://...).");
            }
            community.setCoverImage(cover.isEmpty() ? null : cover);
        }
        Community saved = communityRepository.save(community);
        return toResponse(saved, access.roleOf(saved, userId), userId, true);
    }

    @Override
    @Transactional
    public String regenerateAccessCode(String communityId, String userId) {
        Community community = access.community(communityId);
        access.requireOwner(community, userId);
        community.setAccessCode(newAccessCode(community.getName()));
        return communityRepository.save(community).getAccessCode();
    }

    @Override
    @Transactional
    public void deleteCommunity(String communityId, String userId) {
        Community community = access.community(communityId);
        access.requireOwner(community, userId);
        List<String> storedFiles = community.getResources().stream()
                .map(ResourceFile::getStoredFileName).filter(Objects::nonNull).toList();
        memberRepository.deleteByCommunityId(communityId);
        communityRepository.delete(community);
        afterCommit(() -> storedFiles.forEach(fileStorageService::deleteDocument));
        log.info("Communauté {} ({}) supprimée par {}", community.getName(), communityId, userId);
    }

    // ------------------------------------------------------------------ Membres

    @Override
    @Transactional
    public void updateMemberRole(String communityId, String memberUserId, String role, String userId) {
        Community community = access.community(communityId);
        access.requireOwner(community, userId);
        if (!ROLE_MODERATOR.equals(role) && !ROLE_STUDENT.equals(role)) {
            throw new BadRequestException("role", "Rôle inconnu : choisissez Modérateur ou Membre.");
        }
        if (memberUserId.equals(community.getCreatorId())) {
            throw new BadRequestException("role", "Le rôle du créateur de la communauté ne peut pas être modifié.");
        }
        CommunityMember member = memberRepository.findByCommunityIdAndUserId(communityId, memberUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Ce membre ne fait plus partie de la communauté."));
        member.setRole(role);
        memberRepository.save(member);
    }

    @Override
    @Transactional
    public void removeMember(String communityId, String memberUserId, String userId) {
        Community community = access.community(communityId);
        String actorRole = access.requireManager(community, userId);
        if (memberUserId.equals(community.getCreatorId())) {
            throw new BadRequestException("Le créateur de la communauté ne peut pas en être retiré.");
        }
        if (memberUserId.equals(userId)) {
            throw new BadRequestException("Pour quitter la communauté, utilisez le bouton « Quitter ».");
        }
        CommunityMember member = memberRepository.findByCommunityIdAndUserId(communityId, memberUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Ce membre ne fait plus partie de la communauté."));
        if (ROLE_MODERATOR.equals(actorRole) && !ROLE_STUDENT.equals(member.getRole())) {
            throw new ForbiddenException("Un modérateur ne peut retirer que des membres.");
        }
        memberRepository.delete(member);
    }

    // ------------------------------------------------------------------ Forum

    @Override
    @Transactional
    public ForumTopic createTopic(String communityId, ForumTopic topic, String authorId, String authorName) {
        Community community = access.community(communityId);
        access.requireMember(community, authorId);
        if (topic.getTitle() == null || topic.getTitle().isBlank()) {
            throw new BadRequestException("title", "Le titre du sujet est obligatoire.");
        }
        if (topic.getTitle().trim().length() > 300) {
            throw new BadRequestException("title", "Le titre est trop long (300 caractères maximum).");
        }
        if (topic.getContent() == null || topic.getContent().isBlank()) {
            throw new BadRequestException("content", "Le message du sujet est obligatoire.");
        }
        topic.setId(null);
        topic.setTitle(topic.getTitle().trim());
        topic.setContent(topic.getContent().trim());
        topic.setPinned(false);
        topic.setLocked(false);
        topic.setReported(false);
        topic.setComments(new ArrayList<>());
        topic.setCommunity(community);
        topic.setAuthorId(authorId);
        topic.setAuthorName(authorName);
        return topicRepository.save(topic);
    }

    @Override
    @Transactional
    public ForumComment addComment(String topicId, ForumComment comment, String authorId, String authorName) {
        ForumTopic topic = topic(topicId);
        access.requireMember(topic.getCommunity(), authorId);
        if (topic.isLocked()) {
            throw new BadRequestException("content", "Ce sujet est verrouillé : il n'accepte plus de réponses.");
        }
        if (comment.getContent() == null || comment.getContent().isBlank()) {
            throw new BadRequestException("content", "Écrivez votre réponse avant de l'envoyer.");
        }
        comment.setId(null);
        comment.setContent(comment.getContent().trim());
        comment.setTopic(topic);
        comment.setAuthorId(authorId);
        comment.setAuthorName(authorName);
        return commentRepository.save(comment);
    }

    @Override
    @Transactional
    public ForumTopic moderateTopic(String communityId, String topicId, CommunityRequests.TopicModeration moderation, String userId) {
        Community community = access.community(communityId);
        access.requireManager(community, userId);
        ForumTopic topic = topicOf(community, topicId);
        if (moderation.isPinned() != null) topic.setPinned(moderation.isPinned());
        if (moderation.isLocked() != null) topic.setLocked(moderation.isLocked());
        if (moderation.isReported() != null) topic.setReported(moderation.isReported());
        return topicRepository.save(topic);
    }

    @Override
    @Transactional
    public void deleteTopic(String communityId, String topicId, String userId) {
        Community community = access.community(communityId);
        String role = access.requireMember(community, userId);
        ForumTopic topic = topicOf(community, topicId);
        if (!isManagerRole(role) && !topic.getAuthorId().equals(userId)) {
            throw new ForbiddenException("Vous ne pouvez supprimer que vos propres sujets.");
        }
        community.getTopics().remove(topic);
        topicRepository.delete(topic);
    }

    @Override
    @Transactional
    public void reportTopic(String topicId, String userId) {
        ForumTopic topic = topic(topicId);
        access.requireMember(topic.getCommunity(), userId);
        topic.setReported(true);
        topicRepository.save(topic);
    }

    @Override
    @Transactional
    public void deleteComment(String topicId, String commentId, String userId) {
        ForumTopic topic = topic(topicId);
        String role = access.requireMember(topic.getCommunity(), userId);
        ForumComment comment = commentRepository.findById(commentId)
                .filter(c -> c.getTopic() != null && topicId.equals(c.getTopic().getId()))
                .orElseThrow(() -> new ResourceNotFoundException("Cette réponse n'existe plus."));
        if (!isManagerRole(role) && !comment.getAuthorId().equals(userId)) {
            throw new ForbiddenException("Vous ne pouvez supprimer que vos propres réponses.");
        }
        topic.getComments().remove(comment);
        commentRepository.delete(comment);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CommunityResponse.ModeratedTopic> getTopicsForModeration(String userId) {
        if (!access.isAdmin(userId)) {
            throw new ForbiddenException("Réservé aux administrateurs de la plateforme.");
        }
        return topicRepository.findAll().stream()
                .sorted(Comparator.comparing(ForumTopic::isReported).reversed()
                        .thenComparing(ForumTopic::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(t -> new CommunityResponse.ModeratedTopic(t.getId(),
                        t.getCommunity() != null ? t.getCommunity().getId() : null,
                        t.getCommunity() != null ? t.getCommunity().getName() : "—",
                        t.getTitle(), t.getContent(), t.getAuthorId(), t.getAuthorName(), t.getCommentsCount(),
                        t.isPinned(), t.isLocked(), t.isReported(), t.getCreatedAt()))
                .toList();
    }

    // ------------------------------------------------------------------ Outils

    private ForumTopic topic(String topicId) {
        return topicRepository.findById(topicId)
                .orElseThrow(() -> new ResourceNotFoundException("Ce sujet n'existe plus."));
    }

    private ForumTopic topicOf(Community community, String topicId) {
        ForumTopic topic = topic(topicId);
        if (topic.getCommunity() == null || !community.getId().equals(topic.getCommunity().getId())) {
            throw new ResourceNotFoundException("Ce sujet n'existe plus.");
        }
        return topic;
    }

    private static void validateName(String name) {
        if (name == null || name.trim().isEmpty()) {
            throw new BadRequestException("name", "Le nom de la communauté est obligatoire.");
        }
        if (name.trim().length() > 150) {
            throw new BadRequestException("name", "Le nom est trop long (150 caractères maximum).");
        }
    }

    private static void validateDescription(String description) {
        if (description != null && description.trim().length() > 1000) {
            throw new BadRequestException("description", "La description est trop longue (1000 caractères maximum).");
        }
    }

    /** Code lisible et unique : 4 lettres du nom + 4 caractères sans ambiguïté (ex. DATA-7K3Q). */
    private String newAccessCode(String name) {
        String letters = Normalizer.normalize(name == null ? "" : name, Normalizer.Form.NFD)
                .replaceAll("[^A-Za-z]", "").toUpperCase();
        String prefix = letters.isEmpty() ? "COMM" : letters.substring(0, Math.min(4, letters.length()));
        for (int attempt = 0; attempt < 20; attempt++) {
            StringBuilder code = new StringBuilder(prefix).append('-');
            for (int i = 0; i < 4; i++) code.append(CODE_ALPHABET.charAt(RANDOM.nextInt(CODE_ALPHABET.length())));
            if (!communityRepository.existsByAccessCode(code.toString())) return code.toString();
        }
        return prefix + "-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }

    private CommunityResponse toResponse(Community c, String role, String viewerId, boolean detail) {
        boolean member = role != null;
        boolean canManage = isManagerRole(role);
        boolean canShare = canManage || (member && c.isMembersCanShare());
        return new CommunityResponse(c.getId(), c.getName(), c.getDescription(), c.getCategory(),
                member || !c.isPrivate() ? c.getAccessCode() : null,
                c.getCreatorId(), c.getCreatorName(), c.getCoverImage(), c.isPrivate(), c.isMembersCanShare(),
                c.getMembersCount(), c.getTopicsCount(), c.getResourcesCount(), c.getMeetingsCount(), c.getQuizzesCount(),
                c.getCreatedAt(), role, canManage, canShare, new ArrayList<>(c.getSharedQuizIds()),
                detail ? members(c, canManage, viewerId) : null,
                detail ? c.getTopics().stream().sorted(Comparator.comparing(ForumTopic::isPinned).reversed()).toList() : null,
                detail ? c.getResources().stream().map(CommunityServiceImpl::toResource).toList() : null,
                detail ? new ArrayList<>(c.getMeetings()) : null);
    }

    public static CommunityResponse.Resource toResource(ResourceFile r) {
        boolean link = r.isLink() || (r.getKind() == null && r.getStoredFileName() == null
                && r.getFileUrl() != null && r.getFileUrl().startsWith("http"));
        return new CommunityResponse.Resource(r.getId(), r.getTitle(), r.getDescription(),
                link ? ResourceFile.KIND_LINK : ResourceFile.KIND_FILE, r.getFileType(), r.getFileSize(),
                link ? r.getFileUrl() : null, r.getOriginalFileName(), r.getContentType(), r.getSizeBytes(),
                r.getUploadedById(), r.getUploadedByName(), r.getUploadedAt(), r.getDownloadCount());
    }

    /** Animation d'abord, puis par date d'arrivée ; quiz terminés et XP sur les quiz partagés dans la communauté. */
    private List<CommunityResponse.Member> members(Community c, boolean canManage, String viewerId) {
        List<CommunityMember> rows = memberRepository.findByCommunityId(c.getId());
        Map<String, User> users = userRepository.findAllById(rows.stream().map(CommunityMember::getUserId).toList())
                .stream().collect(Collectors.toMap(User::getId, u -> u, (a, b) -> a));
        Map<String, Set<String>> completed = new HashMap<>();
        Map<String, Integer> xp = new HashMap<>();
        if (!c.getSharedQuizIds().isEmpty()) {
            for (Participation p : participationRepository.findByQuizIdIn(new ArrayList<>(c.getSharedQuizIds()))) {
                if (p.getUserId() == null || !"COMPLETED".equals(p.getStatus())) continue;
                completed.computeIfAbsent(p.getUserId(), k -> new HashSet<>()).add(p.getQuizId());
                xp.merge(p.getUserId(), p.getScore() + 50, Integer::sum);
            }
        }
        return rows.stream()
                .sorted(Comparator.comparingInt((CommunityMember m) -> roleRank(m.getRole()))
                        .thenComparing(CommunityMember::getJoinedAt, Comparator.nullsLast(Comparator.naturalOrder())))
                .map(m -> {
                    User u = users.get(m.getUserId());
                    String name = m.getName() != null && !m.getName().isBlank() ? m.getName() : u != null ? u.getName() : "Membre";
                    String email = m.getEmail() != null ? m.getEmail() : u != null ? u.getEmail() : null;
                    boolean showEmail = canManage || m.getUserId().equals(viewerId);
                    String avatar = u != null && u.getAvatarUrl() != null ? u.getAvatarUrl() : m.getAvatarUrl();
                    return new CommunityResponse.Member(m.getUserId(), name, showEmail ? email : null, avatar, m.getRole(),
                            m.getJoinedAt(), completed.getOrDefault(m.getUserId(), Set.of()).size(), xp.getOrDefault(m.getUserId(), 0));
                })
                .toList();
    }

    private static int roleRank(String role) {
        if (ROLE_CREATOR.equals(role)) return 0;
        if (ROLE_MODERATOR.equals(role)) return 1;
        return 2;
    }

    private static void afterCommit(Runnable action) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    action.run();
                }
            });
        } else {
            action.run();
        }
    }
}
