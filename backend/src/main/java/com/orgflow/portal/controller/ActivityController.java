package com.orgflow.portal.controller;

import com.orgflow.portal.dto.Dtos.ActivityDto;
import com.orgflow.portal.service.ActivityService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/activity")
public class ActivityController {
    private final ActivityService activityService;

    public ActivityController(ActivityService activityService) {
        this.activityService = activityService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('activity:read')")
    public Page<ActivityDto> listActivity(@PageableDefault(size = 25) Pageable pageable) {
        return activityService.listActivity(pageable);
    }
}
