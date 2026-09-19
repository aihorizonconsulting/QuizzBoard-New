package com.iahorizonplus.quizzboardbackend.service;

import com.iahorizonplus.quizzboardbackend.config.PayDunyaConfig;
import com.iahorizonplus.quizzboardbackend.dto.response.PaymentInitiateResponse;
import com.iahorizonplus.quizzboardbackend.entity.Invoice;
import com.iahorizonplus.quizzboardbackend.entity.PaymentMethod;
import com.iahorizonplus.quizzboardbackend.entity.PaymentStatus;
import com.iahorizonplus.quizzboardbackend.entity.TransactionRecord;
import com.iahorizonplus.quizzboardbackend.exception.BadRequestException;
import com.iahorizonplus.quizzboardbackend.external.SmtpEmailService;
import com.iahorizonplus.quizzboardbackend.repository.TransactionRepository;
import com.iahorizonplus.quizzboardbackend.service.impl.PayDunyaPaymentService;
import com.iahorizonplus.quizzboardbackend.service.impl.PaymentSimulationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PayDunyaPaymentServiceTest {

    @Mock
    private PayDunyaConfig payDunyaConfig;

    @Mock
    private TransactionRepository transactionRepository;

    @Mock
    private PaymentSimulationService paymentSimulationService;

    @Mock
    private SmtpEmailService emailService;

    @InjectMocks
    private PayDunyaPaymentService payDunyaPaymentService;

    private TransactionRecord transaction;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(payDunyaPaymentService, "simulationEnabled", true);
        transaction = TransactionRecord.builder()
                .id("tx-1")
                .reference("PD-12345")
                .amountFcfa(9900.0)
                .userEmail("client@quizzboard.com")
                .status(PaymentStatus.INITIATED)
                .build();
    }

    @Test
    @DisplayName("Initiation PayDunya réelle : rejet si clés manquantes et simulation désactivée")
    void createCheckout_MissingConfigAndSimulationDisabled_ThrowsBadRequestException() {
        ReflectionTestUtils.setField(payDunyaPaymentService, "simulationEnabled", false);
        when(transactionRepository.findByReference("PD-12345")).thenReturn(Optional.of(transaction));
        when(payDunyaConfig.isConfigured()).thenReturn(false);

        assertThatThrownBy(() -> payDunyaPaymentService.createCheckout("PD-12345", 9900.0, "client@quizzboard.com"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("PayDunya");

        assertThat(transaction.getStatus()).isEqualTo(PaymentStatus.FAILED);
        verify(transactionRepository).save(transaction);
    }

    @Test
    @DisplayName("Confirmation PayDunya réelle : rejet des tokens mock si simulation désactivée")
    void confirmInvoice_MockTokenAndSimulationDisabled_ThrowsBadRequestException() {
        ReflectionTestUtils.setField(payDunyaPaymentService, "simulationEnabled", false);

        assertThatThrownBy(() -> payDunyaPaymentService.confirmInvoice("mock-PD-12345"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("simulé");

        verify(paymentSimulationService, never()).simulateSuccess(any());
    }

    @Test
    @DisplayName("Initiation PayDunya (Mode Sandbox) : Génération de session avec token mock et checkoutUrl")
    void createCheckout_SandboxMode_Success() {
        when(transactionRepository.findByReference("PD-12345")).thenReturn(Optional.of(transaction));
        when(payDunyaConfig.isConfigured()).thenReturn(false);
        when(payDunyaConfig.getReturnUrl()).thenReturn("http://localhost:4200/app/subscription/callback");

        PaymentInitiateResponse response = payDunyaPaymentService.createCheckout("PD-12345", 9900.0, "client@quizzboard.com");

        assertThat(response).isNotNull();
        assertThat(response.reference()).isEqualTo("PD-12345");
        assertThat(response.paymentMethod()).isEqualTo(PaymentMethod.PAYDUNYA);
        assertThat(response.checkoutUrl()).contains("token=mock-PD-12345");
        assertThat(response.isSimulated()).isTrue();

        verify(transactionRepository).save(transaction);
        assertThat(transaction.getPaydunyaToken()).isEqualTo("mock-PD-12345");
    }

    @Test
    @DisplayName("Confirmation PayDunya : Validation avec token mock simulant un succès")
    void confirmInvoice_MockToken_Success() {
        Invoice invoice = Invoice.builder()
                .reference("PD-12345")
                .amountFcfa(9900.0)
                .status(PaymentStatus.PAID)
                .build();

        when(paymentSimulationService.simulateSuccess("PD-12345")).thenReturn(invoice);

        Invoice confirmed = payDunyaPaymentService.confirmInvoice("mock-PD-12345");

        assertThat(confirmed).isNotNull();
        assertThat(confirmed.getReference()).isEqualTo("PD-12345");
        assertThat(confirmed.getStatus()).isEqualTo(PaymentStatus.PAID);
        verify(paymentSimulationService).simulateSuccess("PD-12345");
    }

    @Test
    @DisplayName("Confirmation PayDunya : Rejet avec exception si token vide ou nul")
    void confirmInvoice_EmptyToken_ThrowsBadRequestException() {
        assertThatThrownBy(() -> payDunyaPaymentService.confirmInvoice(""))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("token");

        assertThatThrownBy(() -> payDunyaPaymentService.confirmInvoice(null))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("token");
    }

    @Test
    @DisplayName("Webhook IPN PayDunya : Validation rigoureuse de l'empreinte SHA-512 de la clé Master")
    void handleIpn_ValidSha512Hash_Success() throws Exception {
        String masterKey = "secure-master-key-xyz";
        when(payDunyaConfig.isConfigured()).thenReturn(true);
        when(payDunyaConfig.getMasterKey()).thenReturn(masterKey);

        MessageDigest md = MessageDigest.getInstance("SHA-512");
        String expectedHash = HexFormat.of().formatHex(md.digest(masterKey.getBytes(StandardCharsets.UTF_8)));

        Map<String, Object> data = Map.of(
                "hash", expectedHash,
                "status", "completed",
                "custom_data", Map.of("reference", "PD-12345")
        );
        Map<String, Object> payload = Map.of("data", data);

        boolean handled = payDunyaPaymentService.handleIpn(payload);

        assertThat(handled).isTrue();
        verify(paymentSimulationService).simulateSuccess("PD-12345");
    }

    @Test
    @DisplayName("Webhook IPN PayDunya : Rejet immédiat si le hash SHA-512 est invalide")
    void handleIpn_InvalidHash_Rejected() {
        when(payDunyaConfig.isConfigured()).thenReturn(true);
        when(payDunyaConfig.getMasterKey()).thenReturn("secure-master-key");

        Map<String, Object> data = Map.of(
                "hash", "invalid-fraudulent-hash",
                "status", "completed",
                "custom_data", Map.of("reference", "PD-12345")
        );
        Map<String, Object> payload = Map.of("data", data);

        boolean handled = payDunyaPaymentService.handleIpn(payload);

        assertThat(handled).isFalse();
        verify(paymentSimulationService, never()).simulateSuccess(any());
    }
}
