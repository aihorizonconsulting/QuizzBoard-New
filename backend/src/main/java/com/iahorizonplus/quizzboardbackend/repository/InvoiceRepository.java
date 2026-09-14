package com.iahorizonplus.quizzboardbackend.repository;

import com.iahorizonplus.quizzboardbackend.entity.Invoice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, String> {
    List<Invoice> findByUserId(String userId);
    List<Invoice> findByUserIdOrderByCreatedAtDesc(String userId);
    List<Invoice> findByUserEmailOrderByCreatedAtDesc(String userEmail);
}
