package com.iahorizonplus.quizzboardbackend.controller;

import com.iahorizonplus.quizzboardbackend.dto.request.CreateLiveSessionRequest;
import com.iahorizonplus.quizzboardbackend.dto.request.JoinLiveSessionRequest;
import com.iahorizonplus.quizzboardbackend.dto.response.ApiResponse;
import com.iahorizonplus.quizzboardbackend.dto.response.LiveSessionResponse;
import com.iahorizonplus.quizzboardbackend.security.UserPrincipal;
import com.iahorizonplus.quizzboardbackend.service.LiveSessionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/live-sessions")
@RequiredArgsConstructor
public class LiveSessionController {

    private final LiveSessionService liveSessionService;

    @PostMapping
    public ResponseEntity<ApiResponse<LiveSessionResponse>> create(
            @RequestBody CreateLiveSessionRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        LiveSessionResponse data = liveSessionService.createSession(request, currentUser);
        return ResponseEntity.status(201).body(ApiResponse.created(data, "Session Live créée", List.of(), "/api/v1/live-sessions"));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<LiveSessionResponse>> get(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.ok(liveSessionService.getSession(id), "Session Live récupérée", List.of(), "/api/v1/live-sessions/" + id));
    }

    @GetMapping("/pin/{pin}")
    public ResponseEntity<ApiResponse<LiveSessionResponse>> getByPin(@PathVariable String pin) {
        return ResponseEntity.ok(ApiResponse.ok(liveSessionService.getSessionByPin(pin), "Session Live récupérée par PIN", List.of(), "/api/v1/live-sessions/pin/" + pin));
    }

    @PostMapping("/{id}/join")
    public ResponseEntity<ApiResponse<LiveSessionResponse>> join(@PathVariable String id, @RequestBody JoinLiveSessionRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(liveSessionService.joinSession(id, request), "Participant ajouté au Live", List.of(), "/api/v1/live-sessions/" + id + "/join"));
    }

    @PostMapping("/{id}/start")
    public ResponseEntity<ApiResponse<LiveSessionResponse>> start(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.ok(liveSessionService.startSession(id), "Session Live lancée", List.of(), "/api/v1/live-sessions/" + id + "/start"));
    }

    @PostMapping("/{id}/next")
    public ResponseEntity<ApiResponse<LiveSessionResponse>> next(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.ok(liveSessionService.nextQuestion(id), "Question suivante", List.of(), "/api/v1/live-sessions/" + id + "/next"));
    }

    @PostMapping("/{id}/stop")
    public ResponseEntity<ApiResponse<LiveSessionResponse>> stop(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.ok(liveSessionService.stopSession(id), "Session Live arrêtée", List.of(), "/api/v1/live-sessions/" + id + "/stop"));
    }
}
