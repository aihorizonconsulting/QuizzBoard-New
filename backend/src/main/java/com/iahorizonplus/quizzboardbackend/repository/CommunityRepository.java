package com.iahorizonplus.quizzboardbackend.repository;

import com.iahorizonplus.quizzboardbackend.entity.Community;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CommunityRepository extends JpaRepository<Community, String> {
    List<Community> findByCreatorIdOrderByCreatedAtDesc(String creatorId);
    Optional<Community> findByAccessCode(String accessCode);
    long countByCreatorId(String creatorId);

    /** Communautés créées sur la plateforme actuelle (UUID) : celles importées de l'ancien QuizzBoard ne comptent pas dans les quotas. */
    @Query("select count(c) from Community c where c.creatorId = :creatorId and c.id like '________-____-____-____-____________'")
    long countCreatedOnPlatformByCreatorId(@Param("creatorId") String creatorId);
}
