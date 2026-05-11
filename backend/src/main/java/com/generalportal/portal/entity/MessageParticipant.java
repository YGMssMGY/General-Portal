package com.orgflow.portal.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "message_participants", indexes = @Index(name = "idx_message_participants_thread", columnList = "thread_id"))
public class MessageParticipant extends AuditableEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "thread_id", nullable = false)
    private MessageThread thread;

    @Column(nullable = false)
    private String name;

    protected MessageParticipant() {
    }

    public MessageParticipant(MessageThread thread, String name) {
        this.thread = thread;
        this.name = name;
    }

    public String getName() {
        return name;
    }
}
