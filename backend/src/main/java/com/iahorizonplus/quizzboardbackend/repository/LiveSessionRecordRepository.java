package com.iahorizonplus.quizzboardbackend.repository;

import com.iahorizonplus.quizzboardbackend.entity.LiveSessionRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LiveSessionRecordRepository extends JpaRepository<LiveSessionRecord, String> {
    List<LiveSessionRecord> findTop100ByHostIdOrderByCreatedAtDesc(String hostId);
    Optional<LiveSessionRecord> findFirstByPinCodeAndStatusNotOrderByCreatedAtDesc(String pinCode, String status);
}
