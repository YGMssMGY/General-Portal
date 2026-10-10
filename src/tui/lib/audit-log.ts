import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export function audit(action: string, target: string, result: string): void {
    try {
        const line = JSON.stringify({
            ts: new Date().toISOString(),
            operator: os.userInfo().username,
            action,
            target,
            result,
        });
        fs.appendFileSync(path.resolve(process.cwd(), ".tui-audit.log"), `${line}\n`);
    } catch {
        return;
    }
}
