package com.orgflow.portal.controller;

import com.orgflow.portal.dto.Dtos.ActivityDto;
import com.orgflow.portal.service.ActivityService;
import java.util.List;
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
    public List<ActivityDto> listActivity() {
        return activityService.listActivity();
    }
}
