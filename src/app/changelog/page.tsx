import type { CSSProperties } from "react";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getTranslations } from "next-intl/server";

const description = "Release notes and product updates for General Portal.";

export const metadata = {
    title: "Changelog",
    description,
    openGraph: { title: "Changelog", description, type: "website", url: "/changelog" },
    twitter: { card: "summary_large_image", title: "Changelog", description },
    alternates: { canonical: "/changelog" },
};

const page: CSSProperties = { maxWidth: "760px", margin: "0 auto", padding: "40px 24px 80px" };
const heading: CSSProperties = { fontSize: "28px", margin: "0 0 24px" };
const empty: CSSProperties = { fontSize: "14px", color: "var(--color-text-secondary)" };
const list: CSSProperties = {
    listStyle: "none",
    padding: 0,
    margin: 0,
    borderLeft: "2px solid var(--color-border)",
};
const item: CSSProperties = {
    padding: "0 0 16px 20px",
    fontSize: "14px",
    color: "var(--color-text-secondary)",
};
const entryTitle: CSSProperties = {
    display: "block",
    fontSize: "15px",
    fontWeight: 600,
    color: "var(--color-text)",
};

async function loadEntries(): Promise<string[] | null> {
    try {
        const content = await readFile(path.resolve(process.cwd(), "CHANGELOG.md"), "utf8");
        const sections = content
            .split(/\n(?=#{1,3}\s)/)
            .map((section) =>
                section
                    .split(/\r?\n/)
                    .map((line) => line.trim())
                    .filter((line) => line.length > 0),
            )
            .filter((lines) => lines.length > 0);
        return sections.flat().slice(0, 12);
    } catch {
        return null;
    }
}

export default async function ChangelogPage() {
    const t = await getTranslations("marketing");
    const entries = await loadEntries();
    return (
        <main style={page}>
            <h1 style={heading}>{t("changelog.title")}</h1>
            {entries === null || entries.length === 0 ? (
                <p style={empty}>{t("changelog.empty")}</p>
            ) : (
                <ol style={list}>
                    {entries.map((entry, index) => (
                        <li key={index} style={item}>
                            <span style={entryTitle}>{entry.replace(/^#+\s*/, "")}</span>
                        </li>
                    ))}
                </ol>
            )}
        </main>
    );
}
