package com.orgflow.portal.repository;

import com.orgflow.portal.entity.Proposal;
import com.orgflow.portal.entity.Workspace;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProposalRepository extends JpaRepository<Proposal, UUID> {
    List<Proposal> findByWorkspaceOrderBySubmittedAtDesc(Workspace workspace);

    long countByWorkspaceAndStatus(Workspace workspace, String status);
}
