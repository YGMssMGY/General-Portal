-- V1__initial_schema.sql
-- Baseline schema for OrgFlow Portal — compatible with PostgreSQL, H2, and SQLite
-- UUIDs stored as raw bytes; indexes are managed by JPA @Index annotations

CREATE TABLE workspaces (
    id BINARY(16) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    name VARCHAR(255) NOT NULL UNIQUE,
    description VARCHAR(500) NOT NULL,
    PRIMARY KEY (id)
);

CREATE TABLE users (
    id BINARY(16) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    display_name VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(255),
    PRIMARY KEY (id)
);

CREATE TABLE memberships (
    id BINARY(16) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    workspace_id BINARY(16) NOT NULL,
    user_id BINARY(16) NOT NULL,
    position VARCHAR(255) NOT NULL,
    access_label VARCHAR(255) NOT NULL,
    task_count INTEGER NOT NULL,
    volunteer_hours INTEGER NOT NULL,
    PRIMARY KEY (id),
    UNIQUE (workspace_id, user_id),
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE permission_grants (
    id BINARY(16) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    membership_id BINARY(16) NOT NULL,
    permission VARCHAR(255) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE (membership_id, permission),
    FOREIGN KEY (membership_id) REFERENCES memberships(id)
);

CREATE TABLE tasks (
    id BINARY(16) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    workspace_id BINARY(16) NOT NULL,
    title VARCHAR(255) NOT NULL,
    status VARCHAR(255) NOT NULL,
    priority VARCHAR(255) NOT NULL,
    project VARCHAR(255) NOT NULL,
    due_date DATE NOT NULL,
    assignee_name VARCHAR(255) NOT NULL,
    progress INTEGER NOT NULL,
    blocked_reason VARCHAR(500),
    PRIMARY KEY (id),
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
);

CREATE TABLE proposals (
    id BINARY(16) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    workspace_id BINARY(16) NOT NULL,
    title VARCHAR(255) NOT NULL,
    type VARCHAR(255) NOT NULL,
    status VARCHAR(255) NOT NULL,
    submitted_by VARCHAR(255) NOT NULL,
    submitted_at TIMESTAMP NOT NULL,
    budget DECIMAL(12,2) NOT NULL,
    summary VARCHAR(1000) NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
);

CREATE TABLE events (
    id BINARY(16) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    workspace_id BINARY(16) NOT NULL,
    title VARCHAR(255) NOT NULL,
    status VARCHAR(255) NOT NULL,
    starts_at TIMESTAMP NOT NULL,
    ends_at TIMESTAMP,
    progress INTEGER NOT NULL,
    budget_used DECIMAL(12,2) NOT NULL,
    budget_total DECIMAL(12,2) NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
);

CREATE TABLE event_owners (
    id BINARY(16) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    event_id BINARY(16) NOT NULL,
    owner_label VARCHAR(255) NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (event_id) REFERENCES events(id)
);

CREATE TABLE volunteer_slots (
    id BINARY(16) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    workspace_id BINARY(16) NOT NULL,
    title VARCHAR(255) NOT NULL,
    event_name VARCHAR(255) NOT NULL,
    starts_at TIMESTAMP NOT NULL,
    capacity INTEGER NOT NULL,
    filled INTEGER NOT NULL,
    hours INTEGER NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
);

CREATE TABLE finance_transactions (
    id BINARY(16) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    workspace_id BINARY(16) NOT NULL,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(255) NOT NULL,
    status VARCHAR(255) NOT NULL,
    submitted_by VARCHAR(255) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    occurred_at TIMESTAMP NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
);

CREATE TABLE message_threads (
    id BINARY(16) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    workspace_id BINARY(16) NOT NULL,
    title VARCHAR(255) NOT NULL,
    context VARCHAR(255) NOT NULL,
    status VARCHAR(255) NOT NULL,
    preview VARCHAR(500) NOT NULL,
    unread_count INTEGER NOT NULL,
    last_message_at TIMESTAMP NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
);

CREATE TABLE message_participants (
    id BINARY(16) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    thread_id BINARY(16) NOT NULL,
    name VARCHAR(255) NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (thread_id) REFERENCES message_threads(id)
);

CREATE TABLE messages (
    id BINARY(16) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    thread_id BINARY(16) NOT NULL,
    author_name VARCHAR(255) NOT NULL,
    body VARCHAR(2000) NOT NULL,
    sent_at TIMESTAMP NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (thread_id) REFERENCES message_threads(id)
);

CREATE TABLE workspace_files (
    id BINARY(16) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    workspace_id BINARY(16) NOT NULL,
    name VARCHAR(255) NOT NULL,
    file_type VARCHAR(255) NOT NULL,
    owner_name VARCHAR(255) NOT NULL,
    linked_resource VARCHAR(255) NOT NULL,
    size_label VARCHAR(255) NOT NULL,
    storage_key VARCHAR(255) NOT NULL,
    file_updated_at TIMESTAMP NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
);

CREATE TABLE activity_logs (
    id BINARY(16) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    workspace_id BINARY(16) NOT NULL,
    actor_name VARCHAR(255) NOT NULL,
    action VARCHAR(255) NOT NULL,
    resource_type VARCHAR(255) NOT NULL,
    resource_title VARCHAR(255) NOT NULL,
    occurred_at TIMESTAMP NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
);

CREATE TABLE workspace_settings (
    id BINARY(16) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    workspace_id BINARY(16) NOT NULL UNIQUE,
    default_visibility VARCHAR(255) NOT NULL,
    require_proposal_approval BOOLEAN NOT NULL,
    allow_member_invites BOOLEAN NOT NULL,
    fiscal_year_start VARCHAR(255) NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
);
