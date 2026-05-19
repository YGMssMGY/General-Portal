import { Pagination } from "@carbon/react";

interface DataTablePaginationProps {
	start: number;
	end: number;
	total: number;
	page: number;
	totalPages: number;
	pageSize: number;
	onPageChange: (page: number) => void;
	onPageSizeChange: (size: number) => void;
}

export function DataTablePagination({
	total,
	page,
	pageSize,
	onPageChange,
	onPageSizeChange,
}: DataTablePaginationProps) {
	return (
		<Pagination
			totalItems={total}
			pageSize={pageSize}
			pageSizes={[10, 20, 30]}
			page={page}
			onChange={({ page: newPage, pageSize: newSize }) => {
				if (newSize !== pageSize) {
					onPageSizeChange(newSize);
				} else {
					onPageChange(newPage);
				}
			}}
		/>
	);
}
