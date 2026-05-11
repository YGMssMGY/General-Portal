package com.generalportal.portal.repository;

import com.generalportal.portal.entity.ActivityLog;
import com.generalportal.portal.entity.Workspace;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ActivityLogRepository extends JpaRepository<ActivityLog, UUID> {
    List<ActivityLog> findTop2ByWorkspaceOrderByOccurredAtDesc(Workspace workspace);

    List<ActivityLog> findTop20ByWorkspaceOrderByOccurredAtDesc(Workspace workspace);

    Page<ActivityLog> findByWorkspaceOrderByOccurredAtDesc(Workspace workspace, Pageable pageable);
}
