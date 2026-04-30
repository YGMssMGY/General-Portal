export type ResourceStatus =
  | "draft"
  | "pending"
  | "under_review"
  | "approved"
  | "rejected"
  | "active"
  | "completed"
  | "blocked";

export type TaskStatus = "todo" | "in_progress" | "blocked" | "done";

export type Priority = "low" | "normal" | "medium" | "high";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  workspaceId: string;
  permissions: string[];
}

export interface Workspace {
  id: string;
  name: string;
  description: string;
}

export interface DashboardMetric {
  label: string;
  value: string;
  tone: "primary" | "secondary" | "tertiary" | "danger" | "neutral";
  icon: string;
}

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  priority: Priority;
  project: string;
  dueDate: string;
  assigneeName: string;
  progress: number;
  blockedReason?: string;
}

export interface Proposal {
  id: string;
  title: string;
  type: "Event" | "Purchase" | "Project";
  status: ResourceStatus;
  submittedBy: string;
  submittedAt: string;
  budget: number;
  summary: string;
}

export interface EventItem {
  id: string;
  title: string;
  status: ResourceStatus;
  startsAt: string;
  endsAt?: string;
  progress: number;
  budgetUsed: number;
  budgetTotal: number;
  ownerNames: string[];
}

export interface VolunteerSlot {
  id: string;
  title: string;
  eventName: string;
  startsAt: string;
  capacity: number;
  filled: number;
  hours: number;
}

export interface FinanceTransaction {
  id: string;
  title: string;
  category: string;
  status: ResourceStatus;
  submittedBy: string;
  amount: number;
  occurredAt: string;
}

export interface Message {
  id: string;
  authorName: string;
  body: string;
  sentAt: string;
}

export interface MessageThread {
  id: string;
  title: string;
  context: "event" | "task" | "proposal" | "file" | "general";
  status: ResourceStatus;
  preview: string;
  unreadCount: number;
  updatedAt: string;
  participants: string[];
  messages: Message[];
}

export interface WorkspaceFile {
  id: string;
  name: string;
  fileType: string;
  ownerName: string;
  linkedResource: string;
  sizeLabel: string;
  updatedAt: string;
}

export interface Member {
  id: string;
  name: string;
  email: string;
  position: string;
  accessLabel: string;
  taskCount: number;
  volunteerHours: number;
  permissions: string[];
}

export interface ActivityItem {
  id: string;
  actorName: string;
  action: string;
  resourceType: string;
  resourceTitle: string;
  occurredAt: string;
}

export interface DashboardData {
  metrics: DashboardMetric[];
  attention: Array<{
    id: string;
    label: string;
    title: string;
    owner: string;
    dueLabel: string;
    tone: "danger" | "tertiary" | "primary";
  }>;
  myTasks: Task[];
  upcomingEvents: EventItem[];
  recentActivity: ActivityItem[];
}

export interface WorkspaceSettings {
  workspaceName: string;
  defaultVisibility: "members" | "officers" | "private";
  requireProposalApproval: boolean;
  allowMemberInvites: boolean;
  fiscalYearStart: string;
}

export interface SearchResult {
  id: string;
  type: "Task" | "Proposal" | "Event" | "File" | "Finance";
  title: string;
  description: string;
  status: string;
}
