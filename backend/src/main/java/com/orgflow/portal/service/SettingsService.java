package com.orgflow.portal.service;

import com.orgflow.portal.dto.Dtos.WorkspaceSettingsDto;
import com.orgflow.portal.exception.ResourceNotFoundException;
import com.orgflow.portal.repository.WorkspaceSettingsRepository;
import com.orgflow.portal.security.Permissions;
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
        return workspaceSettingsRepository.findByWorkspace(currentUserService.currentWorkspace())
            .map(DtoMapper::toWorkspaceSettingsDto)
            .orElseThrow(() -> new ResourceNotFoundException("Workspace settings"));
    }
}
