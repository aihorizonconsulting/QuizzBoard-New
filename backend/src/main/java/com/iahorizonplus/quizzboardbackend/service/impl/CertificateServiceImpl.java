package com.iahorizonplus.quizzboardbackend.service.impl;

import com.iahorizonplus.quizzboardbackend.entity.Certificate;
import com.iahorizonplus.quizzboardbackend.entity.Participation;
import com.iahorizonplus.quizzboardbackend.entity.User;
import com.iahorizonplus.quizzboardbackend.exception.ResourceNotFoundException;
import com.iahorizonplus.quizzboardbackend.repository.CertificateRepository;
import com.iahorizonplus.quizzboardbackend.repository.ParticipationRepository;
import com.iahorizonplus.quizzboardbackend.repository.UserRepository;
import com.iahorizonplus.quizzboardbackend.service.CertificateService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class CertificateServiceImpl implements CertificateService {

    private final CertificateRepository certificateRepository;
    private final ParticipationRepository participationRepository;
    private final UserRepository userRepository;
    private final LearningStatsService learningStatsService;

    /** Noms génériques de l'ancien QuizzBoard : on leur préfère le nom du compte sur le certificat. */
    private static final Set<String> GENERIC_NAMES = Set.of("participant", "player", "participant invité", "apprenant", "invité");

    @Override
    @Transactional
    public Certificate generateCertificate(String participationId) {
        Participation participation = participationRepository.findById(participationId)
                .orElseThrow(() -> new ResourceNotFoundException("Participation non trouvée"));
        User owner = participation.getUserId() != null ? userRepository.findById(participation.getUserId()).orElse(null) : null;
        return issue(participation, owner);
    }

    private Certificate issue(Participation participation, User owner) {
        // Check if certificate already exists
        Optional<Certificate> existing = certificateRepository.findByParticipationId(participation.getId());
        if (existing.isPresent()) {
            return existing.get();
        }

        if (!participation.isCertificateEligible() && participation.getPercentage() < 70.0) {
            throw new IllegalStateException("Le score de " + participation.getPercentage() + "% est insuffisant pour délivrer un certificat (minimum 70%).");
        }

        Certificate cert = Certificate.builder()
                .participationId(participation.getId())
                .quizTitle(participation.getQuizTitle() != null ? participation.getQuizTitle() : "Évaluation QuizzBoard")
                .recipientName(recipientName(participation, owner))
                .scorePercent(participation.getPercentage())
                .issuerName("QuizzBoard Certification Academy")
                .verificationCode(uniqueVerificationCode(participation.getPercentage()))
                .status("VALID")
                .build();

        Certificate saved = certificateRepository.save(cert);
        participation.setCertificateEligible(true);
        participation.setCertificateId(saved.getId());
        participationRepository.save(participation);

        log.info("Certificat généré avec succès: {} pour {}", saved.getVerificationCode(), saved.getRecipientName());
        return saved;
    }

    private String recipientName(Participation participation, User owner) {
        String name = participation.getParticipantName() != null ? participation.getParticipantName().trim() : "";
        boolean generic = name.isEmpty() || GENERIC_NAMES.contains(name.toLowerCase());
        if (generic && owner != null && owner.getPrenom() != null) {
            return (owner.getPrenom() + " " + (owner.getNom() != null ? owner.getNom() : "")).trim();
        }
        return name.isEmpty() ? "Participant" : name;
    }

    /** Code de vérification unique (le code est public et sert à vérifier l'authenticité). */
    private String uniqueVerificationCode(double percentage) {
        SecureRandom random = new SecureRandom();
        String code;
        do {
            code = "QZ-" + (1000 + random.nextInt(9000)) + "-" + (int) Math.round(percentage);
        } while (certificateRepository.findByVerificationCode(code).isPresent());
        return code;
    }

    @Override
    @Transactional
    public List<Certificate> getCertificatesOfUser(String userId) {
        // Les certificats étaient créés mais jamais listés : la page « Mes certificats » se vidait au
        // rechargement. On les renvoie ici, en délivrant ceux qui manquent pour les participations réussies
        // (y compris les résultats importés de l'ancien QuizzBoard).
        // Les quiz joués avec l'email du compte sans être connecté comptent aussi.
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) return List.of();
        List<Certificate> certificates = new ArrayList<>();
        for (Participation p : learningStatsService.completedParticipationsOf(user)) {
            if (p.getPercentage() >= LearningStatsService.PASS_THRESHOLD || p.getCertificateId() != null) {
                certificates.add(issue(p, user));
            }
        }
        certificates.sort(Comparator.comparing(Certificate::getIssuedAt, Comparator.nullsLast(Comparator.reverseOrder())));
        return certificates;
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
