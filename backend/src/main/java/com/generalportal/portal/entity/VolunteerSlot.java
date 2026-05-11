package com.generalportal.portal.entity;

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
    name = "volunteer_slots",
    indexes = {
        @Index(name = "idx_volunteer_slots_workspace", columnList = "workspace_id"),
        @Index(name = "idx_volunteer_slots_starts_at", columnList = "starts_at")
    }
)
public class VolunteerSlot extends AuditableEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "workspace_id", nullable = false)
    private Workspace workspace;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String eventName;

    @Column(name = "starts_at", nullable = false)
    private Instant startsAt;

    @Column(nullable = false)
    private int capacity;

    @Column(nullable = false)
    private int filled;

    @Column(nullable = false)
    private int hours;

    protected VolunteerSlot() {
    }

    public VolunteerSlot(Workspace workspace, String title, String eventName, Instant startsAt, int capacity, int filled, int hours) {
        this.workspace = workspace;
        this.title = title;
        this.eventName = eventName;
        this.startsAt = startsAt;
        this.capacity = capacity;
        this.filled = filled;
        this.hours = hours;
    }

    public String getTitle() {
        return title;
    }

    public String getEventName() {
        return eventName;
    }

    public Instant getStartsAt() {
        return startsAt;
    }

    public int getCapacity() {
        return capacity;
    }

    public int getFilled() {
        return filled;
    }

    public int getHours() {
        return hours;
    }
}
