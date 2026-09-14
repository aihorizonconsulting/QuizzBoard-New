package com.iahorizonplus.quizzboardbackend.repository;

import com.iahorizonplus.quizzboardbackend.entity.ResourceFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ResourceFileRepository extends JpaRepository<ResourceFile, String> {
    List<ResourceFile> findByCommunityIdOrderByUploadedAtDesc(String communityId);
}
