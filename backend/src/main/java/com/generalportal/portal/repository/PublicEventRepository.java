package com.generalportal.portal.repository;

import com.generalportal.portal.entity.PublicEvent;
import com.generalportal.portal.entity.Workspace;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PublicEventRepository extends JpaRepository<PublicEvent, UUID> {
    Page<PublicEvent> findByWorkspaceOrderByDateDesc(Workspace workspace, Pageable pageable);
}
