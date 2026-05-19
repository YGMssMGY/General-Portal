import { useState, useMemo, type ReactNode } from "react";
import { DataTableRow } from "./DataTableRow";
import { DataTableToolbar } from "./DataTableToolbar";
import { DataTablePagination } from "./DataTablePagination";
import {
	TableContainer,
	Table,
	TableHead,
	TableHeader,
	TableRow as CarbonTableRow,
	TableBody,
	TableSelectAll,
	Search,
} from "@carbon/react";

export interface ColumnDef<T> {
	key: string;
	header: string;
	sortable?: boolean;
	render?: (item: T) => ReactNode;
	className?: string;
}

interface DataTableProps<T> {
	columns: ColumnDef<T>[];
	data: T[];
	selectable?: boolean;
	keyField?: string;
	defaultSort?: { key: string; direction: "asc" | "desc" };
	toolbar?: ReactNode;
	pageSize?: number;
	onRowClick?: (item: T) => void;
	virtualize?: boolean;
	filterable?: boolean;
	batchActions?: ReactNode;
	onSearch?: (query: string) => void;
	searchPlaceholder?: string;
}

export function DataTable({
	columns,
	data,
	selectable = false,
	keyField = "id",
	defaultSort,
	toolbar,
	pageSize: defaultPageSize = 10,
	onRowClick,
	virtualize = false,
	filterable = false,
	batchActions,
	onSearch,
	searchPlaceholder = "Search...",
}: DataTableProps<any>) {
	const [sortKey, setSortKey] = useState<string | null>(defaultSort?.key ?? null);
	const [sortDir, setSortDir] = useState<"asc" | "desc">(defaultSort?.direction ?? "asc");
	const [selected, setSelected] = useState<Set<string>>(new Set());
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(defaultPageSize);
	const [searchQuery, setSearchQuery] = useState("");

	const filtered = useMemo(() => {
		if (!searchQuery || !onSearch) return data;
		const q = searchQuery.toLowerCase();
		return data.filter((item: any) =>
			Object.values(item).some((v: any) =>
				String(v ?? "")
					.toLowerCase()
					.includes(q),
			),
		);
	}, [data, searchQuery, onSearch]);

	const sorted = useMemo(() => {
		if (!sortKey) return filtered;
		return [...filtered].sort((a, b) => {
			const aVal = a[sortKey];
			const bVal = b[sortKey];
			if (aVal == null && bVal == null) return 0;
			if (aVal == null) return 1;
			if (bVal == null) return -1;
			const comparison = String(aVal).localeCompare(String(bVal), undefined, {
				numeric: true,
				sensitivity: "base",
			});
			return sortDir === "asc" ? comparison : -comparison;
		});
	}, [filtered, sortKey, sortDir]);

	const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
	const paged = sorted.slice((page - 1) * pageSize, page * pageSize);

	const maxRender = virtualize ? 100 : paged.length;
	const rendered = paged.slice(0, maxRender);

	function handleSort(key: string) {
		if (sortKey === key) {
			setSortDir((d) => (d === "asc" ? "desc" : "asc"));
		} else {
			setSortKey(key);
			setSortDir("asc");
		}
	}

	function toggleSelect(id: string) {
		setSelected((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}

	function toggleAll() {
		if (selected.size === paged.length) {
			setSelected(new Set());
		} else {
			setSelected(new Set(paged.map((item) => String(item[keyField]))));
		}
	}

	function handlePageChange(newPage: number) {
		setPage(newPage);
		setSelected(new Set());
	}

	function handlePageSizeChange(newSize: number) {
		setPageSize(newSize);
		setPage(1);
		setSelected(new Set());
	}

	const start = (page - 1) * pageSize + 1;
	const end = Math.min(page * pageSize, sorted.length);

	const displayData = rendered;

	return (
		<div
			style={{ border: "1px solid var(--cds-border-subtle)", background: "var(--cds-layer)" }}
		>
			{filterable ? (
				<div
					style={{
						padding: "0.5rem",
						borderBottom: "1px solid var(--cds-border-subtle)",
					}}
				>
					<Search
						id="data-table-search"
						labelText="Search"
						placeholder={searchPlaceholder}
						size="sm"
						value={searchQuery}
						onChange={(e) => {
							setSearchQuery(e.target.value);
							onSearch?.(e.target.value);
						}}
						closeButtonLabelText="Clear search"
					/>
				</div>
			) : null}
			{toolbar ? (
				<DataTableToolbar
					selectedCount={selected.size}
					onClearSelection={() => setSelected(new Set())}
					batchActions={batchActions}
				>
					{toolbar}
				</DataTableToolbar>
			) : null}

			<TableContainer>
				<Table>
					<TableHead>
						<CarbonTableRow>
							{selectable ? (
								<TableSelectAll
									id="select-all"
									name="select-all"
									checked={paged.length > 0 && selected.size === paged.length}
									onSelect={toggleAll}
								/>
							) : null}
							{columns.map((col) => (
								<TableHeader
									key={col.key}
									isSortable={col.sortable}
									isSortHeader={sortKey === col.key}
									sortDirection={
										sortKey === col.key
											? sortDir === "asc"
												? "ASC"
												: "DESC"
											: "NONE"
									}
									onClick={() => {
										if (col.sortable) handleSort(col.key);
									}}
								>
									{col.header}
								</TableHeader>
							))}
						</CarbonTableRow>
					</TableHead>
					<TableBody>
						{displayData.map((item) => (
							<DataTableRow
								key={String(item[keyField])}
								item={item}
								columns={columns}
								selectable={selectable}
								selected={selected.has(String(item[keyField]))}
								onToggleSelect={() => toggleSelect(String(item[keyField]))}
								onRowClick={onRowClick ? () => onRowClick(item) : undefined}
							/>
						))}
					</TableBody>
				</Table>
			</TableContainer>

			{sorted.length === 0 ? (
				<div
					style={{
						padding: "2rem",
						textAlign: "center",
						fontSize: "0.875rem",
						color: "var(--cds-text-secondary)",
					}}
				>
					No items to display.
				</div>
			) : null}

			<DataTablePagination
				start={start}
				end={end}
				total={sorted.length}
				page={page}
				totalPages={totalPages}
				pageSize={pageSize}
				onPageChange={handlePageChange}
				onPageSizeChange={handlePageSizeChange}
			/>
		</div>
	);
}
