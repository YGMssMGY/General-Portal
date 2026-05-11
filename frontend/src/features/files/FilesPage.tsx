import { useMemo, useState, type FormEvent } from "react";
import { DataTable } from "../../components/DataTable/DataTable";
import type { ColumnDef } from "../../components/DataTable/DataTable";
import { Card } from "../../components/Card";
import { Modal } from "../../components/Modal";
import { PageHeader } from "../../components/PageHeader";
import { ErrorState, LoadingState } from "../../components/StateViews";
import { Button, TextInput, Form, FileUploader } from "@carbon/react";
import { workspaceApi } from "../../api/workspaceApi";
import { useFiles } from "../../hooks/useWorkspaceResources";
import type { WorkspaceFile } from "../../types";
import { formatDateTime } from "../../utils/format";
import { Document, Upload, TrashCan } from "@carbon/icons-react";

export function FilesPage() {
  const { data, error, isLoading, refetch } = useFiles();
  const [deleteTarget, setDeleteTarget] = useState<WorkspaceFile>();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadName, setUploadName] = useState("");

  const columns: ColumnDef<WorkspaceFile>[] = useMemo(
    () => [
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
      {
        key: "actions",
        header: "",
        render: (file) => (
          <Button
            kind="ghost"
            size="sm"
            renderIcon={TrashCan}
            iconDescription="Delete"
            hasIconOnly
            onClick={() => setDeleteTarget(file)}
          />
        ),
      },
    ],
    [],
  );

  async function handleDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await workspaceApi.deleteFile(deleteTarget.id);
      setDeleteTarget(undefined);
      refetch();
    } catch {
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleUpload(event: FormEvent) {
    event.preventDefault();
    setIsUploadOpen(false);
    setUploadName("");
    refetch();
  }

  if (isLoading) return <LoadingState />;
  if (error || !data)
    return <ErrorState message={error ?? "Files are unavailable"} onRetry={refetch} />;

  return (
    <div>
      <PageHeader
        title="Files"
        description="Store files and keep documents linked to workspace context."
        actions={
          <Button renderIcon={Upload} onClick={() => setIsUploadOpen(true)}>
            Upload File
          </Button>
        }
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

      <Modal title="Upload File" isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)}>
        <Form onSubmit={handleUpload}>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <TextInput
              id="file-name"
              labelText="File Name"
              required
              value={uploadName}
              onChange={(e) => setUploadName(e.target.value)}
            />
            <FileUploader
              labelTitle="Upload file"
              labelDescription="Max file size is 500kb."
              buttonLabel="Select file"
              filenameStatus="edit"
              accept={[".pdf", ".docx", ".xlsx", ".png", ".jpg"]}
              onChange={() => {}}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <Button kind="secondary" type="button" onClick={() => setIsUploadOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" renderIcon={Upload}>
                Upload
              </Button>
            </div>
          </div>
        </Form>
      </Modal>

      <Modal
        title="Delete File"
        description="This action cannot be undone."
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(undefined)}
      >
        <p style={{ marginBottom: "1rem", color: "var(--cds-text-secondary)" }}>
          Delete &quot;{deleteTarget?.name}&quot;?
        </p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
          <Button kind="secondary" onClick={() => setDeleteTarget(undefined)}>
            Cancel
          </Button>
          <Button kind="danger" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
