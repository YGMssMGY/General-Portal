package com.orgflow.portal.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(
    name = "activity_logs",
    indexes = {
        @Index(name = "idx_activity_logs_workspace", columnList = "workspace_id"),
        @Index(name = "idx_activity_logs_occurred_at", columnList = "occurred_at")
    }
)
public class ActivityLog extends AuditableEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "workspace_id", nullable = false)
    private Workspace workspace;

    @Column(nullable = false)
    private String actorName;

    @Column(nullable = false)
    private String action;

    @Column(nullable = false)
    private String resourceType;

    @Column(nullable = false)
    private String resourceTitle;

    @Column(name = "occurred_at", nullable = false)
    private Instant occurredAt;

    protected ActivityLog() {
    }

    public ActivityLog(Workspace workspace, String actorName, String action, String resourceType, String resourceTitle, Instant occurredAt) {
        this.workspace = workspace;
        this.actorName = actorName;
        this.action = action;
        this.resourceType = resourceType;
        this.resourceTitle = resourceTitle;
        this.occurredAt = occurredAt;
    }

    public String getActorName() {
        return actorName;
    }

    public String getAction() {
        return action;
    }

    public String getResourceType() {
        return resourceType;
    }

    public String getResourceTitle() {
        return resourceTitle;
    }

    public Instant getOccurredAt() {
        return occurredAt;
    }
}
