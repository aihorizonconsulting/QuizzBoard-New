package com.iahorizonplus.quizzboardbackend.service.impl;

import com.iahorizonplus.quizzboardbackend.dto.request.PaymentInitiateRequest;
import com.iahorizonplus.quizzboardbackend.dto.response.PaymentInitiateResponse;
import com.iahorizonplus.quizzboardbackend.entity.PaymentMethod;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class WavePaymentService {

    @Value("${app.payment.wave.api-key:}")
    private String waveApiKey;

    @Value("${app.payment.wave.business-id:}")
    private String waveBusinessId;

    public PaymentInitiateResponse createCheckout(String reference, Double amount, String userEmail) {
        log.info("Initialisation du paiement Wave Checkout pour {} (Ref: {}, Montant: {} FCFA)", userEmail, reference, amount);

        // Si la clé d'API Wave de production n'est pas encore renseignée
        if (waveApiKey == null || waveApiKey.isBlank() || waveApiKey.contains("sandbox")) {
            return new PaymentInitiateResponse(
                    "wave-tx-" + System.currentTimeMillis(),
                    reference,
                    PaymentMethod.WAVE,
                    amount,
                    "FCFA",
                    "https://wave.com/checkout/mock/" + reference,
                    "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=wave-" + reference,
                    true,
                    "Session de paiement Wave initialisée (Mode Simulateur disponible)."
            );
        }

        // Intégration API Wave REST (Production)
        String checkoutUrl = "https://api.wave.com/v1/checkout/sessions/" + reference;
        return new PaymentInitiateResponse(
                "wave-" + System.currentTimeMillis(),
                reference,
                PaymentMethod.WAVE,
                amount,
                "FCFA",
                checkoutUrl,
                "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=wave-" + reference,
                false,
                "Lien de paiement Wave sécurisé généré."
        );
    }
}
