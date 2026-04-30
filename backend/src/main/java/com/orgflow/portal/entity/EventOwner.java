package com.orgflow.portal.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "event_owners", indexes = @Index(name = "idx_event_owners_event", columnList = "event_id"))
public class EventOwner extends AuditableEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "event_id", nullable = false)
    private EventItem event;

    @Column(nullable = false)
    private String ownerLabel;

    protected EventOwner() {
    }

    public EventOwner(EventItem event, String ownerLabel) {
        this.event = event;
        this.ownerLabel = ownerLabel;
    }

    public EventItem getEvent() {
        return event;
    }

    public String getOwnerLabel() {
        return ownerLabel;
    }
}
