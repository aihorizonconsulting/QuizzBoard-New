package com.iahorizonplus.quizzboardbackend.repository;

import com.iahorizonplus.quizzboardbackend.entity.Quiz;
import com.iahorizonplus.quizzboardbackend.entity.QuizStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface QuizRepository extends JpaRepository<Quiz, String> {
    List<Quiz> findByCreatorIdOrderByCreatedAtDesc(String creatorId);
    List<Quiz> findByVisibilityAndStatus(String visibility, QuizStatus status);
    Optional<Quiz> findByShareCode(String shareCode);
    Optional<Quiz> findByPin(String pin);
}
