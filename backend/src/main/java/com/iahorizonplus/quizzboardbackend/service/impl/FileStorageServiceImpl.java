package com.iahorizonplus.quizzboardbackend.service.impl;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.iahorizonplus.quizzboardbackend.exception.BadRequestException;
import com.iahorizonplus.quizzboardbackend.exception.ResourceNotFoundException;
import com.iahorizonplus.quizzboardbackend.service.FileStorageService;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.*;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

@Service
@Slf4j
public class FileStorageServiceImpl implements FileStorageService {

    @Value("${app.storage.provider:local}")
    private String storageProvider;

    @Value("${app.storage.local-dir:uploads}")
    private String localUploadDir;

    @Value("${app.storage.base-url:http://localhost:8080/api/v1/files}")
    private String storageBaseUrl;

    @Value("${app.cloudinary.cloud-name:}")
    private String cloudName;

    @Value("${app.cloudinary.api-key:}")
    private String apiKey;

    @Value("${app.cloudinary.api-secret:}")
    private String apiSecret;

    private Cloudinary cloudinary;
    private Path rootLocation;

    @PostConstruct
    public void init() {
        this.rootLocation = Paths.get(localUploadDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(rootLocation);
            Files.createDirectories(rootLocation.resolve("quizzes"));
            Files.createDirectories(rootLocation.resolve("classes"));
            Files.createDirectories(rootLocation.resolve("profiles"));
            Files.createDirectories(rootLocation.resolve("courses"));
            Files.createDirectories(rootLocation.resolve("general"));
        } catch (IOException e) {
            log.warn("Impossible de pré-créer les répertoires d'upload locaux : {}", e.getMessage());
        }

        if (isCloudinaryConfigured()) {
            this.cloudinary = new Cloudinary(ObjectUtils.asMap(
                    "cloud_name", cloudName,
                    "api_key", apiKey,
                    "api_secret", apiSecret,
                    "secure", true
            ));
            log.info("Mode Stockage : CLOUDINARY activé (Cloud Name: '{}')", cloudName);
        } else {
            log.info("Mode Stockage : LOCAL activé (Dossier local: '{}')", rootLocation);
        }
    }

    private boolean isCloudinaryConfigured() {
        return "cloudinary".equalsIgnoreCase(storageProvider)
                && cloudName != null && !cloudName.isBlank() && !cloudName.equals("votre_cloud_name")
                && apiKey != null && !apiKey.isBlank() && !apiKey.equals("votre_api_key");
    }

    @Override
    public String storeFile(MultipartFile file, String folder) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Le fichier envoyé est vide ou manquant.");
        }

        String safeFolder = cleanFolder(folder);

        // 1. Essai de téléversement Cloudinary si configuré en production
        if (isCloudinaryConfigured()) {
            try {
                @SuppressWarnings("rawtypes")
                Map uploadParams = ObjectUtils.asMap(
                        "folder", "quizzboard/" + safeFolder,
                        "resource_type", "auto"
                );
                @SuppressWarnings("rawtypes")
                Map result = cloudinary.uploader().upload(file.getBytes(), uploadParams);
                String secureUrl = (String) result.get("secure_url");
                log.info("Fichier uploadé avec succès sur Cloudinary: {}", secureUrl);
                return secureUrl;
            } catch (Exception e) {
                log.warn("Échec du téléversement Cloudinary ({}), bascule automatique sur le stockage local.", e.getMessage());
            }
        }

        // 2. Stockage sur disque local (Mode local ou fallback)
        return storeLocally(file, safeFolder);
    }

    private String storeLocally(MultipartFile file, String folder) {
        try {
            String originalFilename = StringUtils.cleanPath(Objects.requireNonNull(file.getOriginalFilename()));
            String extension = "";
            int extIndex = originalFilename.lastIndexOf(".");
            if (extIndex > 0) {
                extension = originalFilename.substring(extIndex);
            }

            String uniqueFilename = UUID.randomUUID() + extension;
            Path folderPath = rootLocation.resolve(folder).normalize();
            Files.createDirectories(folderPath);

            Path targetLocation = folderPath.resolve(uniqueFilename);
            Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);

            String localUrl = storageBaseUrl + "/" + folder + "/" + uniqueFilename;
            log.info("Fichier enregistré localement : {}", localUrl);
            return localUrl;
        } catch (IOException e) {
            log.error("Erreur lors de l'enregistrement local du fichier : {}", e.getMessage());
            throw new BadRequestException("Impossible d'enregistrer le fichier image : " + e.getMessage());
        }
    }

    @Override
    public Resource loadFileAsResource(String folder, String filename) {
        try {
            String safeFolder = cleanFolder(folder);
            Path filePath = rootLocation.resolve(safeFolder).resolve(filename).normalize();
            Resource resource = new UrlResource(filePath.toUri());

            if (resource.exists() && resource.isReadable()) {
                return resource;
            } else {
                throw new ResourceNotFoundException("Fichier non trouvé ou illisible : " + filename);
            }
        } catch (MalformedURLException e) {
            throw new ResourceNotFoundException("URL de fichier invalide : " + filename);
        }
    }

    @Override
    public String getContentType(String filename) {
        String lower = filename.toLowerCase();
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
        if (lower.endsWith(".webp")) return "image/webp";
        if (lower.endsWith(".gif")) return "image/gif";
        if (lower.endsWith(".svg")) return "image/svg+xml";
        if (lower.endsWith(".pdf")) return "application/pdf";
        return "application/octet-stream";
    }

    private String cleanFolder(String folder) {
        if (folder == null || folder.isBlank()) {
            return "general";
        }
        String clean = folder.toLowerCase().replaceAll("[^a-z0-9_-]", "");
        return clean.isEmpty() ? "general" : clean;
    }
}
