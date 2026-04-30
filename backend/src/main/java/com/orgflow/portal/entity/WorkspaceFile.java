package com.orgflow.portal.entity;

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
    name = "workspace_files",
    indexes = {
        @Index(name = "idx_workspace_files_workspace", columnList = "workspace_id"),
        @Index(name = "idx_workspace_files_updated_at", columnList = "file_updated_at")
    }
)
public class WorkspaceFile extends AuditableEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "workspace_id", nullable = false)
    private Workspace workspace;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String fileType;

    @Column(nullable = false)
    private String ownerName;

    @Column(nullable = false)
    private String linkedResource;

    @Column(nullable = false)
    private String sizeLabel;

    @Column(nullable = false)
    private String storageKey;

    @Column(name = "file_updated_at", nullable = false)
    private Instant fileUpdatedAt;

    protected WorkspaceFile() {
    }

    public WorkspaceFile(Workspace workspace, String name, String fileType, String ownerName, String linkedResource, String sizeLabel, String storageKey, Instant fileUpdatedAt) {
        this.workspace = workspace;
        this.name = name;
        this.fileType = fileType;
        this.ownerName = ownerName;
        this.linkedResource = linkedResource;
        this.sizeLabel = sizeLabel;
        this.storageKey = storageKey;
        this.fileUpdatedAt = fileUpdatedAt;
    }

    public String getName() {
        return name;
    }

    public String getFileType() {
        return fileType;
    }

    public String getOwnerName() {
        return ownerName;
    }

    public String getLinkedResource() {
        return linkedResource;
    }

    public String getSizeLabel() {
        return sizeLabel;
    }

    public Instant getFileUpdatedAt() {
        return fileUpdatedAt;
    }
}
