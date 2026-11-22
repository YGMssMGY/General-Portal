/* eslint-disable @typescript-eslint/no-explicit-any */
import type { z } from "zod";

export type OpsScope = "ops:read" | "ops:deploy" | "ops:backup" | "ops:danger";
export type OpsSource = "tui" | "api";

export interface OpsContext {
    operatorId: string;
    source: OpsSource;
    scopes: OpsScope[];
    ip?: string;
    idempotencyKey?: string;
    confirmationToken?: string;
    typedValue?: string;
    yes?: boolean;
}

export interface ActionDefinition<P extends z.ZodType = z.ZodType> {
    id: string;
    group: string;
    summary: string;
    scopes: OpsScope[];
    destructive: boolean;
    confirmField?: "slug" | "email";
    params: P;
    run: (input: any, ctx: OpsContext) => Promise<unknown>;
    preview?: (input: any, ctx: OpsContext) => Promise<unknown>;
}

export interface ActionDescriptor {
    id: string;
    group: string;
    summary: string;
    scopes: OpsScope[];
    destructive: boolean;
    confirmField?: "slug" | "email";
    params: Record<string, unknown>;
    exampleCurl: string;
    exampleIrm: string;
}

export type OpsResult =
    | { ok: true; data: unknown; action: string; durationMs: number }
    | {
          ok: false;
          status: "confirmation-required";
          action: string;
          confirmationToken: string;
          preview: unknown;
          expiresAt: string;
          hint: string;
      }
    | {
          ok: false;
          status: "error";
          action: string;
          code: string;
          message: string;
          durationMs: number;
      };
