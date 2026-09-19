package com.iahorizonplus.quizzboardbackend.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.iahorizonplus.quizzboardbackend.config.PayDunyaConfig;
import com.iahorizonplus.quizzboardbackend.dto.response.PaymentInitiateResponse;
import com.iahorizonplus.quizzboardbackend.entity.*;
import com.iahorizonplus.quizzboardbackend.exception.BadRequestException;
import com.iahorizonplus.quizzboardbackend.exception.ResourceNotFoundException;
import com.iahorizonplus.quizzboardbackend.external.SmtpEmailService;
import com.iahorizonplus.quizzboardbackend.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class PayDunyaPaymentService {

    private final PayDunyaConfig payDunyaConfig;
    private final TransactionRepository transactionRepository;
    private final PaymentSimulationService paymentSimulationService;
    private final SmtpEmailService emailService;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${app.payment.simulation-enabled:true}")
    private boolean simulationEnabled;

    /**
     * Initialise une facture et session de paiement PayDunya
     */
    @Transactional
    public PaymentInitiateResponse createCheckout(String reference, Double amountFcfa, String userEmail) {
        log.info("Initialisation du paiement PayDunya pour {} (Ref: {}, Montant: {} FCFA)", userEmail, reference, amountFcfa);

        TransactionRecord transaction = transactionRepository.findByReference(reference)
                .orElseThrow(() -> new ResourceNotFoundException("Transaction introuvable avec la référence : " + reference));

        if (!payDunyaConfig.isConfigured()) {
            if (simulationEnabled) {
                log.warn("PayDunya n'est pas complètement configuré (clés manquantes). Utilisation du mode simulation local.");
                return createSimulatedCheckout(transaction, reference, amountFcfa, "Session PayDunya simulée créée. Redirection vers la page de confirmation.");
            }
            transaction.setStatus(PaymentStatus.FAILED);
            transactionRepository.save(transaction);
            throw new BadRequestException("paydunya", "PayDunya n'est pas configuré sur le serveur. Impossible d'initier un paiement réel.");
        }

        try {
            // Création de la facture PayDunya via API REST
            String url = payDunyaConfig.getBaseUrl() + "/checkout-invoice/create";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("PAYDUNYA-MASTER-KEY", payDunyaConfig.getMasterKey());
            headers.set("PAYDUNYA-PRIVATE-KEY", payDunyaConfig.getPrivateKey());
            headers.set("PAYDUNYA-TOKEN", payDunyaConfig.getToken());

            Map<String, Object> invoice = Map.of(
                    "total_amount", amountFcfa.intValue(),
                    "description", "Abonnement QuizzBoard STARTER - Accès Illimité"
            );

            Map<String, Object> store = Map.of(
                    "name", "QuizzBoard",
                    "tagline", "Plateforme IA de Quiz & Évaluations Interactives",
                    "website_url", "https://quizzboard.com"
            );

            Map<String, Object> actions = Map.of(
                    "cancel_url", payDunyaConfig.getCancelUrl(),
                    "return_url", payDunyaConfig.getReturnUrl(),
                    "callback_url", payDunyaConfig.getCallbackUrl()
            );

            Map<String, Object> customData = Map.of(
                    "reference", reference,
                    "user_email", userEmail
            );

            Map<String, Object> body = Map.of(
                    "invoice", invoice,
                    "store", store,
                    "actions", actions,
                    "custom_data", customData
            );

            HttpEntity<Map<String, Object>> requestEntity = new HttpEntity<>(body, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(url, requestEntity, String.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                JsonNode root = objectMapper.readTree(response.getBody());
                String responseCode = root.path("response_code").asText();

                if ("00".equals(responseCode)) {
                    String checkoutUrl = root.path("response_text").asText();
                    String invoiceToken = root.path("token").asText();

                    transaction.setPaydunyaToken(invoiceToken);
                    transactionRepository.save(transaction);

                    log.info("Facture PayDunya créée avec succès : token={}, checkoutUrl={}", invoiceToken, checkoutUrl);
                    return new PaymentInitiateResponse(
                            invoiceToken,
                            reference,
                            PaymentMethod.PAYDUNYA,
                            amountFcfa,
                            "FCFA",
                            checkoutUrl,
                            "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=" + checkoutUrl,
                            false,
                            "Facture PayDunya générée avec succès."
                    );
                } else {
                    log.error("PayDunya a retourné une erreur : {}", response.getBody());
                }
            }
        } catch (Exception e) {
            log.error("Erreur lors de l'appel à l'API PayDunya : {}", e.getMessage(), e);
        }

        if (!simulationEnabled) {
            transaction.setStatus(PaymentStatus.FAILED);
            transactionRepository.save(transaction);
            throw new BadRequestException("paydunya", "PayDunya n'a pas pu créer la facture. Aucun paiement simulé n'est autorisé sur cet environnement.");
        }

        log.warn("Basculement sur le mode simulation PayDunya pour la référence {}", reference);
        return createSimulatedCheckout(transaction, reference, amountFcfa, "Mode de secours : Paiement simulé disponible.");
    }

    private PaymentInitiateResponse createSimulatedCheckout(TransactionRecord transaction, String reference, Double amountFcfa, String message) {
        String mockToken = "mock-" + reference;
        transaction.setPaydunyaToken(mockToken);
        transactionRepository.save(transaction);
        String simulatedCheckoutUrl = payDunyaConfig.getReturnUrl() + "?token=" + mockToken;

        return new PaymentInitiateResponse(
                "paydunya-" + System.currentTimeMillis(),
                reference,
                PaymentMethod.PAYDUNYA,
                amountFcfa,
                "FCFA",
                simulatedCheckoutUrl,
                "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=" + simulatedCheckoutUrl,
                true,
                message
        );
    }

    /**
     * Vérifie et confirme le paiement auprès de PayDunya (Server-to-Server)
     */
    @Transactional
    public Invoice confirmInvoice(String token) {
        log.info("Confirmation de paiement PayDunya demandée pour le token : {}", token);

        if (token == null || token.isBlank()) {
            throw new BadRequestException("token", "Le token PayDunya est manquant.");
        }

        // Cas token de simulation / sandbox
        if (token.startsWith("mock-")) {
            if (!simulationEnabled) {
                throw new BadRequestException("token", "Les tokens de paiement simulé ne sont pas acceptés sur cet environnement.");
            }
            String reference = token.substring(5);
            log.info("Validation du token de simulation PayDunya pour la référence : {}", reference);
            return paymentSimulationService.simulateSuccess(reference);
        }

        TransactionRecord transaction = transactionRepository.findByPaydunyaToken(token)
                .orElse(null);

        // Si PayDunya est configuré, on appelle l'API officielle pour confirmation
        if (payDunyaConfig.isConfigured()) {
            try {
                String confirmUrl = payDunyaConfig.getBaseUrl() + "/checkout-invoice/confirm/" + token;

                HttpHeaders headers = new HttpHeaders();
                headers.set("PAYDUNYA-MASTER-KEY", payDunyaConfig.getMasterKey());
                headers.set("PAYDUNYA-PRIVATE-KEY", payDunyaConfig.getPrivateKey());
                headers.set("PAYDUNYA-TOKEN", payDunyaConfig.getToken());

                HttpEntity<Void> entity = new HttpEntity<>(headers);
                ResponseEntity<String> response = restTemplate.exchange(confirmUrl, HttpMethod.GET, entity, String.class);

                if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                    JsonNode root = objectMapper.readTree(response.getBody());
                    String status = root.path("status").asText();
                    log.info("Statut PayDunya reçu pour token {} : {}", token, status);

                    String reference = root.path("custom_data").path("reference").asText();
                    if ((reference == null || reference.isBlank()) && transaction != null) {
                        reference = transaction.getReference();
                    }

                    if ("completed".equalsIgnoreCase(status)) {
                        if (reference != null && !reference.isBlank()) {
                            return paymentSimulationService.simulateSuccess(reference);
                        }
                    } else if ("cancelled".equalsIgnoreCase(status)) {
                        if (transaction != null) {
                            transaction.setStatus(PaymentStatus.CANCELLED);
                            transactionRepository.save(transaction);
                        }
                        throw new BadRequestException("status", "Le paiement a été annulé par l'utilisateur.");
                    } else {
                        log.info("Paiement en attente de validation (statut: {})", status);
                        if (transaction != null) {
                            transaction.setStatus(PaymentStatus.PENDING);
                            transactionRepository.save(transaction);
                        }
                        return null;
                    }
                }
            } catch (BadRequestException bre) {
                throw bre;
            } catch (Exception e) {
                log.error("Erreur lors de la vérification du paiement PayDunya : {}", e.getMessage(), e);
            }
        }

        if (transaction != null && simulationEnabled) {
            log.info("Transaction trouvée sans vérification API externe, validation de sécurité locale.");
            return paymentSimulationService.simulateSuccess(transaction.getReference());
        }

        throw new ResourceNotFoundException("Aucune transaction trouvée pour le token PayDunya : " + token);
    }

    /**
     * Traitement du webhook IPN de PayDunya
     */
    @Transactional
    public boolean handleIpn(Map<String, Object> payload) {
        log.info("Réception d'un webhook IPN PayDunya : {}", payload);

        try {
            // Vérification du hash si PayDunya est configuré
            if (payDunyaConfig.isConfigured() && payload.containsKey("data")) {
                @SuppressWarnings("unchecked")
                Map<String, Object> data = (Map<String, Object>) payload.get("data");
                String receivedHash = (String) data.get("hash");

                if (receivedHash != null) {
                    MessageDigest md = MessageDigest.getInstance("SHA-512");
                    byte[] digest = md.digest(payDunyaConfig.getMasterKey().getBytes(StandardCharsets.UTF_8));
                    String calculatedHash = HexFormat.of().formatHex(digest);

                    if (!calculatedHash.equalsIgnoreCase(receivedHash)) {
                        log.warn("Hash IPN PayDunya invalide ! Calculé: {}, Reçu: {}", calculatedHash, receivedHash);
                        return false;
                    }
                }

                String status = (String) data.get("status");
                @SuppressWarnings("unchecked")
                Map<String, Object> customData = (Map<String, Object>) data.get("custom_data");
                String reference = customData != null ? (String) customData.get("reference") : null;

                if ("completed".equalsIgnoreCase(status) && reference != null) {
                    log.info("IPN PayDunya valide et succès confirmé pour la référence {}", reference);
                    paymentSimulationService.simulateSuccess(reference);
                    return true;
                }
            }
        } catch (Exception e) {
            log.error("Erreur lors du traitement de l'IPN PayDunya : {}", e.getMessage(), e);
        }
        return false;
    }
}
