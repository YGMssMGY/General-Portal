package com.orgflow.portal.controller;

import jakarta.servlet.http.HttpServletRequest;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.mvc.method.RequestMappingInfo;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;

@RestController
public class SwaggerController {
    private final RequestMappingHandlerMapping handlerMapping;

    public SwaggerController(RequestMappingHandlerMapping handlerMapping) {
        this.handlerMapping = handlerMapping;
    }

    @GetMapping(value = "/api-docs", produces = "text/html")
    @SuppressWarnings("null")
    public String swaggerUi(HttpServletRequest request) {
        Map<RequestMappingInfo, HandlerMethod> methods = handlerMapping.getHandlerMethods();
        Map<String, List<EndpointInfo>> grouped = new LinkedHashMap<>();

        for (var entry : methods.entrySet()) {
            RequestMappingInfo info = entry.getKey();
            HandlerMethod method = entry.getValue();
            String controllerName = method.getBeanType().getSimpleName();

            if (info.getPathPatternsCondition() == null || info.getMethodsCondition() == null) continue;

            info.getPathPatternsCondition().getPatterns().forEach(pattern -> {
                info.getMethodsCondition().getMethods().forEach(httpMethod -> {
                    grouped
                        .computeIfAbsent(controllerName, k -> new ArrayList<>())
                        .add(new EndpointInfo(httpMethod.name(), pattern.getPatternString()));
                });
            });
        }

        String baseUrl = request.getScheme() + "://" + request.getServerName() + ":" + request.getServerPort();

        StringBuilder html = new StringBuilder();
        html.append("<!DOCTYPE html><html lang=\"en\"><head><meta charset=\"UTF-8\">")
            .append("<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">")
            .append("<title>OrgFlow API</title>")
            .append("<style>")
            .append("*{box-sizing:border-box;margin:0;padding:0}")
            .append("body{font-family:system-ui,sans-serif;background:#f4f4f4;color:#161616;padding:24px}")
            .append("h1{font-size:24px;margin-bottom:8px}")
            .append("h2{font-size:16px;font-weight:600;margin:24px 0 8px;padding:8px 12px;background:#0f62fe;color:#fff}")
            .append(".ep{display:flex;align-items:center;gap:12px;padding:8px 12px;border-bottom:1px solid #e0e0e0;font-size:14px;background:#fff}")
            .append(".ep:hover{background:#e8e8e8}")
            .append(".m{display:inline-block;min-width:56px;padding:2px 8px;text-align:center;font-size:11px;font-weight:700;text-transform:uppercase}")
            .append(".g{background:#198038;color:#fff}.p{background:#0f62fe;color:#fff}.pa{background:#f1c21b;color:#161616}.d{background:#da1e28;color:#fff}")
            .append(".path{font-family:monospace;word-break:break-all}")
            .append("</style></head><body>")
            .append("<h1>OrgFlow API</h1>")
            .append("<p style=\"color:#525252;margin-bottom:16px\">Auto-discovered endpoints &middot; <a href=\"").append(baseUrl).append("/api/health\">health check</a></p>");

        grouped.keySet().stream().sorted().forEach(controller -> {
            html.append("<h2>").append(controller).append("</h2>");
            grouped.get(controller).stream()
                .sorted(Comparator.comparing(EndpointInfo::path))
                .forEach(e -> {
                    String cls = switch (e.method) {
                        case "GET" -> "g"; case "POST" -> "p"; case "PATCH" -> "pa"; case "DELETE" -> "d";
                        default -> "";
                    };
                    html.append("<div class=\"ep\">")
                        .append("<span class=\"m ").append(cls).append("\">").append(e.method).append("</span>")
                        .append("<span class=\"path\">").append(e.path).append("</span>")
                        .append("</div>");
                });
        });

        html.append("</body></html>");
        return html.toString();
    }

    private record EndpointInfo(String method, String path) {}
}
