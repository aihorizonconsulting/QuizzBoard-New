package com.iahorizonplus.quizzboardbackend.repository;

import com.iahorizonplus.quizzboardbackend.entity.Course;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CourseRepository extends JpaRepository<Course, String> {
    List<Course> findByCreatorIdOrderByCreatedAtDesc(String creatorId);
    List<Course> findByStatus(String status);
    long countByCreatorIdAndCreatedAtAfter(String creatorId, java.time.LocalDateTime since);
}
