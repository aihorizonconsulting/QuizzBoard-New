package com.iahorizonplus.quizzboardbackend.service;

import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

public interface FileStorageService {

    /**
     * Téléverse ou stocke un fichier image dans le dossier spécifié
     * (quizzes, classes, profiles, courses, general).
     * En production : téléverse vers Cloudinary et retourne l'URL HTTPS CDN.
     * En local : stocke sur le disque local et retourne l'URL d'accès locale.
     *
     * @param file   le fichier multipart reçu
     * @param folder le sous-dossier ou catégorie cible
     * @return l'URL publique de l'image (Cloudinary ou local)
     */
    String storeFile(MultipartFile file, String folder);

    /**
     * Charge une ressource de fichier stockée localement pour affichage direct
     *
     * @param folder   le sous-dossier (ex: quizzes, profiles)
     * @param filename le nom du fichier
     * @return la ressource Spring
     */
    Resource loadFileAsResource(String folder, String filename);

    /**
     * Détermine le type MIME du fichier pour les réponses HTTP
     *
     * @param filename le nom du fichier
     * @return le Content-Type (ex: image/png, image/jpeg)
     */
    String getContentType(String filename);
}
