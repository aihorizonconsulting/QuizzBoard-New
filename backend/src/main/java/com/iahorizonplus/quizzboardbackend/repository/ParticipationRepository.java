package com.iahorizonplus.quizzboardbackend.repository;

import com.iahorizonplus.quizzboardbackend.entity.Participation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ParticipationRepository extends JpaRepository<Participation, String> {
    List<Participation> findByUserIdOrderByCompletedAtDesc(String userId);
    List<Participation> findByQuizIdOrderByScoreDesc(String quizId);
    List<Participation> findByQuizIdIn(List<String> quizIds);
    long countByQuizIdIn(List<String> quizIds);
}
