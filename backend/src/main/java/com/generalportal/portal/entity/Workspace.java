package com.generalportal.portal.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Index;
import jakarta.persistence.Table;

@Entity
@Table(name = "workspaces", indexes = @Index(name = "idx_workspaces_name", columnList = "name"))
public class Workspace extends AuditableEntity {
    @Column(nullable = false, unique = true)
    private String name;

    @Column(nullable = false, length = 500)
    private String description;

    protected Workspace() {
    }

    public Workspace(String name, String description) {
        this.name = name;
        this.description = description;
    }

    public String getName() {
        return name;
    }

    public String getDescription() {
        return description;
    }
}
