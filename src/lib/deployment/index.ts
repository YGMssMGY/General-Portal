import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import { config } from "@/config";
import { deploymentConfigSchema, type DeploymentConfig, type DeploymentPortal } from "./schema";

export type { DeploymentConfig, DeploymentPortal };
export type PortalNavEntry = DeploymentPortal["nav"][number];
export type PortalLimits = DeploymentPortal["limits"];

const cache = new Map<string, DeploymentConfig>();
let bySlug = new Map<string, DeploymentPortal>();

function readAndValidate(abs: string): DeploymentConfig {
    const cfg = deploymentConfigSchema.parse(parse(fs.readFileSync(abs, "utf8")));
    Object.freeze(cfg);
    cache.set(abs, cfg);
    return cfg;
}

function activePath(): string {
    return path.resolve(process.cwd(), config.deploymentFile);
}

function active(): DeploymentConfig {
    const abs = activePath();
    return cache.get(abs) ?? readAndValidate(abs);
}

function sync(cfg: DeploymentConfig): void {
    bySlug = new Map(cfg.portals.map((p) => [p.slug, p]));
}

sync(active());

export function reloadDeployment(): DeploymentConfig {
    cache.delete(activePath());
    const cfg = active();
    sync(cfg);
    return cfg;
}

export function getDeployment(): DeploymentConfig {
    return active();
}

export function getPortal(slug: string): DeploymentPortal {
    const portal = bySlug.get(slug);
    if (!portal) throw new Error(`Unknown portal: "${slug}"`);
    return portal;
}

export function listPortals(): DeploymentPortal[] {
    return [...bySlug.values()];
}

export function isFeatureEnabled(slug: string, flag: string): boolean {
    return getPortal(slug).features.includes(flag);
}

export function navFor(slug: string): PortalNavEntry[] {
    return getPortal(slug).nav;
}

export function termFor(slug: string, key: string): string {
    return getPortal(slug).terminology[key] ?? key;
}

export function limitsFor(slug: string): PortalLimits {
    return getPortal(slug).limits;
}

export function seedPackFor(slug: string): string {
    return getPortal(slug).seedPack;
}

export function authProvidersFor(slug: string): string[] {
    return getPortal(slug).auth.providers;
}

export function modulesFor(slug: string): string[] {
    return getPortal(slug).modules;
}
