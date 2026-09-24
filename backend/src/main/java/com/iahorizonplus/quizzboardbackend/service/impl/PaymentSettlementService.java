package com.iahorizonplus.quizzboardbackend.service.impl;

import com.iahorizonplus.quizzboardbackend.entity.*;
import com.iahorizonplus.quizzboardbackend.exception.ResourceNotFoundException;
import com.iahorizonplus.quizzboardbackend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentSettlementService {

    private final TransactionRepository transactionRepository;
    private final UserRepository userRepository;
    private final InvoiceRepository invoiceRepository;
    private final NotificationRepository notificationRepository;
    private final AuditLogRepository auditLogRepository;

    @Transactional
    public Invoice settleSuccessfulPayment(String reference) {
        log.info("Règlement confirmé pour la référence de paiement : {}", reference);

        TransactionRecord transaction = transactionRepository.findByReference(reference)
                .orElseThrow(() -> new ResourceNotFoundException("Transaction introuvable avec la référence : " + reference));

        transaction.setStatus(PaymentStatus.PAID);
        transactionRepository.save(transaction);

        // Mise à niveau du forfait utilisateur vers STARTER
        User user = userRepository.findByEmail(transaction.getUserEmail())
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur introuvable : " + transaction.getUserEmail()));

        boolean learnerPlan = "LEARNER_PLUS".equalsIgnoreCase(transaction.getPlan()) || "LEARNER_MONTHLY".equalsIgnoreCase(transaction.getPlan());
        SubscriptionTier targetTier = learnerPlan ? SubscriptionTier.LEARNER_PLUS : SubscriptionTier.STARTER;
        user.setSubscriptionTier(targetTier);
        user.setSubscriptionExpiresAt(LocalDateTime.now().plusMonths(1));
        userRepository.save(user);

        // Création de la facture
        Invoice invoice = Invoice.builder()
                .userId(user.getId())
                .userName(user.getPrenom() + " " + user.getNom())
                .userEmail(user.getEmail())
                .planName(learnerPlan ? "Abonnement Apprenant Plus (Mensuel)" : "Abonnement STARTER Illimité (Mensuel)")
                .amountFcfa(transaction.getAmountFcfa())
                .amountUsd(transaction.getAmountUsd())
                .paymentMethod(transaction.getPaymentMethod())
                .status(PaymentStatus.PAID)
                .reference(transaction.getReference())
                .receiptUrl("/api/v1/invoices/" + transaction.getReference() + "/pdf")
                .build();

        Invoice savedInvoice = invoiceRepository.save(invoice);

        // Création d'une notification in-app
        Notification notification = Notification.builder()
                .userId(user.getId())
                .type("PAYMENT")
                .title(learnerPlan ? "Abonnement Apprenant Activé !" : "Abonnement STARTER Activé ! 🎉")
                .message("Votre paiement de " + (transaction.getAmountFcfa() != null ? transaction.getAmountFcfa().intValue() + " FCFA" : transaction.getAmountUsd() + " $") + " via " + transaction.getPaymentMethod() + " a été validé avec succès.")
                .actionLink("/app/subscription")
                .isRead(false)
                .build();
        notificationRepository.save(notification);

        // Audit Log
        AuditLog logEntry = AuditLog.builder()
                .adminName("Système de Paiement")
                .action("Encaissement & Mise à niveau " + targetTier + " (" + transaction.getPaymentMethod() + ")")
                .target(user.getEmail())
                .severity("INFO")
                .build();
        auditLogRepository.save(logEntry);

        log.info("L'utilisateur {} est désormais passé au forfait {} jusqu'au {}.", user.getEmail(), targetTier, user.getSubscriptionExpiresAt());
        return savedInvoice;
    }
}
