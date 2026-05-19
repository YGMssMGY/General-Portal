import { Hono, Context } from "hono";
import { z } from "zod";
import { getAuthUser } from "./get-auth-user.js";
import {
  successResponse,
  paginatedResponse,
  errorResponse,
  parsePagination,
} from "./api-response.js";

interface ResourceConfig {
  delegate: any;
  createSchema: z.ZodTypeAny;
  updateSchema: z.ZodTypeAny;
  resourceName: string;
  searchFields?: string[];
  softDelete?: boolean;
  allowedIncludes?: string[];
}

export function resourceRoute(config: ResourceConfig) {
  const {
    delegate,
    createSchema,
    updateSchema,
    resourceName,
    searchFields,
    softDelete = false,
    allowedIncludes,
  } = config;

  const route = new Hono();

  function getUser(c: Context) {
    return getAuthUser(c);
  }

  function buildWhere(c: Context, workspaceId: string) {
    const where: Record<string, unknown> = { workspaceId };
    if (softDelete) where["deletedAt"] = null;

    const search = c.req.query("search");
    if (search && searchFields && searchFields.length > 0) {
      where["OR"] = searchFields.map((field) => ({
        [field]: { contains: search, mode: "insensitive" },
      }));
    }

    const status = c.req.query("status");
    if (status) where["status"] = status;

    return where;
  }

  function buildInclude(c: Context) {
    const include: Record<string, boolean> = {};
    const withParam = c.req.query("with");
    if (withParam && allowedIncludes) {
      for (const inc of withParam.split(",")) {
        if (allowedIncludes.includes(inc)) {
          include[inc] = true;
        }
      }
    }
    return Object.keys(include).length > 0 ? include : undefined;
  }

  route.get("/", async (c) => {
    try {
      const user = getUser(c);
      const where = buildWhere(c, user.workspaceId);
      const include = buildInclude(c);
      const { page, limit, skip } = parsePagination(c);

      const orderBy = c.req.query("sort")
        ? { [c.req.query("sort")!]: c.req.query("order") || "asc" }
        : { createdAt: "desc" as const };

      const [data, total] = await Promise.all([
        delegate.findMany({ where, include, skip, take: limit, orderBy }),
        delegate.count({ where }),
      ]);

      return c.json(paginatedResponse(data, total, page, limit));
    } catch {
      return c.json(errorResponse("Failed to fetch " + resourceName), 500);
    }
  });

  route.get("/:id", async (c) => {
    try {
      const user = getUser(c);
      const where: Record<string, unknown> = {
        id: c.req.param("id"),
        workspaceId: user.workspaceId,
      };
      if (softDelete) where["deletedAt"] = null;

      const include = buildInclude(c);
      const item = await delegate.findFirst({ where, include });
      if (!item) return c.json(errorResponse(`${resourceName} not found`), 404);

      return c.json(successResponse(item));
    } catch {
      return c.json(errorResponse("Failed to fetch " + resourceName), 500);
    }
  });

  route.post("/", async (c) => {
    try {
      const user = getUser(c);
      const body = await c.req.json();
      const parsed = createSchema.parse(body);

      const data = { ...parsed, workspaceId: user.workspaceId };
      const item = await delegate.create({ data });

      return c.json(successResponse(item), 201);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return c.json(
          errorResponse("Validation error", "VALIDATION", err.errors),
          400,
        );
      }
      return c.json(errorResponse("Failed to create " + resourceName), 500);
    }
  });

  route.patch("/:id", async (c) => {
    try {
      const user = getUser(c);
      const id = c.req.param("id");
      const body = await c.req.json();
      const parsed = updateSchema.parse(body);

      const existing = await delegate.findFirst({
        where: { id, workspaceId: user.workspaceId },
      });
      if (!existing)
        return c.json(errorResponse(`${resourceName} not found`), 404);

      const item = await delegate.update({
        where: { id },
        data: parsed,
      });

      return c.json(successResponse(item));
    } catch (err) {
      if (err instanceof z.ZodError) {
        return c.json(
          errorResponse("Validation error", "VALIDATION", err.errors),
          400,
        );
      }
      return c.json(errorResponse("Failed to update " + resourceName), 500);
    }
  });

  route.delete("/:id", async (c) => {
    try {
      const user = getUser(c);
      const id = c.req.param("id");

      const existing = await delegate.findFirst({
        where: { id, workspaceId: user.workspaceId },
      });
      if (!existing)
        return c.json(errorResponse(`${resourceName} not found`), 404);

      if (softDelete) {
        await delegate.update({
          where: { id },
          data: { deletedAt: new Date() },
        });
      } else {
        await delegate.delete({ where: { id } });
      }

      return c.body(null, 204);
    } catch {
      return c.json(errorResponse("Failed to delete " + resourceName), 500);
    }
  });

  return route;
}
