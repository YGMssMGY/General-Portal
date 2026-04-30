package com.orgflow.portal.entity;

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
    name = "memberships",
    indexes = {
        @Index(name = "idx_memberships_workspace", columnList = "workspace_id"),
        @Index(name = "idx_memberships_user", columnList = "user_id")
    },
    uniqueConstraints = @UniqueConstraint(name = "uk_membership_workspace_user", columnNames = {"workspace_id", "user_id"})
)
public class Membership extends AuditableEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "workspace_id", nullable = false)
    private Workspace workspace;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private UserAccount user;

    @Column(nullable = false)
    private String position;

    @Column(nullable = false)
    private String accessLabel;

    @Column(nullable = false)
    private int taskCount;

    @Column(nullable = false)
    private int volunteerHours;

    protected Membership() {
    }

    public Membership(Workspace workspace, UserAccount user, String position, String accessLabel, int taskCount, int volunteerHours) {
        this.workspace = workspace;
        this.user = user;
        this.position = position;
        this.accessLabel = accessLabel;
        this.taskCount = taskCount;
        this.volunteerHours = volunteerHours;
    }

    public Workspace getWorkspace() {
        return workspace;
    }

    public UserAccount getUser() {
        return user;
    }

    public String getPosition() {
        return position;
    }

    public String getAccessLabel() {
        return accessLabel;
    }

    public int getTaskCount() {
        return taskCount;
    }

    public int getVolunteerHours() {
        return volunteerHours;
    }
}
