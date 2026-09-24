package com.iahorizonplus.quizzboardbackend.service;

import com.iahorizonplus.quizzboardbackend.dto.request.CreateLiveSessionRequest;
import com.iahorizonplus.quizzboardbackend.dto.request.JoinLiveSessionRequest;
import com.iahorizonplus.quizzboardbackend.dto.request.LiveProgressRequest;
import com.iahorizonplus.quizzboardbackend.dto.request.UpdateLiveSettingsRequest;
import com.iahorizonplus.quizzboardbackend.dto.response.LiveSessionResponse;
import com.iahorizonplus.quizzboardbackend.security.UserPrincipal;

import java.util.List;

public interface LiveSessionService {
    LiveSessionResponse createSession(CreateLiveSessionRequest request, UserPrincipal currentUser);
    LiveSessionResponse getSession(String id);
    LiveSessionResponse getSessionByPin(String pin);
    List<LiveSessionResponse> listHostSessions(UserPrincipal currentUser);
    LiveSessionResponse joinSession(String id, JoinLiveSessionRequest request);
    LiveSessionResponse updateSettings(String id, UpdateLiveSettingsRequest request);
    LiveSessionResponse startSession(String id);
    LiveSessionResponse recordProgress(String id, LiveProgressRequest request);
    LiveSessionResponse finishSession(String id);
    LiveSessionResponse stopSession(String id);
}
