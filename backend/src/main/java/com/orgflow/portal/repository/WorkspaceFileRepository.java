package com.orgflow.portal.repository;

import com.orgflow.portal.entity.Workspace;
import com.orgflow.portal.entity.WorkspaceFile;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WorkspaceFileRepository extends JpaRepository<WorkspaceFile, UUID> {
    List<WorkspaceFile> findByWorkspaceOrderByFileUpdatedAtDesc(Workspace workspace);
}
