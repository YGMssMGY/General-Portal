package com.orgflow.portal.controller;

import com.orgflow.portal.entity.Workspace;
import com.orgflow.portal.service.CurrentUserService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/workspace")
public class WorkspaceController {
    private final CurrentUserService currentUserService;

    public WorkspaceController(CurrentUserService currentUserService) {
        this.currentUserService = currentUserService;
    }

    @GetMapping
    public WorkspaceInfo getWorkspace() {
        Workspace workspace = currentUserService.currentWorkspace();
        return new WorkspaceInfo(workspace.getId().toString(), workspace.getName(), workspace.getDescription());
    }

    public record WorkspaceInfo(String id, String name, String description) {}
}
