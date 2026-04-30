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
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(
    name = "message_threads",
    indexes = {
        @Index(name = "idx_message_threads_workspace_status", columnList = "workspace_id,status"),
        @Index(name = "idx_message_threads_updated_at", columnList = "last_message_at")
    }
)
public class MessageThread extends AuditableEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "workspace_id", nullable = false)
    private Workspace workspace;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String context;

    @Column(nullable = false)
    private String status;

    @Column(nullable = false, length = 500)
    private String preview;

    @Column(nullable = false)
    private int unreadCount;

    @Column(name = "last_message_at", nullable = false)
    private Instant lastMessageAt;

    @OneToMany(mappedBy = "thread", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<MessageParticipant> participants = new ArrayList<>();

    @OneToMany(mappedBy = "thread", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Message> messages = new ArrayList<>();

    protected MessageThread() {
    }

    public MessageThread(Workspace workspace, String title, String context, String status, String preview, int unreadCount, Instant lastMessageAt) {
        this.workspace = workspace;
        this.title = title;
        this.context = context;
        this.status = status;
        this.preview = preview;
        this.unreadCount = unreadCount;
        this.lastMessageAt = lastMessageAt;
    }

    public void addParticipant(String name) {
        participants.add(new MessageParticipant(this, name));
    }

    public void addMessage(String authorName, String body, Instant sentAt) {
        messages.add(new Message(this, authorName, body, sentAt));
    }

    public String getTitle() {
        return title;
    }

    public String getContext() {
        return context;
    }

    public String getStatus() {
        return status;
    }

    public String getPreview() {
        return preview;
    }

    public int getUnreadCount() {
        return unreadCount;
    }

    public Instant getLastMessageAt() {
        return lastMessageAt;
    }

    public List<MessageParticipant> getParticipants() {
        return participants;
    }

    public List<Message> getMessages() {
        return messages;
    }
}
