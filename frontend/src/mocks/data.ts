import type {
  ActivityItem,
  DashboardData,
  DashboardMetric,
  EventItem,
  FinanceTransaction,
  Member,
  Message,
  MessageThread,
  Priority,
  Proposal,
  ResourceStatus,
  SearchResult,
  Task,
  TaskStatus,
  UserProfile,
  VolunteerSlot,
  WorkspaceFile,
  WorkspaceSettings,
} from "../types";

export type UserRole = "admin" | "president" | "officer" | "member";

export interface PublicEvent {
  id: string;
  title: string;
  date: string;
  description: string;
  photoUrl: string;
  category: string;
}

let seed = 42;
function rng(): number {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
}

function randomInt(min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => rng() - 0.5);
  return shuffled.slice(0, n);
}

const firstNames = [
  "Alex",
  "Bianca",
  "Carlos",
  "Diana",
  "Ethan",
  "Fatima",
  "George",
  "Hannah",
  "Isaac",
  "Julia",
  "Kevin",
  "Lena",
  "Marcus",
  "Naomi",
  "Oscar",
  "Priya",
  "Quinn",
  "Ravi",
  "Sofia",
  "Tomas",
  "Uma",
  "Victor",
  "Wei",
  "Xiomara",
  "Yuki",
  "Zara",
];
const lastNames = [
  "Anderson",
  "Brown",
  "Chen",
  "Davis",
  "Edwards",
  "Fernandez",
  "Gupta",
  "Hughes",
  "Ivanov",
  "Johnson",
  "Kim",
  "Lee",
  "Martinez",
  "Nakamura",
  "O'Brien",
  "Patel",
  "Reyes",
  "Singh",
  "Taylor",
  "Williams",
];
const projects = [
  "Hackathon 2026",
  "Open House",
  "Website Redesign",
  "Mentorship Program",
  "Fundraising Gala",
  "Club Fair",
  "Tech Workshop Series",
  "Community Outreach",
  "Newsletter",
  "Alumni Networking",
];
const categories = [
  "Supplies",
  "Events",
  "Travel",
  "Equipment",
  "Software",
  "Food",
  "Marketing",
  "Venue",
  "Speaker Fees",
  "Miscellaneous",
];
const fileTypes = ["PDF", "DOCX", "XLSX", "PNG", "ZIP", "PPTX", "CSV"];
const positions = [
  "Administrator",
  "President",
  "Vice President",
  "Secretary",
  "Treasurer",
  "Event Coordinator",
  "Member",
  "Officer",
];
const accessLevels = ["Admin", "Officer", "Member"];
const eventStatuses: ResourceStatus[] = [
  "draft",
  "pending",
  "under_review",
  "approved",
  "active",
  "completed",
];
const resourceStatuses: ResourceStatus[] = [
  "draft",
  "pending",
  "under_review",
  "approved",
  "rejected",
  "active",
  "completed",
];
const taskStatuses: TaskStatus[] = ["todo", "in_progress", "blocked", "done"];
const priorities: Priority[] = ["low", "normal", "medium", "high"];
const proposalTypes: Array<"Event" | "Purchase" | "Project"> = ["Event", "Purchase", "Project"];

function name(): string {
  return `${pick(firstNames)} ${pick(lastNames)}`;
}

function dateStr(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function isoDate(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString();
}

let nextId = 0;
function uid(prefix: string): string {
  nextId += 1;
  return `${prefix}-${nextId}`;
}

function resetIdCounter(): void {
  nextId = 0;
  seed = 42;
}

export function resetData(): void {
  resetIdCounter();
}

export function generateUserProfiles(): Record<UserRole, UserProfile> {
  return {
    admin: {
      id: "user-admin",
      email: "sarah.mitchell@school.edu",
      displayName: "Dr. Sarah Mitchell",
      avatarUrl: "",
      role: "admin",
      workspaceName: "Developers' Club & Student Council",
      permissions: [
        "admin",
        "manage_members",
        "manage_tasks",
        "manage_events",
        "manage_finance",
        "manage_proposals",
        "manage_volunteers",
        "manage_files",
        "manage_settings",
        "view_all",
      ],
    },
    president: {
      id: "user-president",
      email: "marcus.johnson@school.edu",
      displayName: "Marcus Johnson",
      avatarUrl: "",
      role: "president",
      workspaceName: "Developers' Club & Student Council",
      permissions: [
        "manage_members",
        "manage_tasks",
        "manage_events",
        "manage_proposals",
        "manage_volunteers",
        "manage_files",
        "view_all",
      ],
    },
    officer: {
      id: "user-officer",
      email: "priya.patel@school.edu",
      displayName: "Priya Patel",
      avatarUrl: "",
      role: "officer",
      workspaceName: "Developers' Club & Student Council",
      permissions: [
        "manage_tasks",
        "manage_events",
        "manage_volunteers",
        "manage_files",
        "view_all",
      ],
    },
    member: {
      id: "user-member",
      email: "ethan.brown@school.edu",
      displayName: "Ethan Brown",
      avatarUrl: "",
      role: "member",
      workspaceName: "Developers' Club & Student Council",
      permissions: ["view_all"],
    },
  };
}

let currentRole: UserRole = "president";

export function getCurrentRole(): UserRole {
  return currentRole;
}

export function setCurrentRole(role: UserRole): void {
  currentRole = role;
}

export function getCurrentUser(): UserProfile {
  const profiles = generateUserProfiles();
  return profiles[currentRole];
}

export function generateTasks(): Task[] {
  const tasks: Task[] = [];
  for (let i = 0; i < 25; i++) {
    const status = pick(taskStatuses);
    tasks.push({
      id: uid("task"),
      title: `${pick([
        "Prepare",
        "Review",
        "Update",
        "Finalize",
        "Draft",
        "Submit",
        "Organize",
        "Coordinate",
        "Plan",
        "Execute",
      ])} ${pick([
        "budget report",
        "event schedule",
        "member survey",
        "sponsorship deck",
        "social media post",
        "volunteer roster",
        "venue contract",
        "equipment inventory",
        "training materials",
        "meeting minutes",
      ])}`,
      status,
      priority: pick(priorities),
      project: pick(projects),
      dueDate: dateStr(randomInt(-30, 30)),
      assigneeName: name(),
      progress: status === "done" ? 100 : status === "todo" ? 0 : randomInt(10, 90),
      ...(status === "blocked"
        ? {
            blockedReason: pick([
              "Waiting on approval",
              "Budget pending",
              "Missing requirements",
              "External dependency",
            ]),
          }
        : {}),
    });
  }
  return tasks;
}

export function generateProposals(): Proposal[] {
  return Array.from({ length: 25 }, (_, i) => ({
    id: uid("prop"),
    title: `${pick(["Proposal:", "Request for:", "Plan for:"])} ${pick([
      "Spring Carnival",
      "New Laptops",
      "Website Hosting",
      "Guest Speaker Series",
      "Club T-Shirts",
      "Photography Equipment",
      "End-of-Year Banquet",
      "Coding Bootcamp",
      "Robotics Kit",
      "Field Trip",
    ])}`,
    type: pick(proposalTypes),
    status: pick(resourceStatuses),
    submittedBy: name(),
    submittedAt: isoDate(randomInt(-60, -1)),
    budget: Math.round(rng() * 5000 * 100) / 100,
    summary: pick([
      "Requesting funds to support this initiative.",
      "This proposal outlines the plan for the upcoming activity.",
      "Seeking approval for the described purchase.",
    ]),
  }));
}

export function generateEvents(): EventItem[] {
  return Array.from({ length: 25 }, () => {
    const status = pick(eventStatuses);
    const bTotal = randomInt(500, 10000);
    return {
      id: uid("event"),
      title: pick([
        "Annual Hackathon",
        "Club Fair Booth",
        "Leadership Workshop",
        "Community Cleanup",
        "Movie Night",
        "Study Group Session",
        "Guest Lecture",
        "Fundraising Bake Sale",
        "Team Building Retreat",
        "Career Panel",
        "Game Tournament",
        "Art Exhibition",
      ]),
      status,
      startsAt: isoDate(randomInt(-30, 60)),
      endsAt: isoDate(randomInt(-28, 62)),
      progress: status === "completed" ? 100 : randomInt(0, 95),
      budgetUsed: Math.round(rng() * bTotal * 100) / 100,
      budgetTotal: bTotal,
      ownerNames: pickN(firstNames, randomInt(1, 4)),
    };
  });
}

export function generateVolunteerSlots(): VolunteerSlot[] {
  return Array.from({ length: 25 }, () => {
    const cap = randomInt(5, 30);
    const fill = randomInt(0, cap);
    return {
      id: uid("vol"),
      title: pick([
        "Registration Desk",
        "Setup Crew",
        "Photographer",
        "MC / Host",
        "Food Service",
        "Security",
        "Cleanup Crew",
        "Social Media Live",
        "First Aid",
        "Greeter",
      ]),
      eventName: pick([
        "Hackathon",
        "Open House",
        "Club Fair",
        "Fundraising Gala",
        "Workshop",
        "Retreat",
        "Panel Discussion",
        "Tournament",
      ]),
      startsAt: isoDate(randomInt(1, 30)),
      capacity: cap,
      filled: fill,
      hours: randomInt(1, 8),
    };
  });
}

export function generateFinanceTransactions(): FinanceTransaction[] {
  return Array.from({ length: 25 }, () => ({
    id: uid("fin"),
    title: `${pick(["Payment for", "Reimbursement:", "Invoice:", "Receipt:", "Transfer:"])} ${pick([
      "catering services",
      "venue deposit",
      "equipment rental",
      "software license",
      "printing costs",
      "transportation",
      "speaker honorarium",
      "decorations",
      "prizes",
      "subscription",
    ])}`,
    category: pick(categories),
    status: pick(resourceStatuses),
    submittedBy: name(),
    amount: Math.round(rng() * 2000 * 100) / 100,
    occurredAt: isoDate(randomInt(-60, 0)),
  }));
}

export function generateMessages(): { threads: MessageThread[]; msgs: Record<string, Message[]> } {
  const threads: MessageThread[] = [];
  const msgs: Record<string, Message[]> = {};

  for (let i = 0; i < 20; i++) {
    const tid = uid("thread");
    const messages: Message[] = Array.from({ length: randomInt(2, 8) }, (_, mi) => ({
      id: uid("msg"),
      authorName: name(),
      body: pick([
        "Hey team, just a quick update on the progress.",
        "Can someone review the attached document?",
        "Great work on the event last week!",
        "I've updated the schedule for next month.",
        "Please confirm your availability for Friday.",
        "The budget has been approved.",
        "Meeting notes from today's session are attached.",
        "Reminder: deadline is next Tuesday.",
        "Thanks for your help with this!",
        "Let me know if you need any additional info.",
      ]),
      sentAt: isoDate(randomInt(-14, 0)),
    }));
    msgs[tid] = messages;

    threads.push({
      id: tid,
      title: pick([
        "Budget Discussion",
        "Event Planning",
        "Member Onboarding",
        "Volunteer Schedule",
        "Project Update",
        "General Announcement",
      ]),
      context: pick(["event", "task", "proposal", "file", "general"]),
      status: pick(resourceStatuses),
      preview: messages[messages.length - 1].body.slice(0, 80) + "...",
      unreadCount: randomInt(0, 5),
      updatedAt: messages[messages.length - 1].sentAt,
      participants: pickN(firstNames, randomInt(2, 5)),
      messages,
    });
  }
  return { threads, msgs };
}

export function generateFiles(): WorkspaceFile[] {
  return Array.from({ length: 25 }, () => ({
    id: uid("file"),
    name: `${pick([
      "Budget_Report",
      "Event_Plan",
      "Meeting_Notes",
      "Proposal_Draft",
      "Member_Roster",
      "Volunteer_Schedule",
      "Presentation",
      "Flyer",
      "Contract",
      "Photo_Album",
    ])}_${dateStr(randomInt(-90, -1))}.${pick(fileTypes).toLowerCase()}`,
    fileType: pick(fileTypes),
    ownerName: name(),
    linkedResource: pick([...projects, "Unlinked"]),
    sizeLabel: `${randomInt(10, 5000)} KB`,
    updatedAt: isoDate(randomInt(-30, 0)),
  }));
}

export function generateMembers(): Member[] {
  return Array.from({ length: 25 }, () => {
    const firstName = pick(firstNames);
    const lastName = pick(lastNames);
    const p = pick(positions);
    const a =
      p === "Administrator"
        ? "Admin"
        : p === "President" || p === "Vice President" || p === "Treasurer" || p === "Secretary"
          ? "Officer"
          : "Member";
    const role: UserRole = a === "Admin" ? "admin" : a === "Officer" ? "officer" : "member";
    return {
      id: uid("mbr"),
      user: {
        id: uid("usr"),
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@school.edu`,
        displayName: `${firstName} ${lastName}`,
        role,
        workspaceName: "Developers' Club & Student Council",
      },
      position: p,
      accessLabel: a,
      taskCount: randomInt(0, 15),
      volunteerHours: randomInt(0, 40),
      role,
    };
  });
}

export function generateActivity(): ActivityItem[] {
  return Array.from({ length: 25 }, (_, i) => ({
    id: uid("act"),
    actorName: name(),
    action: pick(["created", "updated", "commented on", "approved", "rejected", "completed"]),
    resourceType: pick(["Task", "Proposal", "Event", "File", "Finance"]),
    resourceTitle: pick([
      "Budget Report",
      "Event Plan",
      "Task Assignment",
      "Proposal #42",
      "Meeting Notes",
    ]),
    occurredAt: isoDate(randomInt(-7, 0)),
  }));
}

export function generateDashboardData(): DashboardData {
  const tasks = generateTasks();
  return {
    metrics: [
      {
        label: "Active Tasks",
        value: String(tasks.filter((t) => t.status !== "done").length),
        tone: "primary",
        icon: "Task",
      },
      {
        label: "Open Proposals",
        value: String(randomInt(3, 12)),
        tone: "secondary",
        icon: "Document",
      },
      {
        label: "Upcoming Events",
        value: String(randomInt(2, 8)),
        tone: "tertiary",
        icon: "Calendar",
      },
      { label: "Overdue Items", value: String(randomInt(0, 5)), tone: "danger", icon: "Warning" },
    ],
    attention: [
      {
        id: "att-1",
        label: "Overdue",
        title: "Budget report submission",
        owner: "Diana Edwards",
        dueLabel: "3 days ago",
        tone: "danger",
      },
      {
        id: "att-2",
        label: "Due soon",
        title: "Sponsorship deck finalization",
        owner: "Kevin Lee",
        dueLabel: "Tomorrow",
        tone: "tertiary",
      },
      {
        id: "att-3",
        label: "New",
        title: "Member onboarding for March",
        owner: "Fatima Fernandez",
        dueLabel: "In 2 days",
        tone: "primary",
      },
    ],
    myTasks: tasks.slice(0, 5),
    upcomingEvents: generateEvents().slice(0, 4),
    recentActivity: generateActivity().slice(0, 4),
  };
}

export function generateSearchResults(): SearchResult[] {
  const types: Array<"Task" | "Proposal" | "Event" | "File" | "Finance"> = [
    "Task",
    "Proposal",
    "Event",
    "File",
    "Finance",
  ];
  return Array.from({ length: 20 }, () => ({
    id: uid("sr"),
    type: pick(types),
    title: `${pick(["Budget", "Event", "Task", "Report", "Plan"])} ${pick(["Q1", "Q2", "2026", "Draft", "Final"])}`,
    description: pick([
      "A search result matching your query.",
      "Related to your recent activity.",
      "Found in the workspace archives.",
    ]),
    status: pick(["Active", "Completed", "Draft", "Pending"]),
  }));
}

export function generateSettings(): WorkspaceSettings {
  return {
    workspaceName: "Developers' Club & Student Council",
    defaultVisibility: "members",
    requireProposalApproval: true,
    allowMemberInvites: false,
    fiscalYearStart: "2026-01-01",
  };
}

export function generatePublicEvents(): PublicEvent[] {
  return Array.from({ length: 12 }, (_, i) => ({
    id: u("pub-" + i),
    title: pick([
      "Annual Hackathon 2025",
      "Spring Coding Workshop",
      "Leadership Summit",
      "Community Tech Fair",
      "Robotics Competition",
      "Alumni Networking Night",
      "Open Source Bootcamp",
      "Game Jam Weekend",
      "Career Development Panel",
      "Science Exhibition",
      "Cultural Festival",
      "End-of-Year Celebration",
    ]),
    date: dateStr(randomInt(-365, -1)),
    description: pick([
      "Our flagship event brought together over 200 participants for a weekend of innovation and collaboration.",
      "An inspiring gathering of students, mentors, and industry professionals sharing knowledge and experiences.",
      "A celebration of creativity and technical excellence across all grade levels.",
    ]),
    photoUrl: "",
    category: pick(["Workshop", "Competition", "Social", "Conference", "Community"]),
  }));
}

export function generatePhotoGallery(): {
  id: string;
  title: string;
  date: string;
  description: string;
}[] {
  return Array.from({ length: 16 }, (_, i) => ({
    id: u("photo-" + i),
    title: pick([
      "Group Photo",
      "Workshop Session",
      "Award Ceremony",
      "Team Building",
      "Presentations",
      "Panel Discussion",
      "Hands-on Lab",
      "Closing Remarks",
    ]),
    date: dateStr(randomInt(-365, -1)),
    description: pick([
      "Participants engaged in hands-on activities throughout the session.",
      "A memorable moment from one of our flagship events.",
      "Students showcasing their projects to the community.",
    ]),
  }));
}

function u(prefix: string): string {
  nextId += 1;
  return `${prefix}${nextId}`;
}
