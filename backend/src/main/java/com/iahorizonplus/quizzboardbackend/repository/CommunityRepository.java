package com.iahorizonplus.quizzboardbackend.repository;

import com.iahorizonplus.quizzboardbackend.entity.Community;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CommunityRepository extends JpaRepository<Community, String> {
    List<Community> findByCreatorIdOrderByCreatedAtDesc(String creatorId);
    Optional<Community> findByAccessCode(String accessCode);
    long countByCreatorId(String creatorId);
}
