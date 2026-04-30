package com.orgflow.portal.repository;

import com.orgflow.portal.entity.EventItem;
import com.orgflow.portal.entity.Workspace;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EventRepository extends JpaRepository<EventItem, UUID> {
    @EntityGraph(attributePaths = "owners")
    List<EventItem> findByWorkspaceOrderByStartsAtAsc(Workspace workspace);
}
