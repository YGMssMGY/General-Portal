"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { usePageTitle } from "@/hooks/usePageTitle";
import { usePortal } from "@/hooks/usePortal";
import { useWorkspace } from "@/hooks/useWorkspace";
import { fetchPage } from "@/lib/api-client";

interface MemberRow {
    id: string;
}

export default function OnboardingPage() {
    const portal = usePortal();
    const { data: workspace } = useWorkspace();
    const t = useTranslations("onboarding");
    usePageTitle(`${t("title")} | ${workspace?.name ?? portal}`);

    const { data: members } = useQuery({
        queryKey: [portal, "members", "onboarding"],
        queryFn: () => fetchPage<MemberRow>("/api/members?limit=100"),
        enabled: portal !== "",
    });

    const steps = [
        {
            key: "password",
            href: `/${portal}/account/sessions`,
            done: workspace?.settings.adminPasswordSet === true,
        },
        {
            key: "brand",
            href: `/${portal}/settings`,
            done: Boolean(workspace?.logoUrl) || workspace?.settings.branded === true,
        },
        {
            key: "invite",
            href: `/${portal}/invitations`,
            done: (members?.items.length ?? 0) > 1,
        },
        {
            key: "showcase",
            href: `/${portal}/showcase-admin`,
            done: workspace?.settings.showcasePublished === true,
        },
    ];
    const completed = steps.filter((step) => step.done).length;
    const progress = Math.round((completed / steps.length) * 100);

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
                <h1
                    style={{
                        fontSize: "20px",
                        fontWeight: 700,
                        color: "var(--color-text)",
                        margin: 0,
                    }}
                >
                    {t("title")}
                </h1>
                <p
                    style={{
                        fontSize: "14px",
                        color: "var(--color-text-secondary)",
                        margin: "4px 0 0",
                    }}
                >
                    {t("description")}
                </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "13px",
                        color: "var(--color-text-secondary)",
                    }}
                >
                    <span>{t("progressLabel")}</span>
                    <span>{t("progressCount", { completed, total: steps.length })}</span>
                </div>
                <Progress value={progress} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {steps.map((step, index) => (
                    <Card key={step.key}>
                        <CardContent
                            style={{
                                padding: "14px 16px",
                                display: "flex",
                                alignItems: "center",
                                gap: "12px",
                            }}
                        >
                            <span
                                style={{
                                    width: "28px",
                                    height: "28px",
                                    borderRadius: "50%",
                                    backgroundColor: "var(--color-bg-secondary)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "13px",
                                    fontWeight: 700,
                                    color: "var(--color-text)",
                                    flexShrink: 0,
                                }}
                            >
                                {index + 1}
                            </span>
                            <span style={{ flex: 1, minWidth: 0 }}>
                                <span
                                    style={{
                                        display: "block",
                                        fontSize: "14px",
                                        fontWeight: 600,
                                        color: "var(--color-text)",
                                    }}
                                >
                                    {t(`${step.key}Title`)}
                                </span>
                                <span
                                    style={{
                                        display: "block",
                                        fontSize: "13px",
                                        color: "var(--color-text-secondary)",
                                    }}
                                >
                                    {t(`${step.key}Description`)}
                                </span>
                            </span>
                            <Badge variant={step.done ? "default" : "outline"}>
                                {step.done ? t("done") : t("pending")}
                            </Badge>
                            <Button asChild size="sm" variant="outline">
                                <Link href={step.href}>{t(`${step.key}Action`)}</Link>
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
