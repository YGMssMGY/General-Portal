export interface NavFragment {
    label: string;
    path: string;
    icon: string;
    module: string;
}

export const NAV_FRAGMENTS: NavFragment[] = [
    { label: "Participation", path: "/participation", icon: "Trophy", module: "members" },
    { label: "Reports", path: "/reports", icon: "FileBarChart", module: "members" },
    { label: "Custom Fields", path: "/custom-fields", icon: "ListPlus", module: "members" },
    { label: "Webhooks", path: "/webhooks", icon: "Webhook", module: "members" },
    { label: "API Tokens", path: "/api-tokens", icon: "KeyRound", module: "members" },
    { label: "Trash", path: "/trash", icon: "Trash2", module: "members" },
];
