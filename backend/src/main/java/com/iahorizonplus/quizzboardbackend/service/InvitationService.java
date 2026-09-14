package com.iahorizonplus.quizzboardbackend.service;

import com.iahorizonplus.quizzboardbackend.dto.request.CreateInvitationRequest;
import com.iahorizonplus.quizzboardbackend.dto.response.AcceptInvitationResponse;
import com.iahorizonplus.quizzboardbackend.dto.response.InvitationResponse;
import com.iahorizonplus.quizzboardbackend.security.UserPrincipal;

import java.util.List;

public interface InvitationService {

    List<InvitationResponse> createInvitations(UserPrincipal currentUser, CreateInvitationRequest request);

    InvitationResponse verifyInvitation(String token);

    AcceptInvitationResponse acceptInvitation(String token, UserPrincipal currentUser);

    List<InvitationResponse> getMyPendingInvitations(UserPrincipal currentUser);

    void declineInvitation(String token, UserPrincipal currentUser);

    void cancelInvitation(String invitationId, UserPrincipal currentUser);
}
