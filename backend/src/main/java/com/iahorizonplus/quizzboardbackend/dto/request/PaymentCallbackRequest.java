package com.iahorizonplus.quizzboardbackend.dto.request;

public record PaymentCallbackRequest(
    String reference,
    String status, // PAID, FAILED, CANCELLED
    String transactionId,
    String providerReference
) {}
