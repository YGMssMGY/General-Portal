export interface PortalClientOptions {
    baseUrl: string;
    token?: string;
    portal?: string;
    fetchImpl?: typeof fetch;
}

export interface ListResult<T> {
    data: T;
    cursor: string | null;
}

export interface ListParams extends Record<string, string | number | undefined> {
    limit?: number;
    cursor?: string;
    q?: string;
}

export interface TaskListParams extends ListParams {
    status?: string;
    assigneeId?: string;
    priority?: number;
}

export interface CreateTaskInput {
    title: string;
    description?: string | null;
    priority?: number;
    dueDate?: string | null;
    assigneeId?: string | null;
    recurrence?: string | null;
    metadata?: Record<string, unknown>;
}

export interface Task {
    id: string;
    title: string;
    description: string | null;
    status: string;
    priority: number;
    dueDate: string | null;
    assigneeId: string | null;
    createdAt: string;
}

export interface EventItem {
    id: string;
    title: string;
    description: string | null;
    startDate: string | null;
    endDate: string | null;
    status: string;
}

export interface Proposal {
    id: string;
    title: string;
    description: string | null;
    status: string;
}

export interface Member {
    id: string;
    name: string | null;
    email: string;
}

export interface FinanceSummary {
    totalIncome: number;
    totalExpense: number;
    balance: number;
    transactionCount: number;
    categoryBreakdown: Array<{
        category: string | null;
        type: string;
        total: number;
        count: number;
    }>;
}

export interface Meeting {
    id: string;
    title: string;
    description: string | null;
    startTime: string | null;
}

export interface MessageThread {
    id: string;
    subject: string | null;
    createdAt: string;
}

export interface FileItem {
    id: string;
    fileName: string;
    mimeType: string | null;
    size: number;
    createdAt: string;
}

export interface Notification {
    id: string;
    title: string;
    body: string | null;
    read: boolean;
    createdAt: string;
}

export interface SearchResult {
    results: Array<{ id: string; title: string; snippet: string; type: string; url: string }>;
    total: number;
}

export interface Workspace {
    id: string;
    name: string;
    description: string | null;
    slug: string;
    settings: Record<string, unknown>;
    terminology: Record<string, unknown>;
    features: Record<string, unknown>;
    modules: unknown[];
    nav: unknown[];
    branding: Record<string, unknown>;
    radius: string;
    category: string | null;
    limits: Record<string, unknown>;
}

export interface PortalClient {
    tasks: {
        list(params?: TaskListParams): Promise<ListResult<Task[]>>;
        create(input: CreateTaskInput): Promise<Task>;
    };
    events: { list(params?: ListParams): Promise<ListResult<EventItem[]>> };
    proposals: { list(params?: ListParams): Promise<ListResult<Proposal[]>> };
    members: { list(params?: ListParams): Promise<ListResult<Member[]>> };
    finance: { summary(): Promise<FinanceSummary> };
    meetings: { list(params?: ListParams): Promise<ListResult<Meeting[]>> };
    messages: { list(params?: ListParams): Promise<ListResult<MessageThread[]>> };
    files: { list(params?: ListParams): Promise<ListResult<FileItem[]>> };
    notifications: { list(params?: ListParams): Promise<ListResult<Notification[]>> };
    search(params: { q: string }): Promise<SearchResult>;
    workspace(): Promise<Workspace>;
}

export class PortalApiError extends Error {
    readonly status: number;

    constructor(status: number, message: string) {
        super(message);
        this.name = "PortalApiError";
        this.status = status;
    }
}

const SLUG = /^[a-z0-9][a-z0-9_-]{0,63}$/;

function query(params?: Record<string, string | number | undefined>): string {
    if (!params) return "";
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) search.set(key, String(value));
    }
    const text = search.toString();
    return text ? `?${text}` : "";
}

export function createPortalClient(options: PortalClientOptions): PortalClient {
    const baseUrl = options.baseUrl.replace(/\/+$/, "");
    const doFetch: typeof fetch =
        options.fetchImpl ?? ((input, init) => globalThis.fetch(input, init));
    const portal = options.portal;
    if (portal !== undefined && !SLUG.test(portal)) {
        throw new Error(`Invalid portal slug: ${portal}`);
    }

    async function request<T>(path: string, init: RequestInit = {}): Promise<ListResult<T>> {
        const headers = new Headers(init.headers);
        headers.set("Accept", "application/json");
        if (init.body !== undefined) headers.set("Content-Type", "application/json");
        if (options.token) headers.set("Authorization", `Bearer ${options.token}`);
        if (portal) headers.set("Cookie", `portal=${portal}`);

        const res = await doFetch(`${baseUrl}${path}`, { ...init, headers });
        let body: unknown = null;
        try {
            body = await res.json();
        } catch {
            throw new PortalApiError(res.status, "Invalid JSON response");
        }
        if (
            typeof body !== "object" ||
            body === null ||
            typeof (body as { success?: unknown }).success !== "boolean"
        ) {
            throw new PortalApiError(res.status, "Unexpected API response");
        }
        const envelope = body as { success: boolean; data?: unknown; error?: string };
        if (!envelope.success) {
            throw new PortalApiError(res.status, envelope.error ?? "Request failed");
        }
        return {
            data: envelope.data as T,
            cursor: res.headers.get("X-Next-Cursor") || null,
        };
    }

    return {
        tasks: {
            list: (params) => request<Task[]>(`/api/tasks${query(params)}`),
            create: (input) =>
                request<Task>("/api/tasks", {
                    method: "POST",
                    body: JSON.stringify(input),
                }).then((result) => result.data),
        },
        events: { list: (params) => request<EventItem[]>(`/api/events${query(params)}`) },
        proposals: { list: (params) => request<Proposal[]>(`/api/proposals${query(params)}`) },
        members: { list: (params) => request<Member[]>(`/api/members${query(params)}`) },
        finance: {
            summary: () => request<FinanceSummary>("/api/finance/summary").then((r) => r.data),
        },
        meetings: { list: (params) => request<Meeting[]>(`/api/meetings${query(params)}`) },
        messages: { list: (params) => request<MessageThread[]>(`/api/messages${query(params)}`) },
        files: { list: (params) => request<FileItem[]>(`/api/files${query(params)}`) },
        notifications: {
            list: (params) => request<Notification[]>(`/api/notifications${query(params)}`),
        },
        search: (params) =>
            request<SearchResult>(`/api/search${query(params)}`).then((r) => r.data),
        workspace: () => request<Workspace>("/api/workspace").then((r) => r.data),
    };
}
