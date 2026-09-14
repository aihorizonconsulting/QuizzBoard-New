package com.iahorizonplus.quizzboardbackend.controller;

import com.iahorizonplus.quizzboardbackend.dto.response.ApiResponse;
import com.iahorizonplus.quizzboardbackend.dto.response.LinkDto;
import com.iahorizonplus.quizzboardbackend.service.FileStorageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/files")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Gestion des Fichiers & Médias", description = "Téléversement d'images (Cloudinary en production / stockage local en développement) pour quiz, classes, profils et cours (Richardson Niveau 3).")
public class FileController {

    private final FileStorageService fileStorageService;

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Téléverser une image (Quiz, Profil, Classe, Cours)")
    public ResponseEntity<ApiResponse<Map<String, Object>>> uploadFile(
            @Parameter(description = "Fichier image à téléverser (PNG, JPG, WEBP, SVG)", required = true)
            @RequestParam("file") MultipartFile file,
            @Parameter(description = "Catégorie ou dossier cible (quizzes, classes, profiles, courses, general)")
            @RequestParam(value = "folder", defaultValue = "general") String folder) {

        String fileUrl = fileStorageService.storeFile(file, folder);

        Map<String, Object> data = new HashMap<>();
        data.put("url", fileUrl);
        data.put("folder", folder);
        data.put("originalFilename", file.getOriginalFilename());
        data.put("size", file.getSize());

        List<LinkDto> links = List.of(
                new LinkDto("self", "/api/v1/files/upload", "POST", "multipart/form-data"),
                new LinkDto("view-file", fileUrl, "GET", "image/*")
        );

        return new ResponseEntity<>(
                ApiResponse.created(data, "Fichier téléversé avec succès", links, "/api/v1/files/upload"),
                HttpStatus.CREATED
        );
    }

    @GetMapping("/{folder}/{filename:.+}")
    @Operation(summary = "Récupérer et afficher une image stockée localement")
    public ResponseEntity<Resource> getLocalFile(
            @PathVariable String folder,
            @PathVariable String filename) {

        Resource resource = fileStorageService.loadFileAsResource(folder, filename);
        String contentType = fileStorageService.getContentType(filename);

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + resource.getFilename() + "\"")
                .body(resource);
    }
}
