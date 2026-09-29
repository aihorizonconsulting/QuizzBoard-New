package com.iahorizonplus.quizzboardbackend;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.iahorizonplus.quizzboardbackend.entity.SubscriptionTier;
import com.iahorizonplus.quizzboardbackend.entity.User;
import com.iahorizonplus.quizzboardbackend.entity.UserRole;
import com.iahorizonplus.quizzboardbackend.repository.UserRepository;
import com.iahorizonplus.quizzboardbackend.security.JwtUtils;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Changement de plan de bout en bout sur un environnement de test (paiement simulé, sans clés PayDunya) :
 * choix du forfait STARTER -> page de paiement -> confirmation -> forfait, quotas et facture mis à jour.
 */
@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "app.payment.simulation-enabled=true",
        "app.paydunya.master-key=",
        "app.url=https://dev.quizzboard.com"
})
class PaymentSimulationIntegrationTest {

    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper json;
    @Autowired private UserRepository userRepository;
    @Autowired private JwtUtils jwtUtils;

    @Test
    void choosingStarter_ActivatesPlanOnce_AndLiftsQuotas() throws Exception {
        User creator = userRepository.save(User.builder().prenom("Plan").nom("Test")
                .email("plan-" + UUID.randomUUID() + "@test.local").password("x")
                .role(UserRole.CREATOR).subscriptionTier(SubscriptionTier.FREE).status("ACTIVE").build());
        String auth = "Bearer " + jwtUtils.generateToken(creator.getEmail(), creator.getRole().name());

        String init = mvc.perform(post("/payments/initiate").header("Authorization", auth).contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("paymentMethod", "PAYDUNYA", "planId", "STARTER"))))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        JsonNode payment = json.readTree(init).at("/data");
        assertThat(payment.at("/isSimulated").asBoolean()).isTrue();
        String checkoutUrl = payment.at("/checkoutUrl").asText();
        assertThat(checkoutUrl).startsWith("https://dev.quizzboard.com/app/subscription/callback?token=SIM-");
        String token = checkoutUrl.substring(checkoutUrl.indexOf("token=") + 6, checkoutUrl.indexOf("&"));

        // Confirmation (retour de la page de paiement), puis une seconde fois (rechargement / notification IPN)
        mvc.perform(get("/payments/paydunya/confirm").param("token", token)).andExpect(status().isOk());
        mvc.perform(get("/payments/paydunya/confirm").param("token", token)).andExpect(status().isOk());

        JsonNode usage = json.readTree(mvc.perform(get("/subscriptions/usage").header("Authorization", auth))
                .andReturn().getResponse().getContentAsString()).at("/data");
        assertThat(usage.at("/tier").asText()).isEqualTo("STARTER");
        assertThat(usage.at("/quizzesLimit").isNull()).isTrue();
        assertThat(usage.at("/aiGenerationsLimit").asInt()).isEqualTo(100);
        assertThat(usage.at("/liveParticipantsLimit").asInt()).isEqualTo(300);

        JsonNode invoices = json.readTree(mvc.perform(get("/payments/invoices").header("Authorization", auth))
                .andReturn().getResponse().getContentAsString()).at("/data");
        assertThat(invoices.size()).isEqualTo(1); // une seule facture malgré la double confirmation
        assertThat(invoices.at("/0/status").asText()).isEqualTo("PAID");
    }
}
