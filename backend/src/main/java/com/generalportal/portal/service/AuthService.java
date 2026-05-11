package com.generalportal.portal.service;

import com.generalportal.portal.dto.Dtos.UserDto;
import com.generalportal.portal.entity.PermissionGrant;
import com.generalportal.portal.entity.UserAccount;
import com.generalportal.portal.exception.ResourceNotFoundException;
import com.generalportal.portal.repository.PermissionGrantRepository;
import com.generalportal.portal.repository.UserAccountRepository;
import com.generalportal.portal.security.Permissions;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {
    private final CurrentUserService currentUserService;
    private final PermissionService permissionService;
    private final UserAccountRepository userAccountRepository;
    private final PermissionGrantRepository permissionGrantRepository;

    private static final Map<String, String> ROLE_EMAIL_MAP = Map.of(
        "admin", "chris@example.edu",
        "president", "sarah.j@example.edu",
        "officer", "maya.c@example.edu",
        "member", "jordan.d@example.edu"
    );

    public AuthService(
        CurrentUserService currentUserService,
        PermissionService permissionService,
        UserAccountRepository userAccountRepository,
        PermissionGrantRepository permissionGrantRepository
    ) {
        this.currentUserService = currentUserService;
        this.permissionService = permissionService;
        this.userAccountRepository = userAccountRepository;
        this.permissionGrantRepository = permissionGrantRepository;
    }

    @Transactional(readOnly = true)
    public UserDto currentUser() {
        permissionService.require(Permissions.DASHBOARD_READ);
        var user = currentUserService.currentUser();
        var workspace = currentUserService.currentWorkspace();
        var perms = permissionService.currentPermissions();
        String role = userAccountRepository.findMembershipForUser(user.getId(), workspace.getId())
            .map(m -> m.getPosition().toLowerCase())
            .orElse("member");
        return new UserDto(user.getId(), user.getDisplayName(), user.getEmail(), user.getAvatarUrl(),
            workspace.getId(), workspace.getName(), role, perms);
    }

    @Transactional(readOnly = true)
    public UserDto switchRole(String role) {
        String email = ROLE_EMAIL_MAP.getOrDefault(role, "chris@example.edu");
        UserAccount user = userAccountRepository.findByEmailIgnoreCase(email)
            .orElseThrow(() -> new ResourceNotFoundException("User not found for role: " + role));
        var workspace = currentUserService.currentWorkspace();

        var membership = userAccountRepository.findMembershipForUser(user.getId(), workspace.getId());
        List<String> perms = membership.map(m ->
            permissionGrantRepository.findByMembership(m).stream()
                .map(PermissionGrant::getPermission)
                .toList()
        ).orElse(List.of());

        return new UserDto(user.getId(), user.getDisplayName(), user.getEmail(), user.getAvatarUrl(),
            workspace.getId(), workspace.getName(), role, perms);
    }
}
