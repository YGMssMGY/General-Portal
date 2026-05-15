import { PrismaClient } from "@prisma/client";

const _prisma = new PrismaClient();

function safe(model: Record<string, unknown>): Record<string, unknown> {
  return new Proxy(model, {
    get(target, prop) {
      const v = target[prop as string];
      if (typeof v !== "function") return v;
      return async (...args: unknown[]) => {
        try {
          return await v(...args);
        } catch (e: unknown) {
          if (typeof e === "object" && e !== null && "clientVersion" in e) {
            const method = prop as string;
            if (method === "findMany" || method === "groupBy") return [];
            if (method === "count") return 0;
            return null;
          }
          throw e;
        }
      };
    },
  });
}

function isModel(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !(v instanceof PrismaClient);
}

export const db = new Proxy(_prisma, {
  get(target, prop) {
    const v = (target as unknown as Record<string, unknown>)[prop as string];
    if (isModel(v)) return safe(v);
    return v;
  },
});

export const prisma = _prisma;
