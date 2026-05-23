"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import {
  MessageSquare,
  Plus,
  Send,
  ChevronLeft,
  Mail,
  MailOpen,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

function getPortal(): string {
  if (typeof window === "undefined") return "developers";
  return document.cookie.match(/(?:^|;\s*)portal=([^;]*)/)?.[1] ?? "developers";
}

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

export default function MessagesPage() {
  const portal = getPortal();
  const queryClient = useQueryClient();
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [showMobileThread, setShowMobileThread] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newContent, setNewContent] = useState("");
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

  const createMutation = useMutation({
    mutationFn: (body: { subject: string; content: string }) =>
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

  function handleCreate() {
    if (!newSubject.trim() || !newContent.trim()) return;
    createMutation.mutate({ subject: newSubject.trim(), content: newContent.trim() });
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

  const threadList = threads ?? [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: 700, color: "var(--color-text)", margin: 0 }}>Messages</h1>
          <p style={{ fontSize: "14px", color: "var(--color-text-secondary)", margin: "4px 0 0" }}>
            Internal messaging
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus size={16} />
          <span>New Message</span>
        </Button>
      </div>

      <div
        className="lg:grid lg:grid-cols-[320px_1fr]"
        style={{
          flex: 1,
          gap: "0",
          border: "1px solid var(--color-border)",
          borderRadius: "5px",
          overflow: "hidden",
          minHeight: "500px",
        }}
      >
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
            {threadList.length} conversation{threadList.length !== 1 ? "s" : ""}
          </div>

          <div style={{ flex: 1, overflowY: "auto" }}>
            {threadsLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={{ padding: "12px", borderBottom: "1px solid var(--color-border)" }}>
                  <Skeleton style={{ width: "60%", height: "14px", borderRadius: "5px", marginBottom: "8px" }} />
                  <Skeleton style={{ width: "80%", height: "12px", borderRadius: "5px" }} />
                </div>
              ))
            ) : threadList.length === 0 ? (
              <div style={{ padding: "24px", textAlign: "center" }}>
                <Mail size={24} style={{ color: "var(--color-text-secondary)", marginBottom: "8px" }} />
                <p style={{ fontSize: "13px", color: "var(--color-text-secondary)", margin: 0 }}>
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
                        e.currentTarget.style.backgroundColor = "var(--color-bg-secondary)";
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
                        backgroundColor: thread.unreadCount > 0 ? "var(--color-primary)" : "transparent",
                        flexShrink: 0,
                        marginTop: "6px",
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
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
                        <span style={{ fontSize: "11px", color: "var(--color-text-secondary)", flexShrink: 0, marginLeft: "8px" }}>
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
              <MessageSquare size={32} style={{ color: "var(--color-text-secondary)", marginBottom: "12px" }} />
              <p style={{ fontSize: "14px", fontWeight: 500, color: "var(--color-text)", margin: "0 0 4px" }}>
                Select a conversation
              </p>
              <p style={{ fontSize: "13px", color: "var(--color-text-secondary)", margin: 0 }}>
                Choose a thread from the left to view messages
              </p>
            </div>
          ) : detailLoading ? (
            <div style={{ padding: "20px" }}>
              <Skeleton style={{ width: "40%", height: "18px", borderRadius: "5px", marginBottom: "20px" }} />
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
                  <Skeleton style={{ width: "28px", height: "28px", borderRadius: "5px", flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <Skeleton style={{ width: "30%", height: "12px", borderRadius: "5px", marginBottom: "6px" }} />
                    <Skeleton style={{ width: "60%", height: "14px", borderRadius: "5px" }} />
                  </div>
                </div>
              ))}
            </div>
          ) : !threadDetail ? (
            <div style={{ textAlign: "center", padding: "48px 24px" }}>
              <p style={{ fontSize: "14px", color: "var(--color-destructive)", margin: 0 }}>
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
                  }}
                >
                  {threadDetail.subject}
                </h2>
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
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                        <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-text)" }}>
                          {msg.sender?.name ?? "Unknown"}
                        </span>
                        <span style={{ fontSize: "11px", color: "var(--color-text-secondary)" }}>
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
              <label style={{ fontSize: "13px", fontWeight: 500, color: "var(--color-text)", display: "block", marginBottom: "6px" }}>
                Subject
              </label>
              <Input
                placeholder="Enter message subject"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
              />
            </div>
            <div>
              <label style={{ fontSize: "13px", fontWeight: 500, color: "var(--color-text)", display: "block", marginBottom: "6px" }}>
                Message
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
              disabled={!newSubject.trim() || !newContent.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? "Sending..." : "Send Message"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
