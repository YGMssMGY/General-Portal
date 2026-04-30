package com.orgflow.portal.repository;

import com.orgflow.portal.entity.TaskItem;
import com.orgflow.portal.entity.Workspace;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TaskRepository extends JpaRepository<TaskItem, UUID> {
    List<TaskItem> findByWorkspaceOrderByDueDateAsc(Workspace workspace);

    long countByWorkspaceAndStatusNot(Workspace workspace, String status);

    long countByWorkspaceAndStatus(Workspace workspace, String status);
}
