"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import {
  MessageSquare,
  Plus,
  Send,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Mail,
  Users,
  Trash2,
  Trophy,
  Star,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { usePortal } from "@/hooks/usePortal";
import { usePageTitle } from "@/hooks/usePageTitle";

interface ThreadSender {
  id: string;
  name: string | null;
  image: string | null;
}

interface LastMessage {
  id: string;
  content: string;
  createdAt: string;
  sender: ThreadSender;
}

interface Thread {
  id: string;
  subject: string;
  createdAt: string;
  updatedAt: string;
  lastMessage: LastMessage | null;
  totalMessages: number;
  unreadCount: number;
}

interface ThreadMessage {
  id: string;
  content: string;
  createdAt: string;
  sender: ThreadSender;
  read: boolean;
  readAt: string | null;
}

interface ThreadDetail {
  id: string;
  subject: string;
  createdAt: string;
  updatedAt: string;
  messages: ThreadMessage[];
}

interface KudoSender {
  id: string;
  name: string | null;
  image: string | null;
}

interface KudoReceiver {
  id: string;
  name: string | null;
  image: string | null;
}

interface KudosEntry {
  id: string;
  message: string | null;
  createdAt: string;
  sender: KudoSender;
  receiver: KudoReceiver;
}

interface LeaderboardEntry {
  userId: string;
  userName: string;
  userEmail: string | null;
  userImage: string | null;
  count: number;
}

export default function MessagesPage() {
  const portal = usePortal();
  const portalName = portal === "developers" ? "Developers' Club" : "Student Council";
  usePageTitle(`Messages | ${portalName}`);
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const isAdmin = session?.user?.role === "admin";
  const queryClient = useQueryClient();
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [showMobileThread, setShowMobileThread] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newRecipients, setNewRecipients] = useState<string[]>([]);

  // Kudos state
  const [showKudos, setShowKudos] = useState(false);
  const [kudoReceiverId, setKudoReceiverId] = useState("");
  const [kudoMessage, setKudoMessage] = useState("");

  const { data: memberList } = useQuery<{ id: string; name: string; email: string }[]>({
    queryKey: [portal, "members"],
    queryFn: () => fetchJson(`/api/members`),
  });

  function toggleRecipient(id: string) {
    setNewRecipients((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id],
    );
  }
  const [replyContent, setReplyContent] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: threads, isLoading: threadsLoading } = useQuery<Thread[]>({
    queryKey: [portal, "messages"],
    queryFn: () => fetchJson<Thread[]>(`/api/messages`),
  });

  const { data: threadDetail, isLoading: detailLoading } = useQuery<ThreadDetail>({
    queryKey: [portal, "messages", selectedThreadId],
    queryFn: () =>
      fetchJson<ThreadDetail>(`/api/messages/threads/${selectedThreadId}`),
    enabled: !!selectedThreadId,
  });

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [threadDetail?.messages]);

  // ---- Kudos queries & mutations ----

  const { data: kudos, isLoading: kudosLoading } = useQuery<KudosEntry[]>({
    queryKey: [portal, "kudos"],
    queryFn: () => fetchJson(`/api/kudos`),
  });

  const { data: leaderboard } = useQuery<LeaderboardEntry[]>({
    queryKey: [portal, "kudos-leaderboard"],
    queryFn: () => fetchJson(`/api/kudos/leaderboard`),
  });

  const sendKudosMutation = useMutation({
    mutationFn: (body: { receiverId: string; message: string }) =>
      fetchJson(`/api/kudos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [portal, "kudos"] });
      queryClient.invalidateQueries({ queryKey: [portal, "kudos-leaderboard"] });
      setKudoReceiverId("");
      setKudoMessage("");
    },
  });

  const deleteKudosMutation = useMutation({
    mutationFn: (id: string) =>
      fetchJson(`/api/kudos/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [portal, "kudos"] });
      queryClient.invalidateQueries({ queryKey: [portal, "kudos-leaderboard"] });
    },
  });

  // ---- Message mutations ----

  const createMutation = useMutation({
    mutationFn: (body: { subject: string; content: string; recipientIds?: string[] }) =>
      fetchJson<ThreadDetail>(`/api/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: (newThread) => {
      queryClient.invalidateQueries({ queryKey: [portal, "messages"] });
      setShowCreate(false);
      setNewSubject("");
      setNewContent("");
      setNewRecipients([]);
      setSelectedThreadId(newThread.id);
      setShowMobileThread(true);
    },
  });

  const replyMutation = useMutation({
    mutationFn: (body: { content: string }) =>
      fetchJson<ThreadMessage>(`/api/messages/threads/${selectedThreadId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [portal, "messages", selectedThreadId] });
      queryClient.invalidateQueries({ queryKey: [portal, "messages"] });
      setReplyContent("");
    },
  });

  const deleteThread = useMutation({
    mutationFn: (id: string) =>
      fetchJson(`/api/messages/threads/${id}`, { method: "DELETE" }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [portal, "messages"] });
      if (selectedThreadId === variables) {
        setSelectedThreadId(null);
        setShowMobileThread(false);
      }
    },
  });

  // ---- Handlers ----

  function handleCreate() {
    if (newRecipients.length === 0 || !newContent.trim()) return;
    createMutation.mutate({
      subject:
        newSubject.trim() || `Message to ${newRecipients.length} recipient(s)`,
      content: newContent.trim(),
      recipientIds: newRecipients,
    });
  }

  function handleReply() {
    if (!replyContent.trim() || !selectedThreadId) return;
    replyMutation.mutate({ content: replyContent.trim() });
  }

  function handleSelectThread(threadId: string) {
    setSelectedThreadId(threadId);
    setShowMobileThread(true);
  }

  function handleBackToList() {
    setShowMobileThread(false);
  }

  function handleSendKudos() {
    if (!kudoReceiverId || !kudoMessage.trim()) return;
    sendKudosMutation.mutate({
      receiverId: kudoReceiverId,
      message: kudoMessage.trim(),
    });
  }

  const threadList = threads ?? [];
  const kudosList = kudos ?? [];
  const leaderboardList = leaderboard ?? [];

  // Members filtered for kudos send (exclude current user)
  const kudoMembers =
    memberList?.filter((m) => m.id !== currentUserId) ?? [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* ---- Header ---- */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
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
            Messages
          </h1>
          <p
            style={{
              fontSize: "14px",
              color: "var(--color-text-secondary)",
              margin: "4px 0 0",
            }}
          >
            Internal messaging
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus size={16} />
          <span>New Message</span>
        </Button>
      </div>

      {/* ---- Messages Grid ---- */}
      <div
        className="lg:grid lg:grid-cols-[320px_1fr]"
        style={{
          border: "1px solid var(--color-border)",
          borderRadius: "5px",
          overflow: "hidden",
          minHeight: "400px",
          maxHeight: "50vh",
        }}
      >
        {/* Thread List */}
        <div
          className={showMobileThread ? "hidden lg:flex" : "flex"}
          style={{
            flexDirection: "column",
            borderRight: "1px solid var(--color-border)",
            backgroundColor: "var(--color-bg)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "12px",
              borderBottom: "1px solid var(--color-border)",
              fontSize: "13px",
              fontWeight: 600,
              color: "var(--color-text-secondary)",
            }}
          >
            {threadList.length} conversation
            {threadList.length !== 1 ? "s" : ""}
          </div>

          <div style={{ flex: 1, overflowY: "auto" }}>
            {threadsLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    padding: "12px",
                    borderBottom: "1px solid var(--color-border)",
                  }}
                >
                  <Skeleton
                    style={{
                      width: "60%",
                      height: "14px",
                      borderRadius: "5px",
                      marginBottom: "8px",
                    }}
                  />
                  <Skeleton
                    style={{
                      width: "80%",
                      height: "12px",
                      borderRadius: "5px",
                    }}
                  />
                </div>
              ))
            ) : threadList.length === 0 ? (
              <div
                style={{
                  padding: "24px",
                  textAlign: "center",
                }}
              >
                <Mail
                  size={24}
                  style={{
                    color: "var(--color-text-secondary)",
                    marginBottom: "8px",
                  }}
                />
                <p
                  style={{
                    fontSize: "13px",
                    color: "var(--color-text-secondary)",
                    margin: 0,
                  }}
                >
                  No messages yet
                </p>
              </div>
            ) : (
              threadList.map((thread) => {
                const isSelected = selectedThreadId === thread.id;
                return (
                  <button
                    key={thread.id}
                    type="button"
                    onClick={() => handleSelectThread(thread.id)}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "10px",
                      width: "100%",
                      padding: "12px",
                      border: "none",
                      borderBottom: "1px solid var(--color-border)",
                      backgroundColor: isSelected
                        ? "var(--color-primary-light)"
                        : "transparent",
                      cursor: "pointer",
                      textAlign: "left",
                      minHeight: "60px",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor =
                          "var(--color-bg-secondary)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }
                    }}
                  >
                    <div
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "5px",
                        backgroundColor:
                          thread.unreadCount > 0
                            ? "var(--color-primary)"
                            : "transparent",
                        flexShrink: 0,
                        marginTop: "6px",
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "4px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "13px",
                            fontWeight: thread.unreadCount > 0 ? 600 : 400,
                            color: "var(--color-text)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {thread.subject}
                        </span>
                        <span
                          style={{
                            fontSize: "11px",
                            color: "var(--color-text-secondary)",
                            flexShrink: 0,
                            marginLeft: "8px",
                          }}
                        >
                          {format(new Date(thread.updatedAt), "MMM d")}
                        </span>
                      </div>
                      {thread.lastMessage && (
                        <p
                          style={{
                            fontSize: "12px",
                            color: "var(--color-text-secondary)",
                            margin: 0,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          <span style={{ fontWeight: 500 }}>
                            {thread.lastMessage.sender?.name ?? "Unknown"}:
                          </span>{" "}
                          {thread.lastMessage.content}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Conversation View */}
        <div
          className={!showMobileThread ? "hidden lg:flex" : "flex"}
          style={{
            flexDirection: "column",
            backgroundColor: "var(--color-bg)",
            overflow: "hidden",
          }}
        >
          {!selectedThreadId ? (
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "24px",
              }}
            >
              <MessageSquare
                size={32}
                style={{
                  color: "var(--color-text-secondary)",
                  marginBottom: "12px",
                }}
              />
              <p
                style={{
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "var(--color-text)",
                  margin: "0 0 4px",
                }}
              >
                Select a conversation
              </p>
              <p
                style={{
                  fontSize: "13px",
                  color: "var(--color-text-secondary)",
                  margin: 0,
                }}
              >
                Choose a thread from the left to view messages
              </p>
            </div>
          ) : detailLoading ? (
            <div style={{ padding: "20px" }}>
              <Skeleton
                style={{
                  width: "40%",
                  height: "18px",
                  borderRadius: "5px",
                  marginBottom: "20px",
                }}
              />
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    gap: "10px",
                    marginBottom: "16px",
                  }}
                >
                  <Skeleton
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "5px",
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <Skeleton
                      style={{
                        width: "30%",
                        height: "12px",
                        borderRadius: "5px",
                        marginBottom: "6px",
                      }}
                    />
                    <Skeleton
                      style={{
                        width: "60%",
                        height: "14px",
                        borderRadius: "5px",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : !threadDetail ? (
            <div style={{ textAlign: "center", padding: "48px 24px" }}>
              <p
                style={{
                  fontSize: "14px",
                  color: "var(--color-destructive)",
                  margin: 0,
                }}
              >
                Failed to load conversation.
              </p>
            </div>
          ) : (
            <>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "12px 16px",
                  borderBottom: "1px solid var(--color-border)",
                }}
              >
                <button
                  type="button"
                  className="flex lg:hidden"
                  onClick={handleBackToList}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "36px",
                    height: "36px",
                    border: "1px solid var(--color-border)",
                    borderRadius: "5px",
                    backgroundColor: "transparent",
                    cursor: "pointer",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  <ChevronLeft size={18} />
                </button>
                <h2
                  style={{
                    fontSize: "15px",
                    fontWeight: 600,
                    color: "var(--color-text)",
                    margin: 0,
                    flex: 1,
                  }}
                >
                  {threadDetail.subject}
                </h2>
                {isAdmin && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("Delete this conversation?"))
                        deleteThread.mutate(threadDetail.id);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "6px 10px",
                      border: "1px solid var(--color-destructive)",
                      borderRadius: "5px",
                      background: "var(--color-bg)",
                      cursor: "pointer",
                      fontSize: "13px",
                      fontFamily: "inherit",
                      color: "var(--color-destructive)",
                      flexShrink: 0,
                    }}
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                )}
              </div>

              <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
                {threadDetail.messages.map((msg) => (
                  <div
                    key={msg.id}
                    style={{
                      display: "flex",
                      gap: "10px",
                      marginBottom: "16px",
                    }}
                  >
                    <div
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "5px",
                        backgroundColor: "var(--color-bg-secondary)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        fontSize: "12px",
                        fontWeight: 600,
                        color: "var(--color-text-secondary)",
                      }}
                    >
                      {msg.sender?.name?.charAt(0)?.toUpperCase() ?? "?"}
                    </div>
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
                            fontSize: "13px",
                            fontWeight: 600,
                            color: "var(--color-text)",
                          }}
                        >
                          {msg.sender?.name ?? "Unknown"}
                        </span>
                        <span
                          style={{
                            fontSize: "11px",
                            color: "var(--color-text-secondary)",
                          }}
                        >
                          {format(new Date(msg.createdAt), "MMM d, h:mm a")}
                        </span>
                      </div>
                      <p
                        style={{
                          fontSize: "14px",
                          color: "var(--color-text)",
                          margin: 0,
                          whiteSpace: "pre-wrap",
                          lineHeight: 1.5,
                        }}
                      >
                        {msg.content}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <div
                style={{
                  padding: "12px 16px",
                  borderTop: "1px solid var(--color-border)",
                  display: "flex",
                  gap: "8px",
                }}
              >
                <Input
                  placeholder="Type your reply..."
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleReply();
                    }
                  }}
                />
                <Button
                  size="icon"
                  onClick={handleReply}
                  disabled={!replyContent.trim() || replyMutation.isPending}
                >
                  <Send size={16} />
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ================================================================ */}
      {/*  KUDOS SECTION                                                  */}
      {/* ================================================================ */}
      <Card>
        <button
          type="button"
          onClick={() => setShowKudos(!showKudos)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            width: "100%",
            padding: "14px 16px",
            border: "none",
            borderRadius: "5px",
            background: "transparent",
            cursor: "pointer",
            fontSize: "15px",
            fontWeight: 600,
            fontFamily: "inherit",
            color: "var(--color-text)",
            textAlign: "left",
          }}
        >
          <Trophy size={20} style={{ color: "var(--color-primary)" }} />
          <span style={{ flex: 1 }}>Kudos</span>
          {showKudos ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </button>

        {showKudos && (
          <div
            style={{
              borderTop: "1px solid var(--color-border)",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "24px",
            }}
          >
            {/* ---- Send Kudos ---- */}
            <div>
              <h3
                style={{
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "var(--color-text)",
                  margin: "0 0 12px",
                }}
              >
                Send Kudos
              </h3>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                <Select
                  value={kudoReceiverId}
                  onValueChange={setKudoReceiverId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a team member..." />
                  </SelectTrigger>
                  <SelectContent>
                    {kudoMembers.length === 0 ? (
                      <div
                        style={{
                          padding: "8px 12px",
                          fontSize: "13px",
                          color: "var(--color-text-secondary)",
                        }}
                      >
                        No other members
                      </div>
                    ) : (
                      kudoMembers.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                            }}
                          >
                            <Users
                              size={14}
                              style={{
                                color: "var(--color-text-secondary)",
                                flexShrink: 0,
                              }}
                            />
                            <span>{m.name || m.email}</span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>

                <Textarea
                  placeholder="What do you appreciate about this person?"
                  value={kudoMessage}
                  onChange={(e) => setKudoMessage(e.target.value)}
                  rows={3}
                />

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                  }}
                >
                  <Button
                    onClick={handleSendKudos}
                    disabled={
                      !kudoReceiverId ||
                      !kudoMessage.trim() ||
                      sendKudosMutation.isPending
                    }
                  >
                    <Star size={16} />
                    <span>
                      {sendKudosMutation.isPending ? "Sending..." : "Send Kudos"}
                    </span>
                  </Button>
                </div>
              </div>
            </div>

            {/* ---- Received Kudos ---- */}
            <div>
              <h3
                style={{
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "var(--color-text)",
                  margin: "0 0 12px",
                }}
              >
                Received Kudos
              </h3>

              {kudosLoading ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton
                      key={i}
                      style={{
                        width: "100%",
                        height: "60px",
                        borderRadius: "5px",
                      }}
                    />
                  ))}
                </div>
              ) : kudosList.length === 0 ? (
                <p
                  style={{
                    fontSize: "13px",
                    color: "var(--color-text-secondary)",
                    margin: 0,
                  }}
                >
                  No kudos have been sent yet.
                </p>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  {kudosList.map((k) => (
                    <div
                      key={k.id}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "12px",
                        padding: "12px",
                        border: "1px solid var(--color-border)",
                        borderRadius: "5px",
                        backgroundColor: "var(--color-bg)",
                      }}
                    >
                      <Star
                        size={18}
                        style={{
                          color: "var(--color-primary)",
                          flexShrink: 0,
                          marginTop: "2px",
                        }}
                      />
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
                              fontSize: "13px",
                              fontWeight: 600,
                              color: "var(--color-text)",
                            }}
                          >
                            {k.sender?.name ?? "Unknown"}
                          </span>
                          <span
                            style={{
                              fontSize: "11px",
                              color: "var(--color-text-secondary)",
                            }}
                          >
                            &rarr; {k.receiver?.name ?? "Unknown"}
                          </span>
                          <span
                            style={{
                              fontSize: "11px",
                              color: "var(--color-text-secondary)",
                              marginLeft: "auto",
                            }}
                          >
                            {format(new Date(k.createdAt), "MMM d, yyyy")}
                          </span>
                        </div>
                        {k.message && (
                          <p
                            style={{
                              fontSize: "13px",
                              color: "var(--color-text)",
                              margin: 0,
                              whiteSpace: "pre-wrap",
                              lineHeight: 1.4,
                            }}
                          >
                            {k.message}
                          </p>
                        )}
                      </div>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm("Delete this kudos?"))
                              deleteKudosMutation.mutate(k.id);
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "32px",
                            height: "32px",
                            border: "1px solid var(--color-destructive)",
                            borderRadius: "5px",
                            backgroundColor: "transparent",
                            cursor: "pointer",
                            color: "var(--color-destructive)",
                            flexShrink: 0,
                          }}
                          title="Delete kudos"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ---- Leaderboard ---- */}
            <div>
              <h3
                style={{
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "var(--color-text)",
                  margin: "0 0 12px",
                }}
              >
                Leaderboard
              </h3>

              {leaderboardList.length === 0 ? (
                <p
                  style={{
                    fontSize: "13px",
                    color: "var(--color-text-secondary)",
                    margin: 0,
                  }}
                >
                  No kudos data yet.
                </p>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                  }}
                >
                  {leaderboardList.map((entry, idx) => (
                    <div
                      key={entry.userId}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "8px 12px",
                        borderRadius: "5px",
                        backgroundColor:
                          idx === 0
                            ? "var(--color-primary-light)"
                            : "transparent",
                      }}
                    >
                      <span
                        style={{
                          width: "24px",
                          fontSize: "14px",
                          fontWeight: 700,
                          color:
                            idx === 0
                              ? "var(--color-primary)"
                              : "var(--color-text-secondary)",
                          textAlign: "center",
                        }}
                      >
                        {idx === 0 ? (
                          <Trophy
                            size={18}
                            style={{
                              color: "var(--color-primary)",
                              display: "inline",
                            }}
                          />
                        ) : (
                          `#${idx + 1}`
                        )}
                      </span>
                      <span
                        style={{
                          flex: 1,
                          fontSize: "13px",
                          fontWeight: 500,
                          color: "var(--color-text)",
                        }}
                      >
                        {entry.userName}
                      </span>
                      <span
                        style={{
                          fontSize: "13px",
                          fontWeight: 600,
                          color: "var(--color-primary)",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <Star size={14} />
                        {entry.count}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* ---- New Message Dialog ---- */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Message</DialogTitle>
            <DialogDescription>
              Start a new conversation thread.
            </DialogDescription>
          </DialogHeader>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label
                style={{
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "var(--color-text)",
                  display: "block",
                  marginBottom: "6px",
                }}
              >
                To <span style={{ color: "var(--color-destructive)" }}>*</span>
              </label>
              <div
                style={{
                  border: "1px solid var(--color-border)",
                  borderRadius: "5px",
                  maxHeight: "160px",
                  overflowY: "auto",
                  padding: "4px",
                }}
              >
                {!memberList || memberList.length === 0 ? (
                  <div
                    style={{
                      padding: "8px",
                      fontSize: "13px",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    No members available
                  </div>
                ) : (
                  memberList.map((m) => {
                    const selected = newRecipients.includes(m.id);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => toggleRecipient(m.id)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          width: "100%",
                          padding: "8px 10px",
                          border: "none",
                          borderRadius: "5px",
                          backgroundColor: selected
                            ? "var(--color-primary-light)"
                            : "transparent",
                          cursor: "pointer",
                          fontSize: "13px",
                          fontFamily: "inherit",
                          color: "var(--color-text)",
                          textAlign: "left",
                        }}
                      >
                        <div
                          style={{
                            width: "16px",
                            height: "16px",
                            borderRadius: "5px",
                            border: selected
                              ? "none"
                              : "2px solid var(--color-border)",
                            backgroundColor: selected
                              ? "var(--color-primary)"
                              : "transparent",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          {selected && (
                            <svg
                              width="10"
                              height="10"
                              viewBox="0 0 10 10"
                              fill="none"
                            >
                              <path
                                d="M2 5L4 7L8 3"
                                stroke="white"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </div>
                        <Users
                          size={14}
                          style={{
                            color: "var(--color-text-secondary)",
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ flex: 1 }}>{m.name || m.email}</span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
            <div>
              <label
                style={{
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "var(--color-text)",
                  display: "block",
                  marginBottom: "6px",
                }}
              >
                Subject (optional)
              </label>
              <Input
                placeholder="Enter message subject"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
              />
            </div>
            <div>
              <label
                style={{
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "var(--color-text)",
                  display: "block",
                  marginBottom: "6px",
                }}
              >
                Message{" "}
                <span style={{ color: "var(--color-destructive)" }}>*</span>
              </label>
              <Textarea
                placeholder="Write your message..."
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                rows={5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={
                newRecipients.length === 0 ||
                !newContent.trim() ||
                createMutation.isPending
              }
            >
              {createMutation.isPending ? "Sending..." : "Send Message"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
