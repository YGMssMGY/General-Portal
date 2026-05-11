package com.generalportal.portal.repository;

import com.generalportal.portal.entity.Membership;
import com.generalportal.portal.entity.PermissionGrant;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PermissionGrantRepository extends JpaRepository<PermissionGrant, UUID> {
    List<PermissionGrant> findByMembership(Membership membership);

    List<PermissionGrant> findByMembershipIn(Collection<Membership> memberships);
}
