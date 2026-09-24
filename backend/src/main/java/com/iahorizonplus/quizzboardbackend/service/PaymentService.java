package com.iahorizonplus.quizzboardbackend.service;

import com.iahorizonplus.quizzboardbackend.dto.request.PaymentCallbackRequest;
import com.iahorizonplus.quizzboardbackend.dto.request.PaymentInitiateRequest;
import com.iahorizonplus.quizzboardbackend.dto.response.PaymentInitiateResponse;
import com.iahorizonplus.quizzboardbackend.entity.Invoice;

import java.util.List;

public interface PaymentService {

    PaymentInitiateResponse initiatePayment(String userEmail, PaymentInitiateRequest request);

    Invoice handlePaymentCallback(PaymentCallbackRequest callback);

    Invoice confirmPayDunya(String token);

    boolean handlePayDunyaIpn(java.util.Map<String, Object> payload);

    List<Invoice> getUserInvoices(String userEmail);
}
