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

  const filteredThreads = useMemo(() => {
    if (!data) return [];
    return data.filter((thread) => contextFilter === "all" || thread.context === contextFilter);
  }, [data, contextFilter]);

  const selectedThread = useMemo<MessageThread | undefined>(() => {
    if (!filteredThreads.length) return undefined;
    return filteredThreads.find((thread) => thread.id === selectedId) ?? filteredThreads[0];
  }, [filteredThreads, selectedId]);

  if (isLoading) return <LoadingState />;
  if (error || !data) return <ErrorState message={error ?? "Messages are unavailable"} onRetry={refetch} />;

  const filterButtonClass = (filter: "all" | "event" | "task") =>
    `rounded-full px-3 py-1 ${
      contextFilter === filter
        ? "bg-primary-container text-on-primary-container"
        : "text-on-surface-variant hover:bg-surface-container"
    }`;

  return (
    <div className="grid min-h-[calc(100vh-112px)] overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest lg:grid-cols-[320px_minmax(0,1fr)_280px]">
      <aside className="border-b border-outline-variant lg:border-b-0 lg:border-r">
        <div className="border-b border-outline-variant p-4">
          <h1 className="font-display text-xl font-semibold text-on-surface">Messages</h1>
          <p className="mt-1 text-sm text-on-surface-variant">Keep conversations attached to tasks, proposals, events, and files.</p>
        </div>
        <div className="flex gap-2 border-b border-outline-variant bg-surface p-3 text-sm font-semibold">
          <button type="button" className={filterButtonClass("all")} onClick={() => setContextFilter("all")}>All</button>
          <button type="button" className={filterButtonClass("event")} onClick={() => setContextFilter("event")}>Events</button>
          <button type="button" className={filterButtonClass("task")} onClick={() => setContextFilter("task")}>Tasks</button>
        </div>
        <div className="scrollbar-soft max-h-[620px] overflow-y-auto">
          {filteredThreads.map((thread) => (
            <button
              key={thread.id}
              type="button"
              onClick={() => setSelectedId(thread.id)}
              className={`w-full border-b border-outline-variant p-4 text-left transition hover:bg-surface-container ${
                selectedThread?.id === thread.id ? "border-l-[3px] border-l-primary bg-surface-container-low" : "border-l-[3px] border-l-transparent"
              }`}
            >
              <div className="mb-1 flex items-start justify-between gap-3">
                <h2 className="font-semibold text-on-surface">{thread.title}</h2>
                <span className="text-xs text-on-surface-variant">{formatDateTime(thread.updatedAt)}</span>
              </div>
              <p className="truncate text-sm text-on-surface-variant">{thread.preview}</p>
              <div className="mt-3 flex items-center justify-between">
                <Badge className={statusBadgeClass(thread.status)}>{sentenceCase(thread.status)}</Badge>
                {thread.unreadCount > 0 ? (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-error px-1 text-xs font-bold text-on-error">
                    {thread.unreadCount}
                  </span>
                ) : null}
              </div>
            </button>
          ))}
          {filteredThreads.length === 0 ? (
            <p className="p-4 text-sm text-on-surface-variant">No threads match this filter.</p>
          ) : null}
        </div>
      </aside>

      <section className="flex min-h-[520px] flex-col">
        <div className="border-b border-outline-variant p-4">
          <h2 className="font-display text-lg font-semibold text-on-surface">{selectedThread?.title}</h2>
          <p className="text-sm text-on-surface-variant">{selectedThread?.participants.join(", ")}</p>
        </div>
        <div className="scrollbar-soft flex-1 space-y-4 overflow-y-auto bg-surface p-5">
          {selectedThread?.messages.map((message) => (
            <div key={message.id} className="max-w-xl rounded-lg border border-outline-variant bg-white p-4 shadow-panel">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-semibold text-on-surface">{message.authorName}</span>
                <span className="text-on-surface-variant">{formatDateTime(message.sentAt)}</span>
              </div>
              <p className="text-sm leading-6 text-on-surface">{message.body}</p>
            </div>
          ))}
        </div>
      </section>

      <aside className="hidden border-l border-outline-variant bg-white p-4 lg:block">
        <h2 className="font-display text-lg font-semibold text-on-surface">Thread Context</h2>
        <dl className="mt-4 space-y-4 text-sm">
          <div>
            <dt className="text-on-surface-variant">Type</dt>
            <dd className="font-semibold capitalize text-on-surface">{selectedThread?.context}</dd>
          </div>
          <div>
            <dt className="text-on-surface-variant">Status</dt>
            <dd className="font-semibold text-on-surface">{selectedThread ? sentenceCase(selectedThread.status) : ""}</dd>
          </div>
          <div>
            <dt className="text-on-surface-variant">Unread</dt>
            <dd className="font-semibold text-on-surface">{selectedThread?.unreadCount ?? 0}</dd>
          </div>
        </dl>
      </aside>
    </div>
  );
}
