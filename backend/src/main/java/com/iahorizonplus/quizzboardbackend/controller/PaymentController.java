package com.iahorizonplus.quizzboardbackend.controller;

import com.iahorizonplus.quizzboardbackend.dto.request.PaymentCallbackRequest;
import com.iahorizonplus.quizzboardbackend.dto.request.PaymentInitiateRequest;
import com.iahorizonplus.quizzboardbackend.dto.response.ApiResponse;
import com.iahorizonplus.quizzboardbackend.dto.response.LinkDto;
import com.iahorizonplus.quizzboardbackend.dto.response.PaymentInitiateResponse;
import com.iahorizonplus.quizzboardbackend.entity.Invoice;
import com.iahorizonplus.quizzboardbackend.entity.PaymentMethod;
import com.iahorizonplus.quizzboardbackend.security.UserPrincipal;
import com.iahorizonplus.quizzboardbackend.service.PaymentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/payments")
@RequiredArgsConstructor
@Tag(name = "Paiements & Abonnements", description = "Passerelle de paiement Wave, Orange Money et Simulateur de paiement local (Richardson Niveau 3)")
public class PaymentController {

    private final PaymentService paymentService;

    @PostMapping("/initiate")
    @Operation(summary = "Initier une transaction de paiement (Wave, Orange Money ou Simulateur)")
    public ResponseEntity<ApiResponse<PaymentInitiateResponse>> initiatePayment(
            @Valid @RequestBody PaymentInitiateRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        String email = currentUser != null ? currentUser.getEmail() : "user@quizzboard.com";
        PaymentInitiateResponse result = paymentService.initiatePayment(email, request);
        List<LinkDto> links = List.of(
                new LinkDto("self", "/api/v1/payments/initiate", "POST", "application/json"),
                new LinkDto("invoices", "/api/v1/payments/invoices", "GET", "application/json")
        );
        return new ResponseEntity<>(ApiResponse.created(result, "Transaction de paiement initiée", links, "/api/v1/payments/initiate"), HttpStatus.CREATED);
    }

    @PostMapping("/callback")
    @Operation(summary = "Webhook / Callback de notification des passerelles Wave et Orange Money")
    public ResponseEntity<ApiResponse<Invoice>> handleCallback(@RequestBody PaymentCallbackRequest callback) {
        Invoice invoice = paymentService.handlePaymentCallback(callback);
        List<LinkDto> links = List.of(
                new LinkDto("self", "/api/v1/payments/callback", "POST", "application/json"),
                new LinkDto("invoices", "/api/v1/payments/invoices", "GET", "application/json")
        );
        return ResponseEntity.ok(ApiResponse.ok(invoice, "Callback de paiement traité", links, "/api/v1/payments/callback"));
    }

    @PostMapping("/paydunya/initiate")
    @Operation(summary = "Initier une transaction de paiement PayDunya directement")
    public ResponseEntity<ApiResponse<PaymentInitiateResponse>> initiatePayDunyaPayment(
            @RequestBody(required = false) PaymentInitiateRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        String email = currentUser != null ? currentUser.getEmail() : "user@quizzboard.com";
        String planId = request != null && request.planId() != null ? request.planId() : "STARTER";
        double defaultFcfa = "LEARNER_PLUS".equalsIgnoreCase(planId) || "LEARNER_MONTHLY".equalsIgnoreCase(planId) ? 200.0 : 999.0;
        double defaultUsd = "LEARNER_PLUS".equalsIgnoreCase(planId) || "LEARNER_MONTHLY".equalsIgnoreCase(planId) ? 0.5 : 2.0;
        PaymentInitiateRequest req = request != null
                ? new PaymentInitiateRequest(PaymentMethod.PAYDUNYA, planId, request.amountFcfa() != null ? request.amountFcfa() : defaultFcfa, request.amountUsd() != null ? request.amountUsd() : defaultUsd, "FCFA", request.phoneNumber())
                : new PaymentInitiateRequest(PaymentMethod.PAYDUNYA, "STARTER", defaultFcfa, defaultUsd, "FCFA", null);
        PaymentInitiateResponse result = paymentService.initiatePayment(email, req);
        List<LinkDto> links = List.of(
                new LinkDto("self", "/api/v1/payments/paydunya/initiate", "POST", "application/json"),
                new LinkDto("confirm", "/api/v1/payments/paydunya/confirm", "POST", "application/json"),
                new LinkDto("invoices", "/api/v1/payments/invoices", "GET", "application/json")
        );
        return new ResponseEntity<>(ApiResponse.created(result, "Session PayDunya initiée", links, "/api/v1/payments/paydunya/initiate"), HttpStatus.CREATED);
    }

    @GetMapping("/paydunya/confirm")
    @Operation(summary = "Confirmer et valider un paiement PayDunya après redirection (GET)")
    public ResponseEntity<ApiResponse<Invoice>> confirmPayDunya(@RequestParam String token) {
        Invoice invoice = paymentService.confirmPayDunya(token);
        List<LinkDto> links = List.of(
                new LinkDto("self", "/api/v1/payments/paydunya/confirm?token=" + token, "GET", "application/json"),
                new LinkDto("invoices", "/api/v1/payments/invoices", "GET", "application/json"),
                new LinkDto("subscriptions", "/api/v1/subscriptions/current", "GET", "application/json")
        );
        return ResponseEntity.ok(ApiResponse.ok(invoice, "Paiement PayDunya validé avec succès", links, "/api/v1/payments/paydunya/confirm"));
    }

    @PostMapping("/paydunya/confirm")
    @Operation(summary = "Confirmer et valider un paiement PayDunya après redirection (POST)")
    public ResponseEntity<ApiResponse<Invoice>> confirmPayDunyaPost(
            @RequestParam(required = false) String token,
            @RequestBody(required = false) java.util.Map<String, String> body) {
        String resolvedToken = token;
        if ((resolvedToken == null || resolvedToken.isBlank()) && body != null) {
            resolvedToken = body.get("token");
        }
        Invoice invoice = paymentService.confirmPayDunya(resolvedToken);
        List<LinkDto> links = List.of(
                new LinkDto("self", "/api/v1/payments/paydunya/confirm", "POST", "application/json"),
                new LinkDto("invoices", "/api/v1/payments/invoices", "GET", "application/json"),
                new LinkDto("subscriptions", "/api/v1/subscriptions/current", "GET", "application/json")
        );
        return ResponseEntity.ok(ApiResponse.ok(invoice, "Paiement PayDunya validé avec succès", links, "/api/v1/payments/paydunya/confirm"));
    }

    @PostMapping("/paydunya/ipn")
    @Operation(summary = "Webhook IPN PayDunya (Notification Instantanée de Paiement)")
    public ResponseEntity<String> handlePayDunyaIpn(@RequestBody java.util.Map<String, Object> payload) {
        boolean success = paymentService.handlePayDunyaIpn(payload);
        if (success) {
            return ResponseEntity.ok("IPN_PROCESSED_SUCCESSFULLY");
        }
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("IPN_REJECTED");
    }

    @GetMapping("/invoices")
    @Operation(summary = "Lister les factures de l'utilisateur connecté")
    public ResponseEntity<ApiResponse<List<Invoice>>> getMyInvoices(@AuthenticationPrincipal UserPrincipal currentUser) {
        String email = currentUser != null ? currentUser.getEmail() : "user@quizzboard.com";
        List<Invoice> invoices = paymentService.getUserInvoices(email);
        List<LinkDto> links = List.of(
                new LinkDto("self", "/api/v1/payments/invoices", "GET", "application/json"),
                new LinkDto("initiate", "/api/v1/payments/initiate", "POST", "application/json"),
                new LinkDto("subscriptions", "/api/v1/subscriptions/current", "GET", "application/json")
        );
        return ResponseEntity.ok(ApiResponse.ok(invoices, "Historique des factures récupéré", links, "/api/v1/payments/invoices"));
    }
}
