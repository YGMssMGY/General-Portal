"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { format } from "date-fns";
import { fetchJson, fetchPage } from "@/lib/api-client";
import { useAuthSession } from "@/components/AuthSessionProvider";
import { usePortal } from "@/hooks/usePortal";
import { useWorkspace } from "@/hooks/useWorkspace";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
    AlertCircle,
    ChevronDown,
    ChevronUp,
    ClipboardList,
    MessageSquare,
    Plus,
    Send,
    Trash2,
} from "lucide-react";

interface SubTask {
    id: string;
    title: string;
    done: boolean;
}

interface TaskComment {
    id: string;
    content: string;
    createdAt: string;
    user: { id: string; name: string | null; image: string | null };
}

interface TaskUser {
    id: string;
    name: string | null;
    image: string | null;
}

interface Task {
    id: string;
    title: string;
    description: string | null;
    status: "todo" | "in_progress" | "done";
    priority: number;
    dueDate: string | null;
    dependsOnId: string | null;
    recurrence: string | null;
    blockedBy: { id: string; title: string; status: string } | null;
    isBlocked: boolean;
    createdBy: TaskUser;
    assignee: TaskUser | null;
    subtasks: SubTask[];
    comments: TaskComment[];
    createdAt: string;
    updatedAt: string;
}

interface Occurrence {
    taskId: string;
    title: string;
    occurrence: string;
}

interface TimeEntry {
    id: string;
    taskId: string;
    userId: string;
    minutes: number;
    note: string | null;
    date: string;
    createdAt: string;
    user: { id: string; name: string | null; image: string | null };
}

type TaskStatus = "todo" | "in_progress" | "done";

const PAGE_SIZE = 20;

function TaskDetailView({ task }: { task: Task }) {
    const portal = usePortal();
    const queryClient = useQueryClient();
    const tTasks = useTranslations("tasks");
    const tProd = useTranslations("productivity");
    const tCommon = useTranslations("common");
    const tErrors = useTranslations("errors");
    const [showPicker, setShowPicker] = useState(false);
    const [depSearch, setDepSearch] = useState("");
    const [debouncedDep, setDebouncedDep] = useState("");
    const [minutes, setMinutes] = useState("");
    const [note, setNote] = useState("");
    const [entryDate, setEntryDate] = useState("");

    useEffect(() => {
        const timer = setTimeout(() => setDepSearch(debouncedDep.trim()), 300);
        return () => clearTimeout(timer);
    }, [debouncedDep]);

    const { data: detail } = useQuery({
        queryKey: [portal, "task", task.id],
        queryFn: () => fetchJson<Task>(`/api/tasks/${task.id}`),
        enabled: portal !== "",
    });

    const { data: depData } = useQuery({
        queryKey: [portal, "tasks-dep", depSearch],
        queryFn: () =>
            fetchPage<Task>(
                `/api/tasks?limit=10${depSearch ? `&q=${encodeURIComponent(depSearch)}` : ""}`,
            ),
        enabled: portal !== "" && showPicker,
    });

    const { data: timeData, refetch: refetchTime } = useQuery({
        queryKey: [portal, "task-time", task.id],
        queryFn: () => fetchPage<TimeEntry>(`/api/tasks/time?taskId=${task.id}&limit=50`),
        enabled: portal !== "",
    });

    const depMutation = useMutation({
        mutationFn: (dependsOnId: string | null) =>
            fetchJson<Task>(`/api/tasks/${task.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ dependsOnId }),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [portal, "tasks"] });
            queryClient.invalidateQueries({ queryKey: [portal, "task", task.id] });
            setShowPicker(false);
            setDepSearch("");
            setDebouncedDep("");
            toast.success(tTasks("updateSuccess"));
        },
        onError: () => toast.error(tErrors("internal")),
    });

    const timeMutation = useMutation({
        mutationFn: (body: {
            taskId: string;
            minutes: number;
            note: string | null;
            date: string | null;
        }) =>
            fetchJson("/api/tasks/time", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [portal, "task-time", task.id] });
            void refetchTime();
            setMinutes("");
            setNote("");
            setEntryDate("");
            toast.success(tProd("logTimeSuccess"));
        },
        onError: () => toast.error(tErrors("internal")),
    });

    const blockedBy = detail?.blockedBy ?? task.blockedBy ?? null;
    const isBlocked = detail
        ? detail.isBlocked
        : task.isBlocked || (blockedBy ? blockedBy.status !== "done" : false);
    const entries = timeData?.items ?? [];
    const totalMinutes = entries.reduce((sum, e) => sum + e.minutes, 0);
    const depOptions = (depData?.items ?? []).filter((d) => d.id !== task.id);

    function handleLogTime() {
        const m = parseInt(minutes, 10);
        if (!Number.isInteger(m) || m < 1 || m > 1440) return;
        timeMutation.mutate({
            taskId: task.id,
            minutes: m,
            note: note.trim() || null,
            date: entryDate || null,
        });
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                {isBlocked && <Badge variant="destructive">{tProd("blocked")}</Badge>}
                {blockedBy && (
                    <span style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
                        {tProd("blockedBy", { title: blockedBy.title })}
                    </span>
                )}
                {!showPicker ? (
                    <Button variant="outline" size="sm" onClick={() => setShowPicker(true)}>
                        {tProd("setDependency")}
                    </Button>
                ) : (
                    <Button variant="outline" size="sm" onClick={() => setShowPicker(false)}>
                        {tCommon("cancel")}
                    </Button>
                )}
                {(task.dependsOnId || blockedBy) && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => depMutation.mutate(null)}
                        disabled={depMutation.isPending}
                    >
                        {tProd("clearDependency")}
                    </Button>
                )}
            </div>
            {showPicker && (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <Input
                        placeholder={tProd("searchTasks")}
                        value={debouncedDep}
                        onChange={(e) => setDebouncedDep(e.target.value)}
                    />
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "4px",
                            maxHeight: "160px",
                            overflowY: "auto",
                        }}
                    >
                        {depOptions.map((d) => (
                            <button
                                key={d.id}
                                type="button"
                                onClick={() => depMutation.mutate(d.id)}
                                style={{
                                    display: "block",
                                    width: "100%",
                                    textAlign: "left",
                                    padding: "8px 12px",
                                    border: "1px solid var(--color-border)",
                                    borderRadius: "5px",
                                    backgroundColor: "transparent",
                                    cursor: "pointer",
                                    fontFamily: "inherit",
                                    fontSize: "13px",
                                    color: "var(--color-text)",
                                }}
                            >
                                {d.title}
                            </button>
                        ))}
                    </div>
                </div>
            )}
            <div>
                <h4
                    style={{
                        fontSize: "13px",
                        fontWeight: 600,
                        color: "var(--color-text)",
                        margin: "0 0 8px",
                    }}
                >
                    {tProd("logTime")} · {tProd("totalMinutes", { count: totalMinutes })}
                </h4>
                {entries.length > 0 && (
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "4px",
                            marginBottom: "8px",
                        }}
                    >
                        {entries.map((e) => (
                            <div
                                key={e.id}
                                style={{
                                    display: "flex",
                                    gap: "8px",
                                    fontSize: "12px",
                                    color: "var(--color-text-secondary)",
                                }}
                            >
                                <span>{e.minutes} min</span>
                                {e.note && <span style={{ flex: 1 }}>{e.note}</span>}
                                <span>{format(new Date(e.date), "MMM d")}</span>
                            </div>
                        ))}
                    </div>
                )}
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <Input
                        type="number"
                        min={1}
                        max={1440}
                        placeholder={tProd("minutes")}
                        value={minutes}
                        onChange={(e) => setMinutes(e.target.value)}
                        style={{ width: "110px" }}
                    />
                    <Input
                        placeholder={tProd("note")}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        style={{ flex: 1, minWidth: "120px" }}
                    />
                    <Input
                        type="date"
                        value={entryDate}
                        onChange={(e) => setEntryDate(e.target.value)}
                        style={{ width: "150px" }}
                    />
                    <Button
                        size="sm"
                        onClick={handleLogTime}
                        disabled={!minutes.trim() || timeMutation.isPending}
                    >
                        {tProd("logTime")}
                    </Button>
                </div>
            </div>
        </div>
    );
}

export default function TasksPage() {
    const portal = usePortal();
    const { data: workspace } = useWorkspace();
    const { user } = useAuthSession();
    const t = useTranslations("tasks");
    const tProd = useTranslations("productivity");
    const tCommon = useTranslations("common");
    const tErrors = useTranslations("errors");
    usePageTitle(`${t("title")} | ${workspace?.name ?? portal}`);
    const queryClient = useQueryClient();

    const [statusFilter, setStatusFilter] = useState("all");
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [cursorStack, setCursorStack] = useState<string[]>([]);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [showCreate, setShowCreate] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [newDescription, setNewDescription] = useState("");
    const [newPriority, setNewPriority] = useState("1");
    const [newDueDate, setNewDueDate] = useState("");
    const [commentText, setCommentText] = useState("");
    const [subtaskTitle, setSubtaskTitle] = useState("");
    const [pendingDelete, setPendingDelete] = useState<Task | null>(null);
    const [permanent, setPermanent] = useState(false);

    const isAdmin = user?.role === "admin";

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
        return () => clearTimeout(timer);
    }, [search]);

    const cursor = cursorStack.length > 0 ? cursorStack[cursorStack.length - 1] : null;
    const listUrl =
        `/api/tasks?limit=${PAGE_SIZE}` +
        (statusFilter !== "all" ? `&status=${statusFilter}` : "") +
        (debouncedSearch ? `&q=${encodeURIComponent(debouncedSearch)}` : "") +
        (cursor ? `&cursor=${encodeURIComponent(cursor)}` : "");

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: [portal, "tasks", statusFilter, debouncedSearch, cursor ?? ""],
        queryFn: () => fetchPage<Task>(listUrl),
        enabled: portal !== "",
    });

    const tasks = data?.items ?? [];
    const nextCursor = data?.nextCursor ?? null;
    const expandedTask = tasks.find((task) => task.id === expandedId);
    const showOccurrences = expandedTask?.recurrence != null;

    const { data: occurrences } = useQuery<Occurrence[]>({
        queryKey: [portal, "task-occurrences", expandedId ?? ""],
        queryFn: () => {
            const start = new Date(Date.now() - 30 * 86_400_000).toISOString();
            const end = new Date(Date.now() + 30 * 86_400_000).toISOString();
            return fetchJson<Occurrence[]>(
                `/api/tasks/occurrences?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
            );
        },
        enabled: portal !== "" && showOccurrences,
    });
    const taskOccurrences = (occurrences ?? []).filter((o) => o.taskId === expandedId);

    function resetPaging() {
        setCursorStack([]);
    }

    const createMutation = useMutation({
        mutationFn: (body: {
            title: string;
            description: string | null;
            priority: number;
            dueDate: string | null;
        }) =>
            fetchJson<Task>("/api/tasks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            }),
        onSuccess: (created) => {
            queryClient.invalidateQueries({ queryKey: [portal, "tasks"] });
            setShowCreate(false);
            setNewTitle("");
            setNewDescription("");
            setNewPriority("1");
            setNewDueDate("");
            toast.success(t("createSuccess"), {
                action: {
                    label: tCommon("undo"),
                    onClick: () => deleteMutation.mutate({ id: created.id, permanent: false }),
                },
            });
        },
        onError: () => toast.error(tErrors("internal")),
    });

    const statusMutation = useMutation({
        mutationFn: ({ id, status }: { id: string; status: TaskStatus }) =>
            fetchJson<Task>(`/api/tasks/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status }),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [portal, "tasks"] });
            toast.success(t("updateSuccess"));
        },
        onError: () => toast.error(tErrors("internal")),
    });

    const deleteMutation = useMutation({
        mutationFn: ({ id, permanent: perm }: { id: string; permanent: boolean }) =>
            fetchJson(`/api/tasks/${id}${perm ? "?permanent=true" : ""}`, { method: "DELETE" }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [portal, "tasks"] });
            setPendingDelete(null);
            setPermanent(false);
            toast.success(t("deleteSuccess", { count: 1 }));
        },
        onError: () => toast.error(tErrors("internal")),
    });

    const subtaskAddMutation = useMutation({
        mutationFn: ({ taskId, title }: { taskId: string; title: string }) =>
            fetchJson(`/api/tasks/${taskId}/subtasks`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title }),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [portal, "tasks"] });
            setSubtaskTitle("");
        },
        onError: () => toast.error(tErrors("internal")),
    });

    const subtaskDeleteMutation = useMutation({
        mutationFn: ({ taskId, subtaskId }: { taskId: string; subtaskId: string }) =>
            fetchJson(`/api/tasks/${taskId}/subtasks?id=${subtaskId}`, { method: "DELETE" }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: [portal, "tasks"] }),
        onError: () => toast.error(tErrors("internal")),
    });

    const commentMutation = useMutation({
        mutationFn: ({ taskId, content }: { taskId: string; content: string }) =>
            fetchJson(`/api/tasks/${taskId}/comments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content }),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [portal, "tasks"] });
            setCommentText("");
            toast.success(t("updateSuccess"));
        },
        onError: () => toast.error(tErrors("internal")),
    });

    function priorityLabel(priority: number): string {
        if (priority >= 3) return t("priorityCritical");
        if (priority === 2) return t("priorityHigh");
        if (priority === 1) return t("priorityNormal");
        return t("priorityLow");
    }

    function priorityColor(priority: number): string {
        if (priority >= 3) return "var(--color-destructive)";
        if (priority === 2) return "var(--color-warning-text)";
        return "var(--color-success-text)";
    }

    function statusLabel(status: TaskStatus): string {
        if (status === "done") return t("statusDone");
        if (status === "in_progress") return t("statusInProgress");
        return t("statusTodo");
    }

    function handleCreate() {
        if (!newTitle.trim()) return;
        createMutation.mutate({
            title: newTitle.trim(),
            description: newDescription.trim() || null,
            priority: parseInt(newPriority, 10),
            dueDate: newDueDate || null,
        });
    }

    const statusTabs = [
        { value: "all", label: t("allTasks") },
        { value: "todo", label: t("statusTodo") },
        { value: "in_progress", label: t("statusInProgress") },
        { value: "done", label: t("statusDone") },
    ];

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: "12px",
                }}
            >
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
                        {t("allTasks")}
                    </p>
                </div>
                <Button onClick={() => setShowCreate(true)}>
                    <Plus size={16} />
                    <span>{t("new")}</span>
                </Button>
            </div>

            <Input
                placeholder={`${tCommon("search")}...`}
                value={search}
                onChange={(e) => {
                    setSearch(e.target.value);
                    resetPaging();
                }}
                style={{ maxWidth: "320px" }}
            />

            <Tabs
                value={statusFilter}
                onValueChange={(v) => {
                    setStatusFilter(v);
                    resetPaging();
                }}
            >
                <TabsList>
                    {statusTabs.map((tab) => (
                        <TabsTrigger key={tab.value} value={tab.value}>
                            {tab.label}
                        </TabsTrigger>
                    ))}
                </TabsList>
                <TabsContent value={statusFilter}>
                    {isLoading ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                            {Array.from({ length: 4 }).map((_, i) => (
                                <Card key={i}>
                                    <CardContent style={{ padding: "20px" }}>
                                        <Skeleton
                                            style={{
                                                width: "50%",
                                                height: "16px",
                                                marginBottom: "8px",
                                            }}
                                        />
                                        <Skeleton style={{ width: "30%", height: "14px" }} />
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : isError ? (
                        <div style={{ textAlign: "center", padding: "48px 24px" }}>
                            <p
                                style={{
                                    fontSize: "14px",
                                    color: "var(--color-destructive)",
                                    margin: 0,
                                }}
                            >
                                {tErrors("internal")}
                            </p>
                            <Button
                                variant="outline"
                                style={{ marginTop: "16px" }}
                                onClick={() => refetch()}
                            >
                                {tCommon("retry")}
                            </Button>
                        </div>
                    ) : tasks.length === 0 ? (
                        <EmptyState icon={<ClipboardList size={24} />} title={t("noTasks")} />
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                            {tasks.map((task) => {
                                const isExpanded = expandedId === task.id;
                                const doneSubtasks =
                                    task.subtasks?.filter((s) => s.done).length ?? 0;
                                const totalSubtasks = task.subtasks?.length ?? 0;
                                return (
                                    <Card key={task.id}>
                                        <div
                                            onClick={() =>
                                                setExpandedId(isExpanded ? null : task.id)
                                            }
                                            style={{
                                                padding: "20px",
                                                cursor: "pointer",
                                                borderBottom: isExpanded
                                                    ? "1px solid var(--color-border)"
                                                    : "none",
                                            }}
                                        >
                                            <div
                                                style={{
                                                    display: "flex",
                                                    alignItems: "flex-start",
                                                    gap: "12px",
                                                }}
                                            >
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div
                                                        style={{
                                                            display: "flex",
                                                            alignItems: "center",
                                                            gap: "8px",
                                                            flexWrap: "wrap",
                                                        }}
                                                    >
                                                        <h3
                                                            style={{
                                                                fontSize: "15px",
                                                                fontWeight: 600,
                                                                color: "var(--color-text)",
                                                                margin: 0,
                                                            }}
                                                        >
                                                            {task.title}
                                                        </h3>
                                                        <Badge
                                                            variant={
                                                                task.status === "done"
                                                                    ? "secondary"
                                                                    : task.status === "in_progress"
                                                                      ? "default"
                                                                      : "outline"
                                                            }
                                                        >
                                                            {statusLabel(task.status)}
                                                        </Badge>
                                                        {(task.isBlocked || task.dependsOnId) && (
                                                            <Badge variant="destructive">
                                                                {tProd("blocked")}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <div
                                                        style={{
                                                            display: "flex",
                                                            alignItems: "center",
                                                            gap: "12px",
                                                            flexWrap: "wrap",
                                                            marginTop: "6px",
                                                        }}
                                                    >
                                                        <span
                                                            style={{
                                                                fontSize: "12px",
                                                                color: priorityColor(task.priority),
                                                                display: "flex",
                                                                alignItems: "center",
                                                                gap: "4px",
                                                            }}
                                                        >
                                                            <AlertCircle size={12} />
                                                            {priorityLabel(task.priority)}
                                                        </span>
                                                        {task.dueDate && (
                                                            <span
                                                                style={{
                                                                    fontSize: "12px",
                                                                    color: "var(--color-text-secondary)",
                                                                }}
                                                            >
                                                                {t("dueDate")}:{" "}
                                                                {format(
                                                                    new Date(task.dueDate),
                                                                    "MMM d",
                                                                )}
                                                            </span>
                                                        )}
                                                        <span
                                                            style={{
                                                                fontSize: "12px",
                                                                color: "var(--color-text-secondary)",
                                                            }}
                                                        >
                                                            {t("assignee")}:{" "}
                                                            {task.assignee?.name ?? t("unassigned")}
                                                        </span>
                                                        {totalSubtasks > 0 && (
                                                            <span
                                                                style={{
                                                                    fontSize: "12px",
                                                                    color: "var(--color-text-secondary)",
                                                                }}
                                                            >
                                                                {t("subtasks")}: {doneSubtasks}/
                                                                {totalSubtasks}
                                                            </span>
                                                        )}
                                                        {task.comments?.length > 0 && (
                                                            <span
                                                                style={{
                                                                    fontSize: "12px",
                                                                    color: "var(--color-text-secondary)",
                                                                    display: "flex",
                                                                    alignItems: "center",
                                                                    gap: "4px",
                                                                }}
                                                            >
                                                                <MessageSquare size={12} />
                                                                {task.comments.length}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                {isExpanded ? (
                                                    <ChevronUp
                                                        size={18}
                                                        style={{
                                                            flexShrink: 0,
                                                            color: "var(--color-text-secondary)",
                                                        }}
                                                    />
                                                ) : (
                                                    <ChevronDown
                                                        size={18}
                                                        style={{
                                                            flexShrink: 0,
                                                            color: "var(--color-text-secondary)",
                                                        }}
                                                    />
                                                )}
                                            </div>
                                        </div>

                                        {isExpanded && (
                                            <div
                                                style={{
                                                    padding: "20px",
                                                    display: "flex",
                                                    flexDirection: "column",
                                                    gap: "20px",
                                                }}
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                {task.description && (
                                                    <p
                                                        style={{
                                                            fontSize: "14px",
                                                            color: "var(--color-text)",
                                                            margin: 0,
                                                            whiteSpace: "pre-wrap",
                                                        }}
                                                    >
                                                        {task.description}
                                                    </p>
                                                )}
                                                <TaskDetailView task={task} />
                                                {showOccurrences && expandedId === task.id && (
                                                    <div>
                                                        <h4
                                                            style={{
                                                                fontSize: "13px",
                                                                fontWeight: 600,
                                                                margin: "0 0 8px",
                                                            }}
                                                        >
                                                            {t("occurrences")}
                                                        </h4>
                                                        {taskOccurrences.length === 0 ? (
                                                            <p
                                                                style={{
                                                                    fontSize: "12px",
                                                                    color: "var(--color-text-secondary)",
                                                                    margin: 0,
                                                                }}
                                                            >
                                                                {t("noOccurrences")}
                                                            </p>
                                                        ) : (
                                                            <div
                                                                style={{
                                                                    display: "flex",
                                                                    flexWrap: "wrap",
                                                                    gap: "6px",
                                                                }}
                                                            >
                                                                {taskOccurrences.map((o, i) => (
                                                                    <Badge
                                                                        key={`${o.taskId}-${o.occurrence}-${i}`}
                                                                        variant="secondary"
                                                                    >
                                                                        {format(
                                                                            new Date(o.occurrence),
                                                                            "MMM d, yyyy",
                                                                        )}
                                                                    </Badge>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                                <div
                                                    style={{
                                                        display: "flex",
                                                        gap: "8px",
                                                        flexWrap: "wrap",
                                                    }}
                                                >
                                                    <Label style={{ alignSelf: "center" }}>
                                                        {tCommon("status")}:
                                                    </Label>
                                                    <Select
                                                        value={task.status}
                                                        onValueChange={(v) =>
                                                            statusMutation.mutate({
                                                                id: task.id,
                                                                status: v as TaskStatus,
                                                            })
                                                        }
                                                    >
                                                        <SelectTrigger style={{ width: "160px" }}>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="todo">
                                                                {t("statusTodo")}
                                                            </SelectItem>
                                                            <SelectItem value="in_progress">
                                                                {t("statusInProgress")}
                                                            </SelectItem>
                                                            <SelectItem value="done">
                                                                {t("statusDone")}
                                                            </SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <div>
                                                    <h4
                                                        style={{
                                                            fontSize: "13px",
                                                            fontWeight: 600,
                                                            color: "var(--color-text)",
                                                            margin: "0 0 8px",
                                                        }}
                                                    >
                                                        {t("subtasks")} ({doneSubtasks}/
                                                        {totalSubtasks})
                                                    </h4>
                                                    <div
                                                        style={{
                                                            display: "flex",
                                                            flexDirection: "column",
                                                            gap: "6px",
                                                            marginBottom: "8px",
                                                        }}
                                                    >
                                                        {(task.subtasks ?? []).map((sub) => (
                                                            <div
                                                                key={sub.id}
                                                                style={{
                                                                    display: "flex",
                                                                    alignItems: "center",
                                                                    gap: "8px",
                                                                    padding: "6px 8px",
                                                                    fontSize: "13px",
                                                                    color: sub.done
                                                                        ? "var(--color-text-secondary)"
                                                                        : "var(--color-text)",
                                                                    textDecoration: sub.done
                                                                        ? "line-through"
                                                                        : "none",
                                                                }}
                                                            >
                                                                <span style={{ flex: 1 }}>
                                                                    {sub.title}
                                                                </span>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() =>
                                                                        subtaskDeleteMutation.mutate(
                                                                            {
                                                                                taskId: task.id,
                                                                                subtaskId: sub.id,
                                                                            },
                                                                        )
                                                                    }
                                                                    aria-label={tCommon("delete")}
                                                                >
                                                                    <Trash2 size={14} />
                                                                </Button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div style={{ display: "flex", gap: "8px" }}>
                                                        <Input
                                                            placeholder={t("addSubtask")}
                                                            value={
                                                                expandedId === task.id
                                                                    ? subtaskTitle
                                                                    : ""
                                                            }
                                                            onChange={(e) =>
                                                                setSubtaskTitle(e.target.value)
                                                            }
                                                            onKeyDown={(e) => {
                                                                if (
                                                                    e.key === "Enter" &&
                                                                    subtaskTitle.trim()
                                                                )
                                                                    subtaskAddMutation.mutate({
                                                                        taskId: task.id,
                                                                        title: subtaskTitle.trim(),
                                                                    });
                                                            }}
                                                        />
                                                        <Button
                                                            variant="outline"
                                                            onClick={() => {
                                                                if (subtaskTitle.trim())
                                                                    subtaskAddMutation.mutate({
                                                                        taskId: task.id,
                                                                        title: subtaskTitle.trim(),
                                                                    });
                                                            }}
                                                            disabled={!subtaskTitle.trim()}
                                                        >
                                                            <Plus size={16} />
                                                        </Button>
                                                    </div>
                                                </div>

                                                <div>
                                                    <h4
                                                        style={{
                                                            fontSize: "13px",
                                                            fontWeight: 600,
                                                            color: "var(--color-text)",
                                                            margin: "0 0 8px",
                                                        }}
                                                    >
                                                        {t("comments")}
                                                    </h4>
                                                    {!task.comments ||
                                                    task.comments.length === 0 ? (
                                                        <p
                                                            style={{
                                                                fontSize: "13px",
                                                                color: "var(--color-text-secondary)",
                                                                margin: "0 0 12px",
                                                            }}
                                                        >
                                                            {t("noComments")}
                                                        </p>
                                                    ) : (
                                                        <div
                                                            style={{
                                                                display: "flex",
                                                                flexDirection: "column",
                                                                gap: "8px",
                                                                marginBottom: "12px",
                                                            }}
                                                        >
                                                            {task.comments.map((comment) => (
                                                                <div
                                                                    key={comment.id}
                                                                    style={{
                                                                        padding: "8px 12px",
                                                                        borderRadius: "5px",
                                                                        backgroundColor:
                                                                            "var(--color-bg-secondary)",
                                                                    }}
                                                                >
                                                                    <div
                                                                        style={{
                                                                            display: "flex",
                                                                            alignItems: "center",
                                                                            gap: "6px",
                                                                            marginBottom: "4px",
                                                                        }}
                                                                    >
                                                                        <span
                                                                            style={{
                                                                                fontSize: "12px",
                                                                                fontWeight: 600,
                                                                                color: "var(--color-text)",
                                                                            }}
                                                                        >
                                                                            {comment.user?.name ??
                                                                                tCommon("unknown")}
                                                                        </span>
                                                                        <span
                                                                            style={{
                                                                                fontSize: "11px",
                                                                                color: "var(--color-text-secondary)",
                                                                            }}
                                                                        >
                                                                            {format(
                                                                                new Date(
                                                                                    comment.createdAt,
                                                                                ),
                                                                                "MMM d, HH:mm",
                                                                            )}
                                                                        </span>
                                                                    </div>
                                                                    <p
                                                                        style={{
                                                                            fontSize: "13px",
                                                                            color: "var(--color-text)",
                                                                            margin: 0,
                                                                        }}
                                                                    >
                                                                        {comment.content}
                                                                    </p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                    <div style={{ display: "flex", gap: "8px" }}>
                                                        <Input
                                                            placeholder={t("addComment")}
                                                            value={commentText}
                                                            onChange={(e) =>
                                                                setCommentText(e.target.value)
                                                            }
                                                            onKeyDown={(e) => {
                                                                if (
                                                                    e.key === "Enter" &&
                                                                    commentText.trim()
                                                                )
                                                                    commentMutation.mutate({
                                                                        taskId: task.id,
                                                                        content: commentText.trim(),
                                                                    });
                                                            }}
                                                        />
                                                        <Button
                                                            size="icon"
                                                            aria-label={t("sendComment")}
                                                            onClick={() => {
                                                                if (commentText.trim())
                                                                    commentMutation.mutate({
                                                                        taskId: task.id,
                                                                        content: commentText.trim(),
                                                                    });
                                                            }}
                                                            disabled={!commentText.trim()}
                                                        >
                                                            <Send size={16} />
                                                        </Button>
                                                    </div>
                                                </div>

                                                <div
                                                    style={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: "12px",
                                                        flexWrap: "wrap",
                                                    }}
                                                >
                                                    <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        onClick={() => setPendingDelete(task)}
                                                    >
                                                        <Trash2 size={14} />
                                                        {tCommon("delete")}
                                                    </Button>
                                                    {isAdmin && (
                                                        <div
                                                            style={{
                                                                display: "flex",
                                                                alignItems: "center",
                                                                gap: "8px",
                                                            }}
                                                        >
                                                            <Checkbox
                                                                id={`permanent-${task.id}`}
                                                                checked={permanent}
                                                                onCheckedChange={(v) =>
                                                                    setPermanent(v === true)
                                                                }
                                                            />
                                                            <Label
                                                                htmlFor={`permanent-${task.id}`}
                                                                style={{
                                                                    fontSize: "13px",
                                                                    cursor: "pointer",
                                                                }}
                                                            >
                                                                {tCommon("permanentlyDelete")}
                                                            </Label>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </Card>
                                );
                            })}

                            {(nextCursor || cursorStack.length > 0) && (
                                <Pagination>
                                    <PaginationContent>
                                        <PaginationItem>
                                            <PaginationPrevious
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    if (cursorStack.length > 0)
                                                        setCursorStack((s) => s.slice(0, -1));
                                                }}
                                                style={
                                                    cursorStack.length === 0
                                                        ? { opacity: 0.4, pointerEvents: "none" }
                                                        : undefined
                                                }
                                            />
                                        </PaginationItem>
                                        <PaginationItem>
                                            <PaginationNext
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    if (nextCursor)
                                                        setCursorStack((s) => [...s, nextCursor]);
                                                }}
                                                style={
                                                    !nextCursor
                                                        ? { opacity: 0.4, pointerEvents: "none" }
                                                        : undefined
                                                }
                                            />
                                        </PaginationItem>
                                    </PaginationContent>
                                </Pagination>
                            )}
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            <Dialog open={showCreate} onOpenChange={setShowCreate}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t("new")}</DialogTitle>
                        <DialogDescription>{t("allTasks")}</DialogDescription>
                    </DialogHeader>
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        <div>
                            <Label style={{ display: "block", marginBottom: "6px" }}>
                                {tCommon("title")}
                            </Label>
                            <Input
                                placeholder={t("new")}
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                            />
                        </div>
                        <div>
                            <Label style={{ display: "block", marginBottom: "6px" }}>
                                {tCommon("description")}
                            </Label>
                            <Textarea
                                placeholder={tCommon("description")}
                                value={newDescription}
                                onChange={(e) => setNewDescription(e.target.value)}
                                rows={3}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label style={{ display: "block", marginBottom: "6px" }}>
                                    {t("priority")}
                                </Label>
                                <Select value={newPriority} onValueChange={setNewPriority}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="0">{t("priorityLow")}</SelectItem>
                                        <SelectItem value="1">{t("priorityNormal")}</SelectItem>
                                        <SelectItem value="2">{t("priorityHigh")}</SelectItem>
                                        <SelectItem value="3">{t("priorityCritical")}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label style={{ display: "block", marginBottom: "6px" }}>
                                    {t("dueDate")}
                                </Label>
                                <Input
                                    type="date"
                                    value={newDueDate}
                                    onChange={(e) => setNewDueDate(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCreate(false)}>
                            {tCommon("cancel")}
                        </Button>
                        <Button
                            onClick={handleCreate}
                            disabled={!newTitle.trim() || createMutation.isPending}
                        >
                            {createMutation.isPending ? tCommon("saving") : tCommon("create")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={pendingDelete !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setPendingDelete(null);
                        setPermanent(false);
                    }
                }}
                title={t("deleteConfirm")}
                description={t("deleteWarning")}
                confirmLabel={permanent ? tCommon("deleteForever") : tCommon("delete")}
                destructive
                requireTypedText={permanent}
                typingChallenge={pendingDelete?.title ?? ""}
                onConfirm={() => {
                    if (pendingDelete) deleteMutation.mutate({ id: pendingDelete.id, permanent });
                }}
            />
        </div>
    );
}
