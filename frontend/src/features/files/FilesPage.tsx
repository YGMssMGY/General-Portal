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
      <div className="flex items-center gap-3">
        <Document size={20} className="text-text-secondary shrink-0" aria-hidden="true" />
        <span className="font-medium text-text-primary">{file.name}</span>
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
  if (error || !data) return <ErrorState message={error ?? "Files are unavailable"} onRetry={refetch} />;

  return (
    <div>
      <PageHeader title="Files" description="Store files and keep documents linked to workspace context." />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {data.slice(0, 4).map((file) => (
          <Card key={file.id} padding="lg">
            <Document size={24} className="text-carbon-blue-60" aria-hidden="true" />
            <h2 className="mt-3 font-medium text-text-primary text-sm truncate">{file.name}</h2>
            <p className="mt-1 text-xs text-text-secondary">{file.sizeLabel} &middot; {file.fileType}</p>
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
