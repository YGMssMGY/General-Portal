package com.orgflow.portal.controller;

import com.orgflow.portal.dto.Dtos.WorkspaceFileDto;
import com.orgflow.portal.service.FileService;
import java.util.List;
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
    public List<WorkspaceFileDto> listFiles() {
        return fileService.listFiles();
    }
}
