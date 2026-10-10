function req(name: string): string {
    const v = process.env[name];
    if (!v) throw new Error(`Missing required environment variable: ${name}`);
    return v;
}

function opt(name: string, fallback = ""): string {
    return process.env[name] ?? fallback;
}

const LOG_LEVELS = new Set(["trace", "debug", "info", "warn", "error", "fatal", "silent"]);
const LOG_LEVEL_BY_ENV: Record<string, string> = {
    production: "info",
    development: "debug",
    test: "silent",
};

function resolveLogLevel(): string {
    const explicit = opt("LOG_LEVEL", "");
    if (LOG_LEVELS.has(explicit)) return explicit;
    const byEnv = LOG_LEVEL_BY_ENV[opt("NODE_ENV", "development")] ?? "info";
    return LOG_LEVELS.has(byEnv) ? byEnv : "info";
}

export const config = {
    nodeEnv: opt("NODE_ENV", "development"),
    logLevel: resolveLogLevel(),
    port: Number(opt("PORT", "3000")),
    baseUrl: opt("APP_BASE_URL", opt("AUTH_URL", "http://localhost:3000")),
    deploymentFile: opt("DEPLOYMENT_FILE", "deployment.yaml"),
    uploadsDir: opt("UPLOADS_DIR", "./uploads"),
    bossUrl: opt("PG_BOSS_URL"),
    poolMax: Math.max(2, Number(opt("PG_POOL_MAX", "10")) || 10),
    sessionCookie: "gp_session",
    portalCookie: "portal",
    sessionTtlHours: Number(opt("SESSION_TTL_HOURS", "24")),
    rateLimitMax: Number(opt("RATE_LIMIT_MAX", "100")),
    authSecret: opt("AUTH_SECRET", ""),
    entra: {
        clientId: opt("MICROSOFT_CLIENT_ID"),
        clientSecret: opt("MICROSOFT_CLIENT_SECRET"),
        tenantId: opt("MICROSOFT_TENANT_ID", "common"),
    },
    basisAuth: {
        issuer: opt("BASIS_AUTH_ISSUER"),
        clientId: opt("BASIS_AUTH_CLIENT_ID"),
        clientSecret: opt("BASIS_AUTH_CLIENT_SECRET"),
        redirectUri: opt("BASIS_AUTH_REDIRECT_URI"),
        resource: opt("BASIS_AUTH_RESOURCE"),
    },
    oidc: {
        issuer: opt("OIDC_ISSUER"),
        clientId: opt("OIDC_CLIENT_ID"),
        clientSecret: opt("OIDC_CLIENT_SECRET"),
        redirectUri: opt("OIDC_REDIRECT_URI"),
    },
    saml: {
        entryPoint: opt("SAML_ENTRY_POINT"),
        issuer: opt("SAML_ISSUER"),
        cert: opt("SAML_CERT"),
    },
    google: {
        clientId: opt("GOOGLE_CLIENT_ID"),
        clientSecret: opt("GOOGLE_CLIENT_SECRET"),
    },
    github: {
        clientId: opt("GITHUB_CLIENT_ID"),
        clientSecret: opt("GITHUB_CLIENT_SECRET"),
    },
    smtp: {
        host: opt("SMTP_HOST"),
        port: Number(opt("SMTP_PORT", "587")),
        user: opt("SMTP_USER"),
        pass: opt("SMTP_PASS"),
        from: opt("SMTP_FROM"),
    },
    teamsWebhookUrl: opt("TEAMS_WEBHOOK_URL"),
};

export function requireEnv(...names: string[]): void {
    for (const n of names) req(n);
}
