package com.generalportal.portal.security;

import com.fasterxml.jackson.databind.ObjectMapper;
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

    public DevLoginFilter(
        @Value("${general-portal.security.dev-auth.username:}") String devUsername,
        @Value("${general-portal.security.dev-auth.password:}") String devPassword
    ) {
        this.devUsername = devUsername;
        this.devPassword = devPassword;

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
                var authentication = new UsernamePasswordAuthenticationToken(username, password, List.of());
                SecurityContextHolder.getContext().setAuthentication(authentication);
                response.setStatus(HttpStatus.OK.value());
                response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                objectMapper.writeValue(response.getWriter(), Map.of("status", "ok", "message", "Dev login successful"));
                logger.info("Dev login successful for: {}", username);
                return;
            }

            sendError(response, HttpStatus.UNAUTHORIZED, "Invalid dev credentials.");
        } catch (IOException e) {
            sendError(response, HttpStatus.BAD_REQUEST, "Invalid request body. Expected {\"username\": \"...\", \"password\": \"...\"}.");
        }
    }

    private void sendError(HttpServletResponse response, HttpStatus status, String message) throws IOException {
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(response.getWriter(), Map.of("error", message));
    }
}
