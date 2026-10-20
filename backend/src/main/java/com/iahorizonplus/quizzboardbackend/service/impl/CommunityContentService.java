package com.iahorizonplus.quizzboardbackend.service.impl;

import com.iahorizonplus.quizzboardbackend.dto.request.CommunityRequests;
import com.iahorizonplus.quizzboardbackend.entity.*;
import com.iahorizonplus.quizzboardbackend.exception.BadRequestException;
import com.iahorizonplus.quizzboardbackend.exception.ForbiddenException;
import com.iahorizonplus.quizzboardbackend.exception.ResourceNotFoundException;
import com.iahorizonplus.quizzboardbackend.external.SmtpEmailService;
import com.iahorizonplus.quizzboardbackend.repository.*;
import com.iahorizonplus.quizzboardbackend.service.FileStorageService;
import com.iahorizonplus.quizzboardbackend.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.security.SecureRandom;
import java.text.Normalizer;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

import static com.iahorizonplus.quizzboardbackend.service.impl.CommunityAccess.isManagerRole;

/**
 * Contenu animé d'une communauté : documents (dépôt de fichiers, liens), réunions en visio et quiz partagés.
 * Les membres sont prévenus (notification, et email pour les réunions).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CommunityContentService {

    private static final Set<String> PLATFORMS = Set.of("GOOGLE_MEET", "ZOOM", "TEAMS", "JITSI", "OTHER");
    private static final DateTimeFormatter WHEN = DateTimeFormatter.ofPattern("EEEE d MMMM yyyy 'à' HH'h'mm", Locale.FRENCH);
    private static final SecureRandom RANDOM = new SecureRandom();

    private final CommunityAccess access;
    private final CommunityRepository communityRepository;
    private final CommunityMemberRepository memberRepository;
    private final ResourceFileRepository resourceRepository;
    private final MeetingRepository meetingRepository;
    private final QuizRepository quizRepository;
    private final UserRepository userRepository;
    private final FileStorageService fileStorageService;
    private final NotificationService notificationService;
    private final SmtpEmailService emailService;

    /** Document prêt à être envoyé au navigateur. */
    public record Download(Resource file, String fileName, String contentType) {}

    // ------------------------------------------------------------------ Documents

    @Transactional
    public ResourceFile uploadDocument(String communityId, MultipartFile file, String title, String description,
                                       String userId, String userName) {
        Community community = access.community(communityId);
        access.requireSharer(community, userId);
        String original = file != null && file.getOriginalFilename() != null
                ? StringUtils.getFilename(StringUtils.cleanPath(file.getOriginalFilename())) : null;
        String storedFileName = fileStorageService.storeDocument(file);
        try {
            ResourceFile resource = ResourceFile.builder()
                    .title(cleanTitle(title, original))
                    .description(cleanDescription(description))
                    .kind(ResourceFile.KIND_FILE)
                    .fileType(fileTypeOf(original))
                    .fileSize(humanSize(file.getSize()))
                    .sizeBytes(file.getSize())
                    .originalFileName(original)
                    .contentType(fileStorageService.getContentType(storedFileName))
                    .storedFileName(storedFileName)
                    .uploadedById(userId)
                    .uploadedByName(userName)
                    .community(community)
                    .build();
            ResourceFile saved = resourceRepository.save(resource);
            notifyMembers(community, userId, "Nouveau document : " + saved.getTitle(),
                    userName + " a partagé « " + saved.getTitle() + " » dans " + community.getName() + ".", "documents");
            return saved;
        } catch (RuntimeException e) {
            fileStorageService.deleteDocument(storedFileName);
            throw e;
        }
    }

    @Transactional
    public ResourceFile addLink(String communityId, CommunityRequests.LinkResource request, String userId, String userName) {
        Community community = access.community(communityId);
        access.requireSharer(community, userId);
        String url = request.url() == null ? "" : request.url().trim();
        if (!url.startsWith("https://") && !url.startsWith("http://")) {
            throw new BadRequestException("url", "Collez une adresse web complète (qui commence par https://).");
        }
        if (url.length() > 1000) {
            throw new BadRequestException("url", "Ce lien est trop long (1000 caractères maximum).");
        }
        if (request.title() == null || request.title().isBlank()) {
            throw new BadRequestException("title", "Donnez un titre à ce lien.");
        }
        ResourceFile saved = resourceRepository.save(ResourceFile.builder()
                .title(cleanTitle(request.title(), null))
                .description(cleanDescription(request.description()))
                .kind(ResourceFile.KIND_LINK)
                .fileType("LINK")
                .fileUrl(url)
                .uploadedById(userId)
                .uploadedByName(userName)
                .community(community)
                .build());
        notifyMembers(community, userId, "Nouveau lien : " + saved.getTitle(),
                userName + " a partagé un lien dans " + community.getName() + ".", "documents");
        return saved;
    }

    @Transactional
    public void deleteResource(String communityId, String resourceId, String userId) {
        Community community = access.community(communityId);
        String role = access.requireMember(community, userId);
        ResourceFile resource = resourceOf(community, resourceId);
        if (!isManagerRole(role) && !userId.equals(resource.getUploadedById())) {
            throw new ForbiddenException("Vous ne pouvez supprimer que les documents que vous avez partagés.");
        }
        String storedFileName = resource.getStoredFileName();
        community.getResources().remove(resource);
        resourceRepository.delete(resource);
        if (storedFileName != null) {
            afterCommit(() -> fileStorageService.deleteDocument(storedFileName));
        }
    }

    @Transactional
    public Download download(String communityId, String resourceId, String userId) {
        Community community = access.community(communityId);
        access.requireMember(community, userId);
        ResourceFile resource = resourceOf(community, resourceId);
        if (resource.getStoredFileName() == null) {
            throw new BadRequestException("Ce document est un lien : ouvrez-le directement.");
        }
        Resource file = fileStorageService.loadDocument(resource.getStoredFileName());
        resource.setDownloadCount(resource.getDownloadCount() + 1);
        resourceRepository.save(resource);
        String name = resource.getOriginalFileName() != null ? resource.getOriginalFileName() : resource.getStoredFileName();
        String type = resource.getContentType() != null ? resource.getContentType() : fileStorageService.getContentType(name);
        return new Download(file, name, type);
    }

    // ------------------------------------------------------------------ Réunions

    @Transactional
    public Meeting scheduleMeeting(String communityId, CommunityRequests.MeetingForm form, String userId, String userName) {
        Community community = access.community(communityId);
        access.requireManager(community, userId);
        Meeting meeting = Meeting.builder().community(community).createdById(userId).hostName(userName).build();
        applyMeetingForm(meeting, form, community);
        Meeting saved = meetingRepository.save(meeting);
        if (!Boolean.FALSE.equals(form.notifyMembers())) {
            notifyMeeting(community, saved, userId, false);
        }
        return saved;
    }

    @Transactional
    public Meeting updateMeeting(String communityId, String meetingId, CommunityRequests.MeetingForm form, String userId) {
        Community community = access.community(communityId);
        access.requireManager(community, userId);
        Meeting meeting = meetingOf(community, meetingId);
        applyMeetingForm(meeting, form, community);
        Meeting saved = meetingRepository.save(meeting);
        if (Boolean.TRUE.equals(form.notifyMembers())) {
            notifyMeeting(community, saved, userId, true);
        }
        return saved;
    }

    @Transactional
    public void deleteMeeting(String communityId, String meetingId, String userId) {
        Community community = access.community(communityId);
        access.requireManager(community, userId);
        Meeting meeting = meetingOf(community, meetingId);
        community.getMeetings().remove(meeting);
        meetingRepository.delete(meeting);
    }

    private void applyMeetingForm(Meeting meeting, CommunityRequests.MeetingForm form, Community community) {
        if (form.title() == null || form.title().isBlank()) {
            throw new BadRequestException("title", "Donnez un titre à la réunion.");
        }
        if (form.title().trim().length() > 200) {
            throw new BadRequestException("title", "Le titre est trop long (200 caractères maximum).");
        }
        if (form.scheduledAt() == null) {
            throw new BadRequestException("scheduledAt", "Choisissez la date et l'heure de la réunion.");
        }
        if (form.scheduledAt().isBefore(LocalDateTime.now().minusMinutes(10))) {
            throw new BadRequestException("scheduledAt", "Cette date est déjà passée : choisissez une date à venir.");
        }
        int duration = form.durationMinutes() == null ? 60 : form.durationMinutes();
        if (duration < 15 || duration > 480) {
            throw new BadRequestException("durationMinutes", "La durée doit être comprise entre 15 minutes et 8 heures.");
        }
        String url = form.meetingUrl() == null ? "" : form.meetingUrl().trim();
        String platform = form.platform() == null || form.platform().isBlank() ? platformOf(url) : form.platform().trim().toUpperCase();
        if (!PLATFORMS.contains(platform)) platform = "OTHER";
        if (url.isEmpty() && "JITSI".equals(platform)) {
            url = "https://meet.jit.si/QuizzBoard-" + slug(community.getName()) + "-" + randomToken();
        }
        if (url.isEmpty()) {
            throw new BadRequestException("meetingUrl", "Collez le lien de la réunion (Google Meet, Zoom, Teams) ou choisissez Jitsi pour en créer un automatiquement.");
        }
        if (!url.startsWith("https://") && !url.startsWith("http://")) {
            throw new BadRequestException("meetingUrl", "Le lien de la réunion doit être une adresse web complète (https://...).");
        }
        if (url.length() > 1000) {
            throw new BadRequestException("meetingUrl", "Ce lien est trop long (1000 caractères maximum).");
        }
        meeting.setTitle(form.title().trim());
        meeting.setDescription(cleanDescription(form.description()));
        meeting.setScheduledAt(form.scheduledAt());
        meeting.setDurationMinutes(duration);
        meeting.setPlatform(platform);
        meeting.setMeetingUrl(url);
    }

    private void notifyMeeting(Community community, Meeting meeting, String actorId, boolean updated) {
        String when = WHEN.format(meeting.getScheduledAt());
        String title = (updated ? "Réunion modifiée : " : "Réunion programmée : ") + meeting.getTitle();
        String message = community.getName() + " — " + when + " (" + meeting.getDurationMinutes() + " min).";
        List<User> recipients = notifyMembers(community, actorId, title, message, "reunions");
        String platform = platformLabel(meeting.getPlatform());
        String meetingTitle = meeting.getTitle();
        String meetingUrl = meeting.getMeetingUrl();
        String host = meeting.getHostName();
        int duration = meeting.getDurationMinutes();
        afterCommit(() -> recipients.forEach(u -> emailService.sendCommunityMeetingEmail(u.getEmail(), u.getName(),
                community.getName(), meetingTitle, when, duration, platform, meetingUrl, host,
                "http://localhost:4200" + communityPath(u, community.getId(), "reunions"), updated)));
    }

    // ------------------------------------------------------------------ Quiz partagés

    @Transactional(readOnly = true)
    public List<Quiz> sharedQuizzes(String communityId, String userId) {
        Community community = access.community(communityId);
        access.requireMember(community, userId);
        Map<String, Quiz> byId = new HashMap<>();
        quizRepository.findAllById(community.getSharedQuizIds()).forEach(q -> byId.put(q.getId(), q));
        return community.getSharedQuizIds().stream().map(byId::get).filter(Objects::nonNull).toList();
    }

    @Transactional
    public List<String> shareQuiz(String communityId, String quizId, String userId, String userName) {
        Community community = access.community(communityId);
        String role = access.requireManager(community, userId);
        Quiz quiz = quizRepository.findById(quizId == null ? "" : quizId)
                .orElseThrow(() -> new ResourceNotFoundException("Ce quiz n'existe plus."));
        boolean own = userId.equals(quiz.getCreatorId());
        if (!own && !"PUBLIC".equalsIgnoreCase(quiz.getVisibility()) && !CommunityAccess.ROLE_ADMIN.equals(role)) {
            throw new ForbiddenException("Vous ne pouvez partager que vos quiz ou des quiz publics.");
        }
        if (!community.getSharedQuizIds().contains(quizId)) {
            community.getSharedQuizIds().add(quizId);
            communityRepository.save(community);
            notifyMembers(community, userId, "Nouveau quiz : " + quiz.getTitle(),
                    userName + " a partagé le quiz « " + quiz.getTitle() + " » dans " + community.getName() + ".", "quiz");
        }
        return new ArrayList<>(community.getSharedQuizIds());
    }

    @Transactional
    public List<String> unshareQuiz(String communityId, String quizId, String userId) {
        Community community = access.community(communityId);
        access.requireManager(community, userId);
        community.getSharedQuizIds().remove(quizId);
        communityRepository.save(community);
        return new ArrayList<>(community.getSharedQuizIds());
    }

    // ------------------------------------------------------------------ Outils

    /** Notification à chaque membre (sauf l'auteur de l'action), avec un lien direct vers la communauté. */
    private List<User> notifyMembers(Community community, String actorId, String title, String message, String tab) {
        Set<String> ids = new LinkedHashSet<>();
        memberRepository.findByCommunityId(community.getId()).forEach(m -> ids.add(m.getUserId()));
        if (community.getCreatorId() != null) ids.add(community.getCreatorId());
        ids.remove(actorId);
        List<User> recipients = userRepository.findAllById(ids);
        for (User user : recipients) {
            notificationService.sendNotification(Notification.builder()
                    .userId(user.getId())
                    .type("COMMUNITY")
                    .title(title.length() > 250 ? title.substring(0, 250) : title)
                    .message(message)
                    .actionLink(communityPath(user, community.getId(), tab))
                    .build());
        }
        return recipients;
    }

    private static String communityPath(User user, String communityId, String tab) {
        String base = user.getRole() == UserRole.LEARNER ? "/app/learner/communities" : "/app/communities";
        return base + "?communaute=" + communityId + "&onglet=" + tab;
    }

    private ResourceFile resourceOf(Community community, String resourceId) {
        return resourceRepository.findById(resourceId)
                .filter(r -> r.getCommunity() != null && community.getId().equals(r.getCommunity().getId()))
                .orElseThrow(() -> new ResourceNotFoundException("Ce document n'existe plus."));
    }

    private Meeting meetingOf(Community community, String meetingId) {
        return meetingRepository.findById(meetingId)
                .filter(m -> m.getCommunity() != null && community.getId().equals(m.getCommunity().getId()))
                .orElseThrow(() -> new ResourceNotFoundException("Cette réunion n'existe plus."));
    }

    private static String cleanTitle(String title, String originalFileName) {
        String value = title != null && !title.isBlank() ? title.trim()
                : originalFileName != null ? originalFileName.replaceFirst("\\.[^.]+$", "") : "Document";
        return value.length() > 200 ? value.substring(0, 200) : value;
    }

    private static String cleanDescription(String description) {
        if (description == null || description.isBlank()) return null;
        String value = description.trim();
        if (value.length() > 1000) {
            throw new BadRequestException("description", "La description est trop longue (1000 caractères maximum).");
        }
        return value;
    }

    static String fileTypeOf(String fileName) {
        String ext = fileName == null || !fileName.contains(".") ? "" : fileName.substring(fileName.lastIndexOf('.') + 1).toLowerCase();
        return switch (ext) {
            case "pdf" -> "PDF";
            case "doc", "docx", "odt", "rtf", "txt" -> "DOC";
            case "ppt", "pptx", "odp" -> "SLIDES";
            case "xls", "xlsx", "ods", "csv" -> "SHEET";
            case "zip", "rar", "7z" -> "ZIP";
            case "png", "jpg", "jpeg", "gif", "webp" -> "IMAGE";
            case "mp3", "mp4" -> "MEDIA";
            default -> "OTHER";
        };
    }

    static String humanSize(long bytes) {
        if (bytes < 1024) return bytes + " o";
        if (bytes < 1024 * 1024) return Math.round(bytes / 1024.0) + " Ko";
        return String.format(Locale.FRENCH, "%.1f Mo", bytes / (1024.0 * 1024.0));
    }

    private static String platformOf(String url) {
        String lower = url.toLowerCase();
        if (lower.contains("meet.google.")) return "GOOGLE_MEET";
        if (lower.contains("zoom.")) return "ZOOM";
        if (lower.contains("teams.microsoft.") || lower.contains("teams.live.")) return "TEAMS";
        if (lower.contains("jit.si") || lower.isEmpty()) return "JITSI";
        return "OTHER";
    }

    static String platformLabel(String platform) {
        return switch (platform == null ? "" : platform) {
            case "GOOGLE_MEET" -> "Google Meet";
            case "ZOOM" -> "Zoom";
            case "TEAMS" -> "Microsoft Teams";
            case "JITSI" -> "Jitsi Meet";
            default -> "Visioconférence";
        };
    }

    private static String slug(String name) {
        String s = Normalizer.normalize(name == null ? "" : name, Normalizer.Form.NFD).replaceAll("[^A-Za-z0-9]+", "");
        return s.isEmpty() ? "Communaute" : s.substring(0, Math.min(24, s.length()));
    }

    private static String randomToken() {
        String alphabet = "abcdefghijkmnpqrstuvwxyz23456789";
        StringBuilder token = new StringBuilder();
        for (int i = 0; i < 10; i++) token.append(alphabet.charAt(RANDOM.nextInt(alphabet.length())));
        return token.toString();
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
