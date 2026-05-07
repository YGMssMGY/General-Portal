package com.orgflow.portal.repository;

import com.orgflow.portal.entity.WorkspaceFile;
import com.orgflow.portal.entity.Workspace;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface WorkspaceFileRepository extends JpaRepository<WorkspaceFile, UUID> {
    List<WorkspaceFile> findByWorkspaceOrderByFileUpdatedAtDesc(Workspace workspace);

    Page<WorkspaceFile> findByWorkspace(Workspace workspace, Pageable pageable);

    @Query("SELECT f FROM WorkspaceFile f WHERE f.workspace = :workspace AND LOWER(f.name) LIKE %:query%")
    List<WorkspaceFile> searchByWorkspace(Workspace workspace, String query);
}
