package com.iahorizonplus.quizzboardbackend.repository;

import com.iahorizonplus.quizzboardbackend.entity.CommunityMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CommunityMemberRepository extends JpaRepository<CommunityMember, String> {
    List<CommunityMember> findByCommunityId(String communityId);
    List<CommunityMember> findByUserId(String userId);
    Optional<CommunityMember> findByCommunityIdAndUserId(String communityId, String userId);
}
