import { useMemo, useState, type FormEvent } from "react";
import { DataTable } from "../../components/DataTable/DataTable";
import type { ColumnDef } from "../../components/DataTable/DataTable";
import { Modal } from "../../components/Modal";
import { PageHeader } from "../../components/PageHeader";
import { ErrorState, LoadingState } from "../../components/StateViews";
import { Badge } from "../../components/Badge";
import { Button, TextInput, Select, SelectItem, Form, FilterableMultiSelect } from "@carbon/react";
import { workspaceApi } from "../../api/workspaceApi";
import { useTasks } from "../../hooks/useWorkspaceResources";
import { useAuth } from "../../context/AuthContext";
import type { Priority, Task, TaskStatus } from "../../types";
import { formatDate } from "../../utils/format";
import { Add, Edit, TrashCan } from "@carbon/icons-react";

export function TasksPage() {
  const { data, error, isLoading, refetch } = useTasks();
  const { user } = useAuth();
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task>();
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string>();
  const [deleteTarget, setDeleteTarget] = useState<Task>();
  const [isDeleting, setIsDeleting] = useState(false);
  const memberOptions = [
    "Chris Rivera",
    "Sarah Jenkins",
    "Maya Chen",
    "Jordan Diaz",
    "Dev Admin",
  ].map((n) => ({ id: n, label: n }));
  const [taskForm, setTaskForm] = useState({
    title: "",
    priority: "normal" as Priority,
    project: "",
    dueDate: new Date().toISOString().slice(0, 10),
    assigneeName: "",
  });

  const columns: ColumnDef<Task>[] = useMemo(
    () => [
      { key: "title", header: "Title", sortable: true },
      { key: "project", header: "Project", sortable: true },
      {
        key: "status",
        header: "Status",
        sortable: true,
        render: (task) => (
          <Select
            id={`status-${task.id}`}
            labelText=""
            hideLabel
            size="sm"
            value={task.status}
            onChange={async (e) => {
              const newStatus = e.target.value as TaskStatus;
              try {
                await workspaceApi.updateTask(task.id, { status: newStatus });
                refetch();
              } catch {
                /* silently fail */
              }
            }}
          >
            <SelectItem value="todo" text="Todo" />
            <SelectItem value="in_progress" text="In Progress" />
            <SelectItem value="blocked" text="Blocked" />
            <SelectItem value="done" text="Done" />
          </Select>
        ),
      },
      {
        key: "priority",
        header: "Priority",
        sortable: true,
        render: (task) => <Badge>{task.priority}</Badge>,
      },
      {
        key: "dueDate",
        header: "Due Date",
        sortable: true,
        render: (task) => formatDate(task.dueDate),
      },
      { key: "assigneeName", header: "Assignee", sortable: true },
      {
        key: "actions",
        header: "",
        render: (task) => (
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <Button
              kind="ghost"
              size="sm"
              renderIcon={Edit}
              iconDescription="Edit"
              hasIconOnly
              onClick={() => {
                setEditingTask(task);
                setTaskForm({
                  title: task.title,
                  priority: task.priority,
                  project: task.project,
                  dueDate: task.dueDate?.slice(0, 10) ?? "",
                  assigneeName: task.assigneeName,
                });
                setIsTaskModalOpen(true);
              }}
            />
            <Button
              kind="ghost"
              size="sm"
              renderIcon={TrashCan}
              iconDescription="Delete"
              hasIconOnly
              onClick={() => setDeleteTarget(task)}
            />
          </div>
        ),
      },
    ],
    [refetch],
  );

  function openCreateModal() {
    setEditingTask(undefined);
    setTaskForm({
      title: "",
      priority: "normal",
      project: "",
      dueDate: new Date().toISOString().slice(0, 10),
      assigneeName: "",
    });
    setIsTaskModalOpen(true);
  }

  async function handleSaveTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateError(undefined);
    setIsCreating(true);
    try {
      const payload = {
        ...taskForm,
        assigneeName: taskForm.assigneeName || user?.displayName || "Unassigned",
      };
      if (editingTask) {
        await workspaceApi.updateTask(editingTask.id, payload);
      } else {
        await workspaceApi.createTask(payload);
      }
      setIsTaskModalOpen(false);
      setEditingTask(undefined);
      refetch();
    } catch (unknownError) {
      setCreateError(unknownError instanceof Error ? unknownError.message : "Could not save task");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleDeleteTask() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await workspaceApi.deleteTask(deleteTarget.id);
      setDeleteTarget(undefined);
      refetch();
    } catch (unknownError) {
      setCreateError(
        unknownError instanceof Error ? unknownError.message : "Could not delete task",
      );
    } finally {
      setIsDeleting(false);
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
          <Button renderIcon={Add} onClick={openCreateModal}>
            Add Task
          </Button>
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
        title={editingTask ? "Edit Task" : "Add Task"}
        description={editingTask ? "Update task details." : "Create a task in the workspace."}
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setEditingTask(undefined);
        }}
      >
        <Form onSubmit={handleSaveTask}>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <TextInput
              id="task-title"
              labelText="Title"
              required
              value={taskForm.title}
              onChange={(e) => setTaskForm((c) => ({ ...c, title: e.target.value }))}
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <TextInput
                id="task-project"
                labelText="Project"
                required
                value={taskForm.project}
                onChange={(e) => setTaskForm((c) => ({ ...c, project: e.target.value }))}
              />
              <FilterableMultiSelect
                id="task-assignee"
                titleText="Assignee"
                placeholder="Search members..."
                items={memberOptions}
                initialSelectedItems={
                  taskForm.assigneeName
                    ? taskForm.assigneeName.split(", ").map((n) => ({ id: n, label: n }))
                    : []
                }
                onChange={({ selectedItems }: any) =>
                  setTaskForm((c) => ({
                    ...c,
                    assigneeName: selectedItems.map((s: any) => s.label).join(", "),
                  }))
                }
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <TextInput
                id="task-due-date"
                labelText="Due date"
                type="date"
                required
                value={taskForm.dueDate}
                onChange={(e) => setTaskForm((c) => ({ ...c, dueDate: e.target.value }))}
              />
              <Select
                id="task-priority"
                labelText="Priority"
                value={taskForm.priority}
                onChange={(e) =>
                  setTaskForm((c) => ({ ...c, priority: e.target.value as Priority }))
                }
              >
                <SelectItem value="low" text="Low" />
                <SelectItem value="normal" text="Normal" />
                <SelectItem value="medium" text="Medium" />
                <SelectItem value="high" text="High" />
              </Select>
            </div>
            {createError ? (
              <p
                style={{
                  borderLeft: "4px solid var(--cds-support-error)",
                  backgroundColor: "var(--cds-layer)",
                  padding: "0.5rem 0.75rem",
                  fontSize: "0.875rem",
                  color: "var(--cds-support-error)",
                }}
              >
                {createError}
              </p>
            ) : null}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <Button
                kind="secondary"
                type="button"
                onClick={() => {
                  setIsTaskModalOpen(false);
                  setEditingTask(undefined);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? "Saving..." : editingTask ? "Save Changes" : "Create Task"}
              </Button>
            </div>
          </div>
        </Form>
      </Modal>

      <Modal
        title="Delete Task"
        description="This action cannot be undone."
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(undefined)}
      >
        <p style={{ marginBottom: "1rem", color: "var(--cds-text-secondary)" }}>
          Are you sure you want to delete &quot;{deleteTarget?.title}&quot;?
        </p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
          <Button kind="secondary" onClick={() => setDeleteTarget(undefined)}>
            Cancel
          </Button>
          <Button kind="danger" onClick={handleDeleteTask} disabled={isDeleting}>
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
