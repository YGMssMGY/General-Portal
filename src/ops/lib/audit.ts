import fs from "node:fs";
import path from "node:path";
import type { OpsContext } from "../types";

export function opsAudit(ctx: OpsContext, action: string, target: string, result: string): void {
    try {
        const line = JSON.stringify({
            ts: new Date().toISOString(),
            operator: ctx.operatorId,
            source: ctx.source,
            action,
            target,
            result,
        });
        fs.appendFileSync(path.resolve(process.cwd(), ".tui-audit.log"), `${line}\n`);
    } catch {
        return;
    }
}
