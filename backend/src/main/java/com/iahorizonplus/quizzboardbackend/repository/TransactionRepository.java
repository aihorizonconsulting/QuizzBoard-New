package com.iahorizonplus.quizzboardbackend.repository;

import com.iahorizonplus.quizzboardbackend.entity.TransactionRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TransactionRepository extends JpaRepository<TransactionRecord, String> {
    Optional<TransactionRecord> findByReference(String reference);
    Optional<TransactionRecord> findByPaydunyaToken(String paydunyaToken);
    List<TransactionRecord> findByUserEmailOrderByCreatedAtDesc(String userEmail);
    List<TransactionRecord> findAllByOrderByCreatedAtDesc();
}
