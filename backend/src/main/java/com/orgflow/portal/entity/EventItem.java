package com.orgflow.portal.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(
    name = "events",
    indexes = {
        @Index(name = "idx_events_workspace_status", columnList = "workspace_id,status"),
        @Index(name = "idx_events_starts_at", columnList = "starts_at")
    }
)
public class EventItem extends AuditableEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "workspace_id", nullable = false)
    private Workspace workspace;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String status;

    @Column(name = "starts_at", nullable = false)
    private Instant startsAt;

    @Column(name = "ends_at")
    private Instant endsAt;

    @Column(nullable = false)
    private int progress;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal budgetUsed;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal budgetTotal;

    @OneToMany(mappedBy = "event", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<EventOwner> owners = new ArrayList<>();

    protected EventItem() {
    }

    public EventItem(Workspace workspace, String title, String status, Instant startsAt, Instant endsAt, int progress, BigDecimal budgetUsed, BigDecimal budgetTotal) {
        this.workspace = workspace;
        this.title = title;
        this.status = status;
        this.startsAt = startsAt;
        this.endsAt = endsAt;
        this.progress = progress;
        this.budgetUsed = budgetUsed;
        this.budgetTotal = budgetTotal;
    }

    public void addOwner(String ownerLabel) {
        owners.add(new EventOwner(this, ownerLabel));
    }

    public Workspace getWorkspace() {
        return workspace;
    }

    public String getTitle() {
        return title;
    }

    public String getStatus() {
        return status;
    }

    public Instant getStartsAt() {
        return startsAt;
    }

    public Instant getEndsAt() {
        return endsAt;
    }

    public int getProgress() {
        return progress;
    }

    public BigDecimal getBudgetUsed() {
        return budgetUsed;
    }

    public BigDecimal getBudgetTotal() {
        return budgetTotal;
    }

    public List<EventOwner> getOwners() {
        return owners;
    }

    public void update(String title, String status, Instant startsAt, Instant endsAt, int progress) {
        this.title = title;
        this.status = status;
        this.startsAt = startsAt;
        this.endsAt = endsAt;
        this.progress = progress;
    }
}
