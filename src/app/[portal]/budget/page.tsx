"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { usePortal } from "@/hooks/usePortal";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function BudgetPage() {
    const portal = usePortal();
    const t = useTranslations("budget");
    const tc = useTranslations("common");
    usePageTitle(`${t("title")} | ${portal}`);

    return (
        <Card>
            <CardContent
                style={{
                    padding: "40px 24px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "16px",
                    textAlign: "center",
                }}
            >
                <h1 style={{ fontSize: "20px", fontWeight: 700, margin: 0 }}>{t("title")}</h1>
                <Button asChild>
                    <Link href={`/${portal}/finance?tab=budget`}>{tc("viewInFinance")}</Link>
                </Button>
            </CardContent>
        </Card>
    );
}
