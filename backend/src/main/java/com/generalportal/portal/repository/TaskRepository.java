package com.orgflow.portal.repository;

import com.orgflow.portal.entity.TaskItem;
import com.orgflow.portal.entity.Workspace;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface TaskRepository extends JpaRepository<TaskItem, UUID> {
    List<TaskItem> findByWorkspaceOrderByDueDateAsc(Workspace workspace);

    Page<TaskItem> findByWorkspace(Workspace workspace, Pageable pageable);

    List<TaskItem> findByWorkspaceAndStatus(Workspace workspace, String status);

    @Query("SELECT t FROM TaskItem t WHERE t.workspace = :workspace AND LOWER(t.title) LIKE %:query%")
    List<TaskItem> searchByWorkspace(Workspace workspace, String query);
}
