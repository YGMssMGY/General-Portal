import { DataTable } from "../../components/DataTable/DataTable";
import type { ColumnDef } from "../../components/DataTable/DataTable";
import { Card } from "../../components/Card";
import { PageHeader } from "../../components/PageHeader";
import { ErrorState, LoadingState } from "../../components/StateViews";
import { useFiles } from "../../hooks/useWorkspaceResources";
import type { WorkspaceFile } from "../../types";
import { formatDateTime } from "../../utils/format";
import { Document } from "@carbon/icons-react";

const columns: ColumnDef<WorkspaceFile>[] = [
  {
    key: "name",
    header: "Name",
    sortable: true,
    render: (file) => (
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <Document
          size={20}
          style={{ color: "var(--cds-text-secondary)", flexShrink: 0 }}
          aria-hidden="true"
        />
        <span style={{ fontWeight: 500, color: "var(--cds-text-primary)" }}>{file.name}</span>
      </div>
    ),
  },
  { key: "fileType", header: "Type", sortable: true },
  { key: "ownerName", header: "Owner", sortable: true },
  { key: "linkedResource", header: "Linked To", sortable: true },
  {
    key: "updatedAt",
    header: "Updated",
    sortable: true,
    render: (file) => formatDateTime(file.updatedAt),
  },
];

export function FilesPage() {
  const { data, error, isLoading, refetch } = useFiles();
  if (isLoading) return <LoadingState />;
  if (error || !data)
    return <ErrorState message={error ?? "Files are unavailable"} onRetry={refetch} />;

  return (
    <div>
      <PageHeader
        title="Files"
        description="Store files and keep documents linked to workspace context."
      />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        {data.slice(0, 4).map((file) => (
          <Card key={file.id} padding="lg">
            <Document size={24} style={{ color: "#0f62fe" }} aria-hidden="true" />
            <h2
              style={{
                marginTop: "0.75rem",
                fontWeight: 500,
                color: "var(--cds-text-primary)",
                fontSize: "0.875rem",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {file.name}
            </h2>
            <p
              style={{
                marginTop: "0.25rem",
                fontSize: "0.75rem",
                color: "var(--cds-text-secondary)",
              }}
            >
              {file.sizeLabel} · {file.fileType}
            </p>
          </Card>
        ))}
      </div>
      <DataTable
        columns={columns}
        data={data as unknown as Record<string, unknown>[]}
        defaultSort={{ key: "updatedAt", direction: "desc" }}
        pageSize={10}
      />
    </div>
  );
}
