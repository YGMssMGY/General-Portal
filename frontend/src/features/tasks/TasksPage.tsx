import { useMemo, useState, type FormEvent } from "react";
import { DataTable } from "../../components/DataTable/DataTable";
import type { ColumnDef } from "../../components/DataTable/DataTable";
import { Modal } from "../../components/Modal";
import { PageHeader } from "../../components/PageHeader";
import { ErrorState, LoadingState } from "../../components/StateViews";
import { Badge } from "../../components/Badge";
import { Button, TextInput, Select, SelectItem, Form } from "@carbon/react";
import { workspaceApi } from "../../api/workspaceApi";
import { useTasks } from "../../hooks/useWorkspaceResources";
import { useAuth } from "../../context/AuthContext";
import type { Priority, Task } from "../../types";
import { formatDate, sentenceCase } from "../../utils/format";
import { Add } from "@carbon/icons-react";

const columns: ColumnDef<Task>[] = [
  { key: "title", header: "Title", sortable: true },
  { key: "project", header: "Project", sortable: true },
  {
    key: "status",
    header: "Status",
    sortable: true,
    render: (task) => <Badge>{sentenceCase(task.status)}</Badge>,
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
        assigneeName: taskForm.assigneeName || user?.displayName || "Unassigned",
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
          <Button renderIcon={Add} onClick={() => setIsTaskModalOpen(true)}>
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
        title="Add Task"
        description="Create a task in the workspace."
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
      >
        <Form onSubmit={handleCreateTask}>
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
              <TextInput
                id="task-assignee"
                labelText="Assignee"
                value={taskForm.assigneeName}
                onChange={(e) => setTaskForm((c) => ({ ...c, assigneeName: e.target.value }))}
                placeholder={user?.displayName}
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
                  backgroundColor: "#fff1f1",
                  padding: "0.5rem 0.75rem",
                  fontSize: "0.875rem",
                  color: "#a2191f",
                }}
              >
                {createError}
              </p>
            ) : null}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <Button kind="secondary" type="button" onClick={() => setIsTaskModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? "Creating..." : "Create Task"}
              </Button>
            </div>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
