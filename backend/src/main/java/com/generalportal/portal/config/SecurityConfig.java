package com.generalportal.portal.config;

import com.generalportal.portal.security.DevLoginFilter;
import jakarta.annotation.PostConstruct;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.hierarchicalroles.RoleHierarchy;
import org.springframework.security.access.hierarchicalroles.RoleHierarchyImpl;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.AnonymousAuthenticationFilter;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {
    private static final Logger logger = LoggerFactory.getLogger(SecurityConfig.class);

    private final DevLoginFilter devLoginFilter;

    @Value("${general-portal.security.frontend-origin}")
    private String frontendOrigin;

    @Value("${spring.security.oauth2.client.registration.microsoft.client-id:}")
    private String oauth2ClientId;

    @Value("${general-portal.security.officer-role-enabled:true}")
    private boolean officerRoleEnabled;

    public SecurityConfig(DevLoginFilter devLoginFilter) {
        this.devLoginFilter = devLoginFilter;
    }

    @Bean
    RoleHierarchy roleHierarchy() {
        return RoleHierarchyImpl.fromHierarchy(roleHierarchyString());
    }

    private String roleHierarchyString() {
        if (officerRoleEnabled) {
            return "ROLE_ADMIN > ROLE_PRESIDENT\n" +
                   "ROLE_PRESIDENT > ROLE_OFFICER\n" +
                   "ROLE_OFFICER > ROLE_MEMBER";
        }
        return "ROLE_ADMIN > ROLE_PRESIDENT\n" +
               "ROLE_PRESIDENT > ROLE_MEMBER";
    }

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        var chain = http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(Customizer.withDefaults())
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED))
            )
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.GET, "/api/health").permitAll()
                .requestMatchers(HttpMethod.GET, "/api-docs").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/events/public").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/photos").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/auth/dev-login").permitAll()
                .requestMatchers("/error").permitAll()
                .anyRequest().authenticated()
            );

        if (!"demo-client-id".equals(oauth2ClientId) && !oauth2ClientId.isBlank()) {
            chain.oauth2Login(Customizer.withDefaults());
        }

        return chain
            .logout(logout -> logout.logoutSuccessUrl("/"))
            .addFilterBefore(devLoginFilter, AnonymousAuthenticationFilter.class)
            .build();
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(List.of(frontendOrigin));
        configuration.setAllowedMethods(List.of("GET", "POST", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-Requested-With"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @PostConstruct
    void validateOAuth2Credentials() {
        String profilesStr = System.getProperty("spring.profiles.active", "");
        if (profilesStr.isBlank()) {
            profilesStr = System.getenv().getOrDefault("SPRING_PROFILES_ACTIVE", "");
        }
        List<String> activeProfiles = profilesStr.isBlank()
            ? List.of()
            : List.of(profilesStr.split(","));

        boolean isDevProfile = activeProfiles.isEmpty()
            || activeProfiles.contains("dev")
            || activeProfiles.contains("demo")
            || activeProfiles.contains("local")
            || activeProfiles.contains("sqlite");

        if (!isDevProfile && ("demo-client-id".equals(oauth2ClientId) || oauth2ClientId.isEmpty())) {
            throw new IllegalStateException(
                "Production requires real Microsoft OAuth2 credentials. " +
                "Set MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET environment variables."
            );
        }
    }

    @PostConstruct
    void validateCorsOrigin() {
        if ("*".equals(frontendOrigin) || !frontendOrigin.startsWith("http")) {
            logger.warn("FRONTEND_ORIGIN '{}' may be misconfigured -- expected an HTTP(S) origin", frontendOrigin);
        }
    }
}
