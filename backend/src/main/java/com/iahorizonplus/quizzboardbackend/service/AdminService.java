package com.iahorizonplus.quizzboardbackend.service;

import com.iahorizonplus.quizzboardbackend.entity.AuditLog;
import com.iahorizonplus.quizzboardbackend.entity.TransactionRecord;
import com.iahorizonplus.quizzboardbackend.entity.User;
import com.iahorizonplus.quizzboardbackend.entity.UserRole;

import java.util.List;
import java.util.Map;

public interface AdminService {
    Map<String, Object> getDashboardStats();
    List<User> getAllUsers();
    User updateUserRole(String userId, UserRole role);
    User updateUserTier(String userId, com.iahorizonplus.quizzboardbackend.entity.SubscriptionTier tier);
    User toggleUserActive(String userId);
    User createUser(User user, String rawPassword);
    void deleteUser(String userId);
    List<TransactionRecord> getAllTransactions();
    List<AuditLog> getAuditLogs();
    void logAction(String actorName, String action, String target, String details);
}
