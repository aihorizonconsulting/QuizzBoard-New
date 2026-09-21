package com.iahorizonplus.quizzboardbackend.service;

import com.iahorizonplus.quizzboardbackend.dto.request.CreateLiveSessionRequest;
import com.iahorizonplus.quizzboardbackend.dto.request.JoinLiveSessionRequest;
import com.iahorizonplus.quizzboardbackend.dto.response.LiveSessionResponse;
import com.iahorizonplus.quizzboardbackend.security.UserPrincipal;

public interface LiveSessionService {
    LiveSessionResponse createSession(CreateLiveSessionRequest request, UserPrincipal currentUser);
    LiveSessionResponse getSession(String id);
    LiveSessionResponse getSessionByPin(String pin);
    LiveSessionResponse joinSession(String id, JoinLiveSessionRequest request);
    LiveSessionResponse startSession(String id);
    LiveSessionResponse nextQuestion(String id);
    LiveSessionResponse stopSession(String id);
}
