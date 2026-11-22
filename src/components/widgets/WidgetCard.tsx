"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { WidgetId } from "./widgetCatalog";

interface WidgetCardProps {
    id: WidgetId;
    title: string;
    count: number | null;
    href: string;
    icon: ComponentType<{ size?: number }>;
}

export function WidgetCard({ id, title, count, href, icon: Icon }: WidgetCardProps) {
    return (
        <Card data-widget={id} className="transition-colors hover:border-[var(--color-primary)]">
            <CardContent className="flex flex-col gap-3 p-5">
                <div className="flex items-start justify-between gap-3">
                    <span
                        className="flex size-9 items-center justify-center rounded-[5px] bg-[var(--color-bg-secondary)] text-[var(--color-primary)]"
                        aria-hidden="true"
                    >
                        <Icon size={18} />
                    </span>
                    <Button asChild variant="ghost" size="icon" aria-label={title}>
                        <Link href={href}>
                            <ArrowUpRight size={16} />
                        </Link>
                    </Button>
                </div>
                <div className="flex flex-col gap-1">
                    <span className="text-2xl font-semibold text-[var(--color-text)]">
                        {count ?? 0}
                    </span>
                    <span className="text-sm text-[var(--color-text-secondary)]">{title}</span>
                </div>
            </CardContent>
        </Card>
    );
}

export default WidgetCard;
