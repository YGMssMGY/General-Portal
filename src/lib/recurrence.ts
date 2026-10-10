export interface RecurrenceRule {
    freq: "daily" | "weekly" | "monthly";
    interval: number;
    count?: number;
    until?: string;
}

export interface RecurrentTask {
    recurrence: string | null;
    dueDate?: Date | string | null;
    createdAt?: Date | string | null;
}

export function parseRecurrenceRule(raw: unknown): RecurrenceRule {
    let v: unknown = raw;
    if (typeof v === "string") {
        if (!v.trim()) throw new Error("Invalid recurrence rule");
        try {
            v = JSON.parse(v) as unknown;
        } catch {
            throw new Error("Invalid recurrence rule");
        }
    }
    if (typeof v !== "object" || v === null) throw new Error("Invalid recurrence rule");
    const o = v as Record<string, unknown>;
    if (o.freq !== "daily" && o.freq !== "weekly" && o.freq !== "monthly") {
        throw new Error("Invalid recurrence rule");
    }
    let interval = 1;
    if (o.interval !== undefined) {
        if (typeof o.interval !== "number" || !Number.isInteger(o.interval) || o.interval < 1) {
            throw new Error("Invalid recurrence rule");
        }
        interval = o.interval;
    }
    let count: number | undefined;
    if (o.count !== undefined) {
        if (typeof o.count !== "number" || !Number.isInteger(o.count) || o.count < 1) {
            throw new Error("Invalid recurrence rule");
        }
        count = o.count;
    }
    let until: string | undefined;
    if (o.until !== undefined) {
        if (typeof o.until !== "string" || Number.isNaN(new Date(o.until).getTime())) {
            throw new Error("Invalid recurrence rule");
        }
        until = o.until;
    }
    return { freq: o.freq, interval, count, until };
}

function advance(d: Date, freq: RecurrenceRule["freq"], interval: number): Date {
    const n = new Date(d.getTime());
    if (freq === "daily") n.setDate(n.getDate() + interval);
    else if (freq === "weekly") n.setDate(n.getDate() + interval * 7);
    else n.setMonth(n.getMonth() + interval);
    return n;
}

export function expandRecurrence(task: RecurrentTask, start: Date, end: Date): Date[] {
    if (!(start instanceof Date) || Number.isNaN(start.getTime()))
        throw new Error("Invalid recurrence rule");
    if (!(end instanceof Date) || Number.isNaN(end.getTime()))
        throw new Error("Invalid recurrence rule");
    if (start > end) throw new Error("Invalid recurrence rule");
    if (!task.recurrence) throw new Error("Invalid recurrence rule");
    const rule = parseRecurrenceRule(task.recurrence);
    const anchorRaw = task.dueDate ?? task.createdAt ?? start;
    const anchor =
        anchorRaw instanceof Date ? new Date(anchorRaw.getTime()) : new Date(anchorRaw as string);
    if (Number.isNaN(anchor.getTime())) throw new Error("Invalid recurrence rule");
    const until = rule.until ? new Date(rule.until) : null;
    if (until && Number.isNaN(until.getTime())) throw new Error("Invalid recurrence rule");
    const out: Date[] = [];
    let cur = anchor;
    let generated = 0;
    while (cur <= end && out.length < 366) {
        if (until && cur > until) break;
        if (rule.count !== undefined && generated >= rule.count) break;
        if (cur >= start) out.push(new Date(cur.getTime()));
        generated += 1;
        if (rule.count !== undefined && generated >= rule.count) break;
        cur = advance(cur, rule.freq, rule.interval);
        if (out.length >= 366) break;
    }
    return out;
}
