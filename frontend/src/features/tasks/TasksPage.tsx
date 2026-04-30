import { CalendarDays, Folder, ListTodo, Plus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Badge } from "../../components/Badge";
import { Card } from "../../components/Card";
import { Modal } from "../../components/Modal";
import { PageHeader } from "../../components/PageHeader";
import { ErrorState, LoadingState } from "../../components/StateViews";
import { workspaceApi } from "../../api/workspaceApi";
import { useTasks } from "../../hooks/useWorkspaceResources";
import type { Priority, Task, TaskStatus } from "../../types";
import { priorityBadgeClass, progressWidthClass } from "../../utils/classes";
import { formatDate, sentenceCase } from "../../utils/format";

const columns: Array<{ status: TaskStatus; label: string; dot: string }> = [
  { status: "todo", label: "To Do", dot: "bg-surface-container-high" },
  { status: "in_progress", label: "In Progress", dot: "bg-primary" },
  { status: "blocked", label: "Blocked", dot: "bg-error" }
];

function TaskCard({ task }: { task: Task }) {
  return (
    <Card className={`p-5 ${task.status === "in_progress" ? "border-primary" : ""}`}>
      <div className="mb-4 flex items-center justify-between">
        <Badge className={priorityBadgeClass(task.priority)}>{task.priority}</Badge>
        {task.status === "blocked" ? <span className="text-xs font-semibold text-error">Blocked</span> : null}
      </div>
      <h3 className={`text-base font-medium text-on-surface ${task.status === "blocked" ? "line-through text-on-surface-variant" : ""}`}>
        {task.title}
      </h3>
      <div className="mt-3 flex items-center gap-2 text-sm text-on-surface-variant">
        <Folder className="h-4 w-4" aria-hidden="true" />
        {task.project}
      </div>
      {task.status === "in_progress" ? (
        <div className="mt-5">
          <div className="h-2 rounded-full bg-surface-container-high">
            <div className={`h-2 rounded-full bg-primary ${progressWidthClass(task.progress)}`} />
          </div>
          <p className="mt-2 text-right text-xs font-medium text-on-surface-variant">{task.progress}%</p>
        </div>
      ) : null}
      <div className="mt-5 border-t border-outline-variant pt-4">
        {task.blockedReason ? (
          <p className="rounded border border-error-container bg-error-container/30 px-3 py-2 text-sm text-on-error-container">
            {task.blockedReason}
          </p>
        ) : (
          <div className="flex items-center justify-between text-sm text-on-surface-variant">
            <span className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" aria-hidden="true" />
              {formatDate(task.dueDate)}
            </span>
            <span className="rounded-full bg-secondary-fixed px-2 py-1 text-xs font-bold text-secondary">
              {task.assigneeName
                .split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)}
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}

export function TasksPage() {
  const { data, error, isLoading, refetch } = useTasks();
  const [viewMode, setViewMode] = useState<"board" | "list">("board");
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string>();
  const [taskForm, setTaskForm] = useState({
    title: "",
    priority: "normal" as Priority,
    project: "",
    dueDate: new Date().toISOString().slice(0, 10),
    assigneeName: ""
  });

  async function handleCreateTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateError(undefined);
    setIsCreating(true);

    try {
      await workspaceApi.createTask(taskForm);
      setTaskForm({
        title: "",
        priority: "normal",
        project: "",
        dueDate: new Date().toISOString().slice(0, 10),
        assigneeName: ""
      });
      setIsTaskModalOpen(false);
      refetch();
    } catch (unknownError) {
      setCreateError(unknownError instanceof Error ? unknownError.message : "Could not create task");
    } finally {
      setIsCreating(false);
    }
  }

  if (isLoading) return <LoadingState />;
  if (error || !data) return <ErrorState message={error ?? "Tasks are unavailable"} onRetry={refetch} />;

  return (
    <div>
      <PageHeader
        title="Tasks"
        description="Assign work, track progress, and keep every responsibility visible."
        actions={
          <>
            <div className="flex h-10 rounded-lg border border-outline-variant bg-surface-container-high p-1">
              <button
                type="button"
                className={`flex items-center gap-2 rounded px-3 text-sm font-semibold ${
                  viewMode === "board" ? "bg-white text-on-surface shadow-panel" : "text-on-surface-variant hover:text-on-surface"
                }`}
                onClick={() => setViewMode("board")}
              >
                <ListTodo className="h-4 w-4" aria-hidden="true" />
                Board
              </button>
              <button
                type="button"
                className={`px-3 text-sm font-semibold ${
                  viewMode === "list" ? "rounded bg-white text-on-surface shadow-panel" : "text-on-surface-variant hover:text-on-surface"
                }`}
                onClick={() => setViewMode("list")}
              >
                List
              </button>
            </div>
            <button
              type="button"
              className="flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary hover:bg-primary-container"
              onClick={() => setIsTaskModalOpen(true)}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add Task
            </button>
          </>
        }
      />

      {viewMode === "board" ? (
        <div className="scrollbar-soft flex gap-6 overflow-x-auto pb-4">
          {columns.map((column) => {
            const tasks = data.filter((task) => task.status === column.status);
            return (
              <section key={column.status} className="w-80 shrink-0">
                <div className="mb-4 flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${column.dot}`} />
                    <h2 className="text-sm font-semibold uppercase tracking-normal text-on-surface">{column.label}</h2>
                  </div>
                  <span className="rounded-full bg-surface-container-high px-3 py-1 text-sm font-semibold text-on-surface">
                    {tasks.length}
                  </span>
                </div>
                <div className="space-y-4">
                  {tasks.map((task) => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                  {column.status === "todo" ? (
                    <button
                      type="button"
                      className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-outline-variant py-4 text-sm font-medium text-on-surface-variant hover:bg-surface-container-low"
                      onClick={() => setIsTaskModalOpen(true)}
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      Add Task
                    </button>
                  ) : null}
                </div>
              </section>
            );
          })}
          <section className="w-80 shrink-0">
            <div className="mb-4 px-1">
              <h2 className="text-sm font-semibold uppercase tracking-normal text-on-surface-variant">Done</h2>
            </div>
            <Card className="p-5 text-sm text-on-surface-variant">Completed work is archived after review.</Card>
          </section>
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-outline-variant bg-surface-container-low text-xs uppercase tracking-normal text-on-surface-variant">
                <tr>
                  <th className="px-4 py-3 font-semibold">Task</th>
                  <th className="px-4 py-3 font-semibold">Project</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Priority</th>
                  <th className="px-4 py-3 font-semibold">Due</th>
                  <th className="px-4 py-3 font-semibold">Assignee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {data.map((task) => (
                  <tr key={task.id} className="hover:bg-surface-container-low/60">
                    <td className="px-4 py-3 font-semibold text-on-surface">{task.title}</td>
                    <td className="px-4 py-3 text-on-surface-variant">{task.project}</td>
                    <td className="px-4 py-3 text-on-surface-variant">{sentenceCase(task.status)}</td>
                    <td className="px-4 py-3">
                      <Badge className={priorityBadgeClass(task.priority)}>{task.priority}</Badge>
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant">{formatDate(task.dueDate)}</td>
                    <td className="px-4 py-3 text-on-surface-variant">{task.assigneeName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <p className="mt-4 text-xs text-on-surface-variant">Statuses: {columns.map((column) => sentenceCase(column.status)).join(", ")}</p>

      <Modal
        title="Add Task"
        description="Create a task in the workspace board."
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
      >
        <form className="grid gap-4" onSubmit={handleCreateTask}>
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-on-surface">Title</span>
            <input
              required
              className="rounded-lg border border-outline-variant px-4 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              value={taskForm.title}
              onChange={(event) => setTaskForm((current) => ({ ...current, title: event.target.value }))}
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-on-surface">Project</span>
              <input
                required
                className="rounded-lg border border-outline-variant px-4 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                value={taskForm.project}
                onChange={(event) => setTaskForm((current) => ({ ...current, project: event.target.value }))}
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-on-surface">Assignee</span>
              <input
                required
                className="rounded-lg border border-outline-variant px-4 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                value={taskForm.assigneeName}
                onChange={(event) => setTaskForm((current) => ({ ...current, assigneeName: event.target.value }))}
              />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-on-surface">Due date</span>
              <input
                required
                type="date"
                className="rounded-lg border border-outline-variant px-4 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                value={taskForm.dueDate}
                onChange={(event) => setTaskForm((current) => ({ ...current, dueDate: event.target.value }))}
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-on-surface">Priority</span>
              <select
                className="rounded-lg border border-outline-variant px-4 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                value={taskForm.priority}
                onChange={(event) => setTaskForm((current) => ({ ...current, priority: event.target.value as Priority }))}
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>
          </div>
          {createError ? <p className="rounded border border-error-container bg-error-container/30 px-3 py-2 text-sm text-on-error-container">{createError}</p> : null}
          <div className="flex justify-end gap-3">
            <button type="button" className="rounded-lg border border-outline-variant px-4 py-2 text-sm font-semibold" onClick={() => setIsTaskModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" disabled={isCreating} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary disabled:opacity-60">
              {isCreating ? "Creating..." : "Create Task"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
