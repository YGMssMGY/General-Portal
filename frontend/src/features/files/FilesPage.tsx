import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
	Search,
	Button,
	Select,
	SelectItem,
	Tile,
	Stack,
	Tag,
	FileUploader,
	Form,
	InlineNotification,
} from "@carbon/react";
import { useUIStore } from "../../stores/useUIStore";
import {
	Document,
	DocumentPdf,
	Table,
	Image,
	Download,
	TrashCan,
	Upload,
	Close,
} from "@carbon/icons-react";
import { Modal } from "../../components/Modal";
import { PageLayout } from "../../components/PageLayout/PageLayout";
import { ErrorState, LoadingState, EmptyState } from "../../components/StateViews";
import { workspaceApi } from "../../api/workspaceApi";
import { useFiles } from "../../hooks/useWorkspaceResources";
import type { WorkspaceFile } from "../../types";
import { formatDateTime } from "../../utils/format";

const IMAGE_EXTS = new Set(["png", "jpg", "jpeg", "gif", "svg", "webp", "bmp", "ico"]);

const fileTypeMeta: Record<string, { icon: typeof Document; color: string; label: string }> = {
	pdf: { icon: DocumentPdf, color: "#da1e28", label: "PDF" },
	docx: { icon: Document, color: "#0f62fe", label: "DOCX" },
	doc: { icon: Document, color: "#0f62fe", label: "DOC" },
	xlsx: { icon: Table, color: "#198038", label: "XLSX" },
	xls: { icon: Table, color: "#198038", label: "XLS" },
	csv: { icon: Table, color: "#198038", label: "CSV" },
	pptx: { icon: Document, color: "#ff832b", label: "PPTX" },
	txt: { icon: Document, color: "#6f6f6f", label: "TXT" },
};

function getFileMeta(ext: string) {
	return (
		fileTypeMeta[ext.toLowerCase()] ?? {
			icon: Document,
			color: "var(--cds-text-secondary)",
			label: ext.toUpperCase(),
		}
	);
}

const typeFilterOptions = [
	{ value: "all", text: "All types" },
	{ value: "pdf", text: "PDF" },
	{ value: "docx", text: "DOCX" },
	{ value: "xlsx", text: "XLSX" },
	{ value: "csv", text: "CSV" },
	{ value: "png", text: "PNG" },
	{ value: "jpg", text: "JPG" },
	{ value: "gif", text: "GIF" },
];

function isImage(ext: string) {
	return IMAGE_EXTS.has(ext.toLowerCase());
}

export function FilesPage() {
	const portal = useUIStore((s) => s.portal) || "developers";
	const { data, error, isLoading, refetch } = useFiles();
	const [searchQuery, setSearchQuery] = useState("");
	const [typeFilter, setTypeFilter] = useState("all");
	const [selectedFile, setSelectedFile] = useState<WorkspaceFile | null>(null);
	const [previewImage, setPreviewImage] = useState<WorkspaceFile | null>(null);
	const [isUploadOpen, setIsUploadOpen] = useState(false);
	const [uploadItems, setUploadItems] = useState<Array<{ file: File; uuid: string }>>([]);
	const [isUploading, setIsUploading] = useState(false);
	const [uploadError, setUploadError] = useState<string>();
	const [deleteTarget, setDeleteTarget] = useState<WorkspaceFile | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);

	const filteredFiles = useMemo(() => {
		if (!data) return [];
		let list = data;
		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase();
			list = list.filter(
				(f) =>
					f.name.toLowerCase().includes(q) ||
					f.fileType.toLowerCase().includes(q) ||
					f.ownerName?.toLowerCase().includes(q),
			);
		}
		if (typeFilter !== "all") {
			list = list.filter((f) => f.fileType.toLowerCase() === typeFilter);
		}
		return list;
	}, [data, searchQuery, typeFilter]);

	const detailFile = useMemo(() => {
		if (!selectedFile || !data) return null;
		return data.find((f) => f.id === selectedFile.id) ?? selectedFile;
	}, [selectedFile, data]);

	const handleUploadChange = (
		_: any,
		data?: { addedFiles: Array<{ file: File; uuid: string }> },
	) => {
		if (data?.addedFiles) {
			const items = data.addedFiles.map((item) => ({
				file: item.file || (item as unknown as File),
				uuid: item.uuid || crypto.randomUUID(),
			}));
			setUploadItems((prev) => [...prev, ...items]);
		}
	};

	const handleUploadRemove = (_: any, data?: any) => {
		if (data?.uuid) {
			setUploadItems((prev) => prev.filter((item) => item.uuid !== data.uuid));
		}
	};

	async function handleUploadSubmit() {
		if (uploadItems.length === 0) return;
		setIsUploading(true);
		setUploadError(undefined);
		try {
			const formData = new FormData();
			for (const item of uploadItems) {
				formData.append("files", item.file);
			}
			await workspaceApi.uploadFile(formData);
			setUploadItems([]);
			setIsUploadOpen(false);
			refetch();
			toast.success("Files uploaded");
		} catch (e) {
			const msg = e instanceof Error ? e.message : "Upload failed";
			setUploadError(msg);
			toast.error(msg);
		} finally {
			setIsUploading(false);
		}
	}

	async function handleDelete() {
		if (!deleteTarget) return;
		setIsDeleting(true);
		try {
			await workspaceApi.deleteFile(deleteTarget.id);
			if (selectedFile?.id === deleteTarget.id) setSelectedFile(null);
			setDeleteTarget(null);
			refetch();
			toast.success("File deleted");
		} catch {
			toast.error("Could not delete file");
		} finally {
			setIsDeleting(false);
		}
	}

	function handleCardClick(file: WorkspaceFile) {
		if (isImage(file.fileType)) {
			setPreviewImage(file);
		} else {
			setSelectedFile(file);
		}
	}

	if (isLoading) return <LoadingState />;
	if (error || !data)
		return <ErrorState message={error ?? "Files are unavailable"} onRetry={refetch} />;

	return (
		<div>
			<Link
				to={`/${portal}/dashboard`}
				style={{
					fontSize: "0.8125rem",
					color: "var(--cds-link-primary)",
					textDecoration: "none",
					display: "inline-block",
					marginBottom: "0.75rem",
				}}
			>
				&larr; Back to Dashboard
			</Link>
			<PageLayout
				title="Files"
				description="Store, preview, and manage workspace files."
				actions={
					<Button renderIcon={Upload} onClick={() => setIsUploadOpen(true)}>
						Upload
					</Button>
				}
			>
				{/* Toolbar */}
				<div
					style={{
						display: "flex",
						gap: "0.75rem",
						marginBottom: "1rem",
						flexWrap: "wrap",
						alignItems: "center",
					}}
				>
					<Search
						id="file-search"
						labelText="Search files"
						placeholder="Search files by name or type..."
						size="lg"
						value={searchQuery}
						onChange={(e: any) => setSearchQuery(e.target.value)}
						style={{ flex: 1, minWidth: "200px" }}
					/>
					<Select
						id="file-type-filter"
						labelText=""
						hideLabel
						size="lg"
						value={typeFilter}
						onChange={(e: any) => setTypeFilter(e.target.value)}
						style={{ minWidth: "140px" }}
					>
						{typeFilterOptions.map((opt) => (
							<SelectItem key={opt.value} value={opt.value} text={opt.text} />
						))}
					</Select>
				</div>

				{/* Main content area */}
				<div style={{ display: "flex", gap: "1.5rem", alignItems: "flex-start" }}>
					{/* File grid */}
					<div style={{ flex: 1 }}>
						{filteredFiles.length === 0 ? (
							<EmptyState
								title="No files found"
								description={
									searchQuery || typeFilter !== "all"
										? "Try adjusting your search or filter."
										: "Upload a file to get started."
								}
							/>
						) : (
							<div
								style={{
									display: "grid",
									gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
									gap: "1rem",
								}}
							>
								{filteredFiles.map((file) => {
									const ext = file.fileType.toLowerCase();
									const meta = getFileMeta(ext);
									const isImg = isImage(ext);
									return (
										<Tile
											key={file.id}
											onClick={() => handleCardClick(file)}
											style={{
												cursor: "pointer",
												padding: "1.25rem",
												textAlign: "center",
												border:
													selectedFile?.id === file.id
														? "2px solid var(--cds-focus)"
														: undefined,
											}}
										>
											{isImg ? (
												<div
													style={{
														width: "64px",
														height: "64px",
														margin: "0 auto",
														background: "var(--cds-layer-02)",
														borderRadius: "8px",
														overflow: "hidden",
														display: "flex",
														alignItems: "center",
														justifyContent: "center",
													}}
												>
													{file.url ? (
														<img
															src={file.url}
															alt={file.name}
															style={{
																width: "100%",
																height: "100%",
																objectFit: "cover",
															}}
														/>
													) : (
														<Image
															size={28}
															style={{
																color: "var(--cds-text-secondary)",
															}}
														/>
													)}
												</div>
											) : (
												<div
													style={{
														width: "48px",
														height: "48px",
														margin: "0 auto",
														display: "flex",
														alignItems: "center",
														justifyContent: "center",
														background: `${meta.color}18`,
														borderRadius: "8px",
													}}
												>
													<meta.icon
														size={28}
														style={{ color: meta.color }}
													/>
												</div>
											)}
											<p
												style={{
													marginTop: "0.75rem",
													fontWeight: 500,
													fontSize: "0.875rem",
													color: "var(--cds-text-primary)",
													overflow: "hidden",
													textOverflow: "ellipsis",
													whiteSpace: "nowrap",
												}}
											>
												{file.name}
											</p>
											<p
												style={{
													marginTop: "0.25rem",
													fontSize: "0.75rem",
													color: "var(--cds-text-secondary)",
												}}
											>
												{file.sizeLabel}
											</p>
										</Tile>
									);
								})}
							</div>
						)}
					</div>

					{/* Detail sidebar */}
					{detailFile ? (
						<div
							style={{
								width: "320px",
								flexShrink: 0,
								border: "1px solid var(--cds-border-subtle)",
								background: "var(--cds-layer)",
								borderRadius: "4px",
								position: "sticky",
								top: "1rem",
							}}
						>
							<div
								style={{
									padding: "1rem 1.25rem",
									borderBottom: "1px solid var(--cds-border-subtle)",
									display: "flex",
									justifyContent: "space-between",
									alignItems: "center",
								}}
							>
								<span style={{ fontWeight: 600, fontSize: "0.875rem" }}>
									File Details
								</span>
								<Button
									kind="ghost"
									size="sm"
									renderIcon={Close}
									hasIconOnly
									iconDescription="Close"
									onClick={() => setSelectedFile(null)}
								/>
							</div>
							<div style={{ padding: "1.25rem" }}>
								<Stack gap={5}>
									{/* Preview area */}
									<div
										style={{
											width: "100%",
											height: "140px",
											background: "var(--cds-layer-02)",
											borderRadius: "4px",
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											overflow: "hidden",
										}}
									>
										{isImage(detailFile.fileType) && detailFile.url ? (
											<img
												src={detailFile.url}
												alt={detailFile.name}
												style={{
													maxWidth: "100%",
													maxHeight: "100%",
													objectFit: "contain",
												}}
											/>
										) : (
											(() => {
												const m = getFileMeta(detailFile.fileType);
												return (
													<m.icon size={48} style={{ color: m.color }} />
												);
											})()
										)}
									</div>

									{/* File info */}
									<div>
										<p
											style={{
												fontWeight: 600,
												fontSize: "1rem",
												color: "var(--cds-text-primary)",
												wordBreak: "break-word",
											}}
										>
											{detailFile.name}
										</p>
									</div>

									<div
										style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}
									>
										<Tag type="outline">
											{detailFile.fileType.toUpperCase()}
										</Tag>
										<Tag type="cool-gray">{detailFile.sizeLabel}</Tag>
									</div>

									<div
										style={{
											display: "grid",
											gridTemplateColumns: "1fr 1fr",
											gap: "0.75rem",
										}}
									>
										<div>
											<p
												style={{
													fontSize: "0.75rem",
													color: "var(--cds-text-secondary)",
													marginBottom: "0.125rem",
												}}
											>
												Uploaded by
											</p>
											<p style={{ fontSize: "0.875rem", fontWeight: 500 }}>
												{detailFile.uploadedBy ||
													detailFile.ownerName ||
													"—"}
											</p>
										</div>
										<div>
											<p
												style={{
													fontSize: "0.75rem",
													color: "var(--cds-text-secondary)",
													marginBottom: "0.125rem",
												}}
											>
												Date
											</p>
											<p style={{ fontSize: "0.875rem", fontWeight: 500 }}>
												{formatDateTime(
													detailFile.uploadedAt || detailFile.updatedAt,
												)}
											</p>
										</div>
									</div>

									{/* Actions */}
									<Stack gap={3}>
										<Button
											kind="primary"
											renderIcon={Download}
											onClick={() => {
												window.open(
													workspaceApi.getFileDownloadUrl(detailFile.id),
													"_blank",
												);
											}}
										>
											Download
										</Button>
										<Button
											kind="danger--ghost"
											renderIcon={TrashCan}
											onClick={() => setDeleteTarget(detailFile)}
										>
											Delete
										</Button>
									</Stack>
								</Stack>
							</div>
						</div>
					) : null}
				</div>

				{/* Upload Modal */}
			</PageLayout>
			{isUploadOpen && (
				<Modal
					title="Upload Files"
					isOpen={isUploadOpen}
					onClose={() => {
						setIsUploadOpen(false);
						setUploadError(undefined);
					}}
				>
					<Form
						onSubmit={(e: any) => {
							e.preventDefault();
							handleUploadSubmit();
						}}
					>
						<Stack gap={5}>
							<FileUploader
								labelTitle="Drag and drop files here or click to browse"
								labelDescription="Max file size is 50 MB per file."
								buttonLabel="Add files"
								buttonKind="tertiary"
								size="lg"
								filenameStatus="edit"
								multiple
								accept={[
									".pdf",
									".doc",
									".docx",
									".xls",
									".xlsx",
									".csv",
									".ppt",
									".pptx",
									".txt",
									".png",
									".jpg",
									".jpeg",
									".gif",
									".svg",
									".webp",
								]}
								onChange={handleUploadChange}
								onDelete={handleUploadRemove}
							/>
							{uploadError ? (
								<InlineNotification
									kind="error"
									title={uploadError}
									lowContrast
									onClose={() => setUploadError(undefined)}
								/>
							) : null}
							<div
								style={{
									display: "flex",
									justifyContent: "flex-end",
									gap: "0.75rem",
								}}
							>
								<Button
									kind="secondary"
									type="button"
									onClick={() => {
										setIsUploadOpen(false);
										setUploadError(undefined);
									}}
								>
									Cancel
								</Button>
								<Button
									type="submit"
									renderIcon={Upload}
									disabled={uploadItems.length === 0 || isUploading}
								>
									{isUploading
										? "Uploading..."
										: `Upload (${uploadItems.length})`}
								</Button>
							</div>
						</Stack>
					</Form>
				</Modal>
			)}

			{/* Image Preview Modal */}
			{previewImage && (
				<Modal
					title={previewImage.name}
					isOpen={!!previewImage}
					onClose={() => setPreviewImage(null)}
				>
					<div
						style={{
							display: "flex",
							justifyContent: "center",
							alignItems: "center",
							minHeight: "300px",
							background: "var(--cds-layer-02)",
							borderRadius: "4px",
							padding: "1rem",
						}}
					>
						{previewImage.url ? (
							<img
								src={previewImage.url}
								alt={previewImage.name}
								style={{
									maxWidth: "100%",
									maxHeight: "70vh",
									objectFit: "contain",
								}}
							/>
						) : (
							<Image size={64} style={{ color: "var(--cds-text-secondary)" }} />
						)}
					</div>
					<div
						style={{
							marginTop: "1rem",
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
						}}
					>
						<Tag type="outline">{previewImage.fileType.toUpperCase()}</Tag>
						<Button
							kind="tertiary"
							size="sm"
							renderIcon={Download}
							onClick={() =>
								window.open(
									workspaceApi.getFileDownloadUrl(previewImage.id),
									"_blank",
								)
							}
						>
							Download
						</Button>
					</div>
				</Modal>
			)}

			{/* Delete Confirmation Modal */}
			<Modal
				title="Delete File"
				description="This action cannot be undone."
				isOpen={!!deleteTarget}
				onClose={() => setDeleteTarget(null)}
			>
				<p style={{ marginBottom: "1rem", color: "var(--cds-text-secondary)" }}>
					Delete &quot;{deleteTarget?.name}&quot;?
				</p>
				<div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
					<Button kind="secondary" onClick={() => setDeleteTarget(null)}>
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
