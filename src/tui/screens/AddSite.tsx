import path from "node:path";
import { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import SelectList from "../components/SelectList.js";
import {
    adminUrlFor,
    createDatabase,
    dbExists,
    isSafeIdentifier,
    parseDbUrl,
    runTsx,
    seedPacks,
} from "../lib/tui-db.js";
import { audit } from "../lib/audit-log.js";
import { normalizeSlug, portalDbUrl } from "../../db/client.js";

type Step =
    | "slug"
    | "name"
    | "category"
    | "pack"
    | "providers"
    | "domains"
    | "confirm"
    | "working"
    | "done";

const PROVIDERS = [
    "microsoft-entra-id",
    "basis-auth",
    "oidc",
    "saml",
    "google",
    "github",
    "credentials",
    "magic-link",
    "email-otp",
    "passkey",
];

function ProviderToggle({
    active,
    onDone,
}: {
    active: boolean;
    onDone: (selected: string[]) => void;
}) {
    const [index, setIndex] = useState(0);
    const [picked, setPicked] = useState<string[]>(["microsoft-entra-id"]);
    useInput(
        (input, key) => {
            const current = PROVIDERS[index];
            if (key.upArrow) setIndex((i) => (i - 1 + PROVIDERS.length) % PROVIDERS.length);
            else if (key.downArrow) setIndex((i) => (i + 1) % PROVIDERS.length);
            else if (input === " ") {
                if (current === undefined) return;
                setPicked((prev) =>
                    prev.includes(current) ? prev.filter((p) => p !== current) : [...prev, current],
                );
            } else if (key.return) onDone(picked);
        },
        { isActive: active },
    );
    return (
        <Box flexDirection="column">
            <Text>Toggle with Space, confirm with Enter:</Text>
            {PROVIDERS.map((p, i) => (
                <Text key={p} color={i === index ? "cyan" : undefined} bold={i === index}>
                    {i === index ? "> " : "  "}[{picked.includes(p) ? "x" : " "}] {p}
                </Text>
            ))}
        </Box>
    );
}

export default function AddSite({ onBack }: { onBack: () => void }) {
    const [step, setStep] = useState<Step>("slug");
    const [slug, setSlug] = useState("");
    const [name, setName] = useState("");
    const [category, setCategory] = useState("");
    const [pack, setPack] = useState("");
    const [providers, setProviders] = useState<string[]>(["microsoft-entra-id"]);
    const [domains, setDomains] = useState("");
    const [lines, setLines] = useState<string[]>([]);
    useInput((input, key) => {
        if (key.escape && step !== "working") {
            if (step === "slug") onBack();
            else if (step === "name") setStep("slug");
            else if (step === "category") setStep("name");
            else if (step === "pack") setStep("category");
            else if (step === "providers") setStep("pack");
            else if (step === "domains") setStep("providers");
            else if (step === "confirm") setStep("domains");
            else if (step === "done") onBack();
        }
    });
    const packs = seedPacks();

    function yamlBlock(): string[] {
        const envVar = `DATABASE_URL_${slug.toUpperCase().replace(/-/g, "_")}`;
        return [
            "Paste this block into the portals list in deployment.yaml:",
            `  - slug: ${slug}`,
            `    name: "${name}"`,
            `    category: ${category}`,
            `    description: ${name}`,
            "    branding:",
            `      logo: /${slug}.png`,
            `      favicon: /${slug}.png`,
            '      primary: "#0f62fe"',
            "    db:",
            `      envVar: ${envVar}`,
            "    auth:",
            `      providers: [${providers.join(", ")}]`,
            `      allowedDomains: [${domains
                .split(",")
                .map((d) => d.trim())
                .filter(Boolean)
                .join(", ")}]`,
            "    modules: [dashboard, proposals, tasks, events, messages, finance, volunteers, members, files, meetings, activity, settings, notifications, budget]",
            "    nav:",
            "      - path: /dashboard",
            "        label: Dashboard",
            "        icon: layout-dashboard",
            "        module: dashboard",
            "    terminology: {}",
            "    roles: [admin, officer, member]",
            `    seedPack: ${pack.replace(/\.ya?ml$/, "")}`,
            "    limits:",
            "      uploadMb: 10",
            "      requestsPerMinute: 100",
            "      auditRetentionDays: 365",
            "    features: []",
        ];
    }

    async function execute(): Promise<void> {
        setStep("working");
        const out: string[] = [];
        const clean = normalizeSlug(slug);
        if (!clean) {
            out.push(`Invalid slug "${slug}". Use lowercase letters, digits, dashes, underscores.`);
            audit("add-site", slug, "failed: invalid slug");
            setLines(out);
            setStep("done");
            return;
        }
        const envVar = `DATABASE_URL_${clean.toUpperCase().replace(/-/g, "_")}`;
        const url = portalDbUrl(clean);
        if (!url) {
            out.push(`Connection string ${envVar} is not set in the environment.`);
            out.push(
                "Set it first, then re-run this wizard. The database cannot be created without it.",
            );
            out.push(...yamlBlock());
            audit("add-site", clean, "blocked: connection string missing");
            setLines(out);
            setStep("done");
            return;
        }
        try {
            const parsed = parseDbUrl(url);
            if (!isSafeIdentifier(parsed.dbName)) {
                out.push(`Database name "${parsed.dbName}" is not a safe identifier. Aborting.`);
                audit("add-site", clean, "failed: unsafe db name");
                setLines(out);
                setStep("done");
                return;
            }
            const adminUrl = adminUrlFor(url);
            const exists = await dbExists(adminUrl, parsed.dbName);
            if (exists === true) {
                out.push(`Database "${parsed.dbName}" already exists. Skipping creation.`);
            } else if (exists === false) {
                await createDatabase(adminUrl, parsed.dbName);
                out.push(`Database "${parsed.dbName}" created.`);
            } else {
                out.push("Could not reach the database server. Aborting before any change.");
                audit("add-site", clean, "failed: server unreachable");
                setLines(out);
                setStep("done");
                return;
            }
            out.push("Applying migrations...");
            const mig = await runTsx("scripts/migrate.ts", [url]);
            out.push(`Migrate exit ${mig.code}.`);
            for (const line of mig.out.split("\n").slice(-6)) {
                if (line.trim()) out.push(`  ${line.trim()}`);
            }
            if (mig.code !== 0) {
                out.push("Migration failed. Seeding skipped. Fix the error and re-run Migrate.");
                audit("add-site", clean, `failed: migrate exit ${mig.code}`);
                setLines(out);
                setStep("done");
                return;
            }
            out.push("Seeding...");
            const packPath = path.join("deployments", "seed-packs", pack);
            const seed = await runTsx("scripts/seed.ts", [clean, packPath], { [envVar]: url });
            out.push(`Seed exit ${seed.code}.`);
            for (const line of seed.out.split("\n").slice(-6)) {
                if (line.trim()) out.push(`  ${line.trim()}`);
            }
            if (seed.code === 0) {
                out.push(`Site "${clean}" provisioned. This tool never edits deployment.yaml.`);
                out.push(...yamlBlock());
                out.push(
                    "Next steps: paste the block above into deployment.yaml, then restart the server. It validates deployment.yaml on boot.",
                );
                audit("add-site", clean, "ok");
            } else {
                out.push("Seeding failed. Database and migrations are retained for inspection.");
                audit("add-site", clean, `failed: seed exit ${seed.code}`);
            }
        } catch (e) {
            out.push(`Provisioning FAILED: ${e instanceof Error ? e.message : String(e)}.`);
            audit("add-site", clean, "failed with exception");
        }
        setLines(out);
        setStep("done");
    }

    return (
        <Box flexDirection="column">
            <Text bold>Add Site (wizard)</Text>
            {step === "slug" && (
                <Box flexDirection="column">
                    <Text>Portal slug (lowercase, digits, dashes):</Text>
                    <TextInput value={slug} onChange={setSlug} onSubmit={() => setStep("name")} />
                </Box>
            )}
            {step === "name" && (
                <Box flexDirection="column">
                    <Text>Display name for portal {slug}:</Text>
                    <TextInput
                        value={name}
                        onChange={setName}
                        onSubmit={() => setStep("category")}
                    />
                </Box>
            )}
            {step === "category" && (
                <Box flexDirection="column">
                    <Text>Category (for example technology, governance, arts):</Text>
                    <TextInput
                        value={category}
                        onChange={setCategory}
                        onSubmit={() => setStep("pack")}
                    />
                </Box>
            )}
            {step === "pack" && (
                <Box flexDirection="column">
                    <Text>Select a seed pack:</Text>
                    {packs.length === 0 && (
                        <Text color="red">No seed packs found in deployments/seed-packs.</Text>
                    )}
                    <SelectList
                        items={packs}
                        onSelect={(item) => {
                            setPack(item);
                            setStep("providers");
                        }}
                    />
                </Box>
            )}
            {step === "providers" && (
                <ProviderToggle
                    active
                    onDone={(selected) => {
                        setProviders(selected);
                        setStep("domains");
                    }}
                />
            )}
            {step === "domains" && (
                <Box flexDirection="column">
                    <Text>Allowed email domains, comma separated (for example example.edu):</Text>
                    <TextInput
                        value={domains}
                        onChange={setDomains}
                        onSubmit={() => setStep("confirm")}
                    />
                </Box>
            )}
            {step === "confirm" && (
                <Box flexDirection="column">
                    <Text>Review and confirm:</Text>
                    <Text> Slug: {slug}</Text>
                    <Text> Name: {name}</Text>
                    <Text> Category: {category}</Text>
                    <Text> Seed pack: {pack}</Text>
                    <Text> Providers: {providers.join(", ") || "(none)"}</Text>
                    <Text> Domains: {domains || "(none)"}</Text>
                    <SelectList
                        items={["Confirm and create", "Cancel"]}
                        onSelect={(item) => {
                            if (item.startsWith("Confirm")) void execute();
                            else onBack();
                        }}
                    />
                </Box>
            )}
            {step === "working" && <Text>Provisioning, please wait...</Text>}
            {step === "done" && (
                <Box flexDirection="column">
                    {lines.map((line, i) => (
                        <Text key={i}>{line}</Text>
                    ))}
                    <Text dimColor>Press Esc to return to the menu.</Text>
                </Box>
            )}
            {step !== "done" && step !== "working" && (
                <Text dimColor>Press Esc to go back. This tool never edits deployment.yaml.</Text>
            )}
        </Box>
    );
}
