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

export function useMessageThreads() {
  return useAsyncData(() => workspaceApi.getMessageThreads(), []);
}

export function useFiles() {
  return useAsyncData(() => workspaceApi.getFiles(), []);
}

export function useMembers() {
  return useAsyncData(() => workspaceApi.getMembers(), []);
}

export function useActivity() {
  return useAsyncData(() => workspaceApi.getActivity(), []);
}

export function useSettings() {
  return useAsyncData(() => workspaceApi.getSettings(), []);
}

export function useSearch(query: string) {
  return useAsyncData(() => workspaceApi.search(query), [query]);
}
