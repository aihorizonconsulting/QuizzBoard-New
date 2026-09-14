package com.iahorizonplus.quizzboardbackend.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "app.payment.paydunya")
@Data
public class PayDunyaConfig {

    private String masterKey = "";
    private String privateKey = "";
    private String publicKey = "";
    private String token = "";
    private String mode = "sandbox"; // "sandbox" or "live"
    private String cancelUrl = "http://localhost:4200/app/pricing?status=cancelled";
    private String returnUrl = "http://localhost:4200/app/subscription/callback";
    private String callbackUrl = "http://localhost:8080/api/v1/payments/paydunya/ipn";

    public String getBaseUrl() {
        if ("live".equalsIgnoreCase(mode)) {
            return "https://app.paydunya.com/api/v1";
        }
        return "https://app.paydunya.com/sandbox-api/v1";
    }

    public boolean isConfigured() {
        return masterKey != null && !masterKey.isBlank() && !masterKey.contains("placeholder") && !masterKey.contains("votre_")
                && privateKey != null && !privateKey.isBlank() && !privateKey.contains("votre_")
                && token != null && !token.isBlank() && !token.contains("votre_");
    }
}
