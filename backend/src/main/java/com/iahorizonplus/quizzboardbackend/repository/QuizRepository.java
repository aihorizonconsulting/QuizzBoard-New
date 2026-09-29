package com.iahorizonplus.quizzboardbackend.repository;

import com.iahorizonplus.quizzboardbackend.entity.Quiz;
import com.iahorizonplus.quizzboardbackend.entity.QuizStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface QuizRepository extends JpaRepository<Quiz, String> {
    List<Quiz> findByCreatorIdOrderByCreatedAtDesc(String creatorId);
    long countByCreatorId(String creatorId);
    List<Quiz> findByVisibilityAndStatus(String visibility, QuizStatus status);
    Optional<Quiz> findByShareCode(String shareCode);
    Optional<Quiz> findByPin(String pin);

    /**
     * Quiz créés sur la plateforme actuelle (identifiant UUID). Les quiz importés de l'ancien
     * QuizzBoard (identifiants numériques ou cuid) ne comptent pas dans les quotas du forfait.
     */
    @Query("select count(q) from Quiz q where q.creatorId = :creatorId and q.id like '________-____-____-____-____________'")
    long countCreatedOnPlatformByCreatorId(@Param("creatorId") String creatorId);

    @Query("select q from Quiz q where :classId member of q.assignedClassIds")
    List<Quiz> findByAssignedClassId(@Param("classId") String classId);
}
