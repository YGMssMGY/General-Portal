export interface PaginationMeta {
	total: number;
	page: number;
	limit: number;
	totalPages: number;
}

export interface SuccessResponse<T> {
	success: true;
	data: T;
	meta?: PaginationMeta;
}

export interface ErrorDetail {
	message: string;
	code?: string;
	details?: unknown;
}

export interface ErrorResponse {
	success: false;
	error: ErrorDetail;
}

export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;

export function successResponse<T>(data: T, meta?: PaginationMeta): SuccessResponse<T> {
	return { success: true, data, ...(meta ? { meta } : {}) };
}

export function errorResponse(message: string, code?: string, details?: unknown): ErrorResponse {
	return {
		success: false,
		error: {
			message,
			...(code ? { code } : {}),
			...(details ? { details } : {}),
		},
	};
}

export function paginatedResponse<T>(
	data: T[],
	total: number,
	page: number = 1,
	limit: number = 50,
): SuccessResponse<T[]> {
	return {
		success: true,
		data,
		meta: {
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
		},
	};
}

export function parsePagination(c: { req: { query: (key: string) => string | undefined } }): {
	page: number;
	limit: number;
	skip: number;
} {
	const page = Math.max(1, parseInt(c.req.query("page") || "1", 10));
	const limit = Math.min(100, Math.max(1, parseInt(c.req.query("limit") || "50", 10)));
	const skip = (page - 1) * limit;
	return { page, limit, skip };
}
