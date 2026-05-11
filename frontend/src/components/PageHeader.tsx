import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div
      style={{
        marginBottom: "1.5rem",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: "1rem",
        borderBottom: "1px solid var(--cds-border-subtle)",
        paddingBottom: "1rem",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: "1rem",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "1.25rem",
              fontWeight: 600,
              lineHeight: "1.75rem",
              color: "var(--cds-text-primary)",
            }}
          >
            {title}
          </h1>
          {description ? (
            <p
              style={{
                marginTop: "0.25rem",
                fontSize: "0.875rem",
                color: "var(--cds-text-secondary)",
              }}
            >
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.75rem" }}>
            {actions}
          </div>
        ) : null}
      </div>
    </div>
  );
}
