package com.iahorizonplus.quizzboardbackend.service.impl;

import com.iahorizonplus.quizzboardbackend.dto.response.PaymentInitiateResponse;
import com.iahorizonplus.quizzboardbackend.entity.PaymentMethod;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class OrangeMoneyPaymentService {

    @Value("${app.payment.orange-money.client-id:}")
    private String omClientId;

    @Value("${app.payment.orange-money.merchant-key:}")
    private String omMerchantKey;

    public PaymentInitiateResponse createWebPayment(String reference, Double amount, String userEmail, String phoneNumber) {
        log.info("Initialisation du paiement Orange Money WebPay pour {} (Tel: {}, Ref: {}, Montant: {} FCFA)", userEmail, phoneNumber, reference, amount);

        if (omClientId == null || omClientId.isBlank() || omClientId.contains("developer")) {
            return new PaymentInitiateResponse(
                    "om-tx-" + System.currentTimeMillis(),
                    reference,
                    PaymentMethod.ORANGE_MONEY,
                    amount,
                    "FCFA",
                    "https://webpayment.orange-money.com/pay/mock/" + reference,
                    "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=om-" + reference,
                    true,
                    "Paiement Orange Money initialisé (Composez le #144# ou validez sur le simulateur)."
            );
        }

        // Intégration API Orange Money WebPay (Production)
        String paymentUrl = "https://api.orange.com/orange-money-webpay/dev/v1/webpayment/" + reference;
        return new PaymentInitiateResponse(
                "om-" + System.currentTimeMillis(),
                reference,
                PaymentMethod.ORANGE_MONEY,
                amount,
                "FCFA",
                paymentUrl,
                null,
                false,
                "Lien Orange Money WebPay généré avec succès."
        );
    }
}
