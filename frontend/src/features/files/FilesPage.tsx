import { File } from "lucide-react";
import { Card } from "../../components/Card";
import { PageHeader } from "../../components/PageHeader";
import { ErrorState, LoadingState } from "../../components/StateViews";
import { useFiles } from "../../hooks/useWorkspaceResources";
import { formatDateTime } from "../../utils/format";

export function FilesPage() {
  const { data, error, isLoading, refetch } = useFiles();

  if (isLoading) return <LoadingState />;
  if (error || !data) return <ErrorState message={error ?? "Files are unavailable"} onRetry={refetch} />;

  return (
    <div>
      <PageHeader
        title="Files"
        description="Store files with metadata and keep every document linked to its workspace context."
      />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        {data.map((file) => (
          <Card key={file.id} className="p-card-padding">
            <div className="mb-5 flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <File className="h-5 w-5" aria-hidden="true" />
              </div>
              <span className="rounded bg-surface-container-high px-2 py-1 text-xs font-semibold text-on-surface-variant">{file.fileType}</span>
            </div>
            <h2 className="font-semibold text-on-surface">{file.name}</h2>
            <p className="mt-1 text-sm text-on-surface-variant">{file.linkedResource}</p>
            <div className="mt-5 flex justify-between text-xs text-on-surface-variant">
              <span>{file.ownerName}</span>
              <span>{file.sizeLabel}</span>
            </div>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-outline-variant p-card-padding">
          <h2 className="font-display text-lg font-semibold text-on-surface">File Library</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="border-b border-outline-variant bg-surface-container-low text-xs uppercase tracking-normal text-on-surface-variant">
              <tr>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Owner</th>
                <th className="px-4 py-3 font-semibold">Linked To</th>
                <th className="px-4 py-3 font-semibold">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {data.map((file) => (
                <tr key={file.id} className="hover:bg-surface-container-low/60">
                  <td className="px-4 py-3 font-semibold text-on-surface">{file.name}</td>
                  <td className="px-4 py-3 text-on-surface-variant">{file.fileType}</td>
                  <td className="px-4 py-3 text-on-surface-variant">{file.ownerName}</td>
                  <td className="px-4 py-3 text-on-surface-variant">{file.linkedResource}</td>
                  <td className="px-4 py-3 text-on-surface-variant">{formatDateTime(file.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
