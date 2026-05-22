import { workspaceApi } from "../api/workspaceApi";
import { useAsyncData } from "./useAsyncData";

export function useDashboard() {
    return useAsyncData(() => workspaceApi.getDashboard(), []);
}

export function useTasks() {
    return useAsyncData(() => workspaceApi.getTasks(), []);
}

export function useProposals() {
    return useAsyncData(() => workspaceApi.getProposals(), []);
}

export function useEvents() {
    return useAsyncData(() => workspaceApi.getEvents(), []);
}

export function useVolunteerSlots() {
    return useAsyncData(() => workspaceApi.getVolunteerSlots(), []);
}

export function useFinanceTransactions() {
    return useAsyncData(() => workspaceApi.getFinanceTransactions(), []);
}

export function useFinanceSummary() {
    return useAsyncData(() => workspaceApi.getFinanceSummary(), []);
}

export function useFinanceTrends(days = 7) {
    return useAsyncData(() => workspaceApi.getFinanceTrends(days), [days]);
}

export function useMessageThreads() {
    return useAsyncData(() => workspaceApi.getMessageThreads(), []);
}

export function useFiles(type?: string) {
    return useAsyncData(() => workspaceApi.getFiles(type), [type]);
}

export function useMembers() {
    return useAsyncData(() => workspaceApi.getMembers(), []);
}

export function useActivity() {
    return useAsyncData(() => workspaceApi.getActivity(), []);
}

export function useActivityStats() {
    return useAsyncData(() => workspaceApi.getActivityStats(), []);
}

export function useSettings() {
    return useAsyncData(() => workspaceApi.getSettings(), []);
}

export function useModules() {
    return useAsyncData(() => workspaceApi.getModules(), []);
}

export function useApprovalRules() {
    return useAsyncData(() => workspaceApi.getApprovalRules(), []);
}

export function useMeetings() {
    return useAsyncData(() => workspaceApi.getMeetings(), []);
}

export function useBudgetAllocations() {
    return useAsyncData(() => workspaceApi.getBudgetAllocations(), []);
}

export function useArchives() {
    return useAsyncData(() => workspaceApi.getArchives(), []);
}

export function useSearch(query: string, type?: string, limit?: number, offset?: number) {
    return useAsyncData(
        () => workspaceApi.search(query, type, limit, offset),
        [query, type, limit, offset],
    );
}
