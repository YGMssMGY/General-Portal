import { useMemo, useState, useEffect, useRef, type FormEvent } from "react";
import toast from "react-hot-toast";
import { Badge } from "../../components/Badge";
import { Modal } from "../../components/Modal";
import { ErrorState, LoadingState } from "../../components/StateViews";
import { useMessageThreads } from "../../hooks/useWorkspaceResources";
import { workspaceApi } from "../../api/workspaceApi";
import { MarkdownRenderer } from "../../components/MarkdownRenderer/MarkdownRenderer";
import { EmojiPicker } from "../../components/EmojiPicker/EmojiPicker";

import type { MessageThread, UserProfile } from "../../types";
import { formatDateTime } from "../../utils/format";
import {
  Tag,
  Button,
  TextInput,
  TextArea,
  Select,
  SelectItem,
  Form,
  Grid,
  Column,
  Tile,
  Search,
} from "@carbon/react";
import { Add, Send, TrashCan, Calendar, Task, Document, FaceActivated } from "@carbon/icons-react";

function computeDateDivider(prevSentAt: string | null, currentSentAt: string): string | null {
  if (!prevSentAt) return null;
  const prev = new Date(prevSentAt);
  const curr = new Date(currentSentAt);
  if (
    prev.getFullYear() === curr.getFullYear() &&
    prev.getMonth() === curr.getMonth() &&
    prev.getDate() === curr.getDate()
  ) {
    return null;
  }
  return formatDateLabel(currentSentAt);
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  ) {
    return "Today";
  }
  if (
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate()
  ) {
    return "Yesterday";
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

const contextIcon: Record<string, any> = {
  event: Calendar,
  task: Task,
  proposal: Document,
  file: Document,
  general: Document,
};

export function MessagesPage() {
  const { data, error, isLoading, refetch } = useMessageThreads();
  const [selectedId, setSelectedId] = useState<string>();
  const [contextFilter, setContextFilter] = useState<"all" | "event" | "task" | "general">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<MessageThread>();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const replyInputRef = useRef<HTMLInputElement>(null);
  const [composeForm, setComposeForm] = useState({
    title: "",
    context: "general" as MessageThread["context"],
    participants: "",
    body: "",
  });
  const [composeError, setComposeError] = useState<string>();

  useEffect(() => {
    workspaceApi
      .getCurrentUser()
      .then(setCurrentUser)
      .catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    if (!data) return [];
    let result = data;
    if (contextFilter !== "all") {
      result = result.filter((t) => t.context === contextFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.preview.toLowerCase().includes(q) ||
          t.participants.some((p) => p.toLowerCase().includes(q)),
      );
    }
    return result;
  }, [data, contextFilter, searchQuery]);

  const selected = useMemo<MessageThread | undefined>(() => {
    if (!filtered.length) return undefined;
    return filtered.find((t) => t.id === selectedId) ?? filtered[0];
  }, [filtered, selectedId]);

  async function handleCompose(event: FormEvent) {
    event.preventDefault();
    setComposeError(undefined);
    try {
      await workspaceApi.sendMessage({
        title: composeForm.title,
        context: composeForm.context,
        participants: composeForm.participants
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        body: composeForm.body,
      });
      setComposeForm({ title: "", context: "general", participants: "", body: "" });
      setIsComposeOpen(false);
      refetch();
      toast.success("Message sent");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not send message";
      setComposeError(msg);
      toast.error(msg);
    }
  }

  async function handleReply(event: FormEvent) {
    event.preventDefault();
    if (!selected || !replyBody.trim()) return;
    try {
      await workspaceApi.replyToThread(selected.id, replyBody);
      setReplyBody("");
      refetch();
      toast.success("Reply sent");
    } catch {
      toast.error("Could not send reply");
    }
  }

  async function handleArchive() {
    if (!deleteTarget) return;
    try {
      await workspaceApi.archiveThread(deleteTarget.id);
      setDeleteTarget(undefined);
      if (selectedId === deleteTarget.id) setSelectedId(undefined);
      refetch();
      toast.success("Thread archived");
    } catch {
      toast.error("Could not archive thread");
    }
  }

  if (isLoading) return <LoadingState />;
  if (error || !data)
    return <ErrorState message={error ?? "Messages unavailable"} onRetry={refetch} />;

  return (
    <div>
      <Grid fullWidth style={{ minHeight: "calc(100vh - 10rem)" }}>
        {/* Thread List — left panel */}
        <Column lg={4} md={4} sm={4}>
          <Tile
            style={{
              height: "100%",
              padding: 0,
              display: "flex",
              flexDirection: "column",
              borderRight: "1px solid var(--cds-border-subtle)",
            }}
          >
            <div style={{ padding: "1rem", borderBottom: "1px solid var(--cds-border-subtle)" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "0.25rem",
                }}
              >
                <h1
                  style={{
                    fontSize: "1.125rem",
                    fontWeight: 600,
                    color: "var(--cds-text-primary)",
                  }}
                >
                  Messages
                </h1>
                <Button
                  kind="ghost"
                  size="sm"
                  renderIcon={Add}
                  iconDescription="Compose"
                  hasIconOnly
                  onClick={() => setIsComposeOpen(true)}
                />
              </div>
              <p
                style={{
                  fontSize: "0.75rem",
                  color: "var(--cds-text-secondary)",
                  marginBottom: "0.75rem",
                }}
              >
                Conversations linked to workspace resources.
              </p>
              <Search
                id="thread-search"
                labelText="Search threads"
                placeholder="Search threads..."
                size="sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div
              style={{
                display: "flex",
                gap: "0.25rem",
                padding: "0.5rem 0.75rem",
                borderBottom: "1px solid var(--cds-border-subtle)",
                flexWrap: "wrap",
              }}
            >
              {(["all", "event", "task", "general"] as const).map((f) => (
                <Button
                  key={f}
                  kind={contextFilter === f ? "primary" : "ghost"}
                  size="sm"
                  onClick={() => setContextFilter(f)}
                  style={{ fontSize: "0.75rem" }}
                >
                  {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1) + "s"}
                </Button>
              ))}
            </div>

            <div style={{ flex: 1, overflowY: "auto" }}>
              {filtered.map((thread) => (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(thread.id);
                    workspaceApi.markThreadRead(thread.id).catch(() => {});
                  }}
                  style={{
                    width: "100%",
                    borderBottom: "1px solid var(--cds-border-subtle)",
                    padding: "0.875rem 1rem",
                    textAlign: "left",
                    borderLeft:
                      selected?.id === thread.id
                        ? "3px solid var(--cds-border-interactive)"
                        : "3px solid transparent",
                    background:
                      selected?.id === thread.id ? "var(--cds-layer-selected)" : "transparent",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "0.75rem",
                    }}
                  >
                    <div
                      style={{
                        width: "2rem",
                        height: "2rem",
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "var(--cds-border-interactive)",
                        borderRadius: "50%",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        color: "#ffffff",
                      }}
                    >
                      {thread.title
                        .split(" ")
                        .map((w) => w[0])
                        .join("")
                        .slice(0, 2)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          justifyContent: "space-between",
                          gap: "0.5rem",
                        }}
                      >
                        <h2
                          style={{
                            fontWeight: thread.unreadCount > 0 ? 600 : 400,
                            color: "var(--cds-text-primary)",
                            fontSize: "0.875rem",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {thread.title}
                        </h2>
                        <span
                          style={{
                            fontSize: "0.6875rem",
                            color: "var(--cds-text-secondary)",
                            whiteSpace: "nowrap",
                            flexShrink: 0,
                          }}
                        >
                          {formatDateTime(thread.updatedAt)}
                        </span>
                      </div>
                      <p
                        style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          fontSize: "0.8125rem",
                          color: "var(--cds-text-secondary)",
                          marginTop: "0.125rem",
                        }}
                      >
                        {thread.preview}
                      </p>
                      <div
                        style={{
                          marginTop: "0.5rem",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                        }}
                      >
                        <Tag
                          type={
                            thread.context === "event"
                              ? "blue"
                              : thread.context === "task"
                                ? "green"
                                : "gray"
                          }
                          style={{ fontSize: "0.6875rem" }}
                        >
                          {thread.context}
                        </Tag>
                        {thread.unreadCount > 0 ? (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              minWidth: "1.25rem",
                              height: "1.25rem",
                              borderRadius: "0.625rem",
                              background: "var(--cds-button-primary)",
                              color: "#ffffff",
                              fontSize: "0.6875rem",
                              fontWeight: 600,
                              padding: "0 0.375rem",
                            }}
                          >
                            {thread.unreadCount}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
              {filtered.length === 0 ? (
                <p
                  style={{
                    padding: "2rem 1rem",
                    fontSize: "0.875rem",
                    color: "var(--cds-text-secondary)",
                    textAlign: "center",
                  }}
                >
                  No threads match this filter.
                </p>
              ) : null}
            </div>
          </Tile>
        </Column>

        {/* Conversation — middle panel */}
        <Column lg={8} md={8} sm={4}>
          <Tile
            style={{
              height: "100%",
              padding: 0,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {selected ? (
              <>
                <div
                  style={{
                    padding: "1rem",
                    borderBottom: "1px solid var(--cds-border-subtle)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <h2
                      style={{
                        fontSize: "1.125rem",
                        fontWeight: 600,
                        color: "var(--cds-text-primary)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {selected.title}
                    </h2>
                    <p
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--cds-text-secondary)",
                        marginTop: "0.125rem",
                      }}
                    >
                      {selected.participants.join(", ")}
                    </p>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      flexShrink: 0,
                      marginLeft: "0.75rem",
                    }}
                  >
                    <Badge>{selected.context}</Badge>
                    <Button
                      kind="ghost"
                      size="sm"
                      renderIcon={TrashCan}
                      iconDescription="Archive"
                      hasIconOnly
                      onClick={() => setDeleteTarget(selected)}
                    />
                  </div>
                </div>

                <div
                  style={{
                    flex: 1,
                    overflowY: "auto",
                    padding: "1rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.25rem",
                  }}
                >
                  {selected.messages.map((msg, idx) => {
                    const isMe = currentUser?.displayName === msg.authorName;
                    const divider = computeDateDivider(
                      idx > 0 ? selected.messages[idx - 1].sentAt : null,
                      msg.sentAt,
                    );
                    return (
                      <div key={msg.id}>
                        {divider ? (
                          <div
                            style={{
                              textAlign: "center",
                              margin: "1rem 0",
                              fontSize: "0.75rem",
                              color: "var(--cds-text-secondary)",
                              fontWeight: 500,
                            }}
                          >
                            <span
                              style={{
                                background: "var(--cds-layer)",
                                padding: "0.125rem 0.75rem",
                                borderRadius: "4px",
                              }}
                            >
                              {divider}
                            </span>
                          </div>
                        ) : null}
                        {idx === 0 ? (
                          <div
                            style={{
                              textAlign: "center",
                              margin: "0 0 0.75rem",
                              fontSize: "0.75rem",
                              color: "var(--cds-text-secondary)",
                              fontWeight: 500,
                            }}
                          >
                            <span
                              style={{
                                background: "var(--cds-layer)",
                                padding: "0.125rem 0.75rem",
                                borderRadius: "4px",
                              }}
                            >
                              {formatDateLabel(msg.sentAt)}
                            </span>
                          </div>
                        ) : null}
                        <div
                          style={{
                            display: "flex",
                            justifyContent: isMe ? "flex-end" : "flex-start",
                            marginBottom: "0.25rem",
                          }}
                        >
                          <div
                            style={{
                              maxWidth: "70%",
                              padding: "0.625rem 0.875rem",
                              borderRadius: "8px",
                              background: isMe ? "var(--cds-button-primary)" : "var(--cds-layer)",
                              color: isMe ? "#ffffff" : "var(--cds-text-primary)",
                              fontSize: "0.875rem",
                              lineHeight: 1.4,
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.5rem",
                                marginBottom: "0.25rem",
                                fontSize: "0.75rem",
                                opacity: 0.8,
                              }}
                            >
                              <span style={{ fontWeight: 500 }}>{msg.authorName}</span>
                            </div>
                            <MarkdownRenderer>{msg.body}</MarkdownRenderer>
                            <p
                              style={{
                                fontSize: "0.6875rem",
                                marginTop: "0.25rem",
                                opacity: 0.7,
                                textAlign: "right",
                              }}
                            >
                              {formatDateTime(msg.sentAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <form
                  onSubmit={handleReply}
                  style={{
                    display: "flex",
                    gap: "0.75rem",
                    padding: "0.75rem 1rem",
                    borderTop: "1px solid var(--cds-border-subtle)",
                    alignItems: "flex-end",
                    position: "relative",
                  }}
                >
                  <div style={{ flex: 1, display: "flex", gap: "0.5rem", alignItems: "flex-end" }}>
                    <div style={{ position: "relative" }}>
                      <Button
                        kind="ghost"
                        size="sm"
                        renderIcon={FaceActivated}
                        hasIconOnly
                        iconDescription="Emoji"
                        type="button"
                        onClick={() => setShowEmojiPicker((v) => !v)}
                      />
                      {showEmojiPicker ? (
                        <EmojiPicker
                          onSelect={(emoji) => {
                            setReplyBody((prev) => prev + emoji);
                            setShowEmojiPicker(false);
                            replyInputRef.current?.focus();
                          }}
                          onClose={() => setShowEmojiPicker(false)}
                        />
                      ) : null}
                    </div>
                    <TextInput
                      id="reply-body"
                      labelText=""
                      hideLabel
                      placeholder="Type a reply..."
                      value={replyBody}
                      ref={replyInputRef}
                      onChange={(e) => setReplyBody(e.target.value)}
                    />
                  </div>
                  <Button type="submit" renderIcon={Send} disabled={!replyBody.trim()}>
                    Send
                  </Button>
                </form>
              </>
            ) : (
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--cds-text-secondary)",
                  fontSize: "0.875rem",
                }}
              >
                Select a conversation to view messages.
              </div>
            )}
          </Tile>
        </Column>

        {/* Context Panel — right panel */}
        <Column lg={4} md={4} sm={4}>
          <Tile
            style={{
              height: "100%",
              padding: "1.25rem",
              borderLeft: "1px solid var(--cds-border-subtle)",
              overflowY: "auto",
            }}
          >
            {selected ? (
              <>
                <h2
                  style={{
                    fontSize: "1rem",
                    fontWeight: 600,
                    color: "var(--cds-text-primary)",
                    marginBottom: "1.25rem",
                  }}
                >
                  Context
                </h2>

                <div
                  style={{
                    border: "1px solid var(--cds-border-subtle)",
                    borderRadius: "4px",
                    padding: "1rem",
                    marginBottom: "1rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      marginBottom: "0.75rem",
                    }}
                  >
                    <span style={{ opacity: 0.7 }}>
                      {(() => {
                        const Icon = contextIcon[selected.context] || Document;
                        return <Icon size={20} />;
                      })()}
                    </span>
                    <span
                      style={{
                        fontWeight: 600,
                        fontSize: "0.875rem",
                        color: "var(--cds-text-primary)",
                        textTransform: "capitalize",
                      }}
                    >
                      {selected.context}
                    </span>
                  </div>
                  <dl
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.75rem",
                      fontSize: "0.8125rem",
                    }}
                  >
                    <div>
                      <dt style={{ color: "var(--cds-text-secondary)", marginBottom: "0.125rem" }}>
                        Participants
                      </dt>
                      <dd
                        style={{
                          fontWeight: 500,
                          color: "var(--cds-text-primary)",
                          lineHeight: 1.5,
                        }}
                      >
                        {selected.participants.join(", ")}
                      </dd>
                    </div>
                    <div>
                      <dt style={{ color: "var(--cds-text-secondary)", marginBottom: "0.125rem" }}>
                        Status
                      </dt>
                      <dd>
                        <Tag
                          type={
                            selected.status === "active"
                              ? "green"
                              : selected.status === "completed"
                                ? "gray"
                                : "blue"
                          }
                        >
                          {selected.status}
                        </Tag>
                      </dd>
                    </div>
                    <div>
                      <dt style={{ color: "var(--cds-text-secondary)", marginBottom: "0.125rem" }}>
                        Messages
                      </dt>
                      <dd style={{ fontWeight: 500, color: "var(--cds-text-primary)" }}>
                        {selected.messages.length}
                      </dd>
                    </div>
                    <div>
                      <dt style={{ color: "var(--cds-text-secondary)", marginBottom: "0.125rem" }}>
                        Last Activity
                      </dt>
                      <dd style={{ fontWeight: 500, color: "var(--cds-text-primary)" }}>
                        {formatDateTime(selected.updatedAt)}
                      </dd>
                    </div>
                  </dl>
                </div>

                {/* Related resource card for event/task threads */}
                {selected.context !== "general" ? (
                  <div
                    style={{
                      border: "1px solid var(--cds-border-subtle)",
                      borderRadius: "4px",
                      padding: "1rem",
                    }}
                  >
                    <h3
                      style={{
                        fontSize: "0.8125rem",
                        fontWeight: 600,
                        color: "var(--cds-text-primary)",
                        marginBottom: "0.75rem",
                      }}
                    >
                      Related Resource
                    </h3>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ opacity: 0.7 }}>
                        {(() => {
                          const Icon = contextIcon[selected.context] || Document;
                          return <Icon size={16} />;
                        })()}
                      </span>
                      <span
                        style={{
                          fontSize: "0.8125rem",
                          color: "var(--cds-text-primary)",
                          fontWeight: 500,
                        }}
                      >
                        {selected.title}
                      </span>
                    </div>
                    <p
                      style={{
                        marginTop: "0.5rem",
                        fontSize: "0.75rem",
                        color: "var(--cds-text-secondary)",
                      }}
                    >
                      This conversation is linked to a {selected.context}. Messages and updates
                      related to this resource will appear here.
                    </p>
                  </div>
                ) : null}
              </>
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  color: "var(--cds-text-secondary)",
                  fontSize: "0.875rem",
                }}
              >
                Select a thread to see context.
              </div>
            )}
          </Tile>
        </Column>
      </Grid>

      {/* Compose Modal */}
      <Modal
        title="New Thread"
        description="Start a conversation."
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
      >
        <Form onSubmit={handleCompose}>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <TextInput
              id="thread-title"
              labelText="Subject"
              required
              value={composeForm.title}
              onChange={(e) => setComposeForm((c) => ({ ...c, title: e.target.value }))}
            />
            <Select
              id="thread-context"
              labelText="Context"
              value={composeForm.context}
              onChange={(e) =>
                setComposeForm((c) => ({
                  ...c,
                  context: e.target.value as MessageThread["context"],
                }))
              }
            >
              <SelectItem value="general" text="General" />
              <SelectItem value="task" text="Task" />
              <SelectItem value="event" text="Event" />
              <SelectItem value="proposal" text="Proposal" />
              <SelectItem value="file" text="File" />
            </Select>
            <TextInput
              id="thread-recipients"
              labelText="Participants (comma-separated)"
              required
              value={composeForm.participants}
              onChange={(e) => setComposeForm((c) => ({ ...c, participants: e.target.value }))}
            />
            <TextArea
              id="thread-body"
              labelText="Initial Message"
              rows={4}
              required
              value={composeForm.body}
              onChange={(e) => setComposeForm((c) => ({ ...c, body: e.target.value }))}
            />
            {composeError ? (
              <p
                style={{
                  borderLeft: "4px solid var(--cds-support-error)",
                  backgroundColor: "var(--cds-layer)",
                  padding: "0.5rem 0.75rem",
                  fontSize: "0.875rem",
                  color: "var(--cds-support-error)",
                }}
              >
                {composeError}
              </p>
            ) : null}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <Button kind="secondary" type="button" onClick={() => setIsComposeOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" renderIcon={Send}>
                Send
              </Button>
            </div>
          </div>
        </Form>
      </Modal>

      {/* Archive Confirmation Modal */}
      <Modal
        title="Archive Thread"
        description="This will remove the thread from view."
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(undefined)}
      >
        <p style={{ marginBottom: "1rem", color: "var(--cds-text-secondary)" }}>
          Archive &quot;{deleteTarget?.title}&quot;?
        </p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
          <Button kind="secondary" onClick={() => setDeleteTarget(undefined)}>
            Cancel
          </Button>
          <Button kind="danger" onClick={handleArchive}>
            Archive
          </Button>
        </div>
      </Modal>
    </div>
  );
}
