package com.iahorizonplus.quizzboardbackend.repository;

import com.iahorizonplus.quizzboardbackend.entity.Classe;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ClasseRepository extends JpaRepository<Classe, String> {
    List<Classe> findByCreatorIdOrderByCreatedAtDesc(String creatorId);
    List<Classe> findByCreatorIdAndPromotionIdOrderByCreatedAtDesc(String creatorId, String promotionId);
    List<Classe> findByPromotionId(String promotionId);
    Optional<Classe> findFirstByCodeIgnoreCase(String code);
    boolean existsByCodeIgnoreCase(String code);
    boolean existsByCodeIgnoreCaseAndIdNot(String code, String id);

    @Query("select c from Classe c where exists (select s.id from Student s where s.classe = c and lower(s.email) = lower(:email)) order by c.createdAt desc")
    List<Classe> findEnrolledByStudentEmail(@Param("email") String email);

    @Query("select c from Classe c where :quizId member of c.assignedQuizIds")
    List<Classe> findByAssignedQuizId(@Param("quizId") String quizId);
}
