package com.orgflow.portal.config;

import com.orgflow.portal.security.DemoAuthenticationFilter;
import jakarta.annotation.PostConstruct;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.access.hierarchicalroles.RoleHierarchy;
import org.springframework.security.access.hierarchicalroles.RoleHierarchyImpl;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.AnonymousAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {
    private static final Logger logger = LoggerFactory.getLogger(SecurityConfig.class);

    private final DemoAuthenticationFilter demoAuthenticationFilter;

    @Value("${orgflow.security.frontend-origin}")
    private String frontendOrigin;

    @Value("${spring.security.oauth2.client.registration.microsoft.client-id:}")
    private String oauth2ClientId;

    public SecurityConfig(DemoAuthenticationFilter demoAuthenticationFilter) {
        this.demoAuthenticationFilter = demoAuthenticationFilter;
    }

    @Bean
    RoleHierarchy roleHierarchy() {
        return RoleHierarchyImpl.withDefaultRolePrefix()
            .role("ADMIN").implies("OFFICER")
            .role("OFFICER").implies("MEMBER")
            .role("MEMBER").implies("GRADE_REP")
            .build();
    }

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
            // CSRF disabled: this REST API uses OAuth2 bearer tokens in production;
            // demo mode uses cookie-based auth in dev only and is guarded by @ConditionalOnExpression.
            .csrf(AbstractHttpConfigurer::disable)
            .cors(Customizer.withDefaults())
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.GET, "/api/health").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/events/public").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/photos").permitAll()
                .requestMatchers("/error").permitAll()
                .anyRequest().authenticated()
            )
            .oauth2Login(Customizer.withDefaults())
            .logout(logout -> logout.logoutSuccessUrl("/"))
            .addFilterBefore(demoAuthenticationFilter, AnonymousAuthenticationFilter.class)
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
        List<String> activeProfiles = List.of(
            System.getProperty("spring.profiles.active", "").split(",")
        );
        boolean isDevProfile = activeProfiles.contains("dev")
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
            logger.warn("FRONTEND_ORIGIN '{}' may be misconfigured — expected an HTTP(S) origin", frontendOrigin);
        }
    }
}
