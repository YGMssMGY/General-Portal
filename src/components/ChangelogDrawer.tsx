"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";

export interface ChangelogItem {
    version: string;
    body: string;
}

export default function ChangelogDrawer({ items }: { items: ChangelogItem[] }) {
    const t = useTranslations("changelogDrawer");
    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                    {t("trigger")}
                </Button>
            </SheetTrigger>
            <SheetContent side="right">
                <SheetHeader>
                    <SheetTitle>{t("title")}</SheetTitle>
                    <SheetDescription>{t("description")}</SheetDescription>
                </SheetHeader>
                <div style={{ marginTop: "24px", display: "grid", gap: "20px" }}>
                    {items.length === 0 ? (
                        <p style={{ fontSize: "14px", color: "var(--color-text-secondary)" }}>
                            {t("empty")}
                        </p>
                    ) : (
                        items.map((item) => (
                            <section key={item.version}>
                                <h3
                                    style={{
                                        fontSize: "14px",
                                        fontWeight: 600,
                                        color: "var(--color-text)",
                                        margin: "0 0 6px",
                                    }}
                                >
                                    {item.version}
                                </h3>
                                <p
                                    style={{
                                        fontSize: "13px",
                                        lineHeight: 1.6,
                                        whiteSpace: "pre-wrap",
                                        color: "var(--color-text-secondary)",
                                        margin: 0,
                                    }}
                                >
                                    {item.body}
                                </p>
                            </section>
                        ))
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}
