package com.iahorizonplus.quizzboardbackend.service;

import com.iahorizonplus.quizzboardbackend.dto.request.CreateInvitationRequest;
import com.iahorizonplus.quizzboardbackend.dto.response.AcceptInvitationResponse;
import com.iahorizonplus.quizzboardbackend.dto.response.InvitationResponse;
import com.iahorizonplus.quizzboardbackend.entity.*;
import com.iahorizonplus.quizzboardbackend.exception.BadRequestException;
import com.iahorizonplus.quizzboardbackend.exception.ResourceNotFoundException;
import com.iahorizonplus.quizzboardbackend.external.SmtpEmailService;
import com.iahorizonplus.quizzboardbackend.repository.*;
import com.iahorizonplus.quizzboardbackend.security.UserPrincipal;
import com.iahorizonplus.quizzboardbackend.service.impl.InvitationServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InvitationServiceTest {

    @Mock
    private InvitationRepository invitationRepository;

    @Mock
    private ClasseRepository classeRepository;

    @Mock
    private StudentRepository studentRepository;

    @Mock
    private CommunityRepository communityRepository;

    @Mock
    private QuizRepository quizRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private SmtpEmailService emailService;

    @InjectMocks
    private InvitationServiceImpl invitationService;

    private UserPrincipal inviterPrincipal;
    private Invitation sampleInvitation;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(invitationService, "invitationBaseUrl", "http://localhost:4200/invitation/");

        User inviter = User.builder()
                .id("inviter-1")
                .prenom("Professeur")
                .nom("Kone")
                .email("kone@quizzboard.com")
                .role(UserRole.CREATOR)
                .build();
        inviterPrincipal = new UserPrincipal(inviter);

        sampleInvitation = Invitation.builder()
                .id("inv-1")
                .token("tok-123456")
                .type(InvitationType.CLASS)
                .status(InvitationStatus.PENDING)
                .resourceId("cls-1")
                .resourceName("la Classe Classe Terminale S")
                .inviterId("inviter-1")
                .inviterName("Professeur Kone")
                .inviterEmail("kone@quizzboard.com")
                .targetEmail("eleve@quizzboard.com")
                .expiresAt(LocalDateTime.now().plusDays(7))
                .createdAt(LocalDateTime.now())
                .build();
    }

    @Test
    @DisplayName("Création d'invitations : génération de token, persistance et envoi d'email")
    void createInvitations_Class_Success() {
        Classe classe = Classe.builder().id("cls-1").name("Classe Terminale S").creatorId("inviter-1").build();
        when(classeRepository.findById("cls-1")).thenReturn(Optional.of(classe));
        when(invitationRepository.findByResourceIdAndTargetEmailAndStatus("cls-1", "eleve@quizzboard.com", InvitationStatus.PENDING)).thenReturn(Optional.empty());
        when(invitationRepository.save(any(Invitation.class))).thenAnswer(inv -> inv.getArgument(0));

        CreateInvitationRequest request = new CreateInvitationRequest(
                InvitationType.CLASS, "cls-1", List.of("eleve@quizzboard.com"),
                "STUDENT", "Bienvenue dans la classe !", 7
        );

        List<InvitationResponse> responses = invitationService.createInvitations(inviterPrincipal, request);

        assertThat(responses).hasSize(1);
        assertThat(responses.getFirst().targetEmail()).isEqualTo("eleve@quizzboard.com");
        assertThat(responses.getFirst().resourceName()).isEqualTo("la Classe Classe Terminale S");
        verify(emailService).sendInvitationEmail(eq("eleve@quizzboard.com"), eq("Professeur Kone"), anyString(), eq("la Classe Classe Terminale S"), any(), eq("Bienvenue dans la classe !"));
    }

    @Test
    @DisplayName("Vérification d'invitation : Consultation par token public")
    void verifyInvitation_Success() {
        when(invitationRepository.findByToken("tok-123456")).thenReturn(Optional.of(sampleInvitation));

        InvitationResponse response = invitationService.verifyInvitation("tok-123456");

        assertThat(response).isNotNull();
        assertThat(response.token()).isEqualTo("tok-123456");
        assertThat(response.status()).isEqualTo(InvitationStatus.PENDING);
    }

    @Test
    @DisplayName("Vérification d'invitation : Rejet si expirée")
    void verifyInvitation_Expired_ThrowsBadRequestException() {
        sampleInvitation.setExpiresAt(LocalDateTime.now().minusDays(1));
        when(invitationRepository.findByToken("tok-123456")).thenReturn(Optional.of(sampleInvitation));

        assertThatThrownBy(() -> invitationService.verifyInvitation("tok-123456"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("expiré");

        assertThat(sampleInvitation.getStatus()).isEqualTo(InvitationStatus.EXPIRED);
        verify(invitationRepository).save(sampleInvitation);
    }

    @Test
    @DisplayName("Acceptation d'invitation : Ajout à la ressource et notification du créateur")
    void acceptInvitation_Class_Success() {
        when(invitationRepository.findByToken("tok-123456")).thenReturn(Optional.of(sampleInvitation));
        Classe classe = Classe.builder().id("cls-1").name("Classe Terminale S").students(new java.util.ArrayList<>()).build();
        when(classeRepository.findById("cls-1")).thenReturn(Optional.of(classe));
        when(studentRepository.findByClasseIdAndEmail("cls-1", "eleve@quizzboard.com")).thenReturn(Optional.empty());

        User student = User.builder().id("std-1").email("eleve@quizzboard.com").prenom("Moussa").nom("Sy").role(UserRole.LEARNER).build();
        UserPrincipal studentPrincipal = new UserPrincipal(student);

        AcceptInvitationResponse response = invitationService.acceptInvitation("tok-123456", studentPrincipal);

        assertThat(response).isNotNull();
        assertThat(sampleInvitation.getStatus()).isEqualTo(InvitationStatus.ACCEPTED);
        assertThat(sampleInvitation.getAcceptedAt()).isNotNull();

        verify(studentRepository).save(any(Student.class));
        verify(invitationRepository).save(sampleInvitation);
        verify(notificationRepository).save(any(Notification.class));
    }

    @Test
    @DisplayName("Refus d'invitation : Statut mis à DECLINED")
    void declineInvitation_Success() {
        when(invitationRepository.findByToken("tok-123456")).thenReturn(Optional.of(sampleInvitation));

        invitationService.declineInvitation("tok-123456", null);

        assertThat(sampleInvitation.getStatus()).isEqualTo(InvitationStatus.DECLINED);
        verify(invitationRepository).save(sampleInvitation);
    }
}
