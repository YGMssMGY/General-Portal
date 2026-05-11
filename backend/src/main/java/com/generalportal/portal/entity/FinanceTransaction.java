package com.generalportal.portal.entity;

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
    name = "finance_transactions",
    indexes = {
        @Index(name = "idx_finance_transactions_workspace_status", columnList = "workspace_id,status"),
        @Index(name = "idx_finance_transactions_occurred_at", columnList = "occurred_at")
    }
)
public class FinanceTransaction extends AuditableEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "workspace_id", nullable = false)
    private Workspace workspace;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String category;

    @Column(nullable = false)
    private String status;

    @Column(nullable = false)
    private String submittedBy;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(name = "occurred_at", nullable = false)
    private Instant occurredAt;

    protected FinanceTransaction() {
    }

    public FinanceTransaction(Workspace workspace, String title, String category, String status, String submittedBy, BigDecimal amount, Instant occurredAt) {
        this.workspace = workspace;
        this.title = title;
        this.category = category;
        this.status = status;
        this.submittedBy = submittedBy;
        this.amount = amount;
        this.occurredAt = occurredAt;
    }

    public String getTitle() {
        return title;
    }

    public String getCategory() {
        return category;
    }

    public String getStatus() {
        return status;
    }

    public String getSubmittedBy() {
        return submittedBy;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public Instant getOccurredAt() {
        return occurredAt;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
