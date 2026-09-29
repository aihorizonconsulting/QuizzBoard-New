package com.iahorizonplus.quizzboardbackend.repository;

import com.iahorizonplus.quizzboardbackend.entity.User;
import com.iahorizonplus.quizzboardbackend.entity.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, String> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    Optional<User> findFirstByRole(UserRole role);

    /** L'inscription affectait « Organisation Démo » à chaque nouveau compte : valeur fictive effacée. */
    @Modifying
    @Transactional
    @Query("update User u set u.organization = null where u.organization = 'Organisation Démo'")
    int clearDemoOrganization();

    Optional<User> findByPasswordResetToken(String passwordResetToken);

    Optional<User> findByEmailVerificationToken(String token);
}
