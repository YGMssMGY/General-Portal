package com.orgflow.portal.repository;

import com.orgflow.portal.entity.Proposal;
import com.orgflow.portal.entity.Workspace;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProposalRepository extends JpaRepository<Proposal, UUID> {
    List<Proposal> findByWorkspaceOrderBySubmittedAtDesc(Workspace workspace);

    long countByWorkspaceAndStatus(Workspace workspace, String status);

    @Query("SELECT p FROM Proposal p WHERE p.workspace = :workspace AND (LOWER(p.title) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(p.summary) LIKE LOWER(CONCAT('%', :query, '%')))")
    List<Proposal> searchByWorkspace(@Param("workspace") Workspace workspace, @Param("query") String query);
}
