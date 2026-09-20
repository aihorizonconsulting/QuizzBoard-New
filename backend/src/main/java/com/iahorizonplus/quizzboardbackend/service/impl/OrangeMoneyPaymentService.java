package com.iahorizonplus.quizzboardbackend.service.impl;

import com.iahorizonplus.quizzboardbackend.dto.response.PaymentInitiateResponse;
import com.iahorizonplus.quizzboardbackend.entity.PaymentMethod;
import com.iahorizonplus.quizzboardbackend.exception.BadRequestException;
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
            throw new BadRequestException("orangeMoney", "Orange Money n'est pas configuré pour les paiements réels.");
        }

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
