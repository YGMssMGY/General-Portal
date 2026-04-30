package com.orgflow.portal.security;

import java.util.List;

public final class Permissions {
    public static final String DASHBOARD_READ = "dashboard:read";
    public static final String TASKS_READ = "tasks:read";
    public static final String TASKS_WRITE = "tasks:write";
    public static final String PROPOSALS_READ = "proposals:read";
    public static final String PROPOSALS_WRITE = "proposals:write";
    public static final String EVENTS_READ = "events:read";
    public static final String VOLUNTEERS_READ = "volunteers:read";
    public static final String FINANCE_READ = "finance:read";
    public static final String MESSAGES_READ = "messages:read";
    public static final String FILES_READ = "files:read";
    public static final String MEMBERS_READ = "members:read";
    public static final String SETTINGS_READ = "settings:read";
    public static final String ACTIVITY_READ = "activity:read";
    public static final String SEARCH_READ = "search:read";

    private Permissions() {
    }

    public static List<String> demoPermissions() {
        return List.of(
            DASHBOARD_READ,
            TASKS_READ,
            TASKS_WRITE,
            PROPOSALS_READ,
            PROPOSALS_WRITE,
            EVENTS_READ,
            VOLUNTEERS_READ,
            FINANCE_READ,
            MESSAGES_READ,
            FILES_READ,
            MEMBERS_READ,
            SETTINGS_READ,
            ACTIVITY_READ,
            SEARCH_READ
        );
    }
}
