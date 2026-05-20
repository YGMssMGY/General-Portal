import { describe, it, expect } from "vitest";
import {
	successResponse,
	errorResponse,
	paginatedResponse,
	parsePagination,
} from "../../../src/lib/api-response.js";

describe("api-response", () => {
	describe("successResponse", () => {
		it("wraps data in success envelope", () => {
			const res = successResponse({ id: 1, name: "test" });
			expect(res.success).toBe(true);
			expect(res.data).toEqual({ id: 1, name: "test" });
		});

		it("includes meta when provided", () => {
			const res = successResponse([], {
				total: 0,
				page: 1,
				limit: 50,
				totalPages: 0,
			});
			expect(res.meta).toBeDefined();
			expect(res.meta!.total).toBe(0);
		});
	});

	describe("errorResponse", () => {
		it("wraps error message in error envelope", () => {
			const res = errorResponse("Something went wrong");
			expect(res.success).toBe(false);
			expect(res.error.message).toBe("Something went wrong");
		});

		it("includes code when provided", () => {
			const res = errorResponse("Bad input", "VALIDATION");
			expect(res.error.code).toBe("VALIDATION");
		});

		it("includes details when provided", () => {
			const res = errorResponse("Bad input", "VALIDATION", { field: "name" });
			expect(res.error.details).toEqual({ field: "name" });
		});
	});

	describe("paginatedResponse", () => {
		it("wraps data with pagination meta", () => {
			const data = [{ id: 1 }, { id: 2 }];
			const res = paginatedResponse(data, 10, 1, 5);

			expect(res.success).toBe(true);
			expect(res.data).toHaveLength(2);
			expect(res.meta).toEqual({
				total: 10,
				page: 1,
				limit: 5,
				totalPages: 2,
			});
		});

		it("calculates totalPages correctly", () => {
			const res = paginatedResponse([], 0, 1, 10);
			expect(res.meta!.totalPages).toBe(0);

			const res2 = paginatedResponse([], 7, 1, 10);
			expect(res2.meta!.totalPages).toBe(1);

			const res3 = paginatedResponse([], 15, 1, 10);
			expect(res3.meta!.totalPages).toBe(2);
		});
	});

	describe("parsePagination", () => {
		it("returns defaults when no query params", () => {
			const c = { req: { query: () => undefined } };
			const result = parsePagination(c as any);
			expect(result.page).toBe(1);
			expect(result.limit).toBe(50);
			expect(result.skip).toBe(0);
		});

		it("parses page and limit from query", () => {
			const c = {
				req: {
					query: (key: string) =>
						key === "page" ? "3" : key === "limit" ? "20" : undefined,
				},
			};
			const result = parsePagination(c as any);
			expect(result.page).toBe(3);
			expect(result.limit).toBe(20);
			expect(result.skip).toBe(40);
		});

		it("caps limit at 100", () => {
			const c = { req: { query: () => "200" } };
			const result = parsePagination(c as any);
			expect(result.limit).toBe(100);
		});

		it("ensures minimum page of 1", () => {
			const c = {
				req: { query: (k: string) => (k === "page" ? "0" : undefined) },
			};
			const result = parsePagination(c as any);
			expect(result.page).toBe(1);
		});
	});
});
