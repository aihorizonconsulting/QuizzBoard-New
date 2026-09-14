package com.iahorizonplus.quizzboardbackend.controller;

import com.iahorizonplus.quizzboardbackend.dto.response.ApiResponse;
import com.iahorizonplus.quizzboardbackend.dto.response.LinkDto;
import com.iahorizonplus.quizzboardbackend.entity.AuditLog;
import com.iahorizonplus.quizzboardbackend.entity.TransactionRecord;
import com.iahorizonplus.quizzboardbackend.entity.User;
import com.iahorizonplus.quizzboardbackend.entity.UserRole;
import com.iahorizonplus.quizzboardbackend.service.AdminService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Administration", description = "Tableau de bord administrateur, gestion des utilisateurs, finances et audit (Richardson Niveau 3)")
public class AdminController {

    private final AdminService adminService;

    @GetMapping("/stats")
    @Operation(summary = "Statistiques globales de la plateforme pour le dashboard admin")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getStats() {
        Map<String, Object> stats = adminService.getDashboardStats();
        List<LinkDto> links = List.of(
                new LinkDto("self", "/api/v1/admin/stats", "GET", "application/json"),
                new LinkDto("users", "/api/v1/admin/users", "GET", "application/json"),
                new LinkDto("transactions", "/api/v1/admin/transactions", "GET", "application/json"),
                new LinkDto("audit-logs", "/api/v1/admin/audit-logs", "GET", "application/json")
        );
        return ResponseEntity.ok(ApiResponse.ok(stats, "Statistiques d'administration récupérées", links, "/api/v1/admin/stats"));
    }

    @GetMapping("/users")
    @Operation(summary = "Lister tous les utilisateurs enregistrés")
    public ResponseEntity<ApiResponse<List<User>>> getAllUsers() {
        List<User> users = adminService.getAllUsers();
        List<LinkDto> links = List.of(
                new LinkDto("self", "/api/v1/admin/users", "GET", "application/json"),
                new LinkDto("stats", "/api/v1/admin/stats", "GET", "application/json")
        );
        return ResponseEntity.ok(ApiResponse.ok(users, "Liste de tous les utilisateurs", links, "/api/v1/admin/users"));
    }

    @PutMapping("/users/{userId}/role")
    @Operation(summary = "Modifier le rôle d'un utilisateur (ADMIN, CREATOR, STUDENT)")
    public ResponseEntity<ApiResponse<User>> updateUserRole(
            @PathVariable String userId,
            @RequestParam UserRole role) {
        User updated = adminService.updateUserRole(userId, role);
        List<LinkDto> links = List.of(
                new LinkDto("self", "/api/v1/admin/users/" + userId + "/role", "PUT", "application/json"),
                new LinkDto("all-users", "/api/v1/admin/users", "GET", "application/json")
        );
        return ResponseEntity.ok(ApiResponse.ok(updated, "Rôle mis à jour avec succès", links, "/api/v1/admin/users/" + userId + "/role"));
    }

    @PutMapping("/users/{userId}/toggle-active")
    @Operation(summary = "Activer ou désactiver l'accès d'un compte utilisateur")
    public ResponseEntity<ApiResponse<User>> toggleUserActive(@PathVariable String userId) {
        User updated = adminService.toggleUserActive(userId);
        List<LinkDto> links = List.of(
                new LinkDto("self", "/api/v1/admin/users/" + userId + "/toggle-active", "PUT", "application/json"),
                new LinkDto("all-users", "/api/v1/admin/users", "GET", "application/json")
        );
        return ResponseEntity.ok(ApiResponse.ok(updated, "Statut du compte modifié", links, "/api/v1/admin/users/" + userId + "/toggle-active"));
    }

    @PutMapping("/users/{userId}/tier")
    @Operation(summary = "Modifier le forfait d'un utilisateur (FREE, STARTER)")
    public ResponseEntity<ApiResponse<User>> updateUserTier(
            @PathVariable String userId,
            @RequestParam com.iahorizonplus.quizzboardbackend.entity.SubscriptionTier tier) {
        User updated = adminService.updateUserTier(userId, tier);
        List<LinkDto> links = List.of(
                new LinkDto("self", "/api/v1/admin/users/" + userId + "/tier", "PUT", "application/json"),
                new LinkDto("all-users", "/api/v1/admin/users", "GET", "application/json")
        );
        return ResponseEntity.ok(ApiResponse.ok(updated, "Forfait mis à jour avec succès", links, "/api/v1/admin/users/" + userId + "/tier"));
    }

    @PostMapping("/users")
    @Operation(summary = "Création manuelle d'un compte utilisateur par l'administrateur")
    public ResponseEntity<ApiResponse<User>> createUser(
            @RequestBody User user,
            @RequestParam(required = false) String password) {
        User created = adminService.createUser(user, password);
        List<LinkDto> links = List.of(
                new LinkDto("self", "/api/v1/admin/users/" + created.getId(), "GET", "application/json"),
                new LinkDto("all-users", "/api/v1/admin/users", "GET", "application/json")
        );
        return ResponseEntity.ok(ApiResponse.ok(created, "Utilisateur créé avec succès", links, "/api/v1/admin/users"));
    }

    @DeleteMapping("/users/{userId}")
    @Operation(summary = "Suppression définitive d'un compte utilisateur")
    public ResponseEntity<ApiResponse<Void>> deleteUser(@PathVariable String userId) {
        adminService.deleteUser(userId);
        List<LinkDto> links = List.of(
                new LinkDto("all-users", "/api/v1/admin/users", "GET", "application/json")
        );
        return ResponseEntity.ok(ApiResponse.ok(null, "Compte utilisateur supprimé avec succès", links, "/api/v1/admin/users/" + userId));
    }

    @GetMapping("/transactions")
    @Operation(summary = "Lister l'ensemble des transactions de paiement (Wave, OM, Stripe)")
    public ResponseEntity<ApiResponse<List<TransactionRecord>>> getTransactions() {
        List<TransactionRecord> transactions = adminService.getAllTransactions();
        List<LinkDto> links = List.of(
                new LinkDto("self", "/api/v1/admin/transactions", "GET", "application/json"),
                new LinkDto("stats", "/api/v1/admin/stats", "GET", "application/json")
        );
        return ResponseEntity.ok(ApiResponse.ok(transactions, "Historique des transactions récupéré", links, "/api/v1/admin/transactions"));
    }

    @GetMapping("/audit-logs")
    @Operation(summary = "Consulter le journal d'audit de sécurité et d'actions administratives")
    public ResponseEntity<ApiResponse<List<AuditLog>>> getAuditLogs() {
        List<AuditLog> logs = adminService.getAuditLogs();
        List<LinkDto> links = List.of(
                new LinkDto("self", "/api/v1/admin/audit-logs", "GET", "application/json"),
                new LinkDto("stats", "/api/v1/admin/stats", "GET", "application/json")
        );
        return ResponseEntity.ok(ApiResponse.ok(logs, "Journal d'audit récupéré", links, "/api/v1/admin/audit-logs"));
    }
}
