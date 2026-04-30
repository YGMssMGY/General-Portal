package com.orgflow.portal.repository;

import com.orgflow.portal.entity.TaskItem;
import com.orgflow.portal.entity.Workspace;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TaskRepository extends JpaRepository<TaskItem, UUID> {
    List<TaskItem> findByWorkspaceOrderByDueDateAsc(Workspace workspace);

    long countByWorkspaceAndStatusNot(Workspace workspace, String status);

    long countByWorkspaceAndStatus(Workspace workspace, String status);

    @Query("SELECT t FROM TaskItem t WHERE t.workspace = :workspace AND (LOWER(t.title) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(t.project) LIKE LOWER(CONCAT('%', :query, '%')))")
    List<TaskItem> searchByWorkspace(@Param("workspace") Workspace workspace, @Param("query") String query);
}
