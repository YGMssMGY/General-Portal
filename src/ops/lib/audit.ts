import fs from "node:fs";
import path from "node:path";
import { logger } from "@/lib/logger";
import type { OpsContext } from "../types";

const MAX_BYTES = 5 * 1024 * 1024;

export function opsAudit(ctx: OpsContext, action: string, target: string, result: string): void {
    const file = path.resolve(process.cwd(), ".tui-audit.log");
    try {
        let size = 0;
        try {
            size = fs.statSync(file).size;
        } catch {
            size = 0;
        }
        if (size >= MAX_BYTES) {
            const rotated = `${file}.1`;
            fs.rmSync(rotated, { force: true });
            fs.renameSync(file, rotated);
        }
        const line = JSON.stringify({
            ts: new Date().toISOString(),
            operator: ctx.operatorId,
            source: ctx.source,
            action,
            target,
            result,
        });
        fs.appendFileSync(file, `${line}\n`);
    } catch (e) {
        logger.error({ err: e, action }, "operator audit write failed");
    }
}
