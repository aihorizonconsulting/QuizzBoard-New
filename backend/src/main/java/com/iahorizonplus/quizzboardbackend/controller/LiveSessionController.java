package com.iahorizonplus.quizzboardbackend.controller;

import com.iahorizonplus.quizzboardbackend.dto.request.CreateLiveSessionRequest;
import com.iahorizonplus.quizzboardbackend.dto.request.JoinLiveSessionRequest;
import com.iahorizonplus.quizzboardbackend.dto.request.LiveProgressRequest;
import com.iahorizonplus.quizzboardbackend.dto.request.UpdateLiveSettingsRequest;
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

    @GetMapping("/mine")
    public ResponseEntity<ApiResponse<List<LiveSessionResponse>>> mine(@AuthenticationPrincipal UserPrincipal currentUser) {
        return ResponseEntity.ok(ApiResponse.ok(liveSessionService.listHostSessions(currentUser), "Sessions Live de l'animateur", List.of(), "/api/v1/live-sessions/mine"));
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

    @PutMapping("/{id}/settings")
    public ResponseEntity<ApiResponse<LiveSessionResponse>> updateSettings(@PathVariable String id, @RequestBody UpdateLiveSettingsRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(liveSessionService.updateSettings(id, request), "Paramètres du Live mis à jour", List.of(), "/api/v1/live-sessions/" + id + "/settings"));
    }

    @PostMapping("/{id}/start")
    public ResponseEntity<ApiResponse<LiveSessionResponse>> start(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.ok(liveSessionService.startSession(id), "Session Live lancée", List.of(), "/api/v1/live-sessions/" + id + "/start"));
    }

    @PostMapping("/{id}/progress")
    public ResponseEntity<ApiResponse<LiveSessionResponse>> progress(@PathVariable String id, @RequestBody LiveProgressRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(liveSessionService.recordProgress(id, request), "Progression enregistrée", List.of(), "/api/v1/live-sessions/" + id + "/progress"));
    }

    @PostMapping("/{id}/finish")
    public ResponseEntity<ApiResponse<LiveSessionResponse>> finish(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.ok(liveSessionService.finishSession(id), "Session Live terminée", List.of(), "/api/v1/live-sessions/" + id + "/finish"));
    }

    @PostMapping("/{id}/stop")
    public ResponseEntity<ApiResponse<LiveSessionResponse>> stop(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.ok(liveSessionService.stopSession(id), "Session Live arrêtée", List.of(), "/api/v1/live-sessions/" + id + "/stop"));
    }
}
