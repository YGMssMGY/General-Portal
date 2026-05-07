import { useMemo, useState } from "react";
import { Badge } from "../../components/Badge";
import { ErrorState, LoadingState } from "../../components/StateViews";
import { useMessageThreads } from "../../hooks/useWorkspaceResources";
import type { MessageThread } from "../../types";
import { statusBadgeClass } from "../../utils/classes";
import { formatDateTime, sentenceCase } from "../../utils/format";

export function MessagesPage() {
  const { data, error, isLoading, refetch } = useMessageThreads();
  const [selectedId, setSelectedId] = useState<string>();
  const [contextFilter, setContextFilter] = useState<"all" | "event" | "task">("all");

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.filter((t) => contextFilter === "all" || t.context === contextFilter);
  }, [data, contextFilter]);

  const selected = useMemo<MessageThread | undefined>(() => {
    if (!filtered.length) return undefined;
    return filtered.find((t) => t.id === selectedId) ?? filtered[0];
  }, [filtered, selectedId]);

  if (isLoading) return <LoadingState />;
  if (error || !data)
    return <ErrorState message={error ?? "Messages unavailable"} onRetry={refetch} />;

  return (
    <div className="grid min-h-[calc(100vh-96px)] border border-border-subtle bg-surface lg:grid-cols-[320px_minmax(0,1fr)_260px]">
      <aside className="border-b border-border-subtle lg:border-b-0 lg:border-r">
        <div className="border-b border-border-subtle p-4">
          <h1 className="text-lg font-semibold text-text-primary font-condensed">Messages</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Conversations linked to workspace resources.
          </p>
        </div>
        <div className="flex gap-2 border-b border-border-subtle p-3">
          {(["all", "event", "task"] as const).map((f) => (
            <button
              key={f}
              type="button"
              className={`px-3 py-1 text-sm font-medium transition-colors ${
                contextFilter === f
                  ? "bg-carbon-blue-60 text-white"
                  : "text-text-secondary hover:bg-surface-hover"
              }`}
              onClick={() => setContextFilter(f)}
            >
              {f === "all" ? "All" : f === "event" ? "Events" : "Tasks"}
            </button>
          ))}
        </div>
        <div className="scrollbar-soft max-h-[600px] overflow-y-auto">
          {filtered.map((thread) => (
            <button
              key={thread.id}
              type="button"
              onClick={() => setSelectedId(thread.id)}
              className={`w-full border-b border-border-subtle p-4 text-left transition-colors border-l-[3px] ${
                selected?.id === thread.id
                  ? "border-l-border-interactive bg-surface-selected"
                  : "border-l-transparent hover:bg-surface-hover"
              }`}
            >
              <div className="mb-1 flex items-start justify-between gap-3">
                <h2 className="font-medium text-text-primary">{thread.title}</h2>
                <span className="text-xs text-text-secondary">
                  {formatDateTime(thread.updatedAt)}
                </span>
              </div>
              <p className="truncate text-sm text-text-secondary">{thread.preview}</p>
              <div className="mt-3 flex items-center justify-between">
                <Badge className={statusBadgeClass(thread.status)}>
                  {sentenceCase(thread.status)}
                </Badge>
                {thread.unreadCount > 0 ? (
                  <span className="flex h-5 min-w-5 items-center justify-center bg-carbon-blue-60 px-1.5 text-xs font-semibold text-white">
                    {thread.unreadCount}
                  </span>
                ) : null}
              </div>
            </button>
          ))}
          {filtered.length === 0 ? (
            <p className="p-4 text-sm text-text-secondary">No threads match this filter.</p>
          ) : null}
        </div>
      </aside>

      <section className="flex min-h-[500px] flex-col">
        <div className="border-b border-border-subtle p-4">
          <h2 className="text-lg font-semibold text-text-primary">{selected?.title}</h2>
          <p className="text-sm text-text-secondary">{selected?.participants.join(", ")}</p>
        </div>
        <div className="scrollbar-soft flex-1 space-y-4 overflow-y-auto p-4">
          {selected?.messages.map((msg) => (
            <div key={msg.id} className="max-w-xl border border-border-subtle bg-surface p-4">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium text-text-primary">{msg.authorName}</span>
                <span className="text-text-secondary">{formatDateTime(msg.sentAt)}</span>
              </div>
              <p className="text-sm text-text-primary">{msg.body}</p>
            </div>
          ))}
        </div>
      </section>

      <aside className="hidden border-l border-border-subtle p-4 lg:block">
        <h2 className="text-lg font-semibold text-text-primary font-condensed">Context</h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div>
            <dt className="text-text-secondary">Type</dt>
            <dd className="font-medium capitalize text-text-primary">{selected?.context}</dd>
          </div>
          <div>
            <dt className="text-text-secondary">Status</dt>
            <dd className="font-medium text-text-primary">
              {selected ? sentenceCase(selected.status) : ""}
            </dd>
          </div>
          <div>
            <dt className="text-text-secondary">Unread</dt>
            <dd className="font-medium text-text-primary">{selected?.unreadCount ?? 0}</dd>
          </div>
        </dl>
      </aside>
    </div>
  );
}
