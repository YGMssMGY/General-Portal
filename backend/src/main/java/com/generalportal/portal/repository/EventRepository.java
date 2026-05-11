package com.generalportal.portal.repository;

import com.generalportal.portal.entity.EventItem;
import com.generalportal.portal.entity.Workspace;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface EventRepository extends JpaRepository<EventItem, UUID> {
    List<EventItem> findByWorkspaceOrderByStartsAtAsc(Workspace workspace);

    Page<EventItem> findByWorkspace(Workspace workspace, Pageable pageable);

    @Query("SELECT e FROM EventItem e WHERE e.workspace = :workspace AND LOWER(e.title) LIKE %:query%")
    List<EventItem> searchByWorkspace(Workspace workspace, String query);
}
