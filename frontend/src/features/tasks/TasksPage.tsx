import { useMemo, useState, type FormEvent } from "react";
import { DataTable } from "../../components/DataTable/DataTable";
import type { ColumnDef } from "../../components/DataTable/DataTable";
import { Modal } from "../../components/Modal";
import { PageHeader } from "../../components/PageHeader";
import { ErrorState, LoadingState } from "../../components/StateViews";
import { Badge } from "../../components/Badge";
import { workspaceApi } from "../../api/workspaceApi";
import { useTasks } from "../../hooks/useWorkspaceResources";
import { useAuth } from "../../context/AuthContext";
import type { Priority, Task } from "../../types";
import { priorityBadgeClass } from "../../utils/classes";
import { formatDate, sentenceCase } from "../../utils/format";
import { Add } from "@carbon/icons-react";

const columns: ColumnDef<Task>[] = [
  { key: "title", header: "Title", sortable: true },
  { key: "project", header: "Project", sortable: true },
  {
    key: "status",
    header: "Status",
    sortable: true,
    render: (task) => (
      <Badge
        className={
          task.status === "in_progress"
            ? "border-carbon-blue-30 bg-carbon-blue-10 text-carbon-blue-60"
            : task.status === "blocked"
              ? "border-carbon-red-30 bg-carbon-red-10 text-carbon-red-60"
              : task.status === "done"
                ? "border-carbon-green-30 bg-carbon-green-10 text-carbon-green-60"
                : "border-border-subtle bg-surface text-text-secondary"
        }
      >
        {sentenceCase(task.status)}
      </Badge>
    ),
  },
  {
    key: "priority",
    header: "Priority",
    sortable: true,
    render: (task) => <Badge className={priorityBadgeClass(task.priority)}>{task.priority}</Badge>,
  },
  {
    key: "dueDate",
    header: "Due Date",
    sortable: true,
    render: (task) => formatDate(task.dueDate),
  },
  { key: "assigneeName", header: "Assignee", sortable: true },
];

export function TasksPage() {
  const { data, error, isLoading, refetch } = useTasks();
  const { user } = useAuth();
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string>();
  const [taskForm, setTaskForm] = useState({
    title: "",
    priority: "normal" as Priority,
    project: "",
    dueDate: new Date().toISOString().slice(0, 10),
    assigneeName: "",
  });

  async function handleCreateTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateError(undefined);
    setIsCreating(true);
    try {
      await workspaceApi.createTask({
        ...taskForm,
        assigneeName: taskForm.assigneeName || user?.name || "Unassigned",
      });
      setTaskForm({
        title: "",
        priority: "normal",
        project: "",
        dueDate: new Date().toISOString().slice(0, 10),
        assigneeName: "",
      });
      setIsTaskModalOpen(false);
      refetch();
    } catch (unknownError) {
      setCreateError(
        unknownError instanceof Error ? unknownError.message : "Could not create task",
      );
    } finally {
      setIsCreating(false);
    }
  }

  if (isLoading) return <LoadingState />;
  if (error || !data)
    return <ErrorState message={error ?? "Tasks are unavailable"} onRetry={refetch} />;

  return (
    <div>
      <PageHeader
        title="Tasks"
        description="Assign work, track progress, and keep every responsibility visible."
        actions={
          <button
            type="button"
            className="flex h-9 items-center gap-2 border border-border-interactive bg-carbon-blue-60 px-4 text-sm font-medium text-white hover:bg-carbon-blue-70 transition-colors"
            onClick={() => setIsTaskModalOpen(true)}
          >
            <Add size={16} aria-hidden="true" />
            Add Task
          </button>
        }
      />

      <DataTable
        columns={columns}
        data={data as unknown as Record<string, unknown>[]}
        selectable
        defaultSort={{ key: "dueDate", direction: "asc" }}
        pageSize={10}
      />

      <Modal
        title="Add Task"
        description="Create a task in the workspace."
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
      >
        <form className="grid gap-4" onSubmit={handleCreateTask}>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-text-primary">Title</span>
            <input
              required
              className="border border-border-subtle bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-border-interactive focus:ring-1 focus:ring-border-interactive"
              value={taskForm.title}
              onChange={(e) => setTaskForm((c) => ({ ...c, title: e.target.value }))}
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-text-primary">Project</span>
              <input
                required
                className="border border-border-subtle bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-border-interactive focus:ring-1 focus:ring-border-interactive"
                value={taskForm.project}
                onChange={(e) => setTaskForm((c) => ({ ...c, project: e.target.value }))}
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-text-primary">Assignee</span>
              <input
                className="border border-border-subtle bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-border-interactive focus:ring-1 focus:ring-border-interactive"
                value={taskForm.assigneeName}
                onChange={(e) => setTaskForm((c) => ({ ...c, assigneeName: e.target.value }))}
                placeholder={user?.name}
              />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-text-primary">Due date</span>
              <input
                required
                type="date"
                className="border border-border-subtle bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-border-interactive focus:ring-1 focus:ring-border-interactive"
                value={taskForm.dueDate}
                onChange={(e) => setTaskForm((c) => ({ ...c, dueDate: e.target.value }))}
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-text-primary">Priority</span>
              <select
                className="border border-border-subtle bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-border-interactive focus:ring-1 focus:ring-border-interactive"
                value={taskForm.priority}
                onChange={(e) =>
                  setTaskForm((c) => ({ ...c, priority: e.target.value as Priority }))
                }
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>
          </div>
          {createError ? (
            <p className="border-l-4 border-danger bg-carbon-red-10 px-3 py-2 text-sm text-carbon-red-70">
              {createError}
            </p>
          ) : null}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              className="border border-border-subtle px-4 py-2 text-sm font-medium text-text-primary hover:bg-surface-hover transition-colors"
              onClick={() => setIsTaskModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className="bg-carbon-blue-60 px-4 py-2 text-sm font-medium text-white hover:bg-carbon-blue-70 disabled:opacity-60 transition-colors"
            >
              {isCreating ? "Creating..." : "Create Task"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
