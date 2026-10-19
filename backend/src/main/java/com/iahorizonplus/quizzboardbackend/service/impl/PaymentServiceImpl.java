package com.iahorizonplus.quizzboardbackend.service.impl;

import com.iahorizonplus.quizzboardbackend.dto.request.PaymentCallbackRequest;
import com.iahorizonplus.quizzboardbackend.dto.request.PaymentInitiateRequest;
import com.iahorizonplus.quizzboardbackend.dto.response.PaymentInitiateResponse;
import com.iahorizonplus.quizzboardbackend.entity.*;
import com.iahorizonplus.quizzboardbackend.exception.BadRequestException;
import com.iahorizonplus.quizzboardbackend.exception.ResourceNotFoundException;
import com.iahorizonplus.quizzboardbackend.repository.InvoiceRepository;
import com.iahorizonplus.quizzboardbackend.repository.PlatformSettingsRepository;
import com.iahorizonplus.quizzboardbackend.repository.TransactionRepository;
import com.iahorizonplus.quizzboardbackend.repository.UserRepository;
import com.iahorizonplus.quizzboardbackend.service.PaymentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentServiceImpl implements PaymentService {

    private final TransactionRepository transactionRepository;
    private final UserRepository userRepository;
    private final InvoiceRepository invoiceRepository;
    private final WavePaymentService wavePaymentService;
    private final OrangeMoneyPaymentService orangeMoneyPaymentService;
    private final PaymentSettlementService paymentSettlementService;
    private final PayDunyaPaymentService payDunyaPaymentService;
    private final PlatformSettingsRepository settingsRepository;

    @Override
    @Transactional
    public PaymentInitiateResponse initiatePayment(String userEmail, PaymentInitiateRequest request) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur introuvable : " + userEmail));

        if (request.paymentMethod() == PaymentMethod.ORANGE_MONEY) {
            if (request.phoneNumber() == null || request.phoneNumber().trim().isEmpty()) {
                throw new BadRequestException("phoneNumber", "Le numéro de téléphone Orange Money est obligatoire pour l'autorisation de prélèvement.");
            }
            String cleanPhone = request.phoneNumber().replaceAll("[\\s\\-\\(\\)\\+]", "");
            if (cleanPhone.length() < 8) {
                throw new BadRequestException("phoneNumber", "Le numéro de téléphone Orange Money saisi est invalide (au moins 8 chiffres requis).");
            }
        } else if (request.paymentMethod() == PaymentMethod.WAVE) {
            if (request.phoneNumber() != null && !request.phoneNumber().trim().isEmpty()) {
                String cleanPhone = request.phoneNumber().replaceAll("[\\s\\-\\(\\)\\+]", "");
                if (cleanPhone.length() < 8) {
                    throw new BadRequestException("phoneNumber", "Le numéro de téléphone Wave saisi est invalide (au moins 8 chiffres requis).");
                }
            }
        }

        String prefix = switch (request.paymentMethod()) {
            case WAVE -> "WAVE-";
            case ORANGE_MONEY -> "OM-";
            case PAYDUNYA -> "PD-";
            case STRIPE -> "STRIPE-";
        };

        String reference = prefix + System.currentTimeMillis() + "-" + UUID.randomUUID().toString().substring(0, 4).toUpperCase();

        // Seuls deux forfaits payants existent ; leur prix est celui fixé dans Admin > Paramètres.
        // Un montant envoyé par le navigateur est ignoré (sinon on pourrait payer 1 F pour un forfait).
        boolean learnerPlan = "LEARNER_PLUS".equalsIgnoreCase(request.planId()) || "LEARNER_MONTHLY".equalsIgnoreCase(request.planId());
        String planId = learnerPlan ? "LEARNER_PLUS" : "STARTER";
        Double amountFcfa = defaultAmountFcfa(planId);
        Double amountUsd = defaultAmountUsd(planId);

        // Enregistrement initial de la transaction en attente
        TransactionRecord record = TransactionRecord.builder()
                .userName(user.getPrenom() + " " + user.getNom())
                .userEmail(user.getEmail())
                .organization(user.getOrganization())
                .plan(planId)
                .amountFcfa(amountFcfa)
                .amountUsd(amountUsd)
                .paymentMethod(request.paymentMethod())
                .status(PaymentStatus.INITIATED)
                .reference(reference)
                .build();

        transactionRepository.save(record);

        if (request.paymentMethod() == PaymentMethod.PAYDUNYA) {
            return payDunyaPaymentService.createCheckout(reference, amountFcfa, userEmail);
        } else if (request.paymentMethod() == PaymentMethod.WAVE) {
            return wavePaymentService.createCheckout(reference, amountFcfa, userEmail);
        } else if (request.paymentMethod() == PaymentMethod.ORANGE_MONEY) {
            return orangeMoneyPaymentService.createWebPayment(reference, amountFcfa, userEmail, request.phoneNumber());
        } else {
            record.setStatus(PaymentStatus.FAILED);
            transactionRepository.save(record);
            throw new BadRequestException("paymentMethod", "Le paiement Stripe réel n'est pas encore configuré. Choisissez PayDunya.");
        }
    }

    @Override
    @Transactional
    public Invoice handlePaymentCallback(PaymentCallbackRequest callback) {
        log.info("Réception d'un webhook/callback de paiement pour la référence : {}", callback.reference());

        if ("PAID".equalsIgnoreCase(callback.status()) || "SUCCESS".equalsIgnoreCase(callback.status())) {
            return paymentSettlementService.settleSuccessfulPayment(callback.reference());
        }

        TransactionRecord transaction = transactionRepository.findByReference(callback.reference())
                .orElseThrow(() -> new ResourceNotFoundException("Transaction introuvable : " + callback.reference()));

        transaction.setStatus(PaymentStatus.FAILED);
        transactionRepository.save(transaction);
        return null;
    }

    @Override
    @Transactional
    public Invoice confirmPayDunya(String token) {
        return payDunyaPaymentService.confirmInvoice(token);
    }

    @Override
    @Transactional
    public boolean handlePayDunyaIpn(java.util.Map<String, Object> payload) {
        return payDunyaPaymentService.handleIpn(payload);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Invoice> getUserInvoices(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur introuvable : " + userEmail));
        return invoiceRepository.findByUserIdOrderByCreatedAtDesc(user.getId());
    }

    private double defaultAmountFcfa(String planId) {
        PlatformSettings settings = platformSettings();
        return "LEARNER_PLUS".equalsIgnoreCase(planId) || "LEARNER_MONTHLY".equalsIgnoreCase(planId)
                ? settings.getLearnerPlusPriceFcfa()
                : settings.getStarterPriceFcfa();
    }

    private double defaultAmountUsd(String planId) {
        PlatformSettings settings = platformSettings();
        return "LEARNER_PLUS".equalsIgnoreCase(planId) || "LEARNER_MONTHLY".equalsIgnoreCase(planId)
                ? settings.getLearnerPlusPriceUsd()
                : settings.getStarterPriceUsd();
    }

    private PlatformSettings platformSettings() {
        return settingsRepository.findById("default-settings")
                .orElseGet(() -> settingsRepository.save(PlatformSettings.builder().id("default-settings").build()));
    }
}
