package com.orgflow.portal.repository;

import com.orgflow.portal.entity.Membership;
import com.orgflow.portal.entity.UserAccount;
import com.orgflow.portal.entity.Workspace;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MembershipRepository extends JpaRepository<Membership, UUID> {
    Optional<Membership> findByWorkspaceAndUser(Workspace workspace, UserAccount user);

    @EntityGraph(attributePaths = {"user", "workspace"})
    List<Membership> findByWorkspaceOrderByUser_DisplayNameAsc(Workspace workspace);
}
