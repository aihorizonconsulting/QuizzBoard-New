package com.iahorizonplus.quizzboardbackend.external;

import jakarta.mail.Multipart;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Les méthodes d'envoi interceptent toutes les exceptions : un gabarit HTML invalide
 * (ex. un % non échappé dans un .formatted()) ne fait que journaliser une erreur et
 * l'email n'est jamais envoyé. Ces tests vérifient que chaque gabarit se construit.
 */
@ExtendWith(MockitoExtension.class)
class SmtpEmailServiceTest {

    @Mock
    private JavaMailSender mailSender;

    @InjectMocks
    private SmtpEmailService emailService;

    private MimeMessage message;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(emailService, "fromEmail", "QuizzBoard <test@quizzboard.com>");
        ReflectionTestUtils.setField(emailService, "appBaseUrl", "https://dev.quizzboard.com");
        ReflectionTestUtils.setField(emailService, "resetPasswordBaseUrl", "https://dev.quizzboard.com/reinitialisation-mot-de-passe?token=");
        message = new MimeMessage((Session) null);
        when(mailSender.createMimeMessage()).thenReturn(message);
    }

    @Test
    @DisplayName("Résultat de quiz (classement général, participant éligible au certificat)")
    void quizCompletedEmail() throws Exception {
        emailService.sendQuizCompletedEmail("awa@example.com", "Awa Diop", "Bases de données SQL",
                85.5, 17, 20, 2, 12, true, "CERT-123", null);
        verify(mailSender).send(any(MimeMessage.class));

        String html = findHtml(message.getContent());
        assertThat(html).contains("Bases de données SQL", "Awa Diop");
        // Le bloc « Certificat Officiel Débloqué » a été retiré de l'email de résultat
        assertThat(html).doesNotContain("Certificat Officiel", "CERT-123", "Consulter mon certificat");
    }

    private static String findHtml(Object content) throws Exception {
        if (content instanceof String text) {
            return text;
        }
        if (content instanceof Multipart multipart) {
            for (int i = 0; i < multipart.getCount(); i++) {
                String html = findHtml(multipart.getBodyPart(i).getContent());
                if (html != null) {
                    return html;
                }
            }
        }
        return null;
    }

    @Test
    @DisplayName("Résultat de quiz (classe, sans certificat)")
    void quizCompletedEmailForClass() {
        emailService.sendQuizCompletedEmail("awa@example.com", "Awa Diop", "Bases de données SQL",
                40.0, 8, 20, 5, 30, false, null, "M2 GL 2026");
        verify(mailSender).send(any(MimeMessage.class));
    }

    @Test
    @DisplayName("Réinitialisation du mot de passe")
    void passwordResetEmail() {
        emailService.sendPasswordResetEmail("awa@example.com", "Awa Diop", "token-123");
        verify(mailSender).send(any(MimeMessage.class));
    }

    @Test
    @DisplayName("Bienvenue")
    void welcomeEmail() {
        emailService.sendWelcomeEmail("awa@example.com", "Awa Diop", "LEARNER");
        verify(mailSender).send(any(MimeMessage.class));
    }

    @Test
    @DisplayName("Fin de cours")
    void courseCompletedEmail() {
        emailService.sendCourseCompletedEmail("awa@example.com", "Awa Diop", "Initiation à HTML", 8, true, "CERT-456");
        verify(mailSender).send(any(MimeMessage.class));
    }

    @Test
    @DisplayName("Invitation")
    void invitationEmail() {
        emailService.sendInvitationEmail("awa@example.com", "Bakary Diassy", "Classe", "M2 GL 2026",
                "https://dev.quizzboard.com/invitation/abc", "Bienvenue dans la classe à 100 % !");
        verify(mailSender).send(any(MimeMessage.class));
    }

    @Test
    @DisplayName("Mot de passe modifié")
    void passwordChangedEmail() {
        emailService.sendPasswordChangedEmail("awa@example.com", "Awa Diop");
        verify(mailSender).send(any(MimeMessage.class));
    }

    @Test
    @DisplayName("Paiement confirmé")
    void paymentSuccessEmail() {
        emailService.sendPaymentSuccessEmail("awa@example.com", "Awa Diop", "STARTER", 9900.0, "PAY-789");
        verify(mailSender).send(any(MimeMessage.class));
    }
}
