package com.generalportal.portal.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.generalportal.portal.entity.Membership;
import com.generalportal.portal.entity.PermissionGrant;
import com.generalportal.portal.entity.UserAccount;
import com.generalportal.portal.entity.Workspace;
import com.generalportal.portal.repository.MembershipRepository;
import com.generalportal.portal.repository.PermissionGrantRepository;
import com.generalportal.portal.repository.UserAccountRepository;
import com.generalportal.portal.repository.WorkspaceRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@Profile({"dev", "demo", "local", "sqlite"})
public class DevLoginFilter extends OncePerRequestFilter {
    private static final Logger logger = LoggerFactory.getLogger(DevLoginFilter.class);
    private static final String LOGIN_PATH = "/api/auth/dev-login";
    private static final ObjectMapper objectMapper = new ObjectMapper();

    private final String devUsername;
    private final String devPassword;
    private final UserAccountRepository userAccountRepository;
    private final MembershipRepository membershipRepository;
    private final WorkspaceRepository workspaceRepository;
    private final PermissionGrantRepository permissionGrantRepository;

    public DevLoginFilter(
        @Value("${general-portal.security.dev-auth.username:}") String devUsername,
        @Value("${general-portal.security.dev-auth.password:}") String devPassword,
        UserAccountRepository userAccountRepository,
        MembershipRepository membershipRepository,
        WorkspaceRepository workspaceRepository,
        PermissionGrantRepository permissionGrantRepository
    ) {
        this.devUsername = devUsername;
        this.devPassword = devPassword;
        this.userAccountRepository = userAccountRepository;
        this.membershipRepository = membershipRepository;
        this.workspaceRepository = workspaceRepository;
        this.permissionGrantRepository = permissionGrantRepository;

        if (devPassword == null || devPassword.isBlank()) {
            logger.info("Dev auth password is not configured — dev login is disabled.");
        } else {
            logger.info("Dev auth enabled for user: {}", devUsername);
        }
    }

    @Override
    protected void doFilterInternal(
        @NonNull HttpServletRequest request,
        @NonNull HttpServletResponse response,
        @NonNull FilterChain filterChain
    ) throws ServletException, IOException {

        if (!LOGIN_PATH.equals(request.getServletPath()) || !"POST".equalsIgnoreCase(request.getMethod())) {
            filterChain.doFilter(request, response);
            return;
        }

        if (devPassword == null || devPassword.isBlank()) {
            sendError(response, HttpStatus.FORBIDDEN, "Dev auth is not configured. Set DEV_AUTH_USERNAME and DEV_AUTH_PASSWORD.");
            return;
        }

        try {
            @SuppressWarnings("unchecked")
            Map<String, String> body = objectMapper.readValue(request.getInputStream(), Map.class);
            String username = body.get("username");
            String password = body.get("password");

            if (devUsername.equals(username) && devPassword.equals(password)) {
                var authorities = List.of(new SimpleGrantedAuthority("ROLE_ADMIN"));
                var authentication = new UsernamePasswordAuthenticationToken(username, password, authorities);
                SecurityContextHolder.getContext().setAuthentication(authentication);

                provisionDevUser(username);

                response.setStatus(HttpStatus.OK.value());
                response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                objectMapper.writeValue(response.getWriter(), Map.of(
                    "status", "ok",
                    "message", "Dev login successful",
                    "username", username,
                    "role", "admin"
                ));
                logger.info("Dev login successful for: {}", username);
                return;
            }

            sendError(response, HttpStatus.UNAUTHORIZED, "Invalid dev credentials.");
        } catch (IOException e) {
            sendError(response, HttpStatus.BAD_REQUEST, "Invalid request body. Expected {\"username\": \"...\", \"password\": \"...\"}.");
        }
    }

    private void provisionDevUser(String username) {
        try {
            if (userAccountRepository.findByEmailIgnoreCase(username).isPresent()) {
                return;
            }
            Workspace workspace = workspaceRepository.findAll().stream().findFirst().orElse(null);
            if (workspace == null) {
                logger.warn("No workspace found — cannot auto-provision dev user");
                return;
            }
            UserAccount user = new UserAccount(username, "Dev Admin", null);
            userAccountRepository.save(user);
            Membership membership = new Membership(workspace, user, "Admin", "Admin", 0, 0);
            membershipRepository.save(membership);

            for (String perm : Permissions.adminPermissions()) {
                permissionGrantRepository.save(new PermissionGrant(membership, perm));
            }

            logger.info("Auto-provisioned dev user: {} as Admin in workspace '{}'", username, workspace.getName());
        } catch (Exception e) {
            logger.warn("Auto-provision of dev user failed (may already exist): {}", e.getMessage());
        }
    }

    private void sendError(HttpServletResponse response, HttpStatus status, String message) throws IOException {
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(response.getWriter(), Map.of("error", message));
    }
}
