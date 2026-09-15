package com.iahorizonplus.quizzboardbackend.external;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class SmtpEmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.host:smtp.gmail.com}")
    private String smtpHost;

    @Value("${spring.mail.port:587}")
    private int smtpPort;

    @Value("${spring.mail.username:}")
    private String smtpUsername;

    @Value("${app.mail.from:QuizzBoard Support <no-reply@quizzboard.com>}")
    private String fromEmail;

    @Value("${app.url:https://dev.quizzboard.com}")
    private String appBaseUrl;

    @Value("${app.mail.reset-password-url:https://dev.quizzboard.com/reinitialisation-mot-de-passe?token=}")
    private String resetPasswordBaseUrl;

    private String resolveFromEmail() {
        if (fromEmail != null && !fromEmail.isBlank() && !fromEmail.contains("no-reply@quizzboard.com")) {
            return fromEmail;
        }
        if (smtpUsername != null && !smtpUsername.isBlank()) {
            return "QuizzBoard <" + smtpUsername.trim() + ">";
        }
        return fromEmail;
    }

    @Async
    public void sendPasswordResetEmail(String toEmail, String userName, String token) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(resolveFromEmail());
            helper.setTo(toEmail);
            helper.setSubject("QuizzBoard - Réinitialisation de votre mot de passe");

            String resetLink = resetPasswordBaseUrl + token;
            String htmlContent = """
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>Réinitialisation de mot de passe</title>
                </head>
                <body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                    <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="padding: 40px 20px;">
                        <tr>
                            <td align="center">
                                <table width="600" border="0" cellspacing="0" cellpadding="0" style="background: #FFFFFF; border-radius: 12px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                                    <!-- Header -->
                                    <tr>
                                        <td style="background-color: #0F172A; padding: 32px 40px; text-align: center;">
                                            <h1 style="color: #FFFFFF; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.02em;">QUIZZBOARD</h1>
                                            <p style="color: #94A3B8; margin: 6px 0 0 0; font-size: 13px;">Plateforme d'Évaluation & d'Apprentissage Interactif</p>
                                        </td>
                                    </tr>
                                    <!-- Body -->
                                    <tr>
                                        <td style="padding: 40px;">
                                            <h2 style="color: #0F172A; font-size: 20px; font-weight: 700; margin-top: 0;">Bonjour %s,</h2>
                                            <p style="color: #475569; font-size: 15px; line-height: 1.6;">
                                                Une demande de réinitialisation de mot de passe a été initiée pour votre compte QuizzBoard.
                                            </p>
                                            <p style="color: #475569; font-size: 15px; line-height: 1.6;">
                                                Pour définir un nouveau mot de passe et sécuriser votre compte, cliquez sur le bouton ci-dessous :
                                            </p>
                                            <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="margin: 32px 0;">
                                                <tr>
                                                    <td align="center">
                                                        <a href="%s" style="background-color: #F97316; color: #FFFFFF; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 700; font-size: 15px; display: inline-block;">
                                                            Réinitialiser mon mot de passe
                                                        </a>
                                                    </td>
                                                </tr>
                                            </table>
                                            <div style="background-color: #F1F5F9; border-left: 4px solid #0F172A; padding: 14px 18px; border-radius: 4px; margin-bottom: 24px;">
                                                <p style="color: #334155; font-size: 13px; margin: 0; line-height: 1.5;">
                                                    ⏱ <strong>Sécurité :</strong> Ce lien est valable pendant <strong>15 minutes</strong>.<br>
                                                    Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email en toute sérénité.
                                                </p>
                                            </div>
                                            <p style="color: #94A3B8; font-size: 12px; word-break: break-all;">
                                                Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur :<br>
                                                <a href="%s" style="color: #F97316;">%s</a>
                                            </p>
                                        </td>
                                    </tr>
                                    <!-- Footer -->
                                    <tr>
                                        <td style="background-color: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 24px; text-align: center;">
                                            <p style="color: #64748B; font-size: 12px; margin: 0;">
                                                © 2026 QuizzBoard • IA Horizon Plus Consulting. Tous droits réservés.
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </body>
                </html>
            """.formatted(userName, resetLink, resetLink, resetLink);

            helper.setText(htmlContent, true);
            mailSender.send(message);
            log.info("Email de réinitialisation SMTP envoyé avec succès à {}", toEmail);
        } catch (MessagingException e) {
            log.error("Échec de l'envoi de l'email SMTP à {} : {}", toEmail, e.getMessage());
        } catch (Exception e) {
            log.warn("Impossible d'envoyer l'email SMTP (serveur SMTP non joignable en local) : {}", e.getMessage());
        }
    }

    @Async
    public void sendWelcomeEmail(String toEmail, String userName, String role) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(resolveFromEmail());
            helper.setTo(toEmail);
            helper.setSubject("Bienvenue sur QuizzBoard ! 🎉");

            String htmlContent = """
                <!DOCTYPE html>
                <html>
                <body style="font-family: Arial, sans-serif; background-color: #F8FAFC; padding: 20px;">
                    <div style="max-width: 600px; margin: auto; background: #FFFFFF; padding: 32px; border-radius: 8px; border: 1px solid #E2E8F0;">
                        <h1 style="color: #0F172A; margin-top: 0;">Bienvenue sur QuizzBoard, %s !</h1>
                        <p style="color: #334155; font-size: 15px; line-height: 1.6;">
                            Votre compte <strong>%s</strong> a été créé avec succès. Vous pouvez désormais concevoir des quiz interactifs, générer des cours avec l'IA et animer des arènes live.
                        </p>
                        <p style="color: #64748B; font-size: 13px; margin-top: 30px;">
                            L'équipe QuizzBoard - Horizon Plus Consulting
                        </p>
                    </div>
                </body>
                </html>
            """.formatted(userName, role);

            helper.setText(htmlContent, true);
            mailSender.send(message);
            log.info("Email de bienvenue envoyé à {}", toEmail);
        } catch (Exception e) {
            log.warn("Notification de bienvenue SMTP non envoyée (erreur SMTP) : {}", e.getMessage());
        }
    }

    /**
     * Envoi automatique d'un email récapitulatif lors de la finalisation d'un Quiz (avec Rang et Score)
     */
    @Async
    public void sendQuizCompletedEmail(
            String toEmail,
            String participantName,
            String quizTitle,
            double percentage,
            int score,
            int maxScore,
            int rank,
            int totalPlayers,
            boolean certificateEligible,
            String certificateCode) {
        sendQuizCompletedEmail(toEmail, participantName, quizTitle, percentage, score, maxScore, rank, totalPlayers, certificateEligible, certificateCode, null);
    }

    @Async
    public void sendQuizCompletedEmail(
            String toEmail,
            String participantName,
            String quizTitle,
            double percentage,
            int score,
            int maxScore,
            int rank,
            int totalPlayers,
            boolean certificateEligible,
            String certificateCode,
            String className) {
        if (toEmail == null || toEmail.isBlank()) {
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(resolveFromEmail());
            helper.setTo(toEmail);

            boolean isClassQuiz = className != null && !className.isBlank();
            String subjectText = isClassQuiz
                    ? String.format("Vos Résultats au Quiz : %s 🎯 (Rang #%d/%d - Classe %s)", quizTitle, rank, totalPlayers, className)
                    : String.format("Vos Résultats au Quiz : %s 🎯 (Rang #%d/%d)", quizTitle, rank, totalPlayers);
            helper.setSubject(subjectText);

            boolean passed = percentage >= 70.0;
            String badgeColor = passed ? "#16A34A" : "#EA580C";
            String badgeBg = passed ? "#DCFCE7" : "#FFEDD5";
            String statusText = passed ? "FÉLICITATIONS ! QUIZ RÉUSSI" : "QUIZ TERMINÉ";

            String rankBannerText;
            if (isClassQuiz) {
                if (rank == 1) {
                    rankBannerText = String.format("🥇 1ère Place — Major de la classe %s !", className);
                } else if (rank <= 3) {
                    rankBannerText = String.format("🥈 Podium de la classe (Rang #%d sur %d élèves dans %s) !", rank, totalPlayers, className);
                } else {
                    rankBannerText = String.format("🎯 Vous êtes classé #%d sur %d élèves dans la classe %s !", rank, totalPlayers, className);
                }
            } else {
                if (rank == 1) {
                    rankBannerText = "🥇 1ère Place — Champion du Quiz (Classement Général) !";
                } else if (rank <= 3) {
                    rankBannerText = String.format("🥈 Podium d'Honneur (Rang #%d sur %d participants) !", rank, totalPlayers);
                } else {
                    rankBannerText = String.format("🎯 Vous êtes classé #%d sur %d participants !", rank, totalPlayers);
                }
            }

            String certificateHtml = "";
            if (certificateEligible && certificateCode != null) {
                certificateHtml = """
                    <div style="background-color: #FEF3C7; border: 1px solid #F59E0B; border-radius: 8px; padding: 20px; margin-top: 24px; text-align: center;">
                        <span style="font-size: 24px;">🏆</span>
                        <h3 style="color: #92400E; margin: 8px 0 4px 0; font-size: 17px; font-weight: 800;">Certificat Officiel Débloqué !</h3>
                        <p style="color: #78350F; font-size: 13px; margin: 0 0 14px 0;">
                            Code de vérification : <strong>%s</strong>
                        </p>
                        <a href="%s/app/learner/certificates" style="background-color: #0F172A; color: #FFFFFF; text-decoration: none; padding: 10px 22px; border-radius: 6px; font-weight: 700; font-size: 13px; display: inline-block;">
                            Consulter mon certificat
                        </a>
                    </div>
                """.formatted(certificateCode, appBaseUrl);
            }

            String htmlContent = """
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>Résultats de Quiz</title>
                </head>
                <body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                    <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="padding: 40px 20px;">
                        <tr>
                            <td align="center">
                                <table width="600" border="0" cellspacing="0" cellpadding="0" style="background: #FFFFFF; border-radius: 12px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                                    <!-- Header -->
                                    <tr>
                                        <td style="background-color: #0F172A; padding: 32px 40px; text-align: center;">
                                            <h1 style="color: #FFFFFF; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.02em;">QUIZZBOARD</h1>
                                            <p style="color: #94A3B8; margin: 6px 0 0 0; font-size: 13px;">Rapport d'évaluation & progression</p>
                                        </td>
                                    </tr>
                                    <!-- Body -->
                                    <tr>
                                        <td style="padding: 36px 40px;">
                                            <div style="display: inline-block; background-color: %s; color: %s; padding: 6px 14px; border-radius: 20px; font-weight: 800; font-size: 12px; letter-spacing: 0.05em; margin-bottom: 12px;">
                                                %s
                                            </div>

                                            <!-- Rank Banner -->
                                            <div style="background-color: #EEF2FF; border: 1px solid #C7D2FE; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; text-align: center;">
                                                <strong style="font-size: 14px; color: #3730A3;">%s</strong>
                                            </div>

                                            <h2 style="color: #0F172A; font-size: 22px; font-weight: 800; margin: 0 0 8px 0;">%s</h2>
                                            <p style="color: #475569; font-size: 14px; margin: 0 0 24px 0;">
                                                Bravo <strong>%s</strong>, voici la synthèse détaillée de votre performance.
                                            </p>

                                            <!-- Score Card with 3 Columns: Score %, Points, Rank -->
                                            <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                                                <tr>
                                                    <td align="center" style="border-right: 1px solid #E2E8F0; width: 33%%; padding: 10px;">
                                                        <div style="font-size: 28px; font-weight: 900; color: #0F172A;">%.1f%%</div>
                                                        <div style="font-size: 11px; color: #64748B; font-weight: 700; text-transform: uppercase; margin-top: 4px;">Score Final</div>
                                                    </td>
                                                    <td align="center" style="border-right: 1px solid #E2E8F0; width: 34%%; padding: 10px;">
                                                        <div style="font-size: 28px; font-weight: 900; color: #F97316;">%d / %d</div>
                                                        <div style="font-size: 11px; color: #64748B; font-weight: 700; text-transform: uppercase; margin-top: 4px;">Points</div>
                                                    </td>
                                                    <td align="center" style="width: 33%%; padding: 10px;">
                                                        <div style="font-size: 28px; font-weight: 900; color: #2563EB;">#%d</div>
                                                        <div style="font-size: 11px; color: #64748B; font-weight: 700; text-transform: uppercase; margin-top: 4px;">Sur %d Joueurs</div>
                                                    </td>
                                                </tr>
                                            </table>

                                            %s

                                            <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 28px;">
                                                <tr>
                                                    <td align="center">
                                                        <a href="%s/app/dashboard" style="background-color: #F97316; color: #FFFFFF; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block;">
                                                            Accéder à mon espace QuizzBoard
                                                        </a>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                    <!-- Footer -->
                                    <tr>
                                        <td style="background-color: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 20px; text-align: center;">
                                            <p style="color: #64748B; font-size: 12px; margin: 0;">
                                                © 2026 QuizzBoard • Système d'Évaluation & Certifications Académiques
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </body>
                </html>
            """.formatted(
                    badgeBg, badgeColor, statusText,
                    rankBannerText,
                    quizTitle, participantName,
                    percentage, score, maxScore,
                    rank, totalPlayers,
                    certificateHtml,
                    appBaseUrl
            );

            helper.setText(htmlContent, true);
            mailSender.send(message);
            log.info("Email de résultat de quiz envoyé avec succès à {} (Score: {}%, Rang: #{})", toEmail, percentage, rank);
        } catch (Exception e) {
            log.error("Notification de quiz par email non envoyée à {} : {}", toEmail, e.getMessage(), e);
        }
    }

    /**
     * Surcharge pour compatibilité ascendante
     */
    @Async
    public void sendQuizCompletedEmail(
            String toEmail,
            String participantName,
            String quizTitle,
            double percentage,
            int score,
            int maxScore,
            boolean certificateEligible,
            String certificateCode) {
        sendQuizCompletedEmail(toEmail, participantName, quizTitle, percentage, score, maxScore, 1, 1, certificateEligible, certificateCode);
    }

    /**
     * Envoi automatique d'un email récapitulatif lors de la validation d'un Cours
     */
    @Async
    public void sendCourseCompletedEmail(
            String toEmail,
            String learnerName,
            String courseTitle,
            int totalChapters,
            boolean hasCertificate,
            String certificateCode) {
        if (toEmail == null || toEmail.isBlank()) {
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject("Félicitations ! Cours Terminé : " + courseTitle + " 🎓");

            String certificateHtml = "";
            if (hasCertificate && certificateCode != null) {
                certificateHtml = """
                    <div style="background-color: #ECFDF5; border: 1px solid #10B981; border-radius: 8px; padding: 18px; margin-top: 20px; text-align: center;">
                        <h3 style="color: #065F46; margin: 0 0 6px 0; font-size: 16px;">Attestation de Réussite Prête !</h3>
                        <p style="color: #047857; font-size: 13px; margin: 0 0 12px 0;">Code officiel : <strong>%s</strong></p>
                        <a href="http://localhost:4200/app/learner/certificates" style="background-color: #065F46; color: #FFFFFF; text-decoration: none; padding: 8px 20px; border-radius: 6px; font-weight: 700; font-size: 12px; display: inline-block;">
                            Télécharger l'attestation
                        </a>
                    </div>
                """.formatted(certificateCode);
            }

            String htmlContent = """
                <!DOCTYPE html>
                <html>
                <body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                    <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="padding: 40px 20px;">
                        <tr>
                            <td align="center">
                                <table width="600" border="0" cellspacing="0" cellpadding="0" style="background: #FFFFFF; border-radius: 12px; border: 1px solid #E2E8F0; overflow: hidden;">
                                    <tr>
                                        <td style="background-color: #0F172A; padding: 30px; text-align: center;">
                                            <h1 style="color: #FFFFFF; margin: 0; font-size: 22px; font-weight: 800;">QUIZZBOARD ACADEMY</h1>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 36px 40px;">
                                            <h2 style="color: #0F172A; margin-top: 0;">Félicitations %s ! 🎉</h2>
                                            <p style="color: #475569; font-size: 15px; line-height: 1.6;">
                                                Vous avez validé avec succès l'intégralité des <strong>%d chapitres</strong> du cours :
                                            </p>
                                            <div style="background-color: #F1F5F9; padding: 14px 18px; border-radius: 8px; font-size: 16px; font-weight: 700; color: #0F172A; margin: 16px 0;">
                                                📖 %s
                                            </div>
                                            %s
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="background-color: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 16px; text-align: center;">
                                            <p style="color: #94A3B8; font-size: 11px; margin: 0;">QuizzBoard • Apprentissage & Certifications Numériques</p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </body>
                </html>
            """.formatted(learnerName, totalChapters, courseTitle, certificateHtml);

            helper.setText(htmlContent, true);
            mailSender.send(message);
            log.info("Email de fin de cours envoyé à {}", toEmail);
        } catch (Exception e) {
            log.warn("Notification de fin de cours SMTP non envoyée : {}", e.getMessage());
        }
    }

    /**
     * Notification d'invitation (Classe, Communauté, Quiz Live)
     */
    @Async
    public void sendInvitationEmail(
            String toEmail,
            String inviterName,
            String resourceTypeLabel,
            String resourceName,
            String inviteUrl,
            String personalMessage) {
        if (toEmail == null || toEmail.isBlank()) return;

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject("Invitation à rejoindre " + resourceName + " sur QuizzBoard ✉️");

            String customMsgHtml = "";
            if (personalMessage != null && !personalMessage.isBlank()) {
                customMsgHtml = """
                    <div style="background-color: #F1F5F9; border-left: 4px solid #F97316; padding: 14px 18px; border-radius: 4px; margin: 20px 0; font-style: italic; color: #334155; font-size: 14px;">
                        « %s »
                    </div>
                """.formatted(personalMessage);
            }

            String htmlContent = """
                <!DOCTYPE html>
                <html>
                <body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                    <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="padding: 40px 20px;">
                        <tr>
                            <td align="center">
                                <table width="600" border="0" cellspacing="0" cellpadding="0" style="background: #FFFFFF; border-radius: 12px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                                    <tr>
                                        <td style="background-color: #0F172A; padding: 32px 40px; text-align: center;">
                                            <h1 style="color: #FFFFFF; margin: 0; font-size: 24px; font-weight: 800;">QUIZZBOARD</h1>
                                            <p style="color: #94A3B8; margin: 6px 0 0 0; font-size: 13px;">Plateforme d'Apprentissage & Quiz Interactifs</p>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 36px 40px;">
                                            <h2 style="color: #0F172A; font-size: 20px; font-weight: 700; margin-top: 0;">Vous avez reçu une invitation !</h2>
                                            <p style="color: #475569; font-size: 15px; line-height: 1.6;">
                                                <strong>%s</strong> vous invite à rejoindre son espace <strong>%s</strong> sur QuizzBoard :
                                            </p>
                                            <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 18px 24px; margin: 20px 0; text-align: center;">
                                                <div style="font-size: 18px; font-weight: 800; color: #0F172A;">%s</div>
                                            </div>
                                            %s
                                            <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="margin: 28px 0;">
                                                <tr>
                                                    <td align="center">
                                                        <a href="%s" style="background-color: #F97316; color: #FFFFFF; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 700; font-size: 15px; display: inline-block;">
                                                            Accepter l'invitation
                                                        </a>
                                                    </td>
                                                </tr>
                                            </table>
                                            <p style="color: #94A3B8; font-size: 12px; text-align: center; margin: 0;">
                                                Ce lien d'invitation expire dans 7 jours.
                                            </p>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="background-color: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 20px; text-align: center;">
                                            <p style="color: #64748B; font-size: 12px; margin: 0;">
                                                © 2026 QuizzBoard • Horizon Plus Consulting. Tous droits réservés.
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </body>
                </html>
            """.formatted(inviterName, resourceTypeLabel, resourceName, customMsgHtml, inviteUrl);

            helper.setText(htmlContent, true);
            mailSender.send(message);
            log.info("Email d'invitation envoyé à {}", toEmail);
        } catch (Exception e) {
            log.warn("Erreur lors de l'envoi de l'invitation SMTP : {}", e.getMessage());
        }
    }

    /**
     * Confirmation de changement de mot de passe
     */
    @Async
    public void sendPasswordChangedEmail(String toEmail, String userName) {
        if (toEmail == null || toEmail.isBlank()) return;

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject("QuizzBoard - Votre mot de passe a été modifié 🔒");

            String htmlContent = """
                <!DOCTYPE html>
                <html>
                <body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                    <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="padding: 40px 20px;">
                        <tr>
                            <td align="center">
                                <table width="600" border="0" cellspacing="0" cellpadding="0" style="background: #FFFFFF; border-radius: 12px; border: 1px solid #E2E8F0; padding: 36px 40px;">
                                    <tr>
                                        <td>
                                            <h2 style="color: #0F172A; margin-top: 0;">Bonjour %s,</h2>
                                            <p style="color: #475569; font-size: 15px; line-height: 1.6;">
                                                Le mot de passe de votre compte QuizzBoard vient d'être modifié avec succès.
                                            </p>
                                            <div style="background-color: #FEF2F2; border-left: 4px solid #DC2626; padding: 14px 18px; border-radius: 4px; margin: 20px 0;">
                                                <p style="color: #991B1B; font-size: 13px; margin: 0; line-height: 1.5;">
                                                    ⚠️ <strong>Important :</strong> Si vous n'êtes pas à l'origine de ce changement, veuillez réinitialiser votre mot de passe immédiatement ou contacter le support.
                                                </p>
                                            </div>
                                            <p style="color: #64748B; font-size: 13px;">L'équipe de sécurité QuizzBoard</p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </body>
                </html>
            """.formatted(userName);

            helper.setText(htmlContent, true);
            mailSender.send(message);
            log.info("Email de confirmation de mot de passe envoyé à {}", toEmail);
        } catch (Exception e) {
            log.warn("Erreur SMTP mot de passe modifié : {}", e.getMessage());
        }
    }

    /**
     * Confirmation de paiement réussi & activation abonnement
     */
    @Async
    public void sendPaymentSuccessEmail(String toEmail, String userName, String planName, Double amountFcfa, String reference) {
        if (toEmail == null || toEmail.isBlank()) return;

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject("Paiement Confirmé - Votre abonnement " + planName + " est actif ! 🎉");

            String htmlContent = """
                <!DOCTYPE html>
                <html>
                <body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                    <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="padding: 40px 20px;">
                        <tr>
                            <td align="center">
                                <table width="600" border="0" cellspacing="0" cellpadding="0" style="background: #FFFFFF; border-radius: 12px; border: 1px solid #E2E8F0; overflow: hidden;">
                                    <tr>
                                        <td style="background-color: #0F172A; padding: 32px; text-align: center;">
                                            <h1 style="color: #FFFFFF; margin: 0; font-size: 22px; font-weight: 800;">QUIZZBOARD</h1>
                                            <p style="color: #94A3B8; margin: 6px 0 0 0; font-size: 13px;">Confirmation de Paiement</p>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 36px 40px;">
                                            <h2 style="color: #0F172A; margin-top: 0;">Merci %s ! 🎉</h2>
                                            <p style="color: #475569; font-size: 15px; line-height: 1.6;">
                                                Votre paiement de <strong>%.0f FCFA</strong> pour la formule <strong>%s</strong> a bien été reçu et validé.
                                            </p>
                                            <table width="100%%" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px 20px; margin: 20px 0; font-size: 14px;">
                                                <tr><td>Référence :</td><td align="right"><strong>%s</strong></td></tr>
                                                <tr><td>Forfait :</td><td align="right"><strong>%s</strong></td></tr>
                                                <tr><td>Montant :</td><td align="right"><strong style="color: #F97316;">%.0f FCFA</strong></td></tr>
                                                <tr><td>Statut :</td><td align="right"><strong style="color: #16A34A;">PAYÉ / ACTIF</strong></td></tr>
                                            </table>
                                            <div style="text-align: center; margin-top: 24px;">
                                                <a href="http://localhost:4200/app/subscription" style="background-color: #0F172A; color: #FFFFFF; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block;">
                                                    Consulter mon abonnement & factures
                                                </a>
                                            </div>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </body>
                </html>
            """.formatted(userName, amountFcfa, planName, reference, planName, amountFcfa);

            helper.setText(htmlContent, true);
            mailSender.send(message);
            log.info("Email de confirmation de paiement envoyé à {}", toEmail);
        } catch (Exception e) {
            log.warn("Erreur envoi email paiement réussi : {}", e.getMessage());
        }
    }

    /**
     * Test synchrone de connexion et d'envoi SMTP (Diagnostic live)
     */
    public Map<String, Object> testSmtpConnection(String toEmail) {
        Map<String, Object> report = new HashMap<>();
        report.put("smtpHost", smtpHost);
        report.put("smtpPort", smtpPort);
        report.put("smtpUsernameConfigured", smtpUsername != null && !smtpUsername.isBlank() ? smtpUsername : "NON_DEFINI");
        report.put("fromEmail", fromEmail);
        report.put("recipient", toEmail);

        try {
            log.info("Lancement test SMTP vers {} via {}:{} avec compte {}", toEmail, smtpHost, smtpPort, smtpUsername);
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject("Test SMTP QuizzBoard Réussi ! 🚀");
            helper.setText("""
                <!DOCTYPE html>
                <html>
                <body style="font-family: Arial, sans-serif; background-color: #F8FAFC; padding: 30px;">
                    <div style="max-width: 550px; margin: auto; background: white; padding: 25px; border-radius: 10px; border: 1px solid #E2E8F0;">
                        <h2 style="color: #16A34A; margin-top: 0;">Connexion SMTP Opérationnelle ! ✅</h2>
                        <p style="color: #334155; font-size: 14px; line-height: 1.6;">
                            Ce message confirme que votre serveur QuizzBoard déployé sous Docker peut communiquer directement avec le serveur SMTP <strong>%s:%d</strong> avec le compte <strong>%s</strong>.
                        </p>
                        <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 20px 0;">
                        <p style="color: #64748B; font-size: 12px; margin-bottom: 0;">
                            QuizzBoard • Diagnostic d'Infrastructure Email
                        </p>
                    </div>
                </body>
                </html>
            """.formatted(smtpHost, smtpPort, smtpUsername), true);

            mailSender.send(message);
            report.put("success", true);
            report.put("status", "Email envoyé avec succès et délivré au serveur SMTP");
            log.info("Test SMTP réussi avec succès vers {}", toEmail);
        } catch (Exception e) {
            report.put("success", false);
            report.put("errorType", e.getClass().getName());
            report.put("errorMessage", e.getMessage());
            if (e.getCause() != null) {
                report.put("causeMessage", e.getCause().getMessage());
            }
            log.error("Échec du test SMTP vers {} : {}", toEmail, e.getMessage(), e);
        }

        return report;
    }

    /**
     * Test direct synchrone de l'email de résultat de quiz
     */
    public Map<String, Object> testQuizCompletedEmailDirect(String toEmail) {
        Map<String, Object> report = new HashMap<>();
        report.put("smtpHost", smtpHost);
        report.put("smtpPort", smtpPort);
        report.put("fromUsed", resolveFromEmail());
        report.put("recipient", toEmail);

        try {
            sendQuizCompletedEmail(toEmail, "Testeur QuizzBoard", "Quiz Démonstration IA & Certifications", 95.0, 190, 200, 1, 10, true, "QZ-DIAG-2026", null);
            report.put("success", true);
            report.put("status", "Email de résultat de quiz envoyé avec succès et délivré au serveur SMTP.");
        } catch (Exception e) {
            report.put("success", false);
            report.put("errorMessage", e.getMessage());
            log.error("Test direct d'email de quiz échoué pour {} : {}", toEmail, e.getMessage(), e);
        }
        return report;
    }
}
