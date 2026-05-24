"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api-client";
import { usePortal } from "@/hooks/usePortal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  MessageSquare,
  Users,
  Plus,
  LogOut,
  Send,
  Trash2,
  UserMinus,
  UserPlus,
  AlertCircle,
} from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";

interface Subgroup {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  _count: { members: number };
}

interface SubgroupMember {
  id: string;
  userId: string;
  user: { id: string; name: string | null; email: string; image: string | null };
  joinedAt: string;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: "todo" | "in_progress" | "done";
  priority: number;
  dueDate: string | null;
  createdBy: { id: string; name: string | null };
}

interface MessageThread {
  id: string;
  subject: string;
  createdAt: string;
  updatedAt: string;
  totalMessages: number;
  lastMessage: {
    id: string;
    content: string;
    createdAt: string;
    sender: { id: string; name: string | null };
  } | null;
}

const statusConfig: Record<string, "default" | "secondary" | "outline"> = {
  todo: "outline",
  in_progress: "default",
  done: "secondary",
};

export default function SubgroupWorkspacePage() {
  const portal = usePortal();
  const params = useParams();
  const router = useRouter();
  const subgroupId = params?.subgroupId as string;
  const { data: session } = useSession();
  const role = session?.user?.role;
  const isOfficer = role === "admin" || role === "officer";
  const currentUserId = session?.user?.id;
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("tasks");

  // Tasks tab state
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskPriority, setTaskPriority] = useState("1");

  // Messages tab state
  const [showCreateThread, setShowCreateThread] = useState(false);
  const [threadSubject, setThreadSubject] = useState("");
  const [threadContent, setThreadContent] = useState("");
  const [replyText, setReplyText] = useState("");
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);

  // Members tab state
  const [showAddMember, setShowAddMember] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");

  const { data: subgroup, isLoading: loadingSubgroup } = useQuery<Subgroup>({
    queryKey: [portal, "subgroups", subgroupId],
    queryFn: () => fetchJson(`/api/subgroups/${subgroupId}`),
    enabled: !!subgroupId,
  });

  const { data: tasks } = useQuery<Task[]>({
    queryKey: [portal, "tasks", subgroupId],
    queryFn: () => fetchJson(`/api/tasks?subgroupId=${subgroupId}`),
    enabled: !!subgroupId,
  });

  const { data: threads } = useQuery<MessageThread[]>({
    queryKey: [portal, "messages", subgroupId],
    queryFn: () => fetchJson(`/api/messages?subgroupId=${subgroupId}`),
    enabled: !!subgroupId,
  });

  const { data: members } = useQuery<SubgroupMember[]>({
    queryKey: [portal, "subgroups", subgroupId, "members"],
    queryFn: () => fetchJson(`/api/subgroups/${subgroupId}/members`),
    enabled: !!subgroupId,
  });

  const { data: allMembers } = useQuery<{ id: string; name: string | null; email: string }[]>({
    queryKey: [portal, "members"],
    queryFn: () => fetchJson(`/api/members`),
    enabled: showAddMember,
  });

  const color = subgroup?.color ?? "var(--color-primary)";
  const portalName = portal === "developers" ? "Developers' Club" : "Student Council";
  usePageTitle(`${subgroup?.name ?? "Subgroup"} | ${portalName}`);

  // Task mutations
  const createTask = useMutation({
    mutationFn: (body: { title: string; description?: string; priority: number }) =>
      fetchJson(`/api/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, subgroupId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [portal, "tasks", subgroupId] });
      setShowCreateTask(false);
      setTaskTitle("");
      setTaskDescription("");
      setTaskPriority("1");
    },
  });

  const deleteTask = useMutation({
    mutationFn: (id: string) =>
      fetchJson(`/api/tasks/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [portal, "tasks", subgroupId] });
    },
  });

  // Thread mutations
  const createThread = useMutation({
    mutationFn: (body: { subject: string; content: string }) =>
      fetchJson(`/api/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, subgroupId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [portal, "messages", subgroupId] });
      setShowCreateThread(false);
      setThreadSubject("");
      setThreadContent("");
    },
  });

  const replyMutation = useMutation({
    mutationFn: ({ threadId, content }: { threadId: string; content: string }) =>
      fetchJson(`/api/messages/threads/${threadId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [portal, "messages", subgroupId] });
      setReplyText("");
    },
  });

  // Member mutations
  const addMember = useMutation({
    mutationFn: (userId: string) =>
      fetchJson(`/api/subgroups/${subgroupId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: [userId] }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [portal, "subgroups", subgroupId, "members"] });
      queryClient.invalidateQueries({ queryKey: [portal, "subgroups"] });
      setShowAddMember(false);
      setSelectedUserId("");
    },
  });

  const removeMember = useMutation({
    mutationFn: (userId: string) =>
      fetchJson(`/api/subgroups/${subgroupId}/members?userId=${userId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [portal, "subgroups", subgroupId, "members"] });
      queryClient.invalidateQueries({ queryKey: [portal, "subgroups"] });
    },
  });

  const taskList = tasks ?? [];
  const threadList = threads ?? [];
  const memberList = members ?? [];
  const availableMembers =
    allMembers?.filter(
      (m) => !memberList.some((sm) => sm.userId === m.id)
    ) ?? [];

  function getPriorityColor(priority: number): string {
    if (priority >= 3) return "var(--color-destructive)";
    if (priority >= 2) return "var(--color-warning)";
    return "var(--color-success)";
  }

  if (loadingSubgroup) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <Skeleton style={{ width: "200px", height: "20px", borderRadius: "5px" }} />
        <Skeleton style={{ width: "100%", height: "80px", borderRadius: "5px" }} />
      </div>
    );
  }

  if (!subgroup) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "64px 24px",
          color: "var(--color-destructive)",
          fontSize: "14px",
        }}
      >
        Subgroup not found.
      </div>
    );
  }

  function handleCreateTask() {
    if (!taskTitle.trim()) return;
    createTask.mutate({
      title: taskTitle.trim(),
      description: taskDescription.trim() || undefined,
      priority: parseInt(taskPriority, 10),
    });
  }

  function handleCreateThread() {
    if (!threadContent.trim()) return;
    createThread.mutate({
      subject: threadSubject.trim() || "Group discussion",
      content: threadContent.trim(),
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Breadcrumb */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          fontSize: "13px",
          color: "var(--color-text-secondary)",
        }}
      >
        <a
          href={`/${portal}/subgroups`}
          onClick={(e) => {
            e.preventDefault();
            router.push(`/${portal}/subgroups`);
          }}
          style={{ color: "var(--color-primary)", cursor: "pointer" }}
        >
          Members
        </a>
        <span>&gt;</span>
        <span style={{ color: color, fontWeight: 600 }}>{subgroup.name}</span>
      </div>

      {/* Colored banner */}
      <div
        style={{
          padding: "20px 24px",
          borderRadius: "5px",
          backgroundColor: `${color}10`,
          border: `1px solid ${color}30`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <h2
            style={{
              fontSize: "18px",
              fontWeight: 700,
              color: "var(--color-text)",
              margin: 0,
            }}
          >
            {subgroup.name}
          </h2>
          {subgroup.description && (
            <p
              style={{
                fontSize: "13px",
                color: "var(--color-text-secondary)",
                margin: "4px 0 0",
              }}
            >
              {subgroup.description}
            </p>
          )}
        </div>
        <Button
          variant="outline"
          onClick={() => router.push(`/${portal}/subgroups`)}
        >
          <LogOut size={16} />
          <span>Exit</span>
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="tasks">
            <ClipboardList size={14} />
            <span>Tasks</span>
          </TabsTrigger>
          <TabsTrigger value="messages">
            <MessageSquare size={14} />
            <span>Messages</span>
          </TabsTrigger>
          <TabsTrigger value="members">
            <Users size={14} />
            <span>Members</span>
          </TabsTrigger>
        </TabsList>

        {/* ===== TASKS TAB ===== */}
        <TabsContent value="tasks">
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontSize: "13px",
                  color: "var(--color-text-secondary)",
                }}
              >
                {taskList.length} task{taskList.length !== 1 ? "s" : ""}
              </span>
              <Button size="sm" onClick={() => setShowCreateTask(true)}>
                <Plus size={14} />
                <span>New Task</span>
              </Button>
            </div>

            {taskList.length === 0 ? (
              <Card>
                <CardContent
                  style={{
                    padding: "40px 20px",
                    textAlign: "center",
                    color: "var(--color-text-secondary)",
                    fontSize: "13px",
                  }}
                >
                  No tasks yet.
                </CardContent>
              </Card>
            ) : (
              taskList.map((task) => (
                <div
                  key={task.id}
                  style={{
                    display: "flex",
                    padding: "12px 16px",
                    border: "1px solid var(--color-border)",
                    borderRadius: "5px",
                    backgroundColor: "var(--color-bg)",
                    borderLeft: `4px solid ${color}`,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        marginBottom: "4px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "14px",
                          fontWeight: 600,
                          color: "var(--color-text)",
                        }}
                      >
                        {task.title}
                      </span>
                      <Badge
                        variant={statusConfig[task.status] ?? "outline"}
                        style={{ fontSize: "11px" }}
                      >
                        {task.status.replace("_", " ")}
                      </Badge>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "12px",
                          color: getPriorityColor(task.priority),
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <AlertCircle size={12} />
                        P{task.priority}
                      </span>
                      {task.dueDate && (
                        <span
                          style={{
                            fontSize: "12px",
                            color: "var(--color-text-secondary)",
                          }}
                        >
                          Due {format(new Date(task.dueDate), "MMM d")}
                        </span>
                      )}
                      <span
                        style={{
                          fontSize: "12px",
                          color: "var(--color-text-secondary)",
                        }}
                      >
                        {task.createdBy?.name ?? "Unknown"}
                      </span>
                    </div>
                  </div>
                  {isOfficer && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm("Delete task?")) deleteTask.mutate(task.id);
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "32px",
                        height: "32px",
                        border: "1px solid var(--color-border)",
                        borderRadius: "5px",
                        backgroundColor: "transparent",
                        cursor: "pointer",
                        color: "var(--color-destructive)",
                        flexShrink: 0,
                        alignSelf: "center",
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))
            )}

            {showCreateTask && (
              <Card>
                <CardContent style={{ padding: "16px" }}>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "12px",
                        color: color,
                        fontWeight: 600,
                      }}
                    >
                      Creating in: {subgroup.name}
                    </div>
                    <Input
                      placeholder="Task title"
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                    />
                    <Textarea
                      placeholder="Description (optional)"
                      value={taskDescription}
                      onChange={(e) => setTaskDescription(e.target.value)}
                      rows={2}
                    />
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Select value={taskPriority} onValueChange={setTaskPriority}>
                        <SelectTrigger style={{ width: "140px" }}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">Low</SelectItem>
                          <SelectItem value="1">Medium</SelectItem>
                          <SelectItem value="2">High</SelectItem>
                          <SelectItem value="3">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        onClick={handleCreateTask}
                        disabled={!taskTitle.trim() || createTask.isPending}
                      >
                        {createTask.isPending ? "Adding..." : "Add"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ===== MESSAGES TAB ===== */}
        <TabsContent value="messages">
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontSize: "13px",
                  color: "var(--color-text-secondary)",
                }}
              >
                {threadList.length} thread{threadList.length !== 1 ? "s" : ""}
              </span>
              <Button size="sm" onClick={() => setShowCreateThread(true)}>
                <Plus size={14} />
                <span>New Thread</span>
              </Button>
            </div>

            {threadList.length === 0 && !showCreateThread ? (
              <Card>
                <CardContent
                  style={{
                    padding: "40px 20px",
                    textAlign: "center",
                    color: "var(--color-text-secondary)",
                    fontSize: "13px",
                  }}
                >
                  No messages yet.
                </CardContent>
              </Card>
            ) : (
              threadList.map((thread) => (
                <div key={thread.id}>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedThreadId(
                        selectedThreadId === thread.id ? null : thread.id
                      )
                    }
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      width: "100%",
                      padding: "12px 16px",
                      border: "1px solid var(--color-border)",
                      borderRadius: "5px",
                      backgroundColor:
                        selectedThreadId === thread.id
                          ? "var(--color-primary-light)"
                          : "var(--color-bg)",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      fontSize: "14px",
                      textAlign: "left",
                      color: "var(--color-text)",
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>{thread.subject}</span>
                    <span
                      style={{
                        fontSize: "12px",
                        color: "var(--color-text-secondary)",
                      }}
                    >
                      {thread.totalMessages ?? 0} message
                      {(thread.totalMessages ?? 0) !== 1 ? "s" : ""}
                    </span>
                  </button>

                  {selectedThreadId === thread.id && (
                    <div
                      style={{
                        border: "1px solid var(--color-border)",
                        borderTop: "none",
                        borderRadius: "0 0 5px 5px",
                        padding: "16px",
                        backgroundColor: "var(--color-bg)",
                      }}
                    >
                      {thread.lastMessage && (
                        <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                          <div
                            style={{
                              width: "28px", height: "28px", borderRadius: "50%",
                              backgroundColor: "var(--color-primary)", color: "#fff",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: "12px", fontWeight: 700, flexShrink: 0,
                            }}
                          >
                            {thread.lastMessage.sender?.name?.charAt(0)?.toUpperCase() ?? "?"}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
                              <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-text)" }}>
                                {thread.lastMessage.sender?.name ?? "Unknown"}
                              </span>
                              <span style={{ fontSize: "11px", color: "var(--color-text-secondary)" }}>
                                {format(new Date(thread.lastMessage.createdAt), "MMM d, h:mm a")}
                              </span>
                            </div>
                            <p style={{ margin: 0, fontSize: "13px", color: "var(--color-text)", lineHeight: 1.5 }}>
                              {thread.lastMessage.content}
                            </p>
                          </div>
                        </div>
                      )}

                      <div style={{ display: "flex", gap: "8px" }}>
                        <Input
                          placeholder="Type a reply..."
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              if (replyText.trim()) {
                                replyMutation.mutate({
                                  threadId: thread.id,
                                  content: replyText.trim(),
                                });
                              }
                            }
                          }}
                        />
                        <Button
                          size="icon"
                          onClick={() => {
                            if (replyText.trim()) {
                              replyMutation.mutate({
                                threadId: thread.id,
                                content: replyText.trim(),
                              });
                            }
                          }}
                          disabled={!replyText.trim() || replyMutation.isPending}
                        >
                          <Send size={16} />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}

            {showCreateThread && (
              <Card>
                <CardContent style={{ padding: "16px" }}>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                    }}
                  >
                    <Input
                      placeholder="Subject (optional)"
                      value={threadSubject}
                      onChange={(e) => setThreadSubject(e.target.value)}
                    />
                    <Textarea
                      placeholder="Write your message..."
                      value={threadContent}
                      onChange={(e) => setThreadContent(e.target.value)}
                      rows={3}
                    />
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <Button
                        size="sm"
                        onClick={handleCreateThread}
                        disabled={
                          !threadContent.trim() || createThread.isPending
                        }
                      >
                        {createThread.isPending ? "Sending..." : "Send"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ===== MEMBERS TAB ===== */}
        <TabsContent value="members">
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontSize: "13px",
                  color: "var(--color-text-secondary)",
                }}
              >
                {memberList.length} member{memberList.length !== 1 ? "s" : ""}
              </span>
              {isOfficer && (
                <Button size="sm" onClick={() => setShowAddMember(true)}>
                  <UserPlus size={14} />
                  <span>Add Member</span>
                </Button>
              )}
            </div>

            {memberList.length === 0 ? (
              <Card>
                <CardContent
                  style={{
                    padding: "40px 20px",
                    textAlign: "center",
                    color: "var(--color-text-secondary)",
                    fontSize: "13px",
                  }}
                >
                  No members yet.
                </CardContent>
              </Card>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {memberList.map((member) => (
                  <div
                    key={member.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 16px",
                      border: "1px solid var(--color-border)",
                      borderRadius: "5px",
                      backgroundColor: "var(--color-bg)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      <div
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "5px",
                          backgroundColor: "var(--color-bg-secondary)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "13px",
                          fontWeight: 600,
                          color: "var(--color-text-secondary)",
                        }}
                      >
                        {member.user?.name?.charAt(0)?.toUpperCase() ?? "?"}
                      </div>
                      <div>
                        <span
                          style={{
                            fontSize: "14px",
                            fontWeight: 500,
                            color: "var(--color-text)",
                          }}
                        >
                          {member.user?.name ?? "Unknown"}
                        </span>
                        {member.user?.email && (
                          <span
                            style={{
                              fontSize: "12px",
                              color: "var(--color-text-secondary)",
                              display: "block",
                            }}
                          >
                            {member.user.email}
                          </span>
                        )}
                      </div>
                    </div>
                    {isOfficer && member.userId !== currentUserId && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm("Remove this member?"))
                            removeMember.mutate(member.userId);
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: "32px",
                          height: "32px",
                          border: "1px solid var(--color-border)",
                          borderRadius: "5px",
                          backgroundColor: "transparent",
                          cursor: "pointer",
                          color: "var(--color-destructive)",
                        }}
                        title="Remove member"
                      >
                        <UserMinus size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Member</DialogTitle>
                <DialogDescription>
                  Add a member to this subgroup.
                </DialogDescription>
              </DialogHeader>
              <div style={{ padding: "8px 0" }}>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a member..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMembers.length === 0 ? (
                      <div
                        style={{
                          padding: "8px 12px",
                          fontSize: "13px",
                          color: "var(--color-text-secondary)",
                        }}
                      >
                        All members already in this subgroup
                      </div>
                    ) : (
                      availableMembers.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name || m.email}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowAddMember(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => addMember.mutate(selectedUserId)}
                  disabled={!selectedUserId || addMember.isPending}
                >
                  {addMember.isPending ? "Adding..." : "Add"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}
