package com.orgflow.portal.controller;

import com.orgflow.portal.dto.Dtos.UserDto;
import com.orgflow.portal.service.AuthService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @GetMapping("/me")
    public UserDto currentUser() {
        return authService.currentUser();
    }

    @PostMapping("/role")
    @PreAuthorize("hasAuthority('dashboard:read')")
    public UserDto switchRole(@RequestBody RoleSwitchRequest request) {
        return authService.switchRole(request.role());
    }

    public record RoleSwitchRequest(String role) {}
}
