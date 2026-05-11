package com.generalportal.portal.service;

import com.generalportal.portal.entity.UserAccount;
import com.generalportal.portal.entity.Workspace;
import com.generalportal.portal.exception.ResourceNotFoundException;
import com.generalportal.portal.repository.UserAccountRepository;
import com.generalportal.portal.repository.WorkspaceRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CurrentUserService {
    private static final String DEFAULT_WORKSPACE_NAME = "General Portal Workspace";

    private final UserAccountRepository userAccountRepository;
    private final WorkspaceRepository workspaceRepository;

    public CurrentUserService(UserAccountRepository userAccountRepository, WorkspaceRepository workspaceRepository) {
        this.userAccountRepository = userAccountRepository;
        this.workspaceRepository = workspaceRepository;
    }

    @Transactional(readOnly = true)
    public UserAccount currentUser() {
        return userAccountRepository.findByEmailIgnoreCase(currentEmail())
            .orElseThrow(() -> new ResourceNotFoundException("Current user"));
    }

    @Transactional(readOnly = true)
    public Workspace currentWorkspace() {
        return workspaceRepository.findByName(DEFAULT_WORKSPACE_NAME)
            .orElseThrow(() -> new ResourceNotFoundException("Workspace"));
    }

    public String currentEmail() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null) {
            throw new ResourceNotFoundException("Authenticated user");
        }

        Object principal = authentication.getPrincipal();
        if (principal instanceof OidcUser oidcUser) {
            String email = oidcUser.getEmail();
            if (email != null && !email.isBlank()) {
                return email;
            }

            String preferredUsername = oidcUser.getClaimAsString("preferred_username");
            if (preferredUsername != null && !preferredUsername.isBlank()) {
                return preferredUsername;
            }

            String upn = oidcUser.getClaimAsString("upn");
            if (upn != null && !upn.isBlank()) {
                return upn;
            }
        }

        return authentication.getName();
    }
}
