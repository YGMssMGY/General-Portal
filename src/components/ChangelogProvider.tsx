import fs from "node:fs/promises";
import path from "node:path";
import ChangelogDrawer, { type ChangelogItem } from "./ChangelogDrawer";

async function readEntries(): Promise<ChangelogItem[]> {
    try {
        const text = await fs.readFile(path.resolve(process.cwd(), "CHANGELOG.md"), "utf8");
        const blocks = text.split(/^##\s+/m).slice(1);
        return blocks.slice(0, 3).map((block) => {
            const lines = block.split("\n");
            const version = (lines[0] ?? "").replace(/[\[\]]/g, "").trim();
            const body = lines
                .slice(1)
                .filter((l) => l.trim().startsWith("- "))
                .slice(0, 3)
                .map((l) => l.trim().replace(/^-\s*/, ""))
                .join("\n");
            return { version, body };
        });
    } catch {
        return [];
    }
}

export default async function ChangelogProvider() {
    const items = await readEntries();
    return <ChangelogDrawer items={items} />;
}
