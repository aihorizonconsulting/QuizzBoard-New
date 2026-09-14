package com.iahorizonplus.quizzboardbackend.dto.response;

import com.iahorizonplus.quizzboardbackend.entity.PaymentMethod;

public record PaymentInitiateResponse(
    String transactionId,
    String reference,
    PaymentMethod paymentMethod,
    Double amount,
    String currency,
    String checkoutUrl,
    String qrCodeUrl,
    boolean isSimulated,
    String message
) {}
