package com.orgflow.portal.service;

import com.orgflow.portal.dto.Dtos.ActivityDto;
import com.orgflow.portal.repository.ActivityLogRepository;
import com.orgflow.portal.security.Permissions;
import java.util.List;
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
    public List<ActivityDto> listActivity() {
        permissionService.require(Permissions.ACTIVITY_READ);
        return activityLogRepository.findTop20ByWorkspaceOrderByOccurredAtDesc(currentUserService.currentWorkspace()).stream()
            .map(DtoMapper::toActivityDto)
            .toList();
    }
}
