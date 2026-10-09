import { z } from "zod";

const providerSchema = z.enum([
    "microsoft-entra-id",
    "basis-auth",
    "oidc",
    "saml",
    "google",
    "github",
    "credentials",
    "magic-link",
    "email-otp",
    "passkey",
]);

const portalSchema = z.object({
    slug: z.string().regex(/^[a-z0-9][a-z0-9_-]{0,63}$/),
    name: z.string(),
    category: z.string(),
    description: z.string(),
    branding: z.object({
        logo: z.string(),
        favicon: z.string(),
        primary: z.string(),
    }),
    db: z.object({
        envVar: z.string(),
    }),
    auth: z.object({
        providers: z.array(providerSchema),
        allowedDomains: z.array(z.string()),
    }),
    modules: z.array(z.string()),
    nav: z.array(
        z.object({
            path: z.string(),
            label: z.string(),
            icon: z.string(),
            module: z.string(),
        }),
    ),
    terminology: z.record(z.string(), z.string()),
    roles: z.array(z.string()),
    seedPack: z.string(),
    limits: z.object({
        uploadMb: z.number(),
        requestsPerMinute: z.number(),
        auditRetentionDays: z.number(),
    }),
    features: z.array(z.string()),
    integrations: z.record(z.string(), z.string()).optional(),
});

export const deploymentConfigSchema = z.object({
    version: z.literal(1),
    deployment: z.object({
        id: z.string(),
        environment: z.string(),
        baseUrl: z.string(),
    }),
    defaults: z.object({
        locale: z.string(),
        timezone: z.string(),
        theme: z.object({
            primary: z.string(),
            radius: z.number(),
        }),
    }),
    portals: z.array(portalSchema),
});

export type DeploymentConfig = z.infer<typeof deploymentConfigSchema>;
export type DeploymentPortal = DeploymentConfig["portals"][number];
