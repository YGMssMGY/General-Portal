package com.generalportal.portal.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(
    name = "permission_grants",
    indexes = {
        @Index(name = "idx_permission_grants_membership", columnList = "membership_id"),
        @Index(name = "idx_permission_grants_permission", columnList = "permission")
    },
    uniqueConstraints = @UniqueConstraint(name = "uk_permission_membership_value", columnNames = {"membership_id", "permission"})
)
public class PermissionGrant extends AuditableEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "membership_id", nullable = false)
    private Membership membership;

    @Column(nullable = false)
    private String permission;

    protected PermissionGrant() {
    }

    public PermissionGrant(Membership membership, String permission) {
        this.membership = membership;
        this.permission = permission;
    }

    public Membership getMembership() {
        return membership;
    }

    public String getPermission() {
        return permission;
    }
}
