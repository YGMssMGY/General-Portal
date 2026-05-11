package com.generalportal.portal.controller;

import com.generalportal.portal.dto.Dtos.WorkspaceFileDto;
import com.generalportal.portal.dto.Dtos.CreateWorkspaceFileRequest;
import com.generalportal.portal.service.FileService;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.Objects;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/files")
public class FileController {
    private final FileService fileService;

    public FileController(FileService fileService) {
        this.fileService = fileService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('files:read')")
    public Page<WorkspaceFileDto> listFiles(@PageableDefault(size = 25) Pageable pageable) {
        return fileService.listFiles(pageable);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('files:write')")
    public ResponseEntity<WorkspaceFileDto> createFile(@Valid @RequestBody CreateWorkspaceFileRequest request) {
        WorkspaceFileDto file = fileService.createFile(request);
        return ResponseEntity.created(Objects.requireNonNull(URI.create("/api/files/" + file.id()))).body(file);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('files:write')")
    public ResponseEntity<Void> deleteFile(@PathVariable UUID id) {
        fileService.deleteFile(id);
        return ResponseEntity.noContent().build();
    }
}
