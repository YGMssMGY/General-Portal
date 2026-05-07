package com.orgflow.portal.controller;

import com.orgflow.portal.dto.Dtos.DashboardDto;
import com.orgflow.portal.service.DashboardService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {
    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('dashboard:read')")
    public DashboardDto getDashboard() {
        return dashboardService.getDashboard();
    }
}
