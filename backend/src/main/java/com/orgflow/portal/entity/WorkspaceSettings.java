package com.orgflow.portal.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "workspace_settings", indexes = @Index(name = "idx_workspace_settings_workspace", columnList = "workspace_id"))
public class WorkspaceSettings extends AuditableEntity {
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "workspace_id", nullable = false, unique = true)
    private Workspace workspace;

    @Column(nullable = false)
    private String defaultVisibility;

    @Column(nullable = false)
    private boolean requireProposalApproval;

    @Column(nullable = false)
    private boolean allowMemberInvites;

    @Column(nullable = false)
    private String fiscalYearStart;

    protected WorkspaceSettings() {
    }

    public WorkspaceSettings(Workspace workspace, String defaultVisibility, boolean requireProposalApproval, boolean allowMemberInvites, String fiscalYearStart) {
        this.workspace = workspace;
        this.defaultVisibility = defaultVisibility;
        this.requireProposalApproval = requireProposalApproval;
        this.allowMemberInvites = allowMemberInvites;
        this.fiscalYearStart = fiscalYearStart;
    }

    public String getWorkspaceName() {
        return workspace.getName();
    }

    public String getDefaultVisibility() {
        return defaultVisibility;
    }

    public boolean isRequireProposalApproval() {
        return requireProposalApproval;
    }

    public boolean isAllowMemberInvites() {
        return allowMemberInvites;
    }

    public String getFiscalYearStart() {
        return fiscalYearStart;
    }

    public void setDefaultVisibility(String defaultVisibility) { this.defaultVisibility = defaultVisibility; }
    public void setRequireProposalApproval(boolean requireProposalApproval) { this.requireProposalApproval = requireProposalApproval; }
    public void setAllowMemberInvites(boolean allowMemberInvites) { this.allowMemberInvites = allowMemberInvites; }
}
