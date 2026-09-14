package com.iahorizonplus.quizzboardbackend.service.impl;

import com.iahorizonplus.quizzboardbackend.dto.request.CreateInvitationRequest;
import com.iahorizonplus.quizzboardbackend.dto.response.AcceptInvitationResponse;
import com.iahorizonplus.quizzboardbackend.dto.response.InvitationResponse;
import com.iahorizonplus.quizzboardbackend.entity.*;
import com.iahorizonplus.quizzboardbackend.exception.BadRequestException;
import com.iahorizonplus.quizzboardbackend.exception.ResourceNotFoundException;
import com.iahorizonplus.quizzboardbackend.external.SmtpEmailService;
import com.iahorizonplus.quizzboardbackend.repository.*;
import com.iahorizonplus.quizzboardbackend.security.UserPrincipal;
import com.iahorizonplus.quizzboardbackend.service.InvitationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class InvitationServiceImpl implements InvitationService {

    private final InvitationRepository invitationRepository;
    private final ClasseRepository classeRepository;
    private final StudentRepository studentRepository;
    private final CommunityRepository communityRepository;
    private final CommunityMemberRepository communityMemberRepository;
    private final QuizRepository quizRepository;
    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;
    private final SmtpEmailService emailService;

    @Value("${app.invitation.base-url:http://localhost:4200/invitation/}")
    private String invitationBaseUrl;

    @Override
    @Transactional
    public List<InvitationResponse> createInvitations(UserPrincipal currentUser, CreateInvitationRequest request) {
        String inviterId = currentUser.getId();
        String inviterEmail = currentUser.getEmail();
        String inviterName = currentUser.getName() != null && !currentUser.getName().isBlank()
                ? currentUser.getName() : inviterEmail;

        String resourceName;
        String typeLabel;

        switch (request.type()) {
            case CLASS -> {
                Classe classe = classeRepository.findById(request.resourceId())
                        .orElseThrow(() -> new ResourceNotFoundException("Classe introuvable avec l'ID : " + request.resourceId()));
                resourceName = "la Classe " + classe.getName();
                typeLabel = "Classe Pédagogique";
            }
            case COMMUNITY -> {
                Community community = communityRepository.findById(request.resourceId())
                        .orElseThrow(() -> new ResourceNotFoundException("Communauté introuvable avec l'ID : " + request.resourceId()));
                resourceName = "la Communauté " + community.getName();
                typeLabel = "Communauté d'Apprenants";
            }
            case LIVE_QUIZ -> {
                Quiz quiz = quizRepository.findById(request.resourceId())
                        .orElseThrow(() -> new ResourceNotFoundException("Quiz introuvable avec l'ID : " + request.resourceId()));
                resourceName = "la session du Quiz " + quiz.getTitle();
                typeLabel = "Quiz Live";
            }
            default -> throw new BadRequestException("type", "Type d'invitation non pris en charge : " + request.type());
        }

        int expiryDays = (request.expiryDays() != null && request.expiryDays() > 0) ? request.expiryDays() : 7;
        LocalDateTime expiresAt = LocalDateTime.now().plusDays(expiryDays);

        List<InvitationResponse> responses = new ArrayList<>();

        for (String rawEmail : request.targetEmails()) {
            if (rawEmail == null || rawEmail.trim().isEmpty()) continue;
            String targetEmail = rawEmail.trim().toLowerCase();

            // Vérifier si une invitation en attente existe déjà pour cette ressource et cet email
            Invitation invitation = invitationRepository
                    .findByResourceIdAndTargetEmailAndStatus(request.resourceId(), targetEmail, InvitationStatus.PENDING)
                    .orElse(null);

            if (invitation == null || invitation.isExpired()) {
                String token = UUID.randomUUID().toString();
                invitation = Invitation.builder()
                        .token(token)
                        .type(request.type())
                        .status(InvitationStatus.PENDING)
                        .inviterId(inviterId)
                        .inviterEmail(inviterEmail)
                        .inviterName(inviterName)
                        .targetEmail(targetEmail)
                        .resourceId(request.resourceId())
                        .resourceName(resourceName)
                        .role(request.role() != null ? request.role() : "STUDENT")
                        .message(request.message())
                        .expiresAt(expiresAt)
                        .build();

                invitation = invitationRepository.save(invitation);
            }

            String inviteUrl = invitationBaseUrl + invitation.getToken();

            // 1. Envoi de l'email transactionnel
            emailService.sendInvitationEmail(
                    targetEmail,
                    inviterName,
                    typeLabel,
                    resourceName,
                    inviteUrl,
                    request.message()
            );

            final String tokenForNotification = invitation.getToken();

            // 2. Création d'une notification in-app si le compte utilisateur existe déjà
            userRepository.findByEmail(targetEmail).ifPresent(targetUser -> {
                Notification notif = Notification.builder()
                        .userId(targetUser.getId())
                        .type("INVITATION")
                        .title("Nouvelle Invitation ✉️")
                        .message(inviterName + " vous invite à rejoindre " + resourceName)
                        .actionLink("/invitation/" + tokenForNotification)
                        .isRead(false)
                        .build();
                notificationRepository.save(notif);
            });

            responses.add(mapToResponse(invitation, inviteUrl));
        }

        log.info("{} invitation(s) créées et envoyées pour la ressource {}", responses.size(), resourceName);
        return responses;
    }

    @Override
    @Transactional(readOnly = true)
    public InvitationResponse verifyInvitation(String token) {
        Invitation invitation = invitationRepository.findByToken(token)
                .orElseThrow(() -> new ResourceNotFoundException("Invitation introuvable ou lien invalide."));

        if (invitation.isExpired()) {
            invitation.setStatus(InvitationStatus.EXPIRED);
            invitationRepository.save(invitation);
            throw new BadRequestException("status", "Cette invitation a expiré.");
        }

        if (invitation.getStatus() == InvitationStatus.ACCEPTED) {
            throw new BadRequestException("status", "Cette invitation a déjà été acceptée.");
        }

        if (invitation.getStatus() == InvitationStatus.CANCELLED) {
            throw new BadRequestException("status", "Cette invitation a été annulée par l'auteur.");
        }

        String inviteUrl = invitationBaseUrl + invitation.getToken();
        return mapToResponse(invitation, inviteUrl);
    }

    @Override
    @Transactional
    public AcceptInvitationResponse acceptInvitation(String token, UserPrincipal currentUser) {
        Invitation invitation = invitationRepository.findByToken(token)
                .orElseThrow(() -> new ResourceNotFoundException("Invitation introuvable ou lien expiré."));

        if (invitation.isExpired()) {
            invitation.setStatus(InvitationStatus.EXPIRED);
            invitationRepository.save(invitation);
            throw new BadRequestException("status", "Cette invitation a expiré.");
        }

        if (invitation.getStatus() == InvitationStatus.ACCEPTED) {
            throw new BadRequestException("status", "Cette invitation a déjà été validée.");
        }

        String userEmail = currentUser != null ? currentUser.getEmail() : invitation.getTargetEmail();
        String userName = currentUser != null && currentUser.getName() != null && !currentUser.getName().isBlank()
                ? currentUser.getName() : userEmail;
        String userId = currentUser != null ? currentUser.getId() : null;

        String redirectUrl;

        switch (invitation.getType()) {
            case CLASS -> {
                Classe classe = classeRepository.findById(invitation.getResourceId())
                        .orElseThrow(() -> new ResourceNotFoundException("La classe associée n'existe plus."));

                // Vérifier si l'étudiant est déjà inscrit
                boolean alreadyIn = studentRepository.findByClasseIdAndEmail(classe.getId(), userEmail).isPresent();
                if (!alreadyIn) {
                    String[] nameParts = userName.split(" ", 2);
                    String prenom = nameParts[0];
                    String nom = nameParts.length > 1 ? nameParts[1] : "";

                    Student student = Student.builder()
                            .prenom(prenom)
                            .nom(nom)
                            .email(userEmail)
                            .classe(classe)
                            .status("ACTIVE")
                            .build();
                    studentRepository.save(student);
                }
                redirectUrl = "/app/learner/classes";
            }
            case COMMUNITY -> {
                Community community = communityRepository.findById(invitation.getResourceId())
                        .orElseThrow(() -> new ResourceNotFoundException("La communauté associée n'existe plus."));

                if (userId != null) {
                    boolean alreadyMember = communityMemberRepository.findByCommunityIdAndUserId(community.getId(), userId).isPresent();
                    if (!alreadyMember) {
                        CommunityMember member = CommunityMember.builder()
                                .communityId(community.getId())
                                .userId(userId)
                                .name(userName)
                                .email(userEmail)
                                .role(invitation.getRole() != null ? invitation.getRole() : "STUDENT")
                                .build();
                        communityMemberRepository.save(member);
                    }
                }
                redirectUrl = "/app/learner/communities";
            }
            case LIVE_QUIZ -> {
                Quiz quiz = quizRepository.findById(invitation.getResourceId())
                        .orElseThrow(() -> new ResourceNotFoundException("Le quiz associé n'existe plus."));
                redirectUrl = "/app/dashboard?joinQuiz=" + (quiz.getShareCode() != null ? quiz.getShareCode() : quiz.getId());
            }
            default -> redirectUrl = "/app/dashboard";
        }

        // Marquer l'invitation comme acceptée
        invitation.setStatus(InvitationStatus.ACCEPTED);
        invitation.setAcceptedAt(LocalDateTime.now());
        invitationRepository.save(invitation);

        // Notifier l'auteur de l'invitation
        Notification notif = Notification.builder()
                .userId(invitation.getInviterId())
                .type("INVITATION_ACCEPTED")
                .title("Invitation Acceptée ! 🎉")
                .message(userName + " a accepté votre invitation pour " + invitation.getResourceName())
                .actionLink(redirectUrl)
                .isRead(false)
                .build();
        notificationRepository.save(notif);

        log.info("Invitation acceptée par {} pour la ressource {}", userEmail, invitation.getResourceName());
        return new AcceptInvitationResponse(
                invitation.getId(),
                invitation.getType(),
                invitation.getResourceId(),
                invitation.getResourceName(),
                redirectUrl,
                "Félicitations ! Vous avez rejoint " + invitation.getResourceName() + " avec succès."
        );
    }

    @Override
    @Transactional(readOnly = true)
    public List<InvitationResponse> getMyPendingInvitations(UserPrincipal currentUser) {
        List<Invitation> pending = invitationRepository
                .findByTargetEmailAndStatusOrderByCreatedAtDesc(currentUser.getEmail(), InvitationStatus.PENDING);
        return pending.stream()
                .filter(inv -> !inv.isExpired())
                .map(inv -> mapToResponse(inv, invitationBaseUrl + inv.getToken()))
                .toList();
    }

    @Override
    @Transactional
    public void cancelInvitation(String invitationId, UserPrincipal currentUser) {
        Invitation invitation = invitationRepository.findById(invitationId)
                .orElseThrow(() -> new ResourceNotFoundException("Invitation introuvable : " + invitationId));

        boolean isAdmin = currentUser.getUser() != null && currentUser.getUser().getRole() == UserRole.ADMIN;
        if (!invitation.getInviterId().equals(currentUser.getId()) && !isAdmin) {
            throw new BadRequestException("permission", "Vous n'avez pas l'autorisation d'annuler cette invitation.");
        }

        invitation.setStatus(InvitationStatus.CANCELLED);
        invitationRepository.save(invitation);
        log.info("Invitation {} annulée par {}", invitationId, currentUser.getEmail());
    }

    @Override
    @Transactional
    public void declineInvitation(String token, UserPrincipal currentUser) {
        Invitation invitation = invitationRepository.findByToken(token)
                .orElseThrow(() -> new ResourceNotFoundException("Invitation introuvable avec ce token."));

        if (invitation.getStatus() != InvitationStatus.PENDING) {
            throw new BadRequestException("status", "Cette invitation a déjà été traitée ou n'est plus en attente.");
        }
        if (invitation.isExpired()) {
            invitation.setStatus(InvitationStatus.EXPIRED);
            invitationRepository.save(invitation);
            throw new BadRequestException("status", "Cette invitation a expiré.");
        }

        invitation.setStatus(InvitationStatus.DECLINED);
        invitationRepository.save(invitation);
        log.info("Invitation avec token {} refusée", token);
    }

    private InvitationResponse mapToResponse(Invitation inv, String inviteUrl) {
        return new InvitationResponse(
                inv.getId(),
                inv.getToken(),
                inv.getType(),
                inv.getStatus(),
                inv.getResourceId(),
                inv.getResourceName(),
                inv.getTargetEmail(),
                inv.getInviterName(),
                inv.getInviterEmail(),
                inv.getRole(),
                inv.getMessage(),
                inviteUrl,
                inv.getExpiresAt(),
                inv.getCreatedAt()
        );
    }
}
