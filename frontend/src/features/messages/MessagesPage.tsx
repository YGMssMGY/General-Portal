import { useMemo, useState, type FormEvent } from "react";
import { Badge } from "../../components/Badge";
import { Modal } from "../../components/Modal";
import { ErrorState, LoadingState } from "../../components/StateViews";
import { useMessageThreads } from "../../hooks/useWorkspaceResources";
import { workspaceApi } from "../../api/workspaceApi";
import { useAuth } from "../../context/AuthContext";
import type { MessageThread } from "../../types";
import { formatDateTime } from "../../utils/format";
import { Tag, Button, TextInput, TextArea, Select, SelectItem, Form } from "@carbon/react";
import { Add, TrashCan, Send } from "@carbon/icons-react";

export function MessagesPage() {
  const { user } = useAuth();
  const { data, error, isLoading, refetch } = useMessageThreads();
  const [selectedId, setSelectedId] = useState<string>();
  const [contextFilter, setContextFilter] = useState<"all" | "event" | "task">("all");
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<MessageThread>();
  const [composeForm, setComposeForm] = useState({
    title: "",
    context: "general" as MessageThread["context"],
    participants: "",
    body: "",
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.filter((t) => contextFilter === "all" || t.context === contextFilter);
  }, [data, contextFilter]);

  const selected = useMemo<MessageThread | undefined>(() => {
    if (!filtered.length) return undefined;
    return filtered.find((t) => t.id === selectedId) ?? filtered[0];
  }, [filtered, selectedId]);

  async function handleCompose(event: FormEvent) {
    event.preventDefault();
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
    } catch {}
  }

  async function handleReply(event: FormEvent) {
    event.preventDefault();
    if (!selected || !replyBody.trim()) return;
    try {
      await workspaceApi.replyToThread(selected.id, replyBody);
      setReplyBody("");
      refetch();
    } catch {}
  }

  async function handleArchive() {
    if (!deleteTarget) return;
    try {
      await workspaceApi.archiveThread(deleteTarget.id);
      setDeleteTarget(undefined);
      if (selectedId === deleteTarget.id) setSelectedId(undefined);
      refetch();
    } catch {}
  }

  if (isLoading) return <LoadingState />;
  if (error || !data)
    return <ErrorState message={error ?? "Messages unavailable"} onRetry={refetch} />;

  const sidebarStyle: React.CSSProperties = {
    border: "1px solid var(--cds-border-subtle)",
    background: "var(--cds-layer)",
    display: "grid",
    gridTemplateColumns: "320px 1fr 260px",
    minHeight: "calc(100vh - 10rem)",
  };

  return (
    <div style={sidebarStyle}>
      <aside style={{ borderRight: "1px solid var(--cds-border-subtle)" }}>
        <div style={{ borderBottom: "1px solid var(--cds-border-subtle)", padding: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h1 style={{ fontSize: "1.125rem", fontWeight: 600, color: "var(--cds-text-primary)" }}>
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
              marginTop: "0.25rem",
              fontSize: "0.875rem",
              color: "var(--cds-text-secondary)",
            }}
          >
            Conversations linked to workspace resources.
          </p>
        </div>
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            borderBottom: "1px solid var(--cds-border-subtle)",
            padding: "0.75rem",
          }}
        >
          {(["all", "event", "task"] as const).map((f) => (
            <Button
              key={f}
              kind={contextFilter === f ? "primary" : "ghost"}
              size="sm"
              onClick={() => setContextFilter(f)}
            >
              {f === "all" ? "All" : f === "event" ? "Events" : "Tasks"}
            </Button>
          ))}
        </div>
        <div className="scrollbar-soft" style={{ maxHeight: "600px", overflowY: "auto" }}>
          {filtered.map((thread) => (
            <button
              key={thread.id}
              type="button"
              onClick={() => setSelectedId(thread.id)}
              style={{
                width: "100%",
                borderBottom: "1px solid var(--cds-border-subtle)",
                padding: "1rem",
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
                  marginBottom: "0.25rem",
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: "0.75rem",
                }}
              >
                <h2 style={{ fontWeight: 500, color: "var(--cds-text-primary)" }}>
                  {thread.title}
                </h2>
                <span style={{ fontSize: "0.75rem", color: "var(--cds-text-secondary)" }}>
                  {formatDateTime(thread.updatedAt)}
                </span>
              </div>
              <p
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  fontSize: "0.875rem",
                  color: "var(--cds-text-secondary)",
                }}
              >
                {thread.preview}
              </p>
              <div
                style={{
                  marginTop: "0.75rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Badge>{thread.status}</Badge>
                {thread.unreadCount > 0 ? <Tag type="blue">{thread.unreadCount}</Tag> : null}
              </div>
            </button>
          ))}
          {filtered.length === 0 ? (
            <p
              style={{ padding: "1rem", fontSize: "0.875rem", color: "var(--cds-text-secondary)" }}
            >
              No threads match this filter.
            </p>
          ) : null}
        </div>
      </aside>

      <section style={{ display: "flex", flexDirection: "column", minHeight: "500px" }}>
        <div
          style={{
            borderBottom: "1px solid var(--cds-border-subtle)",
            padding: "1rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h2 style={{ fontSize: "1.125rem", fontWeight: 600, color: "var(--cds-text-primary)" }}>
              {selected?.title}
            </h2>
            <p style={{ fontSize: "0.875rem", color: "var(--cds-text-secondary)" }}>
              {selected?.participants.join(", ")}
            </p>
          </div>
          {selected ? (
            <Button
              kind="ghost"
              size="sm"
              renderIcon={TrashCan}
              iconDescription="Archive"
              hasIconOnly
              onClick={() => setDeleteTarget(selected)}
            />
          ) : null}
        </div>
        <div
          className="scrollbar-soft"
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "1rem",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
          }}
        >
          {selected?.messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                maxWidth: "36rem",
                border: "1px solid var(--cds-border-subtle)",
                padding: "1rem",
              }}
            >
              <div
                style={{
                  marginBottom: "0.5rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: "0.875rem",
                }}
              >
                <span style={{ fontWeight: 500, color: "var(--cds-text-primary)" }}>
                  {msg.authorName}
                </span>
                <span style={{ color: "var(--cds-text-secondary)" }}>
                  {formatDateTime(msg.sentAt)}
                </span>
              </div>
              <p style={{ fontSize: "0.875rem", color: "var(--cds-text-primary)" }}>{msg.body}</p>
            </div>
          ))}
          {selected ? (
            <form
              onSubmit={handleReply}
              style={{
                display: "flex",
                gap: "0.75rem",
                paddingTop: "0.5rem",
                borderTop: "1px solid var(--cds-border-subtle)",
              }}
            >
              <TextInput
                id="reply-body"
                labelText=""
                hideLabel
                placeholder="Type a reply..."
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                style={{ flex: 1 }}
              />
              <Button type="submit" renderIcon={Send} disabled={!replyBody.trim()}>
                Reply
              </Button>
            </form>
          ) : null}
        </div>
      </section>

      <aside
        style={{
          borderLeft: "1px solid var(--cds-border-subtle)",
          padding: "1rem",
          display: "block",
        }}
      >
        <h2 style={{ fontSize: "1.125rem", fontWeight: 600, color: "var(--cds-text-primary)" }}>
          Context
        </h2>
        <dl
          style={{
            marginTop: "1rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
            fontSize: "0.875rem",
          }}
        >
          <div>
            <dt style={{ color: "var(--cds-text-secondary)" }}>Type</dt>
            <dd
              style={{
                fontWeight: 500,
                textTransform: "capitalize",
                color: "var(--cds-text-primary)",
              }}
            >
              {selected?.context}
            </dd>
          </div>
          <div>
            <dt style={{ color: "var(--cds-text-secondary)" }}>Status</dt>
            <dd style={{ fontWeight: 500, color: "var(--cds-text-primary)" }}>
              {selected?.status}
            </dd>
          </div>
          <div>
            <dt style={{ color: "var(--cds-text-secondary)" }}>Unread</dt>
            <dd style={{ fontWeight: 500, color: "var(--cds-text-primary)" }}>
              {selected?.unreadCount ?? 0}
            </dd>
          </div>
        </dl>
      </aside>

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
              labelText="Recipients (comma-separated)"
              required
              value={composeForm.participants}
              onChange={(e) => setComposeForm((c) => ({ ...c, participants: e.target.value }))}
            />
            <TextArea
              id="thread-body"
              labelText="Message"
              rows={4}
              required
              value={composeForm.body}
              onChange={(e) => setComposeForm((c) => ({ ...c, body: e.target.value }))}
            />
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
