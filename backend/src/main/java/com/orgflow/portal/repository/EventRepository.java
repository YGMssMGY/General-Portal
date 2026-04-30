package com.orgflow.portal.repository;

import com.orgflow.portal.entity.EventItem;
import com.orgflow.portal.entity.Workspace;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface EventRepository extends JpaRepository<EventItem, UUID> {
    @EntityGraph(attributePaths = "owners")
    List<EventItem> findByWorkspaceOrderByStartsAtAsc(Workspace workspace);

    @EntityGraph(attributePaths = "owners")
    @Query("SELECT e FROM EventItem e WHERE e.workspace = :workspace AND LOWER(e.title) LIKE LOWER(CONCAT('%', :query, '%'))")
    List<EventItem> searchByWorkspace(@Param("workspace") Workspace workspace, @Param("query") String query);
}
