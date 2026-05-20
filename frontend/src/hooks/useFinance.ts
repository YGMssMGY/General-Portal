import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { workspaceApi } from "../api/workspaceApi";
import type { FinanceTransaction } from "../types";

const FINANCE_KEY = ["finance"] as const;

export function useFinanceTransactionsQuery() {
    return useQuery({
        queryKey: FINANCE_KEY,
        queryFn: () => workspaceApi.getFinanceTransactions(),
    });
}

export function useFinanceSummaryQuery() {
    return useQuery({
        queryKey: ["finance-summary"],
        queryFn: () => workspaceApi.getFinanceSummary(),
    });
}

export function useFinanceTrendsQuery(days = 7) {
    return useQuery({
        queryKey: ["finance-trends", days],
        queryFn: () => workspaceApi.getFinanceTrends(days),
    });
}

export function useCreateFinanceTransaction() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: Parameters<typeof workspaceApi.createFinanceTransaction>[0]) =>
            workspaceApi.createFinanceTransaction(data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: FINANCE_KEY });
            qc.invalidateQueries({ queryKey: ["finance-summary"] });
        },
    });
}

export function useUpdateFinanceTransaction() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, updates }: { id: string; updates: Partial<FinanceTransaction> }) =>
            workspaceApi.updateFinanceTransaction(id, updates),
        onMutate: async ({ id, updates }) => {
            await qc.cancelQueries({ queryKey: FINANCE_KEY });
            const prev = qc.getQueryData<FinanceTransaction[]>(FINANCE_KEY);
            if (prev) {
                qc.setQueryData<FinanceTransaction[]>(FINANCE_KEY, (old) =>
                    old?.map((t) => (t.id === id ? { ...t, ...updates } : t)),
                );
            }
            return { prev };
        },
        onError: (_err, _vars, ctx) => {
            if (ctx?.prev) qc.setQueryData(FINANCE_KEY, ctx.prev);
        },
        onSettled: () => qc.invalidateQueries({ queryKey: FINANCE_KEY }),
    });
}

export function useDeleteFinanceTransaction() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => workspaceApi.deleteFinanceTransaction(id),
        onSettled: () => qc.invalidateQueries({ queryKey: FINANCE_KEY }),
    });
}
