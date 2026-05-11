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
    name = "photos",
    indexes = {
        @Index(name = "idx_photos_workspace", columnList = "workspace_id"),
        @Index(name = "idx_photos_date", columnList = "photo_date")
    }
)
public class Photo extends AuditableEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "workspace_id", nullable = false)
    private Workspace workspace;

    @Column(nullable = false)
    private String title;

    @Column(name = "photo_date", nullable = false)
    private LocalDate date;

    @Column(nullable = false, length = 500)
    private String description;

    protected Photo() {}

    public Photo(Workspace workspace, String title, LocalDate date, String description) {
        this.workspace = workspace;
        this.title = title;
        this.date = date;
        this.description = description;
    }

    public String getTitle() { return title; }
    public LocalDate getDate() { return date; }
    public String getDescription() { return description; }

    public void update(String title, LocalDate date, String description) {
        this.title = title;
        this.date = date;
        this.description = description;
    }
}
