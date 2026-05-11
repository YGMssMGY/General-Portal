package com.generalportal.portal.service;

import com.generalportal.portal.dto.Dtos.ActivityDto;
import com.generalportal.portal.repository.ActivityLogRepository;
import com.generalportal.portal.security.Permissions;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ActivityService {
    private final CurrentUserService currentUserService;
    private final PermissionService permissionService;
    private final ActivityLogRepository activityLogRepository;

    public ActivityService(CurrentUserService currentUserService, PermissionService permissionService, ActivityLogRepository activityLogRepository) {
        this.currentUserService = currentUserService;
        this.permissionService = permissionService;
        this.activityLogRepository = activityLogRepository;
    }

    @Transactional(readOnly = true)
    public Page<ActivityDto> listActivity(Pageable pageable) {
        permissionService.require(Permissions.ACTIVITY_READ);
        return activityLogRepository.findByWorkspaceOrderByOccurredAtDesc(currentUserService.currentWorkspace(), pageable)
            .map(DtoMapper::toActivityDto);
    }
}
