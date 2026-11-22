import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import { unlink } from "node:fs/promises";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";
import { ApiError } from "@/lib/api";

export type FileKind = "image/png" | "image/jpeg" | "application/pdf" | "text/plain";

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const PDF_SIGNATURE = "%PDF-";

function isPlainText(bytes: Uint8Array): boolean {
    for (const byte of bytes) {
        if (byte === 0) return false;
        if (byte < 0x20 && byte !== 0x09 && byte !== 0x0a && byte !== 0x0d && byte !== 0x0c)
            return false;
        if (byte === 0x7f) return false;
    }
    try {
        new TextDecoder("utf-8", { fatal: true }).decode(bytes, { stream: true });
        return true;
    } catch {
        return false;
    }
}

export function sniffFileKind(firstBytes: Uint8Array): FileKind | null {
    if (firstBytes.length === 0) return null;
    if (
        firstBytes.length >= PNG_SIGNATURE.length &&
        PNG_SIGNATURE.every((byte, i) => firstBytes[i] === byte)
    ) {
        return "image/png";
    }
    if (
        firstBytes.length >= 3 &&
        firstBytes[0] === 0xff &&
        firstBytes[1] === 0xd8 &&
        firstBytes[2] === 0xff
    ) {
        return "image/jpeg";
    }
    if (
        firstBytes.length >= PDF_SIGNATURE.length &&
        [...firstBytes.slice(0, PDF_SIGNATURE.length)].every(
            (byte, i) => byte === PDF_SIGNATURE.charCodeAt(i),
        )
    ) {
        return "application/pdf";
    }
    return isPlainText(firstBytes) ? "text/plain" : null;
}

export function fileKindMatchesMime(kind: FileKind, declaredMime: string): boolean {
    const mime = declaredMime.toLowerCase();
    if (kind === "image/png" || kind === "image/jpeg") return mime.startsWith("image/");
    if (kind === "application/pdf") return mime === "application/pdf";
    return mime === "text/plain";
}

export async function streamFileToDisk(
    file: File,
    targetPath: string,
    maxBytes: number,
): Promise<{ size: number; sha256: string }> {
    const hash = createHash("sha256");
    let size = 0;
    const source = Readable.fromWeb(file.stream() as unknown as NodeReadableStream<Uint8Array>);

    async function* capped(chunks: AsyncIterable<Uint8Array>): AsyncGenerator<Buffer> {
        for await (const chunk of chunks) {
            const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
            size += buffer.length;
            if (size > maxBytes) throw new ApiError("File too large", 400);
            hash.update(buffer);
            yield buffer;
        }
    }

    try {
        await pipeline(source, capped, createWriteStream(targetPath, { flags: "wx" }));
    } catch (e) {
        await unlink(targetPath).catch(() => {});
        throw e;
    }
    return { size, sha256: hash.digest("hex") };
}
