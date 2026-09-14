package com.iahorizonplus.quizzboardbackend.service;

import com.iahorizonplus.quizzboardbackend.entity.Certificate;

public interface CertificateService {
    Certificate generateCertificate(String participationId);
    Certificate verifyCertificate(String verificationCode);
    Certificate getCertificateById(String id);
}
