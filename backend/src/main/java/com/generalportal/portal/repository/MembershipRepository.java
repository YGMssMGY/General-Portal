package com.generalportal.portal.repository;

import com.generalportal.portal.entity.Membership;
import com.generalportal.portal.entity.UserAccount;
import com.generalportal.portal.entity.Workspace;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MembershipRepository extends JpaRepository<Membership, UUID> {
    Optional<Membership> findByWorkspaceAndUser(Workspace workspace, UserAccount user);

    Page<Membership> findByWorkspace(Workspace workspace, Pageable pageable);

    List<Membership> findByWorkspaceOrderByUser_DisplayNameAsc(Workspace workspace);
}
