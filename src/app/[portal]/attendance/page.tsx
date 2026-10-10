"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api-client";
import { AuthSessionProvider, useAuthSession } from "@/components/AuthSessionProvider";
import { usePortal } from "@/hooks/usePortal";
import { usePageTitle } from "@/hooks/usePageTitle";

interface AttendanceRecord {
    id: string;
    meetingId: string | null;
    eventId: string | null;
    status: string;
    checkedInAt: string | null;
    createdAt: string;
    meeting: { id: string; title: string; startTime: string } | null;
    event: { id: string; title: string; startDate: string } | null;
}

interface MeetingOption {
    id: string;
    title: string;
}

interface EventOption {
    id: string;
    title: string;
}

interface MemberOption {
    id: string;
    name: string | null;
    email: string;
}

interface RateResult {
    present: number;
    total: number;
    rate: number;
}

const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    fontSize: "14px",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-sm)",
    backgroundColor: "var(--color-bg)",
    color: "var(--color-text)",
    fontFamily: "inherit",
    outline: "none",
};

const labelStyle: React.CSSProperties = {
    fontSize: "13px",
    fontWeight: 600,
    color: "var(--color-text)",
    marginBottom: "4px",
    display: "block",
};

const btnBase: React.CSSProperties = {
    padding: "8px 16px",
    borderRadius: "var(--radius-sm)",
    border: "none",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
    minHeight: "36px",
};

const cardStyle: React.CSSProperties = {
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-sm)",
    padding: "16px",
    backgroundColor: "var(--color-bg)",
    marginBottom: "20px",
};

function AttendanceContent() {
    const t = useTranslations("attendance");
    const tc = useTranslations("common");
    const tm = useTranslations("meetings");
    const te = useTranslations("events");
    const portal = usePortal();
    const qc = useQueryClient();
    const { user } = useAuthSession();
    usePageTitle(t("title"));
    const canManage = user?.permissions.includes("manage_attendance") ?? false;

    const [kind, setKind] = useState<"meeting" | "event">("meeting");
    const [targetId, setTargetId] = useState("");
    const [code, setCode] = useState("");
    const [rosterMeetingId, setRosterMeetingId] = useState("");
    const [recordUserId, setRecordUserId] = useState("");
    const [recordStatus, setRecordStatus] = useState("present");

    const { data: mine, isLoading } = useQuery<AttendanceRecord[]>({
        queryKey: [portal, "attendance", "mine"],
        queryFn: () => fetchJson<AttendanceRecord[]>("/api/attendance"),
    });

    const { data: meetings } = useQuery<MeetingOption[]>({
        queryKey: [portal, "meetings"],
        queryFn: () => fetchJson<MeetingOption[]>("/api/meetings"),
    });

    const { data: events } = useQuery<EventOption[]>({
        queryKey: [portal, "events"],
        queryFn: () => fetchJson<EventOption[]>("/api/events"),
    });

    const { data: members } = useQuery<MemberOption[]>({
        queryKey: [portal, "members"],
        queryFn: () => fetchJson<MemberOption[]>("/api/members"),
        enabled: canManage,
    });

    const { data: rate } = useQuery<RateResult>({
        queryKey: [portal, "attendance", "rate", rosterMeetingId],
        queryFn: () => fetchJson<RateResult>(`/api/attendance/rate?meetingId=${rosterMeetingId}`),
        enabled: canManage && rosterMeetingId !== "",
    });

    const checkInMutation = useMutation({
        mutationFn: () =>
            fetchJson("/api/attendance", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(
                    kind === "meeting"
                        ? { meetingId: targetId, code: code.trim() === "" ? null : code }
                        : { eventId: targetId, code: code.trim() === "" ? null : code },
                ),
            }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: [portal, "attendance", "mine"] });
            setTargetId("");
            setCode("");
        },
    });

    const recordMutation = useMutation({
        mutationFn: () =>
            fetchJson("/api/attendance/record", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    meetingId: rosterMeetingId,
                    userId: recordUserId,
                    status: recordStatus,
                }),
            }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: [portal, "attendance", "rate", rosterMeetingId] });
            setRecordUserId("");
        },
    });

    const statusLabel = (s: string) => {
        if (s === "present") return t("present");
        if (s === "absent") return t("absent");
        if (s === "late") return t("late");
        return t("excused");
    };

    if (isLoading) {
        return (
            <div style={{ color: "var(--color-text-secondary)", fontSize: "14px" }}>
                {tc("loading")}
            </div>
        );
    }

    const records = mine ?? [];
    const meetingList = meetings ?? [];
    const eventList = events ?? [];
    const memberList = members ?? [];
    const options = kind === "meeting" ? meetingList : eventList;

    return (
        <div>
            <h1
                style={{
                    fontSize: "20px",
                    fontWeight: 700,
                    margin: "0 0 20px",
                    color: "var(--color-text)",
                }}
            >
                {t("title")}
            </h1>

            <div style={cardStyle}>
                <h2
                    style={{
                        fontSize: "15px",
                        fontWeight: 600,
                        margin: "0 0 12px",
                        color: "var(--color-text)",
                    }}
                >
                    {t("checkIn")}
                </h2>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div>
                        <label style={labelStyle}>{tc("type")}</label>
                        <select
                            style={inputStyle}
                            value={kind}
                            onChange={(e) => {
                                setKind(e.target.value as "meeting" | "event");
                                setTargetId("");
                            }}
                        >
                            <option value="meeting">{tm("title")}</option>
                            <option value="event">{te("title")}</option>
                        </select>
                    </div>
                    <div>
                        <label style={labelStyle}>
                            {kind === "meeting" ? tm("title") : te("title")}
                        </label>
                        <select
                            style={inputStyle}
                            value={targetId}
                            onChange={(e) => setTargetId(e.target.value)}
                        >
                            <option value="">{tc("all")}</option>
                            {options.map((o) => (
                                <option key={o.id} value={o.id}>
                                    {o.title}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label style={labelStyle}>{t("checkInCode")}</label>
                        <input
                            style={inputStyle}
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                        />
                    </div>
                    <div>
                        <button
                            type="button"
                            onClick={() => checkInMutation.mutate()}
                            disabled={!targetId || checkInMutation.isPending}
                            style={{
                                ...btnBase,
                                backgroundColor: "var(--color-primary)",
                                color: "#fff",
                                opacity: !targetId ? 0.5 : 1,
                            }}
                        >
                            {checkInMutation.isPending ? tc("saving") : t("checkIn")}
                        </button>
                    </div>
                </div>
            </div>

            <h2
                style={{
                    fontSize: "16px",
                    fontWeight: 700,
                    margin: "0 0 12px",
                    color: "var(--color-text)",
                }}
            >
                {t("myAttendance")}
            </h2>
            {records.length === 0 ? (
                <p style={{ fontSize: "14px", color: "var(--color-text-secondary)" }}>
                    {t("noRecords")}
                </p>
            ) : (
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px",
                        marginBottom: "20px",
                    }}
                >
                    {records.map((r) => (
                        <div
                            key={r.id}
                            style={{
                                border: "1px solid var(--color-border)",
                                borderRadius: "var(--radius-sm)",
                                padding: "12px 16px",
                                backgroundColor: "var(--color-bg)",
                                display: "flex",
                                alignItems: "center",
                                gap: "12px",
                                flexWrap: "wrap",
                            }}
                        >
                            <span
                                style={{
                                    fontSize: "14px",
                                    fontWeight: 600,
                                    color: "var(--color-text)",
                                    flex: 1,
                                    minWidth: "160px",
                                }}
                            >
                                {r.meeting?.title ?? r.event?.title ?? r.meetingId ?? r.eventId}
                            </span>
                            <span
                                style={{ fontSize: "13px", color: "var(--color-text-secondary)" }}
                            >
                                {statusLabel(r.status)}
                            </span>
                            <span
                                style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}
                            >
                                {r.checkedInAt ? t("checkedIn") : t("notCheckedIn")}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {canManage && (
                <div style={cardStyle}>
                    <h2
                        style={{
                            fontSize: "15px",
                            fontWeight: 600,
                            margin: "0 0 12px",
                            color: "var(--color-text)",
                        }}
                    >
                        {t("attendanceRate")}
                    </h2>
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        <div>
                            <label style={labelStyle}>{tm("title")}</label>
                            <select
                                style={inputStyle}
                                value={rosterMeetingId}
                                onChange={(e) => setRosterMeetingId(e.target.value)}
                            >
                                <option value="">{tc("all")}</option>
                                {meetingList.map((m) => (
                                    <option key={m.id} value={m.id}>
                                        {m.title}
                                    </option>
                                ))}
                            </select>
                        </div>
                        {rate && (
                            <p
                                style={{
                                    fontSize: "14px",
                                    color: "var(--color-text)",
                                    margin: 0,
                                }}
                            >
                                {t("attendanceRate")}: {rate.present}/{rate.total} ·{" "}
                                {Math.round(rate.rate * 100)}%
                            </p>
                        )}
                        <div>
                            <label style={labelStyle}>{tc("members")}</label>
                            <select
                                style={inputStyle}
                                value={recordUserId}
                                onChange={(e) => setRecordUserId(e.target.value)}
                            >
                                <option value="">{tc("all")}</option>
                                {memberList.map((m) => (
                                    <option key={m.id} value={m.id}>
                                        {m.name ?? m.email}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>{tc("status")}</label>
                            <select
                                style={inputStyle}
                                value={recordStatus}
                                onChange={(e) => setRecordStatus(e.target.value)}
                            >
                                <option value="present">{t("present")}</option>
                                <option value="absent">{t("absent")}</option>
                                <option value="late">{t("late")}</option>
                                <option value="excused">{t("excused")}</option>
                            </select>
                        </div>
                        <div>
                            <button
                                type="button"
                                onClick={() => recordMutation.mutate()}
                                disabled={
                                    !rosterMeetingId || !recordUserId || recordMutation.isPending
                                }
                                style={{
                                    ...btnBase,
                                    backgroundColor: "var(--color-primary)",
                                    color: "#fff",
                                    opacity: !rosterMeetingId || !recordUserId ? 0.5 : 1,
                                }}
                            >
                                {recordMutation.isPending ? tc("saving") : tc("save")}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function AttendancePage() {
    return (
        <AuthSessionProvider>
            <AttendanceContent />
        </AuthSessionProvider>
    );
}
