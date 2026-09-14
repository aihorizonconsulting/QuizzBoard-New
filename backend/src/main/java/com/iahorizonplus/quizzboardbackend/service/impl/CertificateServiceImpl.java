package com.iahorizonplus.quizzboardbackend.service.impl;

import com.iahorizonplus.quizzboardbackend.entity.Certificate;
import com.iahorizonplus.quizzboardbackend.entity.Participation;
import com.iahorizonplus.quizzboardbackend.exception.ResourceNotFoundException;
import com.iahorizonplus.quizzboardbackend.repository.CertificateRepository;
import com.iahorizonplus.quizzboardbackend.repository.ParticipationRepository;
import com.iahorizonplus.quizzboardbackend.service.CertificateService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class CertificateServiceImpl implements CertificateService {

    private final CertificateRepository certificateRepository;
    private final ParticipationRepository participationRepository;

    @Override
    @Transactional
    public Certificate generateCertificate(String participationId) {
        // Check if certificate already exists
        Optional<Certificate> existing = certificateRepository.findByParticipationId(participationId);
        if (existing.isPresent()) {
            return existing.get();
        }

        Participation participation = participationRepository.findById(participationId)
                .orElseThrow(() -> new ResourceNotFoundException("Participation non trouvée"));

        if (!participation.isCertificateEligible() && participation.getPercentage() < 70.0) {
            throw new IllegalStateException("Le score de " + participation.getPercentage() + "% est insuffisant pour délivrer un certificat (minimum 70%).");
        }

        String randomCode = "QZ-" + (1000 + new SecureRandom().nextInt(9000)) + "-" + ((int) Math.round(participation.getPercentage()));

        Certificate cert = Certificate.builder()
                .participationId(participation.getId())
                .quizTitle(participation.getQuizTitle())
                .recipientName(participation.getParticipantName())
                .scorePercent(participation.getPercentage())
                .issuerName("QuizzBoard Certification Academy")
                .verificationCode(randomCode)
                .status("VALID")
                .build();

        Certificate saved = certificateRepository.save(cert);
        participation.setCertificateEligible(true);
        participation.setCertificateId(saved.getId());
        participationRepository.save(participation);

        log.info("Certificat généré avec succès: {} pour {}", saved.getVerificationCode(), saved.getRecipientName());
        return saved;
    }

    @Override
    @Transactional(readOnly = true)
    public Certificate verifyCertificate(String verificationCode) {
        if (verificationCode == null || verificationCode.trim().isEmpty()) {
            throw new IllegalArgumentException("Le code de vérification est obligatoire");
        }
        return certificateRepository.findByVerificationCode(verificationCode.trim().toUpperCase())
                .orElseThrow(() -> new ResourceNotFoundException("Certificat introuvable ou code invalide : " + verificationCode));
    }

    @Override
    @Transactional(readOnly = true)
    public Certificate getCertificateById(String id) {
        return certificateRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Certificat non trouvé avec l'id: " + id));
    }
}
