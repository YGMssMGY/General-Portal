import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { workspaceApi } from "../api/workspaceApi";
import type { Proposal } from "../types";

const PROPOSALS_KEY = ["proposals"] as const;

export function useProposalsQuery() {
    return useQuery({
        queryKey: PROPOSALS_KEY,
        queryFn: () => workspaceApi.getProposals(),
    });
}

export function useCreateProposal() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: Parameters<typeof workspaceApi.createProposal>[0]) =>
            workspaceApi.createProposal(data),
        onSuccess: () => qc.invalidateQueries({ queryKey: PROPOSALS_KEY }),
    });
}

export function useUpdateProposal() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, updates }: { id: string; updates: Partial<Proposal> }) =>
            workspaceApi.updateProposal(id, updates),
        onMutate: async ({ id, updates }) => {
            await qc.cancelQueries({ queryKey: PROPOSALS_KEY });
            const prev = qc.getQueryData<Proposal[]>(PROPOSALS_KEY);
            if (prev) {
                qc.setQueryData<Proposal[]>(PROPOSALS_KEY, (old) =>
                    old?.map((p) => (p.id === id ? { ...p, ...updates } : p)),
                );
            }
            return { prev };
        },
        onError: (_err, _vars, ctx) => {
            if (ctx?.prev) qc.setQueryData(PROPOSALS_KEY, ctx.prev);
        },
        onSettled: () => qc.invalidateQueries({ queryKey: PROPOSALS_KEY }),
    });
}

export function useDeleteProposal() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => workspaceApi.deleteProposal(id),
        onSettled: () => qc.invalidateQueries({ queryKey: PROPOSALS_KEY }),
    });
}
