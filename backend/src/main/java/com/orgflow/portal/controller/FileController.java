package com.orgflow.portal.controller;

import com.orgflow.portal.dto.Dtos.WorkspaceFileDto;
import com.orgflow.portal.service.FileService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
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
}
