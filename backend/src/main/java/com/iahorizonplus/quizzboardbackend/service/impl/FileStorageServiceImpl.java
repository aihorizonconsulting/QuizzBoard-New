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

    private static final String DOCUMENTS_FOLDER = "documents";
    private static final long MAX_DOCUMENT_BYTES = 20L * 1024 * 1024;

    /** Formats acceptés pour les documents de communauté, avec leur type MIME. */
    private static final Map<String, String> DOCUMENT_TYPES = Map.ofEntries(
            Map.entry("pdf", "application/pdf"),
            Map.entry("doc", "application/msword"),
            Map.entry("docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
            Map.entry("odt", "application/vnd.oasis.opendocument.text"),
            Map.entry("rtf", "application/rtf"),
            Map.entry("txt", "text/plain; charset=UTF-8"),
            Map.entry("ppt", "application/vnd.ms-powerpoint"),
            Map.entry("pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation"),
            Map.entry("odp", "application/vnd.oasis.opendocument.presentation"),
            Map.entry("xls", "application/vnd.ms-excel"),
            Map.entry("xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
            Map.entry("ods", "application/vnd.oasis.opendocument.spreadsheet"),
            Map.entry("csv", "text/csv; charset=UTF-8"),
            Map.entry("zip", "application/zip"),
            Map.entry("rar", "application/vnd.rar"),
            Map.entry("7z", "application/x-7z-compressed"),
            Map.entry("png", "image/png"),
            Map.entry("jpg", "image/jpeg"),
            Map.entry("jpeg", "image/jpeg"),
            Map.entry("gif", "image/gif"),
            Map.entry("webp", "image/webp"),
            Map.entry("mp3", "audio/mpeg"),
            Map.entry("mp4", "video/mp4"));

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
        if (!Files.isWritable(rootLocation)) {
            log.error("Dossier d'upload {} non accessible en écriture : les documents des communautés ne pourront pas être déposés.", rootLocation);
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
        String type = DOCUMENT_TYPES.get(extensionOf(lower));
        return type != null ? type : "application/octet-stream";
    }

    @Override
    public String storeDocument(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("file", "Choisissez un fichier à partager.");
        }
        if (file.getSize() > MAX_DOCUMENT_BYTES) {
            throw new BadRequestException("file", "Fichier trop volumineux : 20 Mo maximum.");
        }
        String extension = extensionOf(file.getOriginalFilename());
        if (!DOCUMENT_TYPES.containsKey(extension)) {
            throw new BadRequestException("file",
                    "Format non pris en charge. Formats acceptés : PDF, Word, PowerPoint, Excel, texte, ZIP, images, MP3 et MP4.");
        }
        String storedFileName = UUID.randomUUID() + "." + extension;
        try (var in = file.getInputStream()) {
            Path folder = rootLocation.resolve(DOCUMENTS_FOLDER);
            Files.createDirectories(folder);
            Files.copy(in, folder.resolve(storedFileName));
            log.info("Document de communauté enregistré : {} ({} octets)", storedFileName, file.getSize());
            return storedFileName;
        } catch (IOException e) {
            log.error("Enregistrement du document impossible : {}", e.getMessage());
            throw new BadRequestException("file", "Le document n'a pas pu être enregistré. Réessayez dans un instant.");
        }
    }

    @Override
    public Resource loadDocument(String storedFileName) {
        Path path = documentPath(storedFileName);
        if (path == null || !Files.isReadable(path)) {
            throw new ResourceNotFoundException("Ce document n'est plus disponible sur le serveur.");
        }
        try {
            return new UrlResource(path.toUri());
        } catch (MalformedURLException e) {
            throw new ResourceNotFoundException("Ce document n'est plus disponible sur le serveur.");
        }
    }

    @Override
    public void deleteDocument(String storedFileName) {
        Path path = documentPath(storedFileName);
        if (path == null) return;
        try {
            Files.deleteIfExists(path);
        } catch (IOException e) {
            log.warn("Suppression du document {} impossible : {}", storedFileName, e.getMessage());
        }
    }

    /** Chemin d'un document stocké ; null si le nom n'est pas un nom généré par storeDocument (pas de ../). */
    private Path documentPath(String storedFileName) {
        if (storedFileName == null || !storedFileName.matches("[0-9a-f-]{36}\\.[a-z0-9]{1,5}")) {
            return null;
        }
        return rootLocation.resolve(DOCUMENTS_FOLDER).resolve(storedFileName).normalize();
    }

    private static String extensionOf(String filename) {
        if (filename == null) return "";
        int dot = filename.lastIndexOf('.');
        return dot >= 0 ? filename.substring(dot + 1).toLowerCase() : "";
    }

    private String cleanFolder(String folder) {
        if (folder == null || folder.isBlank()) {
            return "general";
        }
        String clean = folder.toLowerCase().replaceAll("[^a-z0-9_-]", "");
        // Le dossier des documents de communauté n'est accessible qu'aux membres (téléchargement via l'API communautés)
        return clean.isEmpty() || clean.equals(DOCUMENTS_FOLDER) ? "general" : clean;
    }
}
