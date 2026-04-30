package com.orgflow.portal.repository;

import com.orgflow.portal.entity.Membership;
import com.orgflow.portal.entity.PermissionGrant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PermissionGrantRepository extends JpaRepository<PermissionGrant, UUID> {
    List<PermissionGrant> findByMembership(Membership membership);
}
