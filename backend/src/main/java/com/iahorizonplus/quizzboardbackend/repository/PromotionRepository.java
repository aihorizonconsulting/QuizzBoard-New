package com.iahorizonplus.quizzboardbackend.repository;

import com.iahorizonplus.quizzboardbackend.entity.Promotion;
import com.iahorizonplus.quizzboardbackend.entity.PromotionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PromotionRepository extends JpaRepository<Promotion, String> {
    List<Promotion> findByCreatorIdOrderByCreatedAtDesc(String creatorId);
    List<Promotion> findByCreatorIdAndStatus(String creatorId, PromotionStatus status);
    long countByCreatorId(String creatorId);
}
