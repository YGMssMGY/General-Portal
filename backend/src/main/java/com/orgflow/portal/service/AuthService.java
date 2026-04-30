package com.orgflow.portal.service;

import com.orgflow.portal.dto.Dtos.UserDto;
import com.orgflow.portal.security.Permissions;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {
    private final CurrentUserService currentUserService;
    private final PermissionService permissionService;

    public AuthService(CurrentUserService currentUserService, PermissionService permissionService) {
        this.currentUserService = currentUserService;
        this.permissionService = permissionService;
    }

    @Transactional(readOnly = true)
    public UserDto currentUser() {
        permissionService.require(Permissions.DASHBOARD_READ);
        var user = currentUserService.currentUser();
        var workspace = currentUserService.currentWorkspace();
        return new UserDto(user.getId(), user.getDisplayName(), user.getEmail(), user.getAvatarUrl(), workspace.getId(), permissionService.currentPermissions());
    }
}
