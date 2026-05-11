package com.generalportal.portal.service;

import com.generalportal.portal.dto.Dtos.UpdateSettingsRequest;
import com.generalportal.portal.dto.Dtos.WorkspaceSettingsDto;
import com.generalportal.portal.repository.WorkspaceSettingsRepository;
import com.generalportal.portal.security.Permissions;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SettingsService {
    private final CurrentUserService currentUserService;
    private final PermissionService permissionService;
    private final WorkspaceSettingsRepository workspaceSettingsRepository;

    public SettingsService(CurrentUserService currentUserService, PermissionService permissionService, WorkspaceSettingsRepository workspaceSettingsRepository) {
        this.currentUserService = currentUserService;
        this.permissionService = permissionService;
        this.workspaceSettingsRepository = workspaceSettingsRepository;
    }

    @Transactional(readOnly = true)
    public WorkspaceSettingsDto getSettings() {
        permissionService.require(Permissions.SETTINGS_READ);
        var settings = workspaceSettingsRepository.findByWorkspace(currentUserService.currentWorkspace())
            .orElseThrow(() -> new RuntimeException("Settings not found"));
        return new WorkspaceSettingsDto(settings.getWorkspaceName(), settings.getDefaultVisibility(), settings.isRequireProposalApproval(), settings.isAllowMemberInvites(), settings.getFiscalYearStart());
    }

    @Transactional
    public WorkspaceSettingsDto updateSettings(UpdateSettingsRequest request) {
        permissionService.require(Permissions.SETTINGS_WRITE);
        var settings = workspaceSettingsRepository.findByWorkspace(currentUserService.currentWorkspace())
            .orElseThrow(() -> new RuntimeException("Settings not found"));
        if (request.defaultVisibility() != null) settings.setDefaultVisibility(request.defaultVisibility());
        if (request.requireProposalApproval() != null) settings.setRequireProposalApproval(request.requireProposalApproval());
        if (request.allowMemberInvites() != null) settings.setAllowMemberInvites(request.allowMemberInvites());
        return new WorkspaceSettingsDto(settings.getWorkspaceName(), settings.getDefaultVisibility(), settings.isRequireProposalApproval(), settings.isAllowMemberInvites(), settings.getFiscalYearStart());
    }
}
