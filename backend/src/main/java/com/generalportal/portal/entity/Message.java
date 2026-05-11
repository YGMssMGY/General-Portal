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
    name = "messages",
    indexes = {
        @Index(name = "idx_messages_thread", columnList = "thread_id"),
        @Index(name = "idx_messages_sent_at", columnList = "sent_at")
    }
)
public class Message extends AuditableEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "thread_id", nullable = false)
    private MessageThread thread;

    @Column(nullable = false)
    private String authorName;

    @Column(nullable = false, length = 2000)
    private String body;

    @Column(name = "sent_at", nullable = false)
    private Instant sentAt;

    protected Message() {
    }

    public Message(MessageThread thread, String authorName, String body, Instant sentAt) {
        this.thread = thread;
        this.authorName = authorName;
        this.body = body;
        this.sentAt = sentAt;
    }

    public String getAuthorName() {
        return authorName;
    }

    public String getBody() {
        return body;
    }

    public Instant getSentAt() {
        return sentAt;
    }
}
