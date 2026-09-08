import { useEffect, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useCurrentUser } from "@/hooks/use-current-user";
import type { User } from "@/lib/account-types";
import { useAuth } from "@/store/auth";

type UseProtectedUserOptions = {
  role?: User["role"] | User["role"][];
  redirectTo?: string;
  unauthorizedRedirectTo?: string;
};

export function useProtectedUser({ role, redirectTo = "/login", unauthorizedRedirectTo = "/" }: UseProtectedUserOptions = {}) {
  const auth = useAuth();
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const navigate = useNavigate();
  const allowedRoles = useMemo(() => (Array.isArray(role) ? role : role ? [role] : []), [role]);

  const activeUser = user ?? auth.user;
  const isPending = (!auth.hydrated && !activeUser) || (auth.loading && !activeUser) || (userLoading && !activeUser);
  const isAuthorized = !isPending && Boolean(activeUser) && (allowedRoles.length === 0 || allowedRoles.includes(activeUser!.role));

  useEffect(() => {
    if (isPending) {
      return;
    }

    if (!activeUser) {
      void navigate({ to: redirectTo });
      return;
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(activeUser.role)) {
      void navigate({ to: unauthorizedRedirectTo });
    }
  }, [allowedRoles, isPending, navigate, redirectTo, unauthorizedRedirectTo, activeUser]);

  return {
    auth,
    user: activeUser,
    isPending,
    isAuthorized,
  };
}
