package com.iahorizonplus.quizzboardbackend.service.impl;

import com.iahorizonplus.quizzboardbackend.entity.*;
import com.iahorizonplus.quizzboardbackend.exception.ResourceNotFoundException;
import com.iahorizonplus.quizzboardbackend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

        user.setSubscriptionTier(SubscriptionTier.STARTER);
        userRepository.save(user);

        // Création de la facture
        Invoice invoice = Invoice.builder()
                .userId(user.getId())
                .userName(user.getPrenom() + " " + user.getNom())
                .userEmail(user.getEmail())
                .planName("Abonnement STARTER Illimité (Mensuel)")
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
                .title("Abonnement STARTER Activé ! 🎉")
                .message("Votre paiement de " + (transaction.getAmountFcfa() != null ? transaction.getAmountFcfa().intValue() + " FCFA" : transaction.getAmountUsd() + " $") + " via " + transaction.getPaymentMethod() + " a été validé avec succès.")
                .actionLink("/app/subscription")
                .isRead(false)
                .build();
        notificationRepository.save(notification);

        // Audit Log
        AuditLog logEntry = AuditLog.builder()
                .adminName("Système de Paiement")
                .action("Encaissement & Mise à niveau STARTER (" + transaction.getPaymentMethod() + ")")
                .target(user.getEmail())
                .severity("INFO")
                .build();
        auditLogRepository.save(logEntry);

        log.info("L'utilisateur {} est désormais passé au forfait STARTER avec succès.", user.getEmail());
        return savedInvoice;
    }
}
