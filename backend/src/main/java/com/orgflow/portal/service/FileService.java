package com.orgflow.portal.service;

import com.orgflow.portal.dto.Dtos.WorkspaceFileDto;
import com.orgflow.portal.repository.WorkspaceFileRepository;
import com.orgflow.portal.security.Permissions;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class FileService {
    private final CurrentUserService currentUserService;
    private final PermissionService permissionService;
    private final WorkspaceFileRepository workspaceFileRepository;

    public FileService(CurrentUserService currentUserService, PermissionService permissionService, WorkspaceFileRepository workspaceFileRepository) {
        this.currentUserService = currentUserService;
        this.permissionService = permissionService;
        this.workspaceFileRepository = workspaceFileRepository;
    }

    @Transactional(readOnly = true)
    public List<WorkspaceFileDto> listFiles() {
        permissionService.require(Permissions.FILES_READ);
        return workspaceFileRepository.findByWorkspaceOrderByFileUpdatedAtDesc(currentUserService.currentWorkspace()).stream()
            .map(DtoMapper::toWorkspaceFileDto)
            .toList();
    }
}
