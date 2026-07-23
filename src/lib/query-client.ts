import { QueryClient } from "@tanstack/react-query";
import { RequestError } from "@/lib/api";

export const APP_QUERY_STALE_MS = 30_000;
export const APP_QUERY_GC_MS = 5 * 60_000;

const shouldRetryQuery = (failureCount: number, error: unknown) => {
  if (error instanceof RequestError) {
    if ([401, 403, 404, 422, 429].includes(error.status)) {
      return false;
    }
  }

  return failureCount < 1;
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: APP_QUERY_STALE_MS,
      gcTime: APP_QUERY_GC_MS,
      retry: shouldRetryQuery,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});
