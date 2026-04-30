package com.orgflow.portal.repository;

import com.orgflow.portal.entity.MessageThread;
import com.orgflow.portal.entity.Workspace;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MessageThreadRepository extends JpaRepository<MessageThread, UUID> {
    @EntityGraph(attributePaths = {"participants", "messages"})
    List<MessageThread> findByWorkspaceOrderByLastMessageAtDesc(Workspace workspace);
}
