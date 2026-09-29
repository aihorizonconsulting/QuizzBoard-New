package com.iahorizonplus.quizzboardbackend.repository;

import com.iahorizonplus.quizzboardbackend.entity.Participation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ParticipationRepository extends JpaRepository<Participation, String> {
    List<Participation> findByUserIdOrderByCompletedAtDesc(String userId);
    List<Participation> findByQuizIdOrderByScoreDesc(String quizId);
    List<Participation> findByQuizIdAndClassIdOrderByScoreDesc(String quizId, String classId);
    List<Participation> findByQuizIdIn(List<String> quizIds);
    long countByQuizIdIn(List<String> quizIds);
    List<Participation> findByUserIdAndStatus(String userId, String status);
    List<Participation> findByStatus(String status);

    /** Participations d'un compte : liées au compte, ou jouées avec son email sans être connecté (ancien QuizzBoard, invités). */
    @Query("select p from Participation p where p.status = :status and (p.userId = :userId or (p.userId is null and lower(trim(p.participantEmail)) = :email))")
    List<Participation> findOwnedByStatus(@Param("userId") String userId, @Param("email") String normalizedEmail, @Param("status") String status);
    List<Participation> findByQuizIdAndStatusOrderByScoreDesc(String quizId, String status);
    List<Participation> findByQuizIdAndClassIdAndStatusOrderByScoreDesc(String quizId, String classId, String status);
}
