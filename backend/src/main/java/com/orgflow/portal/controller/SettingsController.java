package com.orgflow.portal.controller;

import com.orgflow.portal.dto.Dtos.WorkspaceSettingsDto;
import com.orgflow.portal.service.SettingsService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/settings")
public class SettingsController {
    private final SettingsService settingsService;

    public SettingsController(SettingsService settingsService) {
        this.settingsService = settingsService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('settings:read')")
    public WorkspaceSettingsDto getSettings() {
        return settingsService.getSettings();
    }
}
