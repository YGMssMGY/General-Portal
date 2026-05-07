package com.orgflow.portal.repository;

import com.orgflow.portal.entity.VolunteerSlot;
import com.orgflow.portal.entity.Workspace;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VolunteerSlotRepository extends JpaRepository<VolunteerSlot, UUID> {
    List<VolunteerSlot> findByWorkspaceOrderByStartsAtAsc(Workspace workspace);

    Page<VolunteerSlot> findByWorkspace(Workspace workspace, Pageable pageable);
}
