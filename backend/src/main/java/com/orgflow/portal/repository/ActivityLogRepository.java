package com.orgflow.portal.repository;

import com.orgflow.portal.entity.ActivityLog;
import com.orgflow.portal.entity.Workspace;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ActivityLogRepository extends JpaRepository<ActivityLog, UUID> {
    List<ActivityLog> findTop20ByWorkspaceOrderByOccurredAtDesc(Workspace workspace);

    List<ActivityLog> findTop2ByWorkspaceOrderByOccurredAtDesc(Workspace workspace);
}
