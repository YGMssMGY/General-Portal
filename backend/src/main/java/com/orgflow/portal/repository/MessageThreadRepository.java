package com.orgflow.portal.repository;

import com.orgflow.portal.entity.MessageThread;
import com.orgflow.portal.entity.Workspace;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MessageThreadRepository extends JpaRepository<MessageThread, UUID> {
    Page<MessageThread> findByWorkspace(Workspace workspace, Pageable pageable);

    long countByWorkspaceAndUnreadCountGreaterThan(Workspace workspace, int threshold);
}
