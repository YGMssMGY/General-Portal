package com.generalportal.portal.entity;

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
    name = "public_events",
    indexes = {
        @Index(name = "idx_public_events_workspace", columnList = "workspace_id"),
        @Index(name = "idx_public_events_date", columnList = "event_date")
    }
)
public class PublicEvent extends AuditableEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "workspace_id", nullable = false)
    private Workspace workspace;

    @Column(nullable = false)
    private String title;

    @Column(name = "event_date", nullable = false)
    private LocalDate date;

    @Column(nullable = false, length = 1000)
    private String description;

    @Column(nullable = false)
    private String category;

    protected PublicEvent() {}

    public PublicEvent(Workspace workspace, String title, LocalDate date, String description, String category) {
        this.workspace = workspace;
        this.title = title;
        this.date = date;
        this.description = description;
        this.category = category;
    }

    public String getTitle() { return title; }
    public LocalDate getDate() { return date; }
    public String getDescription() { return description; }
    public String getCategory() { return category; }

    public void update(String title, LocalDate date, String description, String category) {
        this.title = title;
        this.date = date;
        this.description = description;
        this.category = category;
    }
}
