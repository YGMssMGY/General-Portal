package com.generalportal.portal.repository;

import com.generalportal.portal.entity.Workspace;
import com.generalportal.portal.entity.WorkspaceSettings;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WorkspaceSettingsRepository extends JpaRepository<WorkspaceSettings, UUID> {
    Optional<WorkspaceSettings> findByWorkspace(Workspace workspace);
}
