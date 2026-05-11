package com.generalportal.portal.repository;

import com.generalportal.portal.entity.Proposal;
import com.generalportal.portal.entity.Workspace;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ProposalRepository extends JpaRepository<Proposal, UUID> {
    List<Proposal> findByWorkspaceOrderBySubmittedAtDesc(Workspace workspace);

    Page<Proposal> findByWorkspace(Workspace workspace, Pageable pageable);

    long countByWorkspaceAndStatus(Workspace workspace, String status);

    @Query("SELECT p FROM Proposal p WHERE p.workspace = :workspace AND (LOWER(p.title) LIKE %:query% OR LOWER(p.summary) LIKE %:query%)")
    List<Proposal> searchByWorkspace(Workspace workspace, String query);
}
