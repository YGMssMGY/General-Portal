package com.orgflow.portal.service;

import com.orgflow.portal.entity.Membership;
import com.orgflow.portal.entity.PermissionGrant;
import com.orgflow.portal.entity.UserAccount;
import com.orgflow.portal.exception.PermissionDeniedException;
import com.orgflow.portal.exception.ResourceNotFoundException;
import com.orgflow.portal.repository.MembershipRepository;
import com.orgflow.portal.repository.PermissionGrantRepository;
import com.orgflow.portal.repository.UserAccountRepository;
import com.orgflow.portal.security.Permissions;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PermissionService {
    private final CurrentUserService currentUserService;
    private final UserAccountRepository userAccountRepository;
    private final MembershipRepository membershipRepository;
    private final PermissionGrantRepository permissionGrantRepository;
    private final boolean autoProvisionUsers;

    public PermissionService(
        CurrentUserService currentUserService,
        UserAccountRepository userAccountRepository,
        MembershipRepository membershipRepository,
        PermissionGrantRepository permissionGrantRepository,
        @Value("${orgflow.security.auto-provision-users:true}") boolean autoProvisionUsers
    ) {
        this.currentUserService = currentUserService;
        this.userAccountRepository = userAccountRepository;
        this.membershipRepository = membershipRepository;
        this.permissionGrantRepository = permissionGrantRepository;
        this.autoProvisionUsers = autoProvisionUsers;
    }

    @Transactional
    public void require(String permission) {
        if (!currentPermissions().contains(permission)) {
            throw new PermissionDeniedException(permission);
        }
    }

    @Transactional
    public List<String> currentPermissions() {
        return permissionsForEmail(currentUserService.currentEmail());
    }

    @Cacheable(cacheNames = "permissions", key = "#email")
    @Transactional
    public List<String> permissionsForEmail(String email) {
        var user = userAccountRepository.findByEmailIgnoreCase(email)
            .orElseGet(() -> provisionUser(email));
        var workspace = currentUserService.currentWorkspace();
        Membership membership = membershipRepository.findByWorkspaceAndUser(workspace, user)
            .orElseGet(() -> provisionMembership(workspace, user));

        return permissionGrantRepository.findByMembership(membership)
            .stream()
            .map(PermissionGrant::getPermission)
            .sorted()
            .toList();
    }

    private UserAccount provisionUser(String email) {
        if (!autoProvisionUsers) {
            throw new ResourceNotFoundException("User");
        }

        String displayName = email.contains("@") ? email.substring(0, email.indexOf('@')) : email;
        return userAccountRepository.save(new UserAccount(email, displayName, null));
    }

    private Membership provisionMembership(com.orgflow.portal.entity.Workspace workspace, UserAccount user) {
        if (!autoProvisionUsers) {
            throw new ResourceNotFoundException("Membership");
        }

        Membership membership = membershipRepository.save(new Membership(workspace, user, "Member", "Member", 0, 0));
        permissionGrantRepository.saveAll(Permissions.demoPermissions().stream()
            .map(permission -> new PermissionGrant(membership, permission))
            .toList());
        return membership;
    }
}
