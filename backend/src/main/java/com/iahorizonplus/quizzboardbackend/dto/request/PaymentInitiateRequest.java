package com.iahorizonplus.quizzboardbackend.dto.request;

import com.iahorizonplus.quizzboardbackend.entity.PaymentMethod;
import jakarta.validation.constraints.NotNull;

public record PaymentInitiateRequest(
    @NotNull(message = "Le moyen de paiement est obligatoire")
    PaymentMethod paymentMethod,

    String planId, // STARTER

    Double amountFcfa,
    Double amountUsd,
    String currency, // FCFA, USD
    String phoneNumber // Optionnel (pour Orange Money USSD)
) {}
