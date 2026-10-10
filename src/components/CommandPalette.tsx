"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuthSession } from "@/components/AuthSessionProvider";
import { usePortal } from "@/hooks/usePortal";
import { useWorkspace } from "@/hooks/useWorkspace";
import { fetchJson } from "@/lib/api-client";
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface SearchItem {
    id: string;
    title: string;
    snippet: string;
    type: string;
    url: string;
}

const EMPTY_SETTINGS: Record<string, boolean> = {};

const GOTO_ITEMS = [
    { key: "dashboard", path: "/dashboard" },
    { key: "tasks", path: "/tasks" },
    { key: "events", path: "/events" },
    { key: "meetings", path: "/meetings" },
    { key: "calendar", path: "/calendar" },
    { key: "proposals", path: "/proposals" },
    { key: "messages", path: "/messages" },
    { key: "members", path: "/members" },
    { key: "files", path: "/files" },
    { key: "activity", path: "/activity" },
] as const;

export function CommandPalette() {
    const router = useRouter();
    const portal = usePortal();
    const { data: workspace } = useWorkspace();
    const { user } = useAuthSession();
    const t = useTranslations("productivity");
    const tNav = useTranslations("nav");
    const [open, setOpen] = useState(false);
    const [helpOpen, setHelpOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [debounced, setDebounced] = useState("");
    const [results, setResults] = useState<SearchItem[]>([]);

    useEffect(() => {
        const timer = setTimeout(() => setDebounced(query.trim()), 250);
        return () => clearTimeout(timer);
    }, [query]);

    useEffect(() => {
        let cancelled = false;
        async function run() {
            if (!debounced || portal === "") {
                setResults([]);
                return;
            }
            try {
                const data = await fetchJson<{ results: SearchItem[] }>(
                    `/api/search?q=${encodeURIComponent(debounced)}`,
                );
                if (!cancelled) setResults((data.results ?? []).slice(0, 5));
            } catch {
                if (!cancelled) setResults([]);
            }
        }
        void run();
        return () => {
            cancelled = true;
        };
    }, [debounced, portal]);

    useEffect(() => {
        let lastG = 0;
        function onKey(e: KeyboardEvent) {
            const target = e.target as HTMLElement | null;
            const typing =
                target &&
                (target.tagName === "INPUT" ||
                    target.tagName === "TEXTAREA" ||
                    target.isContentEditable);
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
                e.preventDefault();
                setOpen((v) => !v);
                return;
            }
            if (typing || open) return;
            if (e.key === "?") {
                e.preventDefault();
                setHelpOpen(true);
                return;
            }
            const now = Date.now();
            if (e.key.toLowerCase() === "g") {
                lastG = now;
                return;
            }
            if (now - lastG < 800 && portal !== "") {
                const k = e.key.toLowerCase();
                const map: Record<string, string> = {
                    d: "/dashboard",
                    t: "/tasks",
                    e: "/events",
                    m: "/meetings",
                    c: "/calendar",
                };
                const path = map[k];
                if (path) {
                    e.preventDefault();
                    router.push(`/${portal}${path}`);
                }
                lastG = 0;
            }
        }
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [open, portal, router]);

    const settings = workspace?.settings ?? EMPTY_SETTINGS;
    const gotoItems = useMemo(
        () =>
            GOTO_ITEMS.filter((item) => {
                if (settings[item.key] === false) return false;
                return true;
            }),
        [settings],
    );

    function go(url: string) {
        setOpen(false);
        setQuery("");
        setResults([]);
        router.push(url);
    }

    const isMember = user?.role === "member";
    const actionItems = [
        { label: t("newTask"), url: `/${portal}/tasks` },
        { label: t("newEvent"), url: `/${portal}/events` },
        { label: t("newProposal"), url: `/${portal}/proposals` },
        { label: t("newMeeting"), url: `/${portal}/meetings` },
    ];

    return (
        <>
            <CommandDialog open={open} onOpenChange={setOpen}>
                <CommandInput
                    placeholder={t("palettePlaceholder")}
                    value={query}
                    onValueChange={setQuery}
                />
                <CommandList>
                    <CommandEmpty>{t("noResults")}</CommandEmpty>
                    <CommandGroup heading={t("goTo")}>
                        {gotoItems.map((item) => (
                            <CommandItem
                                key={item.path}
                                onSelect={() => go(`/${portal}${item.path}`)}
                            >
                                {tNav(item.key)}
                            </CommandItem>
                        ))}
                        {!isMember && (
                            <CommandItem onSelect={() => go(`/${portal}/settings`)}>
                                {tNav("settings")}
                            </CommandItem>
                        )}
                    </CommandGroup>
                    <CommandGroup heading={t("sectionActions")}>
                        {actionItems.map((a) => (
                            <CommandItem key={a.label} onSelect={() => go(a.url)}>
                                {a.label}
                            </CommandItem>
                        ))}
                    </CommandGroup>
                    {results.length > 0 && (
                        <CommandGroup heading={t("sectionSearch")}>
                            {results.map((r) => (
                                <CommandItem key={`${r.type}-${r.id}`} onSelect={() => go(r.url)}>
                                    <span
                                        style={{
                                            flex: 1,
                                            minWidth: 0,
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpace: "nowrap",
                                        }}
                                    >
                                        {r.title}
                                    </span>
                                    <span
                                        style={{
                                            fontSize: "11px",
                                            color: "var(--color-text-secondary)",
                                        }}
                                    >
                                        {r.type}
                                    </span>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    )}
                </CommandList>
            </CommandDialog>
            <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t("shortcuts")}</DialogTitle>
                    </DialogHeader>
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "8px",
                            fontSize: "13px",
                            color: "var(--color-text)",
                        }}
                    >
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span>g + d</span>
                            <span>{tNav("dashboard")}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span>g + t</span>
                            <span>{tNav("tasks")}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span>g + e</span>
                            <span>{tNav("events")}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span>g + m</span>
                            <span>{tNav("meetings")}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span>g + c</span>
                            <span>{tNav("calendar")}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span>Ctrl/⌘ + K</span>
                            <span>{t("paletteTitle")}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span>?</span>
                            <span>{t("shortcuts")}</span>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
