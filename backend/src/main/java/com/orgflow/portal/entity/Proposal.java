package com.orgflow.portal.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(
    name = "proposals",
    indexes = {
        @Index(name = "idx_proposals_workspace_status", columnList = "workspace_id,status"),
        @Index(name = "idx_proposals_submitted_at", columnList = "submitted_at")
    }
)
public class Proposal extends AuditableEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "workspace_id", nullable = false)
    private Workspace workspace;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String type;

    @Column(nullable = false)
    private String status;

    @Column(nullable = false)
    private String submittedBy;

    @Column(name = "submitted_at", nullable = false)
    private Instant submittedAt;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal budget;

    @Column(nullable = false, length = 1000)
    private String summary;

    protected Proposal() {
    }

    public Proposal(Workspace workspace, String title, String type, String status, String submittedBy, Instant submittedAt, BigDecimal budget, String summary) {
        this.workspace = workspace;
        this.title = title;
        this.type = type;
        this.status = status;
        this.submittedBy = submittedBy;
        this.submittedAt = submittedAt;
        this.budget = budget;
        this.summary = summary;
    }

    public Workspace getWorkspace() {
        return workspace;
    }

    public String getTitle() {
        return title;
    }

    public String getType() {
        return type;
    }

    public String getStatus() {
        return status;
    }

    public String getSubmittedBy() {
        return submittedBy;
    }

    public Instant getSubmittedAt() {
        return submittedAt;
    }

    public BigDecimal getBudget() {
        return budget;
    }

    public String getSummary() {
        return summary;
    }
}
