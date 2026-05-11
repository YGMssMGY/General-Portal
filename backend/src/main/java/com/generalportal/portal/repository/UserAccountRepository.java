package com.generalportal.portal.repository;

import com.generalportal.portal.entity.Membership;
import com.generalportal.portal.entity.UserAccount;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface UserAccountRepository extends JpaRepository<UserAccount, UUID> {
    Optional<UserAccount> findByEmailIgnoreCase(String email);

    @Query("SELECT m FROM Membership m WHERE m.user.id = :userId AND m.workspace.id = :workspaceId")
    Optional<Membership> findMembershipForUser(UUID userId, UUID workspaceId);
}
