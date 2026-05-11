package com.orgflow.portal.repository;

import com.orgflow.portal.entity.Photo;
import com.orgflow.portal.entity.Workspace;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PhotoRepository extends JpaRepository<Photo, UUID> {
    Page<Photo> findByWorkspaceOrderByDateDesc(Workspace workspace, Pageable pageable);
}
