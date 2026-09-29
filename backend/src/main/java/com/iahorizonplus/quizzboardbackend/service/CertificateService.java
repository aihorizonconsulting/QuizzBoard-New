package com.iahorizonplus.quizzboardbackend.service;

import com.iahorizonplus.quizzboardbackend.entity.Certificate;

import java.util.List;

public interface CertificateService {
    Certificate generateCertificate(String participationId);
    Certificate verifyCertificate(String verificationCode);
    Certificate getCertificateById(String id);
    /** Certificats de l'utilisateur : un par participation terminée réussie (score >= 70 %). */
    List<Certificate> getCertificatesOfUser(String userId);
}
