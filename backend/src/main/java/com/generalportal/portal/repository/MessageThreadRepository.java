package com.generalportal.portal.repository;

import com.generalportal.portal.entity.MessageThread;
import com.generalportal.portal.entity.Workspace;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MessageThreadRepository extends JpaRepository<MessageThread, UUID> {
    Page<MessageThread> findByWorkspace(Workspace workspace, Pageable pageable);

    long countByWorkspaceAndUnreadCountGreaterThan(Workspace workspace, int threshold);
}
