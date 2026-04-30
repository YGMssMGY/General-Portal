package com.orgflow.portal.repository;

import com.orgflow.portal.entity.Workspace;
import com.orgflow.portal.entity.WorkspaceFile;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface WorkspaceFileRepository extends JpaRepository<WorkspaceFile, UUID> {
    List<WorkspaceFile> findByWorkspaceOrderByFileUpdatedAtDesc(Workspace workspace);

    @Query("SELECT f FROM WorkspaceFile f WHERE f.workspace = :workspace AND (LOWER(f.name) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(f.linkedResource) LIKE LOWER(CONCAT('%', :query, '%')))")
    List<WorkspaceFile> searchByWorkspace(@Param("workspace") Workspace workspace, @Param("query") String query);
}
