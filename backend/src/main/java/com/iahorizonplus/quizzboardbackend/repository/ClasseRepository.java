package com.iahorizonplus.quizzboardbackend.repository;

import com.iahorizonplus.quizzboardbackend.entity.Classe;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ClasseRepository extends JpaRepository<Classe, String> {
    List<Classe> findByCreatorIdOrderByCreatedAtDesc(String creatorId);
    List<Classe> findByPromotionId(String promotionId);
}
