package com.iahorizonplus.quizzboardbackend.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "community_resources")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ResourceFile {

    public static final String KIND_FILE = "FILE";
    public static final String KIND_LINK = "LINK";

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(length = 1000)
    private String description;

    /** FILE : document déposé sur QuizzBoard ; LINK : lien externe (Drive, YouTube, site...). */
    private String kind;

    @Column(nullable = false)
    @Builder.Default
    private String fileType = "PDF"; // PDF, DOC, SLIDES, SHEET, ZIP, IMAGE, LINK, OTHER

    private String fileSize;

    /** Lien externe (LINK) ; pour un document déposé, le téléchargement passe par l'API (réservé aux membres). */
    @Column(length = 1000)
    private String fileUrl;

    private String originalFileName;
    private String contentType;
    private Long sizeBytes;

    /** Nom du fichier sur le serveur (jamais exposé). */
    @JsonIgnore
    private String storedFileName;

    private String uploadedById;
    private String uploadedByName;

    @Builder.Default
    private int downloadCount = 0;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "community_id")
    @JsonIgnore
    private Community community;

    @CreationTimestamp
    private LocalDateTime uploadedAt;

    public boolean isLink() {
        return KIND_LINK.equals(kind);
    }
}
