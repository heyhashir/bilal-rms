import { useQuery } from "@tanstack/react-query";
import { authApi } from "@/lib/auth-api";
import { APP_QUERY_STALE_MS } from "@/lib/query-client";
import { queryKeys } from "@/lib/query-keys";
import { useAuth } from "@/store/auth";

export function useCurrentUser() {
  const hydrated = useAuth((state) => state.hydrated);

  return useQuery({
    queryKey: queryKeys.auth.currentUser,
    queryFn: authApi.currentUser,
    enabled: hydrated,
    staleTime: APP_QUERY_STALE_MS,
  });
}
