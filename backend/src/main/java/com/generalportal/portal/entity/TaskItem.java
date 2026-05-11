package com.orgflow.portal.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDate;

@Entity
@Table(
    name = "tasks",
    indexes = {
        @Index(name = "idx_tasks_workspace_status", columnList = "workspace_id,status"),
        @Index(name = "idx_tasks_due_date", columnList = "due_date")
    }
)
public class TaskItem extends AuditableEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "workspace_id", nullable = false)
    private Workspace workspace;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String status;

    @Column(nullable = false)
    private String priority;

    @Column(nullable = false)
    private String project;

    @Column(name = "due_date", nullable = false)
    private LocalDate dueDate;

    @Column(nullable = false)
    private String assigneeName;

    @Column(nullable = false)
    private int progress;

    @Column(length = 500)
    private String blockedReason;

    protected TaskItem() {
    }

    public TaskItem(
        Workspace workspace,
        String title,
        String status,
        String priority,
        String project,
        LocalDate dueDate,
        String assigneeName,
        int progress,
        String blockedReason
    ) {
        this.workspace = workspace;
        this.title = title;
        this.status = status;
        this.priority = priority;
        this.project = project;
        this.dueDate = dueDate;
        this.assigneeName = assigneeName;
        this.progress = progress;
        this.blockedReason = blockedReason;
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

    public String getPriority() {
        return priority;
    }

    public String getProject() {
        return project;
    }

    public LocalDate getDueDate() {
        return dueDate;
    }

    public String getAssigneeName() {
        return assigneeName;
    }

    public int getProgress() {
        return progress;
    }

    public String getBlockedReason() {
        return blockedReason;
    }

    public void update(String title, String status, String priority, String project, LocalDate dueDate, String assigneeName, int progress, String blockedReason) {
        this.title = title;
        this.status = status;
        this.priority = priority;
        this.project = project;
        this.dueDate = dueDate;
        this.assigneeName = assigneeName;
        this.progress = progress;
        this.blockedReason = blockedReason;
    }
}
