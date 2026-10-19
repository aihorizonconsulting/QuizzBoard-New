package com.iahorizonplus.quizzboardbackend.repository;

import com.iahorizonplus.quizzboardbackend.entity.RemedialPack;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RemedialPackRepository extends JpaRepository<RemedialPack, String> {

    List<RemedialPack> findByUserIdOrderByUpdatedAtDesc(String userId);

    Optional<RemedialPack> findFirstByUserIdAndQuizId(String userId, String quizId);
}
