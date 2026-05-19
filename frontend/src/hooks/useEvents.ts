import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { workspaceApi } from "../api/workspaceApi";
import type { EventItem } from "../types";

const EVENTS_KEY = ["events"] as const;

export function useEventsQuery() {
  return useQuery({
    queryKey: EVENTS_KEY,
    queryFn: () => workspaceApi.getEvents(),
  });
}

export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof workspaceApi.createEvent>[0]) =>
      workspaceApi.createEvent(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: EVENTS_KEY }),
  });
}

export function useUpdateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<EventItem> }) =>
      workspaceApi.updateEvent(id, updates),
    onMutate: async ({ id, updates }) => {
      await qc.cancelQueries({ queryKey: EVENTS_KEY });
      const prev = qc.getQueryData<EventItem[]>(EVENTS_KEY);
      if (prev) {
        qc.setQueryData<EventItem[]>(EVENTS_KEY, (old) =>
          old?.map((e) => (e.id === id ? { ...e, ...updates } : e)),
        );
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(EVENTS_KEY, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: EVENTS_KEY }),
  });
}

export function useDeleteEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => workspaceApi.deleteEvent(id),
    onSettled: () => qc.invalidateQueries({ queryKey: EVENTS_KEY }),
  });
}
