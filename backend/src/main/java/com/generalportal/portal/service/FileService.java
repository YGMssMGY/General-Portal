package com.generalportal.portal.service;

import com.generalportal.portal.dto.Dtos.CreateWorkspaceFileRequest;
import com.generalportal.portal.dto.Dtos.WorkspaceFileDto;
import com.generalportal.portal.entity.WorkspaceFile;
import com.generalportal.portal.repository.WorkspaceFileRepository;
import com.generalportal.portal.security.Permissions;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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
    public Page<WorkspaceFileDto> listFiles(Pageable pageable) {
        permissionService.require(Permissions.FILES_READ);
        return workspaceFileRepository.findByWorkspace(currentUserService.currentWorkspace(), pageable)
            .map(DtoMapper::toWorkspaceFileDto);
    }

    @Transactional
    public WorkspaceFileDto createFile(CreateWorkspaceFileRequest request) {
        permissionService.require(Permissions.FILES_WRITE);
        var file = new WorkspaceFile(currentUserService.currentWorkspace(), request.name(), request.fileType(), currentUserService.currentUser().getDisplayName(), request.linkedResource(), request.sizeLabel(), "files/" + UUID.randomUUID(), Instant.now());
        return DtoMapper.toWorkspaceFileDto(workspaceFileRepository.save(file));
    }

    @Transactional
    public void deleteFile(UUID id) {
        permissionService.require(Permissions.FILES_WRITE);
        workspaceFileRepository.deleteById(Objects.requireNonNull(id));
    }
}
