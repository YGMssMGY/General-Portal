import type { ComponentType } from "react";
import {
    Calendar,
    CalendarCheck,
    CircleDollarSign,
    ClipboardList,
    FileText,
    HeartHandshake,
    ShieldCheck,
    Vote,
} from "lucide-react";

export const WIDGET_IDS = [
    "tasks",
    "events",
    "proposals",
    "approvals",
    "dues",
    "polls",
    "rsvps",
    "kudos",
] as const;

export type WidgetId = (typeof WIDGET_IDS)[number];

export const WIDGET_ICONS: Record<WidgetId, ComponentType<{ size?: number }>> = {
    tasks: ClipboardList,
    events: Calendar,
    proposals: FileText,
    approvals: ShieldCheck,
    dues: CircleDollarSign,
    polls: Vote,
    rsvps: CalendarCheck,
    kudos: HeartHandshake,
};
