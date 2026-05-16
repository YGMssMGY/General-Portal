import { useMemo, useState, useEffect, useCallback, type FormEvent } from "react";
import { DataTable } from "../../components/DataTable/DataTable";
import type { ColumnDef } from "../../components/DataTable/DataTable";
import { Modal } from "../../components/Modal";
import { PageHeader } from "../../components/PageHeader";
import { ErrorState, LoadingState } from "../../components/StateViews";
import { Badge } from "../../components/Badge";
import {
  Button,
  TextInput,
  Select,
  SelectItem,
  Form,
  Search,
  FilterableMultiSelect,
  InlineNotification,
  Stack,
  Tag,
  Tile,
  Grid,
  Column,
} from "@carbon/react";
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { workspaceApi } from "../../api/workspaceApi";
import { useTasks } from "../../hooks/useWorkspaceResources";
import { useAuth } from "../../context/AuthContext";
import type { Priority, Task, TaskStatus, Member } from "../../types";
import { formatDate } from "../../utils/format";
import {
  Add,
  Edit,
  TrashCan,
  Close,
  Calendar,
  Folder,
  CheckboxChecked,
  Chat,
  Attachment,
  Locked,
  View,
  Menu,
} from "@carbon/icons-react";

/* ---------- Kanban sub-components ---------- */

const columnMeta: Record<TaskStatus, { title: string; dotColor: string }> = {
  todo: { title: "To Do", dotColor: "var(--cds-text-secondary)" },
  in_progress: { title: "In Progress", dotColor: "var(--cds-interactive)" },
  blocked: { title: "Blocked", dotColor: "var(--cds-support-error)" },
  done: { title: "Done", dotColor: "var(--cds-support-success)" },
};

const priorityLabel: Record<Priority, string> = {
  high: "High",
  medium: "Medium",
  normal: "Normal",
  low: "Low",
};

const statusOrder: TaskStatus[] = ["todo", "in_progress", "blocked", "done"];

function KanbanCard({ task, onClick }: { task: Task; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { status: task.status },
  });

  const style: React.CSSProperties = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.4 : 1,
      }
    : {};

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={style}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick();
      }}
    >
      <Tile style={{ padding: "1rem", cursor: "pointer", marginBottom: "0.75rem" }}>
        <Stack gap={3}>
          <div
            style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}
          >
            <Tag
              type={
                task.priority === "high"
                  ? "red"
                  : task.priority === "medium"
                    ? "warm-gray"
                    : "outline"
              }
            >
              {priorityLabel[task.priority]}
            </Tag>
          </div>
          <p className="cds--type-body-02" style={{ fontWeight: 500, margin: 0 }}>
            {task.title}
          </p>
          {task.project ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.25rem",
                color: "var(--cds-text-secondary)",
              }}
            >
              <Folder size={14} />
              <span className="cds--type-label">{task.project}</span>
            </div>
          ) : null}
          {task.status === "in_progress" && task.progress != null ? (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <div
                style={{
                  flex: 1,
                  height: "6px",
                  background: "var(--cds-layer-02)",
                  borderRadius: "3px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${Math.min(100, task.progress)}%`,
                    height: "100%",
                    background: "var(--cds-interactive)",
                    borderRadius: "3px",
                  }}
                />
              </div>
              <span className="cds--type-label" style={{ color: "var(--cds-text-secondary)" }}>
                {Math.round(task.progress)}%
              </span>
            </div>
          ) : null}
          {task.status === "blocked" && task.blockedReason ? (
            <div
              style={{
                background: "var(--cds-layer-02)",
                padding: "0.5rem",
                borderRadius: "4px",
                display: "flex",
                alignItems: "center",
                gap: "0.25rem",
                color: "var(--cds-support-error)",
              }}
              className="cds--type-label"
            >
              <Locked size={14} />
              {task.blockedReason}
            </div>
          ) : null}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderTop: "1px solid var(--cds-border-subtle)",
              paddingTop: "0.75rem",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.25rem",
                color: "var(--cds-text-secondary)",
              }}
            >
              <Calendar size={14} />
              <span className="cds--type-label">
                {task.dueDate ? formatDate(task.dueDate) : "No due date"}
              </span>
            </div>
            {task.assigneeName ? (
              <span className="cds--type-label" style={{ color: "var(--cds-text-secondary)" }}>
                {task.assigneeName}
              </span>
            ) : null}
          </div>
        </Stack>
      </Tile>
    </div>
  );
}

function KanbanColumn({
  status,
  tasks,
  onCardClick,
  onAddTask,
}: {
  status: TaskStatus;
  tasks: Task[];
  onCardClick: (task: Task) => void;
  onAddTask?: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const meta = columnMeta[status];

  return (
    <div
      style={{
        flexShrink: 0,
        width: "280px",
        display: "flex",
        flexDirection: "column",
        maxHeight: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1rem",
          padding: "0 0.25rem",
        }}
      >
        <h3
          className="cds--type-label"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            margin: 0,
          }}
        >
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: meta.dotColor,
              display: "inline-block",
            }}
          />
          {meta.title}
        </h3>
        <span
          style={{
            background: "var(--cds-layer-02)",
            color: "var(--cds-text-secondary)",
            fontSize: "0.75rem",
            fontWeight: 600,
            padding: "0.125rem 0.5rem",
            borderRadius: "999px",
          }}
        >
          {tasks.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        style={{
          flex: 1,
          overflowY: "auto",
          paddingBottom: "1rem",
          background: isOver ? "var(--cds-layer-02)" : "transparent",
          borderRadius: "4px",
          transition: "background 0.15s",
          minHeight: "200px",
        }}
      >
        {tasks.map((task) => (
          <KanbanCard key={task.id} task={task} onClick={() => onCardClick(task)} />
        ))}
        {onAddTask ? (
          <button
            type="button"
            onClick={onAddTask}
            style={{
              width: "100%",
              padding: "0.5rem",
              border: "1px dashed var(--cds-border-subtle)",
              borderRadius: "4px",
              background: "transparent",
              color: "var(--cds-text-secondary)",
              cursor: "pointer",
              fontSize: "0.75rem",
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.25rem",
            }}
          >
            <Add size={14} /> Add Task
          </button>
        ) : null}
      </div>
    </div>
  );
}

function DraggedCardOverlay({ task }: { task: Task | null }) {
  if (!task) return null;
  return (
    <Tile
      style={{
        padding: "1rem",
        width: "260px",
        opacity: 0.9,
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      }}
    >
      <Stack gap={3}>
        <Tag
          type={
            task.priority === "high" ? "red" : task.priority === "medium" ? "warm-gray" : "outline"
          }
        >
          {priorityLabel[task.priority]}
        </Tag>
        <p className="cds--type-body-02" style={{ fontWeight: 500, margin: 0 }}>
          {task.title}
        </p>
      </Stack>
    </Tile>
  );
}

/* ---------- Detail Drawer ---------- */

function TaskDetailDrawer({ task, onClose }: { task: Task | null; onClose: () => void }) {
  if (!task) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        width: "400px",
        height: "100%",
        background: "var(--cds-layer-01)",
        borderLeft: "1px solid var(--cds-border-subtle)",
        boxShadow: "-4px 0 12px rgba(0,0,0,0.08)",
        zIndex: 100,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Drawer header */}
      <div
        style={{
          padding: "1rem 1.5rem",
          borderBottom: "1px solid var(--cds-border-subtle)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          background: "var(--cds-layer-02)",
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              gap: "0.5rem",
              alignItems: "center",
              marginBottom: "0.25rem",
            }}
          >
            <Tag type="blue">{task.project || "General"}</Tag>
            <span className="cds--type-label" style={{ color: "var(--cds-text-secondary)" }}>
              {task.id.slice(0, 8)}
            </span>
          </div>
        </div>
        <Button
          kind="ghost"
          size="sm"
          renderIcon={Close}
          hasIconOnly
          iconDescription="Close"
          onClick={onClose}
        />
      </div>

      {/* Drawer body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem" }}>
        <Stack gap={8}>
          <h2 className="cds--type-heading-02" style={{ margin: 0 }}>
            {task.title}
          </h2>

          {/* Properties grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <p
                className="cds--type-label"
                style={{ color: "var(--cds-text-secondary)", marginBottom: "0.25rem" }}
              >
                Status
              </p>
              <p className="cds--type-body-01" style={{ fontWeight: 500, margin: 0 }}>
                {columnMeta[task.status]?.title ?? task.status}
              </p>
            </div>
            <div>
              <p
                className="cds--type-label"
                style={{ color: "var(--cds-text-secondary)", marginBottom: "0.25rem" }}
              >
                Assignee
              </p>
              <p className="cds--type-body-01" style={{ fontWeight: 500, margin: 0 }}>
                {task.assigneeName || "Unassigned"}
              </p>
            </div>
            <div>
              <p
                className="cds--type-label"
                style={{ color: "var(--cds-text-secondary)", marginBottom: "0.25rem" }}
              >
                Due Date
              </p>
              <p
                className="cds--type-body-01"
                style={{
                  fontWeight: 500,
                  margin: 0,
                  color: task.dueDate ? "var(--cds-text-primary)" : "var(--cds-text-secondary)",
                }}
              >
                {task.dueDate ? formatDate(task.dueDate) : "No due date"}
              </p>
            </div>
            <div>
              <p
                className="cds--type-label"
                style={{ color: "var(--cds-text-secondary)", marginBottom: "0.25rem" }}
              >
                Priority
              </p>
              <Tag
                type={
                  task.priority === "high"
                    ? "red"
                    : task.priority === "medium"
                      ? "warm-gray"
                      : "outline"
                }
              >
                {priorityLabel[task.priority]}
              </Tag>
            </div>
          </div>

          {/* Subtasks placeholder */}
          <div>
            <h3
              className="cds--type-heading-01"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                marginBottom: "0.75rem",
              }}
            >
              <CheckboxChecked size={16} /> Subtasks
            </h3>
            <div
              className="cds--type-body-01"
              style={{ color: "var(--cds-text-secondary)", padding: "0.5rem 0" }}
            >
              Subtask management will be available in a future update.
            </div>
          </div>

          {/* Comments placeholder */}
          <div>
            <h3
              className="cds--type-heading-01"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                marginBottom: "0.75rem",
              }}
            >
              <Chat size={16} /> Comments
            </h3>
            <div
              className="cds--type-body-01"
              style={{ color: "var(--cds-text-secondary)", padding: "0.5rem 0" }}
            >
              Comments will be available in a future update.
            </div>
          </div>

          {/* Attachments placeholder */}
          <div>
            <h3
              className="cds--type-heading-01"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                marginBottom: "0.75rem",
              }}
            >
              <Attachment size={16} /> Attachments
            </h3>
            <div
              className="cds--type-body-01"
              style={{ color: "var(--cds-text-secondary)", padding: "0.5rem 0" }}
            >
              Attachments will be available in a future update.
            </div>
          </div>
        </Stack>
      </div>
    </div>
  );
}

/* ---------- View Toggle ---------- */

function ViewToggle({
  value,
  onChange,
}: {
  value: "board" | "list";
  onChange: (v: "board" | "list") => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        background: "var(--cds-layer-02)",
        borderRadius: "4px",
        padding: "2px",
        border: "1px solid var(--cds-border-subtle)",
      }}
    >
      <button
        type="button"
        onClick={() => onChange("board")}
        style={{
          padding: "0.375rem 0.75rem",
          border: "none",
          borderRadius: "3px",
          background: value === "board" ? "var(--cds-layer-01)" : "transparent",
          color: value === "board" ? "var(--cds-text-primary)" : "var(--cds-text-secondary)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "0.375rem",
          fontSize: "0.75rem",
          fontWeight: 500,
          boxShadow: value === "board" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
        }}
      >
        <Menu size={14} /> Board
      </button>
      <button
        type="button"
        onClick={() => onChange("list")}
        style={{
          padding: "0.375rem 0.75rem",
          border: "none",
          borderRadius: "3px",
          background: value === "list" ? "var(--cds-layer-01)" : "transparent",
          color: value === "list" ? "var(--cds-text-primary)" : "var(--cds-text-secondary)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "0.375rem",
          fontSize: "0.75rem",
          fontWeight: 500,
          boxShadow: value === "list" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
        }}
      >
        <View size={14} /> List
      </button>
    </div>
  );
}

/* ---------- DataToolbar ---------- */

function DataToolbar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onAddTask,
}: {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  statusFilter: string;
  onStatusFilterChange: (f: string) => void;
  onAddTask: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        marginBottom: "1rem",
        flexWrap: "wrap",
      }}
    >
      <Search
        id="task-search"
        labelText="Search tasks"
        placeholder="Search tasks..."
        size="sm"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        style={{ minWidth: "200px", flex: 1 }}
      />
      <Select
        id="status-filter"
        labelText=""
        hideLabel
        size="sm"
        value={statusFilter}
        onChange={(e) => onStatusFilterChange(e.target.value)}
        style={{ minWidth: "140px" }}
      >
        <SelectItem value="" text="All statuses" />
        <SelectItem value="todo" text="To Do" />
        <SelectItem value="in_progress" text="In Progress" />
        <SelectItem value="blocked" text="Blocked" />
        <SelectItem value="done" text="Done" />
      </Select>
      <Button size="sm" renderIcon={Add} onClick={onAddTask}>
        Add Task
      </Button>
    </div>
  );
}

/* ---------- Main Page Component ---------- */

export function TasksPage() {
  const { data, error, isLoading, refetch } = useTasks();
  const { user } = useAuth();
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task>();
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string>();
  const [deleteTarget, setDeleteTarget] = useState<Task>();
  const [isDeleting, setIsDeleting] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);

  /* -- New state: view mode, drawer, toolbar -- */
  const [viewMode, setViewMode] = useState<"board" | "list">("board");
  const [drawerTask, setDrawerTask] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  /* -- dnd-kit state -- */
  const [activeDragTask, setActiveDragTask] = useState<Task | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    workspaceApi
      .getMembers()
      .then(setMembers)
      .catch(() => {});
  }, []);

  const memberOptions = useMemo(
    () =>
      members.map((m) => ({
        id: m.id,
        label: (m as any).displayName || m.user?.displayName || "Unknown",
      })),
    [members],
  );

  const [selectedAssignees, setSelectedAssignees] = useState<{ id: string; label: string }[]>([]);
  const [taskForm, setTaskForm] = useState({
    title: "",
    priority: "normal" as Priority,
    project: "",
    dueDate: new Date().toISOString().slice(0, 10),
    assigneeName: "",
  });

  /* -- Filter tasks -- */
  const filteredTasks = useMemo(() => {
    if (!data) return [];
    let list = data as unknown as Task[];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.project && t.project.toLowerCase().includes(q)) ||
          t.assigneeName?.toLowerCase().includes(q),
      );
    }
    if (statusFilter) {
      list = list.filter((t) => t.status === statusFilter);
    }
    return list;
  }, [data, searchQuery, statusFilter]);

  const groupedTasks = useMemo(() => {
    const groups: Record<TaskStatus, Task[]> = {
      todo: [],
      in_progress: [],
      blocked: [],
      done: [],
    };
    for (const task of filteredTasks) {
      if (groups[task.status]) {
        groups[task.status].push(task);
      }
    }
    return groups;
  }, [filteredTasks]);

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
          <Stack gap={3} orientation="horizontal">
            <Button
              kind="ghost"
              size="sm"
              renderIcon={Edit}
              iconDescription="Edit"
              hasIconOnly
              onClick={(e) => {
                e.stopPropagation();
                setEditingTask(task);
                setTaskForm({
                  title: task.title,
                  priority: task.priority,
                  project: task.project,
                  dueDate: task.dueDate?.slice(0, 10) ?? "",
                  assigneeName: task.assigneeName,
                });
                setSelectedAssignees(
                  task.assigneeName
                    ? task.assigneeName.split(", ").map((n) => ({ id: n, label: n }))
                    : [],
                );
                setIsTaskModalOpen(true);
              }}
            />
            <Button
              kind="ghost"
              size="sm"
              renderIcon={TrashCan}
              iconDescription="Delete"
              hasIconOnly
              onClick={(e) => {
                e.stopPropagation();
                setDeleteTarget(task);
              }}
            />
          </Stack>
        ),
      },
    ],
    [refetch],
  );

  /* -- Handlers -- */
  function openCreateModal() {
    setEditingTask(undefined);
    setTaskForm({
      title: "",
      priority: "normal",
      project: "",
      dueDate: new Date().toISOString().slice(0, 10),
      assigneeName: "",
    });
    setSelectedAssignees([]);
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

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const task = filteredTasks.find((t) => t.id === event.active.id);
      if (task) setActiveDragTask(task);
    },
    [filteredTasks],
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setActiveDragTask(null);
      const { active, over } = event;
      if (!over) return;

      const taskId = active.id as string;
      const targetStatus = over.id as TaskStatus;
      const task = filteredTasks.find((t) => t.id === taskId);
      if (!task || task.status === targetStatus) return;

      // Optimistic update via refetch after API call
      try {
        await workspaceApi.updateTask(taskId, { status: targetStatus } as Partial<Task>);
        refetch();
      } catch {
        /* revert handled by refetch */
      }
    },
    [filteredTasks, refetch],
  );

  if (isLoading) return <LoadingState />;
  if (error || !data)
    return <ErrorState message={error ?? "Tasks are unavailable"} onRetry={refetch} />;

  return (
    <div style={{ position: "relative", minHeight: "calc(100vh - 4rem)" }}>
      <PageHeader
        title="Tasks"
        description="Assign work, track progress, and keep every responsibility visible."
        actions={
          <Stack gap={3} orientation="horizontal">
            <ViewToggle value={viewMode} onChange={setViewMode} />
          </Stack>
        }
      />

      {/* DataToolbar */}
      <DataToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        onAddTask={openCreateModal}
      />

      {/* Board view */}
      {viewMode === "board" ? (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div
            style={{
              display: "flex",
              gap: "1.5rem",
              overflowX: "auto",
              paddingBottom: "1rem",
              flex: 1,
              height: "calc(100vh - 18rem)",
            }}
          >
            {statusOrder.map((status) => (
              <KanbanColumn
                key={status}
                status={status}
                tasks={groupedTasks[status]}
                onCardClick={(task) => setDrawerTask(task)}
                onAddTask={status === "todo" ? openCreateModal : undefined}
              />
            ))}
          </div>
          <DragOverlay>
            <DraggedCardOverlay task={activeDragTask} />
          </DragOverlay>
        </DndContext>
      ) : (
        /* List view */
        <DataTable
          columns={columns}
          data={filteredTasks as unknown as Record<string, unknown>[]}
          selectable
          defaultSort={{ key: "dueDate", direction: "asc" }}
          pageSize={10}
        />
      )}

      {/* Detail slide-over drawer */}
      {drawerTask ? (
        <TaskDetailDrawer task={drawerTask} onClose={() => setDrawerTask(null)} />
      ) : null}

      {/* Create/Edit Task Modal */}
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
          <Stack gap={5}>
            <TextInput
              id="task-title"
              labelText="Title"
              required
              value={taskForm.title}
              onChange={(e) => setTaskForm((c) => ({ ...c, title: e.target.value }))}
            />
            <Grid style={{ padding: 0 }}>
              <Column lg={8} md={4} sm={4}>
                <TextInput
                  id="task-project"
                  labelText="Project"
                  required
                  value={taskForm.project}
                  onChange={(e) => setTaskForm((c) => ({ ...c, project: e.target.value }))}
                />
              </Column>
              <Column lg={8} md={4} sm={4}>
                <FilterableMultiSelect
                  key={isTaskModalOpen ? "open" : "closed"}
                  id="task-assignee"
                  titleText="Assignee"
                  placeholder="Search members..."
                  items={memberOptions}
                  selectedItems={selectedAssignees}
                  onChange={({
                    selectedItems,
                  }: {
                    selectedItems: { id: string; label: string }[];
                  }) => {
                    setSelectedAssignees(selectedItems);
                    setTaskForm((c) => ({
                      ...c,
                      assigneeName: selectedItems.map((s) => s.label).join(", "),
                    }));
                  }}
                />
              </Column>
            </Grid>
            <Grid style={{ padding: 0 }}>
              <Column lg={8} md={4} sm={4}>
                <TextInput
                  id="task-due-date"
                  labelText="Due date"
                  type="date"
                  required
                  value={taskForm.dueDate}
                  onChange={(e) => setTaskForm((c) => ({ ...c, dueDate: e.target.value }))}
                />
              </Column>
              <Column lg={8} md={4} sm={4}>
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
              </Column>
            </Grid>
            {createError ? (
              <InlineNotification
                kind="error"
                title={createError}
                lowContrast
                onClose={() => setCreateError(undefined)}
              />
            ) : null}
            <Stack gap={3} orientation="horizontal" style={{ justifyContent: "flex-end" }}>
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
            </Stack>
          </Stack>
        </Form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        title="Delete Task"
        description="This action cannot be undone."
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(undefined)}
      >
        <p style={{ marginBottom: "1rem", color: "var(--cds-text-secondary)" }}>
          Are you sure you want to delete &quot;{deleteTarget?.title}&quot;?
        </p>
        <Stack gap={3} orientation="horizontal" style={{ justifyContent: "flex-end" }}>
          <Button kind="secondary" onClick={() => setDeleteTarget(undefined)}>
            Cancel
          </Button>
          <Button kind="danger" onClick={handleDeleteTask} disabled={isDeleting}>
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </Stack>
      </Modal>
    </div>
  );
}
