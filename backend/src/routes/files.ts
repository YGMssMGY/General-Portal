import { Hono } from "hono";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { writeFile, readFile } from "fs/promises";

const __dirname = dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = resolve(__dirname, "..", "..", "uploads");

const ALLOWED_MIME_PREFIXES = [
  "image/",
  "application/pdf",
  "text/",
  "application/vnd",
];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const FORBIDDEN_EXT = [
  ".exe",
  ".bat",
  ".cmd",
  ".com",
  ".msi",
  ".scr",
  ".ps1",
  ".sh",
  ".dll",
];

const MIME_MAP: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  svg: "image/svg+xml",
  webp: "image/webp",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  txt: "text/plain",
  csv: "text/csv",
  json: "application/json",
};

function mimeType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  return MIME_MAP[ext] || "application/octet-stream";
}

const route = new Hono();

route.get("/files", async (c) => {
  const db = c.get("db");
  const wid = c.get("workspaceId");
  const type = c.req.query("type");
  const where: any = { workspaceId: wid };
  if (type) where.fileType = type;
  const items = await db.workspaceFile.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
  return c.json(items);
});

route.post("/files", async (c) => {
  const db = c.get("db");
  const wid = c.get("workspaceId");
  const body = await c.req.parseBody();
  const file = body["file"] as File | undefined;
  if (!file) return c.json({ error: "No file provided" }, 400);

  const originalName = file.name;
  const ext = (originalName.split(".").pop() || "").toLowerCase();

  // Validate file extension
  if (FORBIDDEN_EXT.includes(`.${ext}`)) {
    return c.json({ error: "File type not allowed" }, 400);
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return c.json({ error: "File exceeds 50 MB limit" }, 400);
  }

  // Validate MIME type
  const allowed = ALLOWED_MIME_PREFIXES.some((p) => file.type.startsWith(p));
  if (!allowed) {
    return c.json({ error: "File type not allowed" }, 400);
  }

  const storageKey = `${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  await writeFile(resolve(UPLOADS_DIR, storageKey), buffer);

  const record = await db.workspaceFile.create({
    data: {
      workspaceId: wid,
      name: originalName,
      fileType: mimeType(originalName).startsWith("image/")
        ? "Image"
        : ext.toUpperCase() === "PDF"
          ? "PDF"
          : ["doc", "docx"].includes(ext)
            ? "Document"
            : ["xls", "xlsx", "csv"].includes(ext)
              ? "Spreadsheet"
              : "Other",
      ownerName: (body["ownerName"] as string) || "Unknown",
      sizeLabel: `${(buffer.length / 1024).toFixed(1)} KB`,
      storageKey,
    },
  });

  return c.json(record, 201);
});

route.get("/files/:id/download", async (c) => {
  const wid = c.get("workspaceId");
  const id = c.req.param("id");
  const db = c.get("db");
  const record = await db.workspaceFile.findFirst({
    where: { id, workspaceId: wid },
  });
  if (!record || !record.storageKey) return c.json({ error: "Not found" }, 404);

  const filePath = resolve(UPLOADS_DIR, record.storageKey);
  let content: Buffer;
  try {
    content = await readFile(filePath);
  } catch {
    return c.json({ error: "File not found on disk" }, 404);
  }

  c.header("Content-Type", mimeType(record.name));
  c.header("Content-Disposition", `attachment; filename="${record.name}"`);
  return c.body(new Uint8Array(content));
});

route.delete("/files/:id", async (c) => {
  const wid = c.get("workspaceId");
  const db = c.get("db");
  const record = await db.workspaceFile.findFirst({
    where: { id: c.req.param("id"), workspaceId: wid },
  });
  if (!record) return c.json({ error: "Not found" }, 404);
  await db.workspaceFile.delete({ where: { id: record.id } });
  return c.body(null, 204);
});

export default route;
