import { QueryClient } from "@tanstack/react-query";

const STALE_TIME = 30_000;
const GC_TIME = 5 * 60_000;

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: STALE_TIME,
        gcTime: GC_TIME,
        retry: 1,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}
