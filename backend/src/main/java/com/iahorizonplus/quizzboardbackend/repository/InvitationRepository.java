package com.iahorizonplus.quizzboardbackend.repository;

import com.iahorizonplus.quizzboardbackend.entity.Invitation;
import com.iahorizonplus.quizzboardbackend.entity.InvitationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface InvitationRepository extends JpaRepository<Invitation, String> {
    Optional<Invitation> findByToken(String token);
    List<Invitation> findByTargetEmailAndStatusOrderByCreatedAtDesc(String targetEmail, InvitationStatus status);
    List<Invitation> findByTargetEmailOrderByCreatedAtDesc(String targetEmail);
    List<Invitation> findByResourceIdAndStatus(String resourceId, InvitationStatus status);
    List<Invitation> findByInviterIdOrderByCreatedAtDesc(String inviterId);
    Optional<Invitation> findByResourceIdAndTargetEmailAndStatus(String resourceId, String targetEmail, InvitationStatus status);
}
