"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import {
  ClipboardList,
  Plus,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Send,
  AlertCircle,
  ChevronRight,
} from "lucide-react";

function getPortal(): string {
  if (typeof window === "undefined") return "developers";
  return document.cookie.match(/(?:^|;\s*)portal=([^;]*)/)?.[1] ?? "developers";
}

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

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: "todo" | "in_progress" | "done";
  priority: number;
  dueDate: string | null;
  createdBy: { id: string; name: string | null; image: string | null };
  assignee: { id: string; name: string | null; image: string | null } | null;
  subtasks: SubTask[];
  comments: TaskComment[];
  createdAt: string;
  updatedAt: string;
}

interface TasksResponse {
  tasks: Task[];
  total: number;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  todo: { label: "Todo", variant: "outline" },
  in_progress: { label: "In Progress", variant: "default" },
  done: { label: "Done", variant: "secondary" },
};

const statusTabs = [
  { value: "all", label: "All" },
  { value: "todo", label: "Todo" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
];

function getPriorityColor(priority: number): string {
  if (priority >= 3) return "var(--color-destructive)";
  if (priority >= 2) return "var(--color-warning)";
  return "var(--color-success)";
}

function getPriorityLabel(priority: number): string {
  if (priority >= 3) return "High";
  if (priority >= 2) return "Medium";
  return "Low";
}

export default function TasksPage() {
  const portal = getPortal();
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPriority, setNewPriority] = useState("1");
  const [newDueDate, setNewDueDate] = useState("");
  const [commentText, setCommentText] = useState("");

  const { data, isLoading, isError } = useQuery<Task[]>({
    queryKey: [portal, "tasks"],
    queryFn: () => fetchJson<Task[]>(`/api/tasks`),
  });

  const createMutation = useMutation({
    mutationFn: (body: { title: string; description: string; priority: number; dueDate: string | null }) =>
      fetchJson<Task>(`/api/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [portal, "tasks"] });
      setShowCreate(false);
      setNewTitle("");
      setNewDescription("");
      setNewPriority("1");
      setNewDueDate("");
    },
  });

  const subtaskToggleMutation = useMutation({
    mutationFn: ({ taskId, subtaskId, done }: { taskId: string; subtaskId: string; done: boolean }) =>
      fetchJson<SubTask>(`/api/tasks/${taskId}/subtasks`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subtaskId, done }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [portal, "tasks"] });
    },
  });

  const commentMutation = useMutation({
    mutationFn: ({ taskId, content }: { taskId: string; content: string }) =>
      fetchJson<TaskComment>(`/api/tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [portal, "tasks"] });
      setCommentText("");
    },
  });

  const tasks = data ?? [];
  const filteredTasks =
    statusFilter === "all"
      ? tasks
      : tasks.filter((t) => t.status === statusFilter);

  if (isLoading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 style={{ fontSize: "20px", fontWeight: 700, color: "var(--color-text)", margin: 0 }}>Tasks</h1>
            <p style={{ fontSize: "14px", color: "var(--color-text-secondary)", margin: "4px 0 0" }}>
              Manage tasks and assignments
            </p>
          </div>
        </div>
        <Tabs defaultValue="all">
          <TabsList>
            {statusTabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent style={{ padding: "20px" }}>
              <div style={{ display: "flex", gap: "12px" }}>
                <Skeleton style={{ width: "16px", height: "16px", borderRadius: "5px", flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <Skeleton style={{ width: "50%", height: "16px", borderRadius: "5px", marginBottom: "8px" }} />
                  <Skeleton style={{ width: "30%", height: "14px", borderRadius: "5px" }} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div style={{ textAlign: "center", padding: "48px 24px" }}>
        <p style={{ fontSize: "14px", color: "var(--color-destructive)", margin: 0 }}>
          Failed to load tasks.
        </p>
      </div>
    );
  }

  function handleCreate() {
    if (!newTitle.trim()) return;
    createMutation.mutate({
      title: newTitle.trim(),
      description: newDescription.trim(),
      priority: parseInt(newPriority, 10),
      dueDate: newDueDate || null,
    });
  }

  function handleCommentSubmit(taskId: string) {
    if (!commentText.trim()) return;
    commentMutation.mutate({ taskId, content: commentText.trim() });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: 700, color: "var(--color-text)", margin: 0 }}>Tasks</h1>
          <p style={{ fontSize: "14px", color: "var(--color-text-secondary)", margin: "4px 0 0" }}>
            Manage tasks and assignments
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus size={16} />
          <span>New Task</span>
        </Button>
      </div>

      <Tabs defaultValue="all" onValueChange={(v) => setStatusFilter(v)}>
        <TabsList>
          {statusTabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={statusFilter}>
          {filteredTasks.length === 0 ? (
            <Card>
              <CardContent style={{ padding: "40px 20px", textAlign: "center" }}>
                <ClipboardList size={32} style={{ color: "var(--color-text-secondary)", marginBottom: "12px" }} />
                <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-text)", margin: "0 0 4px" }}>
                  No tasks found
                </p>
                <p style={{ fontSize: "13px", color: "var(--color-text-secondary)", margin: 0 }}>
                  {statusFilter === "all" ? "Create a new task to get started." : `No tasks with status "${statusFilter}".`}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredTasks.map((task) => {
              const isExpanded = expandedId === task.id;
              const config = statusConfig[task.status] ?? statusConfig.todo;
              const doneSubtasks = task.subtasks?.filter((s) => s.done).length ?? 0;
              const totalSubtasks = task.subtasks?.length ?? 0;

              return (
                <Card key={task.id}>
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : task.id)}
                    style={{
                      padding: "20px",
                      cursor: "pointer",
                      borderBottom: isExpanded ? "1px solid var(--color-border)" : "none",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", flexWrap: "wrap" }}>
                          <h3 style={{ fontSize: "15px", fontWeight: 600, color: "var(--color-text)", margin: 0 }}>
                            {task.title}
                          </h3>
                          <Badge variant={config.variant}>{config.label}</Badge>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", marginTop: "6px" }}>
                          <span style={{ fontSize: "12px", color: getPriorityColor(task.priority), display: "flex", alignItems: "center", gap: "4px" }}>
                            <AlertCircle size={12} />
                            {getPriorityLabel(task.priority)}
                          </span>
                          {task.dueDate && (
                            <span style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
                              Due {format(new Date(task.dueDate), "MMM d")}
                            </span>
                          )}
                          {task.assignee && (
                            <span style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
                              {task.assignee.name ?? "Unassigned"}
                            </span>
                          )}
                          {totalSubtasks > 0 && (
                            <span style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
                              {doneSubtasks}/{totalSubtasks} subtasks
                            </span>
                          )}
                          {task.comments && task.comments.length > 0 && (
                            <span style={{ fontSize: "12px", color: "var(--color-text-secondary)", display: "flex", alignItems: "center", gap: "4px" }}>
                              <MessageSquare size={12} />
                              {task.comments.length}
                            </span>
                          )}
                        </div>
                      </div>
                      {isExpanded ? <ChevronUp size={18} style={{ flexShrink: 0, color: "var(--color-text-secondary)" }} /> : <ChevronDown size={18} style={{ flexShrink: 0, color: "var(--color-text-secondary)" }} />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={{ padding: "20px" }}>
                      {task.description && (
                        <p style={{ fontSize: "14px", color: "var(--color-text)", margin: "0 0 20px", whiteSpace: "pre-wrap" }}>
                          {task.description}
                        </p>
                      )}

                      {totalSubtasks > 0 && (
                        <div style={{ marginBottom: "20px" }}>
                          <h4 style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-text)", margin: "0 0 8px" }}>
                            Subtasks ({doneSubtasks}/{totalSubtasks})
                          </h4>
                          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            {task.subtasks.map((sub) => (
                              <label
                                key={sub.id}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px",
                                  padding: "6px 8px",
                                  borderRadius: "5px",
                                  cursor: "pointer",
                                  fontSize: "13px",
                                  color: sub.done ? "var(--color-text-secondary)" : "var(--color-text)",
                                  textDecoration: sub.done ? "line-through" : "none",
                                }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Checkbox
                                  checked={sub.done}
                                  onCheckedChange={(checked) => {
                                    subtaskToggleMutation.mutate({
                                      taskId: task.id,
                                      subtaskId: sub.id,
                                      done: checked === true,
                                    });
                                  }}
                                />
                                {sub.title}
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                      <div>
                        <h4 style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-text)", margin: "0 0 8px" }}>
                          Comments
                        </h4>
                        {(!task.comments || task.comments.length === 0) ? (
                          <p style={{ fontSize: "13px", color: "var(--color-text-secondary)", margin: "0 0 12px" }}>
                            No comments yet.
                          </p>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "12px" }}>
                            {task.comments.map((comment) => (
                              <div
                                key={comment.id}
                                style={{
                                  padding: "8px 12px",
                                  borderRadius: "5px",
                                  backgroundColor: "var(--color-bg-secondary)",
                                }}
                              >
                                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                                  <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-text)" }}>
                                    {comment.user?.name ?? "Unknown"}
                                  </span>
                                  <span style={{ fontSize: "11px", color: "var(--color-text-secondary)" }}>
                                    {format(new Date(comment.createdAt), "MMM d, HH:mm")}
                                  </span>
                                </div>
                                <p style={{ fontSize: "13px", color: "var(--color-text)", margin: 0 }}>
                                  {comment.content}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}

                        <div
                          style={{ display: "flex", gap: "8px" }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Input
                            placeholder="Add a comment..."
                            value={expandedId === task.id ? commentText : ""}
                            onChange={(e) => setCommentText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleCommentSubmit(task.id);
                              }
                            }}
                          />
                          <Button
                            size="icon"
                            onClick={() => handleCommentSubmit(task.id)}
                            disabled={!commentText.trim()}
                          >
                            <Send size={16} />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Task</DialogTitle>
            <DialogDescription>
              Create a new task for the team.
            </DialogDescription>
          </DialogHeader>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={{ fontSize: "13px", fontWeight: 500, color: "var(--color-text)", display: "block", marginBottom: "6px" }}>
                Title
              </label>
              <Input
                placeholder="Enter task title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
            </div>
            <div>
              <label style={{ fontSize: "13px", fontWeight: 500, color: "var(--color-text)", display: "block", marginBottom: "6px" }}>
                Description
              </label>
              <Textarea
                placeholder="Describe the task"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label style={{ fontSize: "13px", fontWeight: 500, color: "var(--color-text)", display: "block", marginBottom: "6px" }}>
                  Priority
                </label>
                <Select value={newPriority} onValueChange={setNewPriority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Low</SelectItem>
                    <SelectItem value="1">Medium</SelectItem>
                    <SelectItem value="2">High</SelectItem>
                    <SelectItem value="3">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label style={{ fontSize: "13px", fontWeight: 500, color: "var(--color-text)", display: "block", marginBottom: "6px" }}>
                  Due Date
                </label>
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
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!newTitle.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? "Creating..." : "Create Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
