package com.iahorizonplus.quizzboardbackend.repository;

import com.iahorizonplus.quizzboardbackend.entity.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StudentRepository extends JpaRepository<Student, String> {
    List<Student> findByClasseId(String classeId);
    Optional<Student> findByClasseIdAndEmail(String classeId, String email);
    Optional<Student> findByEmail(String email);
    Optional<Student> findByMatricule(String matricule);
}
