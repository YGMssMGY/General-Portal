package com.generalportal.portal.service;

import com.generalportal.portal.entity.Membership;
import com.generalportal.portal.entity.PermissionGrant;
import com.generalportal.portal.entity.UserAccount;
import com.generalportal.portal.exception.PermissionDeniedException;
import com.generalportal.portal.exception.ResourceNotFoundException;
import com.generalportal.portal.repository.MembershipRepository;
import com.generalportal.portal.repository.PermissionGrantRepository;
import com.generalportal.portal.repository.UserAccountRepository;
import com.generalportal.portal.security.Permissions;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.context.annotation.Lazy;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PermissionService {
    private final CurrentUserService currentUserService;
    private final UserAccountRepository userAccountRepository;
    private final MembershipRepository membershipRepository;
    private final PermissionGrantRepository permissionGrantRepository;
    private final boolean autoProvisionUsers;

    @Lazy
    @Autowired
    private PermissionService self;

    public PermissionService(
        CurrentUserService currentUserService,
        UserAccountRepository userAccountRepository,
        MembershipRepository membershipRepository,
        PermissionGrantRepository permissionGrantRepository,
        @Value("${general-portal.security.auto-provision-users:true}") boolean autoProvisionUsers
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
        return self.permissionsForEmail(currentUserService.currentEmail());
    }

    @Cacheable(cacheNames = "permissions", key = "#email")
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public List<String> permissionsForEmail(String email) {
        try {
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
        } catch (DataIntegrityViolationException e) {
            var user = userAccountRepository.findByEmailIgnoreCase(email).orElseThrow();
            var workspace = currentUserService.currentWorkspace();
            Membership membership = membershipRepository.findByWorkspaceAndUser(workspace, user).orElseThrow();
            return permissionGrantRepository.findByMembership(membership)
                .stream()
                .map(PermissionGrant::getPermission)
                .sorted()
                .toList();
        }
    }

    public Map<Membership, List<String>> permissionsForMemberships(Collection<Membership> memberships) {
        List<PermissionGrant> allGrants = permissionGrantRepository.findByMembershipIn(new ArrayList<>(memberships));
        return memberships.stream()
            .collect(Collectors.toMap(
                m -> m,
                m -> allGrants.stream()
                    .filter(g -> g.getMembership().getId().equals(m.getId()))
                    .map(PermissionGrant::getPermission)
                    .sorted()
                    .toList()
            ));
    }

    private UserAccount provisionUser(String email) {
        if (!autoProvisionUsers) {
            throw new ResourceNotFoundException("User");
        }

        String displayName = email.contains("@") ? email.substring(0, email.indexOf('@')) : email;
        return userAccountRepository.save(new UserAccount(email, displayName, null));
    }

    private Membership provisionMembership(com.generalportal.portal.entity.Workspace workspace, UserAccount user) {
        if (!autoProvisionUsers) {
            throw new ResourceNotFoundException("Membership");
        }

        Membership membership = membershipRepository.save(new Membership(workspace, user, "Member", "Member", 0, 0));
        permissionGrantRepository.saveAll(Objects.requireNonNull(Permissions.memberPermissions().stream()
            .map(permission -> new PermissionGrant(membership, permission))
            .toList()));
        return membership;
    }
}
